import { streamText, tool, stepCountIs, type LanguageModel, type ModelMessage, type ToolSet } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { deepseek } from '@ai-sdk/deepseek'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { YUKAI_SYSTEM_PROMPT } from '@/shared/yukai/persona'

export const runtime = 'nodejs'

type Provider = 'anthropic' | 'openai' | 'deepseek'

type Body = {
  messages: ModelMessage[]
  system?: string
  provider?: Provider
  model?: string
  tools?: boolean // enable memory tools (client-side execution)
}

function pickModel(provider: Provider, model?: string): LanguageModel {
  switch (provider) {
    case 'openai':
      return openai(model ?? 'gpt-4o')
    case 'deepseek':
      return deepseek(model ?? 'deepseek-chat')
    case 'anthropic':
    default:
      return anthropic(model ?? 'claude-haiku-4-5-20251001')
  }
}

// Tools для работы с файлами в kika-memory (клиент выполняет через Electron IPC)
const memoryTools = {
  read_memory_file: tool({
    description:
      'Читает markdown-файл из папки kika-memory/ пользователя. Возвращает содержимое или пустую строку если файла нет.',
    inputSchema: z.object({
      path: z.string().describe('Относительный путь в kika-memory/, например "profile.md" или "notes/work.md"'),
    }),
  }),
  write_memory_file: tool({
    description:
      'Создаёт или ПОЛНОСТЬЮ перезаписывает файл в kika-memory/. Осторожно с перезаписью.',
    inputSchema: z.object({
      path: z.string(),
      content: z.string().describe('Содержимое файла целиком в markdown'),
    }),
  }),
  append_memory_file: tool({
    description:
      'Добавляет строку в конец файла в kika-memory/. Создаёт файл если нет. Используй для заметок.',
    inputSchema: z.object({
      path: z.string(),
      text: z.string().describe('Текст для добавления (одна или несколько строк)'),
    }),
  }),
  list_memory_files: tool({
    description: 'Возвращает список файлов и папок в указанной директории kika-memory/.',
    inputSchema: z.object({
      dir: z.string().default('').describe('Относительный путь директории, "" = корень'),
    }),
  }),
}

export async function POST(req: NextRequest) {
  const {
    messages,
    system,
    provider = 'anthropic',
    model,
    tools: useTools,
  }: Body = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages required' }, { status: 400 })
  }

  // Web search — server-side tool Anthropic. Модель сама решает когда искать.
  // maxUses=2 чтобы не уходить в бесконечные итерации поиска и не съедать секунды latency.
  // Версия 20250305: совместима с Haiku 4.5. Версия 20260209 требует programmatic
  // tool calling (только Sonnet 4.5+/Opus 4.5+).
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
    // useTools=true → memory tools (max 3 шага: write + ответ).
    // Иначе только web_search (max 4: до 2 поисков + ответ).
    stopWhen: hasTools ? stepCountIs(useTools ? 3 : 4) : undefined,
  })

  // useTools (memory) → UI message stream с client-side tool_calls.
  // Иначе → text stream (web_search server-side, юзер видит только финальный текст).
  return useTools ? result.toUIMessageStreamResponse() : result.toTextStreamResponse()
}
