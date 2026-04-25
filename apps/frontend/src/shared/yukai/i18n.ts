// Простая локализация без runtime-зависимостей. Словари RU/EN ключ → строка.
// Подход — t(language, key). Переключение мгновенное при смене языка в Settings.
//
// Когда строк станет > 100 — мигрировать на next-intl или react-intl с JSON-файлами.

import type { Language } from './persona'

const DICT = {
  // Chat / Overlay header
  'chat.you': { ru: 'ты', en: 'you' },
  'chat.status.error': { ru: 'ошибка', en: 'error' },
  'chat.status.speaking': { ru: 'говорит', en: 'speaking' },
  'chat.status.thinking': { ru: 'думает', en: 'thinking' },
  'chat.status.ready': { ru: 'готова', en: 'ready' },
  'chat.empty.hint': { ru: 'Зажми', en: 'Press' },
  'chat.empty.hint2': { ru: 'чтобы поговорить', en: 'to talk' },
  'chat.timing.label': { ru: 'всего', en: 'total' },

  // Onboarding tooltip
  'onboarding.greet': { ru: 'Привет!', en: 'Hi there!' },
  'onboarding.text1': {
    ru: 'Чтобы поговорить голосом — зажми',
    en: 'To talk by voice — press',
  },
  'onboarding.text2': {
    ru: 'или кликни на полоски под Yukai:',
    en: 'or click the bars below Yukai:',
  },
  'onboarding.text3': {
    ru: 'Повторное нажатие/клик — выключить.',
    en: 'Press/click again to turn off.',
  },
  'onboarding.dismiss': { ru: 'Понятно', en: 'Got it' },

  // Settings panel — sections
  'settings.title': { ru: 'Настройки', en: 'Settings' },
  'settings.close': { ru: 'Закрыть', en: 'Close' },
  'settings.mic': { ru: 'Микрофон', en: 'Microphone' },
  'settings.mic.default': { ru: 'По умолчанию', en: 'Default' },
  'settings.voice': { ru: 'Голос Yukai', en: 'Yukai voice' },
  'settings.voice.hint': {
    ru: 'ElevenLabs — лучшее произношение английского. Fish — живой русский.',
    en: 'ElevenLabs — best for English. Fish — natural Russian.',
  },
  'settings.sensitivity': { ru: 'Чувствительность мика', en: 'Mic sensitivity' },
  'settings.sensitivity.hint': {
    ru: 'Заливка = вероятность речи от VAD. Тащи оранжевый порог — где он, там и начинается «речь». Применяется сразу.',
    en: 'Fill = VAD speech probability. Drag the orange threshold — that\'s where "speech" starts. Applies instantly.',
  },
  'settings.language': { ru: 'Язык / Language', en: 'Language / Язык' },
  'settings.language.hint': {
    ru: 'Меняет язык, на котором отвечает Yukai. Голос подбирается автоматически.',
    en: 'Changes the language Yukai responds in. Voice auto-adjusts.',
  },
  'settings.connection': { ru: 'Подключение', en: 'Connection' },
  'settings.connection.auto': { ru: 'Авто (рекомендуется)', en: 'Auto (recommended)' },
  'settings.connection.direct': { ru: 'Прямое — yukai.app', en: 'Direct — yukai.app' },
  'settings.connection.ru': { ru: 'РФ-зеркало — ru.yukai.app', en: 'RU mirror — ru.yukai.app' },
  'settings.connection.hint': {
    ru: 'Если приложение не подключается — выбери РФ-зеркало. При смене окно перезагружается.',
    en: 'If the app fails to connect — try the RU mirror. Window reloads on change.',
  },
  'settings.hotkeys': { ru: 'Хоткеи:', en: 'Hotkeys:' },
  'settings.hotkey.handsfree': { ru: 'hands-free вкл/выкл', en: 'hands-free on/off' },
  'settings.hotkey.dictation': { ru: 'диктовка (hold)', en: 'dictation (hold)' },
  'settings.hotkey.shazam': { ru: 'распознать песню', en: 'recognize song' },
  'settings.devchat.title': { ru: 'Чат с разработчиком', en: 'Chat with the developer' },
  'settings.devchat.hint': {
    ru: 'Напиши что сломалось, чего не хватает, что понравилось',
    en: 'Tell me what broke, what\'s missing, what you liked',
  },
  'settings.show-onboarding': {
    ru: 'Показать подсказку для новичков ещё раз',
    en: 'Show beginner tooltip again',
  },

  // Plugins section
  'plugins.section': { ru: 'Плагины', en: 'Plugins' },

  // Radial menu
  'menu.chat': { ru: 'Чат', en: 'Chat' },
  'menu.memory': { ru: 'Память Yukai (открыть папку)', en: 'Yukai memory (open folder)' },
  'menu.settings': { ru: 'Настройки', en: 'Settings' },

  // Plugins — individual
  'plugin.music.name': { ru: 'Распознавание песен', en: 'Music recognition' },
  'plugin.music.desc': {
    ru: 'Shazam-style: зажми Left Alt + ` чтобы Yukai узнала что играет',
    en: 'Shazam-style: hold Left Alt + ` for Yukai to identify what\'s playing',
  },
  'plugin.dictation.name': { ru: 'Диктовка', en: 'Dictation' },
  'plugin.dictation.desc': {
    ru: 'Зажми Right Alt и говори — текст распознается и вставится в активное поле',
    en: 'Hold Right Alt and speak — text is transcribed and pasted into the active field',
  },
  'plugin.english.name': { ru: 'Изучение английского', en: 'English learning' },
  'plugin.english.desc': {
    ru: 'Карточки с угадыванием, SRS-трекер. [img: word] → картинка + Yukai спрашивает.',
    en: 'Flashcards with SRS spaced repetition. [img: word] → image + Yukai asks.',
  },
  'plugin.screenshot.name': { ru: 'Скриншот + зрение', en: 'Screenshot + vision' },
  'plugin.screenshot.desc': {
    ru: 'Захват экрана → Claude описывает что видит. Скажи "что на экране", "выдели область", "из какого это аниме".',
    en: 'Screen capture → Claude describes what it sees. Say "what\'s on screen", "select region", "what anime is this".',
  },
} as const

export type I18nKey = keyof typeof DICT

export function t(language: Language, key: I18nKey): string {
  return DICT[key][language]
}

// Перевод имени/описания плагина по его id. Если в словаре нет — возвращает оригинал.
export function translatePluginName(language: Language, id: string, fallback: string): string {
  const key = `plugin.${id}.name` as I18nKey
  if (key in DICT) return DICT[key][language]
  return fallback
}

export function translatePluginDescription(language: Language, id: string, fallback: string): string {
  const key = `plugin.${id}.desc` as I18nKey
  if (key in DICT) return DICT[key][language]
  return fallback
}
