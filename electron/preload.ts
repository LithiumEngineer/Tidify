import { contextBridge, ipcRenderer } from 'electron'

const api = {
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),
  getBackendPort: (): Promise<number> => ipcRenderer.invoke('backend:port'),
  openFile: (path: string): Promise<void> => ipcRenderer.invoke('shell:openFile', path),
  showInFolder: (path: string): Promise<void> => ipcRenderer.invoke('shell:showInFolder', path)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback for non-isolated context
  window.api = api
}
