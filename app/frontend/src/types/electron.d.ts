export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>
  getBackendPort: () => Promise<number>
  openFile: (path: string) => Promise<void>
  showInFolder: (path: string) => Promise<void>
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
