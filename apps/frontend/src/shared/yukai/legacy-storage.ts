// Ребренд Kika → Yukai: одноразово переносим localStorage-ключи `kika:*` → `yukai:*`,
// чтобы у юзеров не слетели голос, персонаж, плагины, история и т.п.
// Выполняется при импорте модуля — импортировать ПЕРВЫМ, до любых чтений storage.
const LEGACY_PREFIX = 'kika:'
const PREFIX = 'yukai:'
// Этот ключ мигрирует сам useEnglishVocabulary (там своя схема) — не трогаем.
const SKIP = new Set(['kika:english-history'])

function migrateLegacyStorage() {
  if (typeof window === 'undefined') return
  try {
    const legacyKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(LEGACY_PREFIX) && !SKIP.has(key)) legacyKeys.push(key)
    }
    for (const key of legacyKeys) {
      const newKey = PREFIX + key.slice(LEGACY_PREFIX.length)
      const value = localStorage.getItem(key)
      if (value !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, value)
      }
      localStorage.removeItem(key)
    }
  } catch {}
}

migrateLegacyStorage()
