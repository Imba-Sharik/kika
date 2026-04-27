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
  'onboarding.mic.hint': {
    ru: 'Полоски не двигаются?',
    en: "Bars not moving?",
  },
  'onboarding.mic.cta': {
    ru: 'Открыть настройки микрофона',
    en: 'Open mic settings',
  },

  // Settings — аккаунт
  'settings.account': { ru: 'Аккаунт', en: 'Account' },
  'settings.account.signedIn': { ru: 'Вошёл как', en: 'Signed in as' },
  'settings.account.notSignedIn': {
    ru: 'Не авторизован — Юкай не сможет отвечать',
    en: 'Not signed in — Yukai can\'t respond',
  },
  'settings.account.signin': { ru: 'Войти', en: 'Sign in' },
  'settings.account.signout': { ru: 'Выйти', en: 'Sign out' },

  // Quota widget
  'quota.today': { ru: 'Сегодня:', en: 'Today:' },
  'quota.tier.trial': { ru: 'Trial', en: 'Trial' },
  'quota.tier.free': { ru: 'Free', en: 'Free' },
  'quota.tier.paid': { ru: 'Paid', en: 'Paid' },
  'quota.trialLeft': {
    ru: 'Бесплатный период: {days} дн.',
    en: 'Free trial: {days} days left',
  },
  'quota.trialExpired': {
    ru: 'Trial закончился — оплата скоро будет',
    en: 'Trial expired — payment coming soon',
  },

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
  'settings.language': { ru: 'Язык', en: 'Language' },
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

  // Common buttons / states
  'common.close': { ru: 'Закрыть', en: 'Close' },
  'common.empty': { ru: 'Пока пусто.', en: 'Nothing here yet.' },

  // English plugin panel
  'english.stats': {
    ru: 'всего · {known} знаю · {learning} учу · {newish} новых',
    en: 'total · {known} known · {learning} learning · {newish} new',
  },
  'english.tab.all': { ru: 'Все', en: 'All' },
  'english.tab.new': { ru: 'Новое', en: 'New' },
  'english.tab.learning': { ru: 'Учу', en: 'Learning' },
  'english.tab.known': { ru: 'Знаю', en: 'Known' },
  'english.empty.hint': {
    ru: 'Скажи Yukai: «давай поучим английский» или «попрактикуемся» — изученные слова появятся здесь',
    en: 'Say to Yukai: "let\'s study English" or "let\'s practice" — learned words will appear here',
  },
  'english.bottom.hint': {
    ru: 'Скажи «попрактикуемся» — Yukai покажет новые слова в режиме угадай',
    en: 'Say "let\'s practice" — Yukai will show new words in guess mode',
  },

  // Plugin radial titles (set inside plugin manifests, used by registry → render via translate helpers)
  'plugin.music.title': { ru: 'История песен', en: 'Song history' },
  'plugin.dictation.title': { ru: 'История диктовки', en: 'Dictation history' },
  'plugin.english.title': { ru: 'История английского', en: 'English history' },
  'plugin.screenshot.title': { ru: 'Скриншоты + зрение', en: 'Screenshots + vision' },

  // Music plugin panel
  'music.history': { ru: 'История', en: 'History' },
  'music.empty': {
    ru: 'Зажми Alt+` чтобы распознать играющую песню',
    en: 'Hold Alt+` to identify the playing song',
  },

  // Dictation plugin panel
  'dictation.title': { ru: 'Диктовка', en: 'Dictation' },
  'dictation.empty': {
    ru: 'Зажми Right Alt и говори — текст вставится и запишется сюда',
    en: 'Hold Right Alt and speak — text gets pasted and saved here',
  },
  'dictation.repaste-tooltip': { ru: 'Клик — вставить снова', en: 'Click to paste again' },

  // Screenshot plugin panel
  'screenshot.title': { ru: 'Скриншоты', en: 'Screenshots' },
  'screenshot.region': { ru: '▭ область', en: '▭ region' },
  'screenshot.full': { ru: '+ экран', en: '+ full' },
  'screenshot.region-tooltip': { ru: 'Выделить область мышкой', en: 'Select region with mouse' },
  'screenshot.full-tooltip': { ru: 'Скрин всего экрана', en: 'Capture full screen' },
  'screenshot.anime-tooltip': {
    ru: 'Точный поиск по кадрам аниме (эпизод + таймкод)',
    en: 'Precise anime frame search (episode + timestamp)',
  },
  'screenshot.empty.hint': {
    ru: 'Нажми «+ экран» или скажи «что на экране?» / «выдели область и скажи откуда это»',
    en: 'Click "+ full" or say "what\'s on screen?" / "select region and tell me what it is"',
  },

  // Radial menu
  'menu.chat': { ru: 'Чат', en: 'Chat' },
  'menu.memory': { ru: 'Память Yukai (открыть папку)', en: 'Yukai memory (open folder)' },
  'menu.settings': { ru: 'Настройки', en: 'Settings' },

  // Overlay buttons
  'overlay.close-chat': { ru: 'Закрыть чат', en: 'Close chat' },
  'overlay.settings-btn': { ru: '⚙ Настройки', en: '⚙ Settings' },
  'overlay.settings-title': { ru: 'Настройки', en: 'Settings' },
  'overlay.send': { ru: 'Отправить', en: 'Send' },
  'overlay.placeholder': { ru: 'Сообщение...', en: 'Message...' },

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

  // Header / nav
  'nav.pricing': { ru: 'Цена', en: 'Pricing' },
  'nav.faq': { ru: 'FAQ', en: 'FAQ' },
  'nav.devchat': { ru: 'Чат', en: 'Chat' },
  'nav.privacy': { ru: 'Приватность', en: 'Privacy' },
  'nav.terms': { ru: 'Условия', en: 'Terms' },
  // unused: 'nav.signup' — оставлено в словаре, на лендинге регистрация скрыта
  // (юзер регится в app после скачивания)
  'nav.download': { ru: 'Скачать', en: 'Download' },
  'nav.signin': { ru: 'Войти', en: 'Sign in' },
  'nav.signup': { ru: 'Регистрация', en: 'Sign up' },
  'nav.openApp': { ru: 'Открыть Yukai', en: 'Open Yukai' },
  'nav.analytics': { ru: '📊 Аналитика', en: '📊 Analytics' },
  'nav.signout': { ru: 'Выйти', en: 'Sign out' },

  // Login page
  'login.title': { ru: 'С возвращением', en: 'Welcome back' },
  'login.subtitle': {
    ru: 'Войди, чтобы продолжить разговор с Yukai',
    en: 'Sign in to continue chatting with Yukai',
  },
  'login.email': { ru: 'Email', en: 'Email' },
  'login.password': { ru: 'Пароль', en: 'Password' },
  'login.forgot': { ru: 'Забыл пароль?', en: 'Forgot password?' },
  'login.submit': { ru: 'Войти', en: 'Sign in' },
  'login.submitting': { ru: 'Входим...', en: 'Signing in...' },
  'login.noAccount': { ru: 'Нет аккаунта?', en: 'No account?' },
  'login.noAccount.cta': { ru: 'Зарегистрироваться', en: 'Sign up' },
  'login.error.invalid': {
    ru: 'Неверный email или пароль',
    en: 'Invalid email or password',
  },

  // Register page
  'register.title': { ru: 'Давай знакомиться', en: "Let's meet" },
  'register.subtitle': {
    ru: 'Создай аккаунт за минуту и начни общаться с Yukai',
    en: 'Create an account in a minute and start chatting with Yukai',
  },
  'register.username': { ru: 'Имя пользователя', en: 'Username' },
  'register.email': { ru: 'Email', en: 'Email' },
  'register.password': { ru: 'Пароль', en: 'Password' },
  'register.password.hint': {
    ru: 'Минимум 8 символов',
    en: 'At least 8 characters',
  },
  'register.confirmPassword': {
    ru: 'Подтвердить пароль',
    en: 'Confirm password',
  },
  'register.submit': { ru: 'Зарегистрироваться', en: 'Sign up' },
  'register.submitting': { ru: 'Создаём...', en: 'Creating...' },
  'register.haveAccount': { ru: 'Уже есть аккаунт?', en: 'Already have an account?' },
  'register.haveAccount.cta': { ru: 'Войти', en: 'Sign in' },
  'register.error.passwordMismatch': {
    ru: 'Пароли не совпадают',
    en: 'Passwords do not match',
  },
  'register.error.failed': {
    ru: 'Не удалось создать аккаунт',
    en: 'Failed to create account',
  },
  'register.error.loginAfter': {
    ru: 'Аккаунт создан, но войти не получилось — попробуй на странице входа',
    en: 'Account created but auto-login failed — try the sign in page',
  },
} as const

export type I18nKey = keyof typeof DICT

export function t(language: Language, key: I18nKey): string {
  return DICT[key][language]
}

// Перевод имени/описания/радиал-тайтла плагина по его id. Если ключа нет — оригинал.
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

export function translatePluginTitle(language: Language, id: string, fallback: string): string {
  const key = `plugin.${id}.title` as I18nKey
  if (key in DICT) return DICT[key][language]
  return fallback
}
