const { app, BrowserWindow, clipboard, desktopCapturer, globalShortcut, ipcMain, Menu, screen, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

// Папка с памятью Yukai. Ребренд с Kika → Yukai: если у юзера осталась
// старая папка kika-memory — переименовываем в yukai-memory, сохраняя профиль.
const MEMORY_DIR = path.join(app.getPath('home'), 'yukai-memory')
const LEGACY_MEMORY_DIR = path.join(app.getPath('home'), 'kika-memory')

function ensureMemoryDir() {
  try {
    // Миграция со старой папки (v0.1.x юзеры)
    if (!fs.existsSync(MEMORY_DIR) && fs.existsSync(LEGACY_MEMORY_DIR)) {
      try {
        fs.renameSync(LEGACY_MEMORY_DIR, MEMORY_DIR)
        console.log('[main] migrated kika-memory → yukai-memory')
      } catch (err) {
        console.error('[main] memory migration failed, creating fresh:', err)
      }
    }
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true })
      fs.writeFileSync(
        path.join(MEMORY_DIR, 'README.md'),
        '# Память Yukai\n\nЗдесь Yukai хранит заметки о тебе, прогресс и важные разговоры.\n\nФайлы обновляются через чат: скажи "запомни X" — Yukai добавит.\n',
        'utf8',
      )
    }
  } catch (err) {
    console.error('[main] ensureMemoryDir failed:', err)
  }
}

// Скрыть dev-warning "Insecure Content-Security-Policy" — в проде его не видно
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// Origin preference — где хостится фронт. 'auto' (HEAD-проверка), 'direct' (yukai.app),
// 'ru' (через Selectel-прокси для пользователей с заблокированным Vercel в РФ).
// Сохраняется между запусками в userData/origin.json.
const ORIGINS = {
  direct: 'https://yukai.app',
  ru: 'https://ru.yukai.app',
}

function originFile() {
  return path.join(app.getPath('userData'), 'origin.json')
}

function readOriginData() {
  try {
    return JSON.parse(fs.readFileSync(originFile(), 'utf8'))
  } catch {
    return {}
  }
}

function getOriginPref() {
  return readOriginData().pref ?? 'auto'
}

function setOriginPref(pref) {
  try {
    fs.writeFileSync(originFile(), JSON.stringify({ ...readOriginData(), pref }))
  } catch (err) {
    console.error('[main] setOriginPref failed:', err)
  }
}

// Какой origin последний раз успешно загрузился — следующий запуск начинаем с него.
// HEAD-проверку убрали: у юзеров с DPI она ложно проходит для yukai.app, но GET режется.
function getLastWorkingOrigin() {
  return readOriginData().lastWorking ?? null
}

function setLastWorkingOrigin(origin) {
  try {
    fs.writeFileSync(originFile(), JSON.stringify({ ...readOriginData(), lastWorking: origin }))
  } catch (err) {
    console.error('[main] setLastWorkingOrigin failed:', err)
  }
}

// В auto-режиме: если есть lastWorking — стартуем с него, иначе с direct.
// При фейле логика try-next автоматически переключит на альтернативный origin.
function pickOriginUrl() {
  const pref = getOriginPref()
  if (pref === 'direct') return ORIGINS.direct
  if (pref === 'ru') return ORIGINS.ru
  return getLastWorkingOrigin() || ORIGINS.direct
}

let uIOhook = null
try {
  uIOhook = require('uiohook-napi').uIOhook
} catch (err) {
  console.error('[main] FAILED to load uiohook-napi:', err.message)
}

// Окно всегда фиксированного размера — избегаем race между Win32 resize и Chromium repaint.
// Чат скрывается через CSS (display:none), персонаж абсолютно-позиционирован — не двигается.
const WINDOW_SIZE = { width: 560, height: 400 }

let mainWindow = null
let loadedFallback = false
const triedOrigins = new Set()
let currentLoadTimer = null

// Single-instance lock — если приложение уже запущено, повторный клик по exe
// не создаёт второе невидимое окно (баг: пустое прозрачное окно блокировало
// взаимодействие с иконками рабочего стола в левом нижнем углу).
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// Грузит конкретный origin с таймаутом 12с. По таймауту — переключается на следующий
// непробованный origin. По did-fail-load это делает обработчик в createWindow.
function tryLoadOrigin(origin) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  triedOrigins.add(origin)
  console.log('[main] loading origin:', origin)
  if (currentLoadTimer) clearTimeout(currentLoadTimer)
  currentLoadTimer = setTimeout(() => {
    currentLoadTimer = null
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (loadedFallback) return
    if (mainWindow.webContents.isLoading()) {
      console.error('[main] load timeout for', origin)
      try { mainWindow.webContents.stop() } catch {}
      tryNextOriginOrFallback()
    }
  }, 12000)
  mainWindow.loadURL(origin + '/overlay').catch((err) => {
    console.error('[main] loadURL rejected for', origin, err.message)
  })
}

