import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { PhotoDedup } from './pages/PhotoDedup'
import { DownloadsCleanup } from './pages/DownloadsCleanup'
import { ScanStatsProvider } from './context/ScanStatsContext'
import { initApiClient, healthApi } from './api/client'

export default function App(): React.ReactElement {
  const [backendReady, setBackendReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function waitForBackend(): Promise<void> {
      await initApiClient()

      for (let i = 0; i < 60; i++) {
        try {
          await healthApi.check()
          if (!cancelled) setBackendReady(true)
          return
        } catch {
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
    }

    waitForBackend()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="drag-region h-12 border-b" />
        <div className="p-6">
          {!backendReady ? (
            <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                <p className="text-sm text-muted-foreground">Starting backend...</p>
              </div>
            </div>
          ) : (
            <ScanStatsProvider>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/photos" element={<PhotoDedup />} />
                <Route path="/downloads" element={<DownloadsCleanup />} />
              </Routes>
            </ScanStatsProvider>
          )}
        </div>
      </main>
    </div>
  )
}
