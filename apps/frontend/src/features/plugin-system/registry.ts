import type { KikaPlugin } from './types'
import { musicPlugin } from '@/features/music-recognition/MusicPlugin'
import { dictationPlugin } from '@/features/dictation/DictationPlugin'
import { englishPlugin } from '@/features/english/EnglishPlugin'
import { screenshotPlugin } from '@/features/screenshot/ScreenshotPlugin'

// Встроенные плагины. В будущем добавим 3rd-party через loader.
export const BUILTIN_PLUGINS: KikaPlugin[] = [
  musicPlugin,
  dictationPlugin,
  englishPlugin,
  screenshotPlugin,
]
