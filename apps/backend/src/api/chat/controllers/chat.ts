import { Readable } from 'node:stream'
import { streamText, tool, stepCountIs, type LanguageModel, type ModelMessage, type ToolSet } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { YUKAI_SYSTEM_PROMPT } from '../../../shared/yukai/persona'

type Provider = 'anthropic'

type Body = {
  messages: ModelMessage[]
  system?: string
  provider?: Provider
  model?: string
  tools?: boolean
}

function pickModel(provider: Provider, model?: string): LanguageModel {
  // OpenAI/DeepSeek можно вернуть позже — сейчас прод гоняет только Anthropic.
  return anthropic(model ?? 'claude-haiku-4-5-20251001')
}

// Memory tools — клиент исполняет через Electron IPC. Бэк только декларирует
// схему, чтобы Claude мог их вызвать. Результат прилетает обратно в messages.
const memoryTools = {
  read_memory_file: tool({
    description:
      'Читает markdown-файл из папки yukai-memory/ пользователя. Возвращает содержимое или пустую строку.',
    inputSchema: z.object({ path: z.string() }),
  }),
  write_memory_file: tool({
    description: 'Создаёт или ПОЛНОСТЬЮ перезаписывает файл в yukai-memory/.',
    inputSchema: z.object({ path: z.string(), content: z.string() }),
  }),
  append_memory_file: tool({
    description: 'Добавляет строку в конец файла в yukai-memory/. Создаёт если нет.',
    inputSchema: z.object({ path: z.string(), text: z.string() }),
  }),
  list_memory_files: tool({
    description: 'Список файлов и папок в указанной директории yukai-memory/.',
    inputSchema: z.object({ dir: z.string().default('') }),
  }),
}

export default {
  async stream(ctx) {
    const {
      messages,
      system,
      provider = 'anthropic',
      model,
      tools: useTools,
    }: Body = ctx.request.body || {}

    if (!Array.isArray(messages) || messages.length === 0) {
      return ctx.badRequest('messages required')
    }

    const combinedTools: ToolSet = {}
    if (useTools) Object.assign(combinedTools, memoryTools)
    if (provider === 'anthropic') {
      combinedTools.web_search = anthropic.tools.webSearch_20250305({ maxUses: 2 })
    }
    const hasTools = Object.keys(combinedTools).length > 0

    const result = streamText({
      model: pickModel(provider, model),
      system: system ?? YUKAI_SYSTEM_PROMPT,
      messages,
      tools: hasTools ? combinedTools : undefined,
      stopWhen: hasTools ? stepCountIs(useTools ? 3 : 4) : undefined,
    })

    // useTools (memory) → UI-message stream с tool_calls для клиента.
    // Иначе → текстовый stream.
    const response = useTools
      ? result.toUIMessageStreamResponse()
      : result.toTextStreamResponse()

    // Web Response → Koa-friendly Node stream
    ctx.status = response.status
    response.headers.forEach((value, key) => {
      ctx.set(key, value)
    })
    if (response.body) {
      ctx.body = Readable.fromWeb(response.body as never)
    } else {
      ctx.body = ''
    }
  },
}