// Подбирает первый origin из списка, который ещё не пробовали. Если все пробовали —
// показывает локальный fallback.html.
function tryNextOriginOrFallback() {
  if (loadedFallback) return
  if (!mainWindow || mainWindow.isDestroyed()) return
  const candidates = [ORIGINS.direct, ORIGINS.ru]
  const next = candidates.find((o) => !triedOrigins.has(o))
  if (next) {
    tryLoadOrigin(next)
    return
  }
  if (currentLoadTimer) { clearTimeout(currentLoadTimer); currentLoadTimer = null }
  loadedFallback = true
  mainWindow.loadFile(path.join(__dirname, 'fallback.html')).catch(() => {})
}

function createWindow() {
  // Убираем дефолтное меню: оно держит роль Undo на Ctrl+Z, которая перехватывает
  // наш глобальный хоткей микрофона, когда overlay в фокусе.
  Menu.setApplicationMenu(null)

  const { height: screenH } = screen.getPrimaryDisplay().workAreaSize
  mainWindow = new BrowserWindow({
    width: WINDOW_SIZE.width,
    height: WINDOW_SIZE.height,
    // Персонаж у bottom-left окна → размещаем окно так, чтобы левый нижний угол был внизу-слева экрана
    x: 20,
    y: screenH - WINDOW_SIZE.height - 20,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    hasShadow: false,
    show: false,
    // focusable: false было проблематично — getUserMedia мог не работать
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setAlwaysOnTop(true, 'screen-saver')

  // Пока контент не загрузился, окно прозрачное И не перехватывает клики мыши.
  // Иначе невидимое окно 560x400 блокирует иконки рабочего стола под ним.
  // После did-finish-load фронт сам управляет интерактивностью.
  mainWindow.setIgnoreMouseEvents(true)

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show()
  })

  loadedFallback = false
  triedOrigins.clear()

  mainWindow.webContents.on('did-finish-load', () => {
    if (currentLoadTimer) { clearTimeout(currentLoadTimer); currentLoadTimer = null }
    // Click-through по умолчанию: прозрачные части окна пропускают клики на стол.
    // forward:true сохраняет mouseenter/leave для hit-detection — фронт через IPC
    // переключает ignore=false когда мышь над интерактивным элементом (Yukai face,
    // меню, панели), и обратно true когда уходит.
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true })
    }
    // Запоминаем рабочий origin — следующий запуск начнём с него
    const url = mainWindow?.webContents.getURL() || ''
    if (url.startsWith(ORIGINS.direct)) setLastWorkingOrigin(ORIGINS.direct)
    else if (url.startsWith(ORIGINS.ru)) setLastWorkingOrigin(ORIGINS.ru)
  })

  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDesc, validatedURL) => {
    if (errorCode === -3) return // ABORTED — нормально при быстрой смене URL
    if (loadedFallback) return
    console.error('[main] did-fail-load:', errorCode, errorDesc, validatedURL)
    tryNextOriginOrFallback()
  })

  mainWindow.on('closed', () => {
    if (currentLoadTimer) { clearTimeout(currentLoadTimer); currentLoadTimer = null }
  })

  // Блокируем системное контекст-меню Windows на drag-region (right-click)
  mainWindow.on('system-context-menu', (e) => {
    e.preventDefault()
  })

  // URL фронта: в dev-режиме localhost, в packaged билде — prod-домен.
  // YUKAI_APP_URL env-override используется для staging.
  // Иначе — pickOriginUrl() с user preference (auto / direct / ru) + auto-fallback при фейле.
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000/overlay')
  } else if (process.env.YUKAI_APP_URL) {
    mainWindow.loadURL(process.env.YUKAI_APP_URL + '/overlay')
  } else {
    tryLoadOrigin(pickOriginUrl())
  }

  // DevTools не открываем автоматически. Для отладки — запусти с KIKA_DEVTOOLS=1
  if (process.env.KIKA_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

// Click-through toggle для overlay. Фронт зовёт setMouseIgnore(false) на
// onMouseEnter интерактивных элементов и setMouseIgnore(true) на onMouseLeave —
// прозрачные части окна не блокируют клики на иконки рабочего стола под ним.
ipcMain.on('set-mouse-ignore', (_event, ignore) => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.setIgnoreMouseEvents(!!ignore, { forward: true })
})

