import { EMOTIONS, type Emotion } from '@/shared/kika/persona'

// Терминальные знаки предложения: точка, восклицание, вопрос, многоточие-одним-символом.
const TERMINATORS = '.!?…'
// Закрывающие кавычки/скобки, которые могут идти сразу после терминатора
// (пример: «Правда?» или "Точно!"). ']' намеренно не включаем — используется в тегах.
const CLOSERS = '»""\')'

// Из стримингового буфера Claude вытаскивает завершённые предложения для TTS.
// - Эмоция: [happy], [thinking] и т.д. внутри текста переключают текущую эмоцию.
// - Предложение эмитится когда после терминатора (. ! ? … возможно серией, плюс
//   опциональная закрывающая кавычка) идёт пробел/newline/[. На конце буфера
//   (nxt === undefined) НЕ эмитим — ждём следующий delta, иначе многоточие
//   ".." разрежется на куски между чанками.
// - Em-dash ' — ' после 20+ символов — тоже граница.
// - Memory-теги [APPEND:]/[WRITE:] вырезаются перед обработкой.
// - Возвращаем remainder (необработанный хвост) + текущую эмоцию.
export function extractSentences(
  buffer: string,
  em: Emotion,
  emit: (sentence: string, emotion: Emotion) => void,
): { remainder: string; emotion: Emotion } {
  const cutIdx = buffer.search(/\[(?:APPEND|WRITE):/i)
  if (cutIdx >= 0) buffer = buffer.slice(0, cutIdx)

  let pos = 0
  let lastEmit = 0
  let cur = em

  while (pos < buffer.length) {
    if (buffer[pos] === '[') {
      const close = buffer.indexOf(']', pos)
      if (close === -1) break
      const tag = buffer.slice(pos + 1, close).toLowerCase()
      if ((EMOTIONS as readonly string[]).includes(tag)) cur = tag as Emotion
      pos = close + 1
      continue
    }

    if (TERMINATORS.includes(buffer[pos])) {
      // Серия терминаторов подряд: "...", "!!!", "?!"
      let end = pos + 1
      while (end < buffer.length && TERMINATORS.includes(buffer[end])) end++
      // Опциональная закрывающая кавычка/скобка
      if (end < buffer.length && CLOSERS.includes(buffer[end])) end++

      const nxt = buffer[end]
      if (nxt === ' ' || nxt === '\n' || nxt === '[') {
        const raw = buffer.slice(lastEmit, end)
        const clean = raw.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
        if (clean) emit(clean, cur)
        lastEmit = end
        pos = end
        continue
      }
      if (nxt === undefined) break // ждём следующий delta
      pos = end
      continue
    }

    if (
      pos >= lastEmit + 20 &&
      buffer[pos] === '—' &&
      buffer[pos - 1] === ' ' &&
      buffer[pos + 1] === ' '
    ) {
      const raw = buffer.slice(lastEmit, pos)
      const clean = raw.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
      if (clean) emit(clean, cur)
      lastEmit = pos + 2
      pos = pos + 2
      continue
    }

    pos++
  }

  return { remainder: buffer.slice(lastEmit), emotion: cur }
}
