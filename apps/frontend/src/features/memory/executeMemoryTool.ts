// Выполняет memory tool_calls от Claude через Electron IPC.
// Вызывается из chat-loop: Claude прислал tool_call → локально исполняем → отдаём результат.

export type MemoryToolCall = {
  toolCallId: string
  toolName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
}

export type MemoryToolResult = {
  // AI SDK v6: output должен быть обёрнут в { type: 'text'|'json', value }
  output:
    | { type: 'text'; value: string }
    | { type: 'json'; value: unknown }
}

// Запускает один tool_call. Опционально сигналит о мутации profile.md —
// чтобы вызывающий мог обновить кешированное содержимое в своём state.
export async function executeMemoryTool(
  tc: MemoryToolCall,
  onProfileMutated?: (freshContent: string) => void,
): Promise<MemoryToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (window as any).electronAPI
  let result: unknown = ''
  try {
    if (tc.toolName === 'read_memory_file') {
      result = (await api?.readMemoryFile?.(tc.args.path)) ?? ''
    } else if (tc.toolName === 'write_memory_file') {
      const ok = await api?.writeMemoryFile?.(tc.args.path, tc.args.content)
      result = ok ? 'OK' : 'FAILED'
      if (ok && tc.args.path === 'profile.md' && onProfileMutated) {
        const fresh = await api?.readMemoryFile?.('profile.md')
        if (typeof fresh === 'string') onProfileMutated(fresh)
      }
    } else if (tc.toolName === 'append_memory_file') {
      const ok = await api?.appendMemoryFile?.(tc.args.path, tc.args.text)
      result = ok ? 'OK' : 'FAILED'
      if (ok && tc.args.path === 'profile.md' && onProfileMutated) {
        const fresh = await api?.readMemoryFile?.('profile.md')
        if (typeof fresh === 'string') onProfileMutated(fresh)
      }
    } else if (tc.toolName === 'list_memory_files') {
      result = (await api?.listMemoryFiles?.(tc.args.dir || '')) ?? []
    } else {
      result = { error: `unknown tool: ${tc.toolName}` }
    }
  } catch (err) {
    result = { error: String(err) }
  }
  console.log(`[tool] ${tc.toolName}(${JSON.stringify(tc.args)}) →`, result)

  const output: MemoryToolResult['output'] =
    typeof result === 'string'
      ? { type: 'text', value: result }
      : { type: 'json', value: result as unknown }
  return { output }
}