// Кнопка "Повторить" из fallback.html — повторяет попытку загрузки фронта,
// сбрасывая список пробованных origin'ов и стартуя цикл заново.
ipcMain.handle('retry-load', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  loadedFallback = false
  triedOrigins.clear()
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000/overlay')
    return
  }
  if (process.env.YUKAI_APP_URL) {
    mainWindow.loadURL(process.env.YUKAI_APP_URL + '/overlay')
    return
  }
  tryLoadOrigin(pickOriginUrl())
})

// Origin-preference IPC — Settings panel читает/пишет, при смене перезагружаем окно
ipcMain.handle('get-origin-pref', () => getOriginPref())
ipcMain.handle('set-origin-pref', (_event, pref) => {
  setOriginPref(pref)
  if (mainWindow && !mainWindow.isDestroyed() && app.isPackaged) {
    loadedFallback = false
    triedOrigins.clear()
    tryLoadOrigin(pickOriginUrl())
  }
  return getOriginPref()
})

// Для Shazam-фичи — отдаём ID источника системного аудио (loopback)
ipcMain.handle('get-desktop-audio-source', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] })
  return sources[0]?.id ?? null
})

// Скрин области — используем нативный Windows Snipping Tool (ms-screenclip:)
// потому что desktopCapturer в Electron/Chromium возвращает чёрную область
// для hardware-accelerated видео (YouTube, HTML5 video).
// Flow: запускаем Snipping Tool → юзер выделяет область → скрин попадает
// в clipboard → читаем clipboard и возвращаем dataURL.
ipcMain.handle('capture-region', async () => {
  // Запоминаем что было в clipboard до — чтобы отличить старое от нового
  const beforeImage = clipboard.readImage()
  const beforeHash = beforeImage.isEmpty() ? null : beforeImage.toPNG().length

  try {
    // Запускаем modern Snipping Tool в режиме выделения области.
    // Окно Yukai НЕ прячем — персонаж остаётся видимым (юзер сможет обойти его при выделении).
    // Закрытие только панели скрина делает фронт через ctx.ui.closePanel().
    await shell.openExternal('ms-screenclip:')
  } catch (err) {
    console.error('[main] failed to launch ms-screenclip:', err)
    return null
  }

  // Ждём пока в clipboard появится новая картинка (макс 60с)
  const TIMEOUT_MS = 60_000
  const POLL_MS = 300
  const start = Date.now()

  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS))
    const img = clipboard.readImage()
    if (img.isEmpty()) continue
    const currentHash = img.toPNG().length
    if (beforeHash === null || currentHash !== beforeHash) {
      return img.toDataURL()
    }
  }
  console.warn('[main] capture-region: timeout waiting for snipping tool')
  return null
})

// Скриншот основного экрана → base64 PNG (для vision-плагина)
// thumbnailSize = размер монитора → получаем "полноразмерный" thumbnail.
ipcMain.handle('capture-screen', async () => {
  // Окно Yukai НЕ прячем — персонаж виден в скрине, чат и панель уже свёрнуты.
  try {
    const { width, height } = screen.getPrimaryDisplay().size
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    })
    const primary = sources[0]
    if (!primary) return null
    return primary.thumbnail.toDataURL()
  } catch (err) {
    console.error('[main] capture-screen failed:', err)
    return null
  }
})

// Открывает папку с памятью Yukai в OS-проводнике
ipcMain.on('open-memory-folder', () => {
  ensureMemoryDir()
  shell.openPath(MEMORY_DIR)
})

// Открыть URL в дефолтном браузере (для плагинов — например "open on trace.moe")
ipcMain.on('open-external', (_event, url) => {
  if (typeof url !== 'string') return
  try { void shell.openExternal(url) } catch (err) { console.error('[main] openExternal:', err) }
})

// Положить картинку в системный clipboard — чтобы юзер мог Ctrl+V вставить в сайт
ipcMain.on('copy-image-to-clipboard', (_event, dataUrl) => {
  if (typeof dataUrl !== 'string') return
  try {
    const { nativeImage } = require('electron')
    const img = nativeImage.createFromDataURL(dataUrl)
    if (!img.isEmpty()) clipboard.writeImage(img)
  } catch (err) {
    console.error('[main] copy-image-to-clipboard:', err)
  }
})

