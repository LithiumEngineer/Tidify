// Photo deduplication types

export interface PhotoGroup {
  id: string
  photos: PhotoInfo[]
  bestIndex: number
}

export interface PhotoInfo {
  path: string
  filename: string
  width: number
  height: number
  fileSize: number
  format: string
  sharpness: number
  hash: string
  thumbnailUrl: string
}

export interface ScanProgress {
  phase: 'scanning' | 'hashing' | 'indexing' | 'grouping' | 'ranking' | 'done'
  current: number
  total: number
  message: string
}

export interface ScanResult {
  jobId: string
  totalFiles: number
  totalGroups: number
  duplicateCount: number
  reclaimableBytes: number
}

// Downloads cleanup types

export type FileAction = 'delete' | 'move' | 'keep'

export interface FileEntry {
  path: string
  filename: string
  extension: string
  size: number
  createdAt: string
  modifiedAt: string
  mimeType: string
}

export interface ActionPlanItem {
  id: string
  file: FileEntry
  action: FileAction
  destination?: string
  reason: string
  approved: boolean
}

export interface ActionPlan {
  items: ActionPlanItem[]
  totalFiles: number
  deleteCount: number
  moveCount: number
  keepCount: number
  reclaimableBytes: number
}

// Action log for undo

export interface ActionLogEntry {
  id: string
  timestamp: string
  action: FileAction
  sourcePath: string
  destinationPath?: string
  fileSize: number
}
