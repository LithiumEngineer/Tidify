import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { ChildProcess, spawn } from 'child_process'

let pythonProcess: ChildProcess | null = null
const BACKEND_PORT = 18457
const isDev = !app.isPackaged

function startPythonBackend(): void {
  if (isDev) return

  const backendPath = join(process.resourcesPath, 'backend/main.py')
  const pythonCmd = join(process.resourcesPath, 'python/bin/python3')

  pythonProcess = spawn(pythonCmd, [backendPath, '--port', String(BACKEND_PORT)], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, TIDIFY_PORT: String(BACKEND_PORT) },
  })

  pythonProcess.stdout?.on('data', (data) => {
    console.log(`[backend] ${data}`)
  })

  pythonProcess.stderr?.on('data', (data) => {
    console.error(`[backend] ${data}`)
  })

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python backend:', err)
  })

  pythonProcess.on('exit', (code) => {
    console.log(`Python backend exited with code ${code}`)
    pythonProcess = null
  })
}

function stopPythonBackend(): void {
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM')
    pythonProcess = null
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId?.('com.tidify')

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('backend:port', () => BACKEND_PORT)

  ipcMain.handle('shell:openFile', async (_event, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle('shell:showInFolder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  startPythonBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopPythonBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopPythonBackend()
})