function resolveSafeMemoryPath(relPath) {
  const safe = path.resolve(MEMORY_DIR, relPath)
  // Защита от path traversal (..\..\Windows\system32) — путь должен быть внутри MEMORY_DIR
  if (!safe.startsWith(MEMORY_DIR + path.sep) && safe !== MEMORY_DIR) {
    throw new Error('path escape attempt blocked')
  }
  return safe
}

// Читает файл из yukai-memory
ipcMain.handle('read-memory-file', async (_event, relPath) => {
  ensureMemoryDir()
  try {
    const safe = resolveSafeMemoryPath(relPath)
    if (!fs.existsSync(safe)) return null
    return fs.readFileSync(safe, 'utf8')
  } catch (err) {
    console.error('[main] read-memory-file failed:', err.message)
    return null
  }
})

// Записывает файл в yukai-memory (создаёт вложенные папки)
ipcMain.handle('write-memory-file', async (_event, relPath, content) => {
  ensureMemoryDir()
  try {
    const safe = resolveSafeMemoryPath(relPath)
    fs.mkdirSync(path.dirname(safe), { recursive: true })
    fs.writeFileSync(safe, String(content ?? ''), 'utf8')
    return true
  } catch (err) {
    console.error('[main] write-memory-file failed:', err.message)
    return false
  }
})

// Дописывает текст в конец файла
ipcMain.handle('append-memory-file', async (_event, relPath, text) => {
  ensureMemoryDir()
  try {
    const safe = resolveSafeMemoryPath(relPath)
    fs.mkdirSync(path.dirname(safe), { recursive: true })
    const existing = fs.existsSync(safe) ? fs.readFileSync(safe, 'utf8') : ''
    const sep = existing.length === 0 || existing.endsWith('\n') ? '' : '\n'
    fs.writeFileSync(safe, existing + sep + String(text ?? '') + '\n', 'utf8')
    return true
  } catch (err) {
    console.error('[main] append-memory-file failed:', err.message)
    return false
  }
})

// Возвращает список файлов в директории yukai-memory/<dir>
ipcMain.handle('list-memory-files', async (_event, relDir) => {
  ensureMemoryDir()
  try {
    const safe = resolveSafeMemoryPath(relDir || '')
    if (!fs.existsSync(safe)) return []
    const entries = fs.readdirSync(safe, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
    }))
  } catch (err) {
    console.error('[main] list-memory-files failed:', err.message)
    return []
  }
})

// set-compact больше не ресайзит окно — только сигнал для React (CSS show/hide чата).
// Окно всегда фиксированного размера, персонаж абсолютно позиционирован → zero jump.
ipcMain.on('set-compact', () => { /* noop, логика на фронте */ })

// Ручное перемещение окна по дельте (drag без -webkit-app-region)
ipcMain.on('move-window-by', (_event, dx, dy) => {
  if (!mainWindow) return
  const [x, y] = mainWindow.getPosition()
  mainWindow.setPosition(x + Math.round(dx), y + Math.round(dy))
})

// Скрипт для paste через low-level keybd_event (отпускаем Alt, потом Ctrl+V)
const PASTE_SCRIPT = `
$sig = '[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, int flags, int extra);'
Add-Type -MemberDefinition $sig -Name K -Namespace W
Start-Sleep -Milliseconds 50
[W.K]::keybd_event(0x11,0,2,0)
[W.K]::keybd_event(0x12,0,2,0)
[W.K]::keybd_event(0xC0,0,2,0)
Start-Sleep -Milliseconds 100
[W.K]::keybd_event(0x11,0,0,0)
[W.K]::keybd_event(0x56,0,0,0)
Start-Sleep -Milliseconds 30
[W.K]::keybd_event(0x56,0,2,0)
[W.K]::keybd_event(0x11,0,2,0)
`.trim()

// PowerShell -EncodedCommand принимает base64 UTF-16LE — никакого экранирования
const PASTE_SCRIPT_B64 = Buffer.from(PASTE_SCRIPT, 'utf16le').toString('base64')

ipcMain.on('paste-text', (_event, text) => {
  if (typeof text !== 'string' || !text.trim()) return
  clipboard.writeText(text)
  setTimeout(() => {
    exec(
      `powershell -NoProfile -WindowStyle Hidden -EncodedCommand ${PASTE_SCRIPT_B64}`,
      { windowsHide: true },
      (err, _stdout, stderr) => {
        if (err) console.error('[main] paste exec error:', err.message)
        if (stderr) console.error('[main] paste stderr:', stderr)
      },
    )
  }, 100)
})

