import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'dedupify.lastScan.v1'

export interface ScanStats {
  lastScanTime: Date | null
}

interface ScanStatsContextValue {
  stats: ScanStats
  recordScan: () => void
}

const defaultStats: ScanStats = { lastScanTime: null }

function loadPersisted(): ScanStats {
  if (typeof window === 'undefined') return defaultStats
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStats
    const p = JSON.parse(raw) as { lastScanTime: string | null }
    return {
      lastScanTime: p.lastScanTime ? new Date(p.lastScanTime) : null,
    }
  } catch {
    return defaultStats
  }
}

const ScanStatsContext = createContext<ScanStatsContextValue | null>(null)

export function ScanStatsProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [stats, setStats] = useState<ScanStats>(loadPersisted)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lastScanTime: stats.lastScanTime?.toISOString() ?? null,
        })
      )
    } catch {
      // ignore quota / private mode
    }
  }, [stats])

  const recordScan = useCallback(() => {
    setStats({ lastScanTime: new Date() })
  }, [])

  return (
    <ScanStatsContext.Provider value={{ stats, recordScan }}>
      {children}
    </ScanStatsContext.Provider>
  )
}

export function useScanStats(): ScanStatsContextValue {
  const ctx = useContext(ScanStatsContext)
  if (!ctx) throw new Error('useScanStats must be used within ScanStatsProvider')
  return ctx
}
