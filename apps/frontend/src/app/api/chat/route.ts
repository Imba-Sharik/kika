import { streamText, tool, stepCountIs, type LanguageModel, type ModelMessage } from 'ai'
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
      return anthropic(model ?? 'claude-sonnet-4-20250514')
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

  const result = streamText({
    model: pickModel(provider, model),
    system: system ?? YUKAI_SYSTEM_PROMPT,
    messages,
    tools: useTools ? memoryTools : undefined,
    // Max 3 шага: write + final response. Без длинных read→think→write цепочек.
    // AI SDK v6: maxSteps → stopWhen: stepCountIs(N)
    stopWhen: useTools ? stepCountIs(3) : undefined,
  })

  // Если tools включены — UI message stream (SSE, с tool_calls). Иначе — простой text stream.
  return useTools ? result.toUIMessageStreamResponse() : result.toTextStreamResponse()
}