// Короткий скрипт — только Ctrl+V, без модификаций clipboard.
// Используется для "paste в активное окно" после открытия trace.moe в браузере.
const CTRL_V_SCRIPT = `
$sig = '[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, int flags, int extra);'
Add-Type -MemberDefinition $sig -Name K -Namespace W
[W.K]::keybd_event(0x11,0,0,0)
[W.K]::keybd_event(0x56,0,0,0)
Start-Sleep -Milliseconds 30
[W.K]::keybd_event(0x56,0,2,0)
[W.K]::keybd_event(0x11,0,2,0)
`.trim()
const CTRL_V_B64 = Buffer.from(CTRL_V_SCRIPT, 'utf16le').toString('base64')

ipcMain.on('simulate-paste', () => {
  exec(
    `powershell -NoProfile -WindowStyle Hidden -EncodedCommand ${CTRL_V_B64}`,
    { windowsHide: true },
    (err) => {
      if (err) console.error('[main] simulate-paste error:', err.message)
    },
  )
})

app.whenReady().then(() => {
  createWindow()

  // DevTools по Ctrl+Shift+I и F12 — работает в packaged-билде для диагностики.
  // F12 как дублёр, т.к. Ctrl+Shift+I на русской раскладке иногда не триггерится.
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools()
  })
  globalShortcut.register('F12', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools()
  })

  // Silent auto-update (как Chrome/VSCode): проверка при старте → тихое скачивание →
  // установка при закрытии приложения юзером. Нотификаций не показываем, чтобы
  // не дёргать Kика-диалог всплывашками. Следующий запуск = новая версия.
  if (app.isPackaged) {
    autoUpdater.autoDownload = true              // качать сразу как нашлось обновление
    autoUpdater.autoInstallOnAppQuit = true      // применять при квите (дефолт, для ясности)

    autoUpdater.on('error', (err) => console.error('[updater] error:', err.message))
    autoUpdater.on('update-available', (info) => console.log('[updater] found:', info.version))
    autoUpdater.on('update-downloaded', (info) => console.log('[updater] downloaded:', info.version))

    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] check failed:', err.message)
    })
  }

  if (!uIOhook) {
    console.error('[main] uIOhook not available — dictation disabled')
    return
  }

  // Right Alt: dictation hold-to-talk
  const RIGHT_ALT = 3640
  let rightAltDown = false

  // Left Alt + ` : music recognition hold-to-listen (нужны оба)
  const LEFT_ALT = 56   // 0x38
  const BACKTICK = 41   // 0x29
  let leftAltDown = false
  let backtickDown = false
  let musicActive = false

  // Ctrl + Z : глобальный toggle микрофона (работает даже если окно не в фокусе)
  const Z = 44          // 0x2C
  let lastMicToggleAt = 0 // защита от авто-повтора + случайных дублей; НЕ флаг состояния

  function updateMusicState() {
    const shouldBeActive = leftAltDown && backtickDown
    if (shouldBeActive && !musicActive) {
      musicActive = true
      if (mainWindow) mainWindow.webContents.send('music-start')
    } else if (!shouldBeActive && musicActive) {
      musicActive = false
      if (mainWindow) mainWindow.webContents.send('music-stop')
    }
  }

  uIOhook.on('keydown', (e) => {
    if (e.keycode === RIGHT_ALT && !rightAltDown) {
      rightAltDown = true
      if (mainWindow) mainWindow.webContents.send('dictation-start')
    }
    if (e.keycode === LEFT_ALT) { leftAltDown = true; updateMusicState() }
    if (e.keycode === BACKTICK) { backtickDown = true; updateMusicState() }
    if (e.keycode === Z && e.ctrlKey) {
      // e.ctrlKey — состояние Ctrl из самого события (uIOhook), не ломается
      // если keyup пропустился. Повторы отсеиваем по таймстемпу.
      const now = Date.now()
      if (now - lastMicToggleAt > 300) {
        lastMicToggleAt = now
        if (mainWindow) mainWindow.webContents.send('mic-toggle')
      }
    }
  })

  uIOhook.on('keyup', (e) => {
    if (e.keycode === RIGHT_ALT && rightAltDown) {
      rightAltDown = false
      if (mainWindow) mainWindow.webContents.send('dictation-stop')
    }
    if (e.keycode === LEFT_ALT) { leftAltDown = false; updateMusicState() }
    if (e.keycode === BACKTICK) { backtickDown = false; updateMusicState() }
  })

  try {
    uIOhook.start()
  } catch (err) {
    console.error('[main] uIOhook failed to start:', err.message)
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('will-quit', () => {
  try { uIOhook.stop() } catch {}
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
