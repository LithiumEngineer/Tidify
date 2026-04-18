let baseUrl = 'http://localhost:18457'

export async function initApiClient(): Promise<void> {
  if (window.api?.getBackendPort) {
    const port = await window.api.getBackendPort()
    baseUrl = `http://localhost:${port}`
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }
  return res.json()
}

export function createWebSocket(path: string): WebSocket {
  const wsUrl = baseUrl.replace(/^http/, 'ws')
  return new WebSocket(`${wsUrl}${path}`)
}

// Photo dedup API

export const photosApi = {
  scan: (directory: string, sensitivity = 50) =>
    request<{ jobId: string }>('/photos/scan', {
      method: 'POST',
      body: JSON.stringify({ directory, sensitivity })
    }),

  progress: (jobId: string) =>
    request<import('../types').ScanProgress>(`/photos/progress?jobId=${jobId}`),

  getGroups: (jobId: string) =>
    request<{
      groups: import('../types').PhotoGroup[]
      totalDuplicates: number
      reclaimableBytes: number
    }>(`/photos/groups?jobId=${jobId}`),

  cleanup: (jobId: string, pathsToDelete: string[]) =>
    request<{ deletedCount: number; freedBytes: number }>('/photos/cleanup', {
      method: 'POST',
      body: JSON.stringify({ jobId, pathsToDelete })
    })
}

// Downloads cleanup API

export const downloadsApi = {
  scan: (directory?: string) =>
    request<{ jobId: string }>('/downloads/scan', {
      method: 'POST',
      body: JSON.stringify({ directory })
    }),

  getPlan: (jobId: string) =>
    request<import('../types').ActionPlan>(`/downloads/plan?jobId=${jobId}`),

  execute: (jobId: string, approvedIds: string[]) =>
    request<{ executedCount: number; freedBytes: number }>('/downloads/execute', {
      method: 'POST',
      body: JSON.stringify({ jobId, approvedIds })
    }),

  undo: (jobId: string) =>
    request<{ undoneCount: number }>('/downloads/undo', {
      method: 'POST',
      body: JSON.stringify({ jobId })
    })
}

// Health check

export const healthApi = {
  check: () => request<{ status: string; version: string }>('/health')
}
