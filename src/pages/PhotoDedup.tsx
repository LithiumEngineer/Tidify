import { useState, useCallback, useRef } from 'react'
import { FolderOpen, Play, Trash2, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { photosApi } from '@/api/client'
import { cn, formatBytes } from '@/lib/utils'
import type { PhotoGroup, ScanProgress } from '@/types'

export function PhotoDedup(): React.ReactElement {
  const [directory, setDirectory] = useState<string | null>(null)
  const [sensitivity, setSensitivity] = useState(90)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [groups, setGroups] = useState<PhotoGroup[]>([])
  const [markedForDeletion, setMarkedForDeletion] = useState<Set<string>>(new Set())
  const [jobId, setJobId] = useState<string | null>(null)
  const [scanComplete, setScanComplete] = useState(false)
  const [totalScanned, setTotalScanned] = useState(0)
  const [cleanupResult, setCleanupResult] = useState<{
    count: number
    bytes: number
  } | null>(null)
  const pollingRef = useRef(false)

  const handleSelectDirectory = useCallback(async () => {
    const dir = await window.api.selectDirectory()
    if (dir) setDirectory(dir)
  }, [])

  const handleScan = useCallback(async () => {
    if (!directory) return
    setScanning(true)
    setScanComplete(false)
    setCleanupResult(null)
    setTotalScanned(0)
    setGroups([])
    setMarkedForDeletion(new Set())
    setProgress({ phase: 'scanning', current: 0, total: 0, message: 'Starting scan...' })

    try {
      const { jobId: newJobId } = await photosApi.scan(directory, sensitivity)
      setJobId(newJobId)
      pollingRef.current = true

      const poll = async (): Promise<void> => {
        while (pollingRef.current) {
          try {
            const status = await photosApi.progress(newJobId)
            setProgress(status)

            if (status.phase === 'done') {
              pollingRef.current = false
              await loadGroups(newJobId)
              return
            }
          } catch (err) {
            console.error('Poll error:', err)
          }
          await new Promise((r) => setTimeout(r, 500))
        }
      }

      poll().catch(console.error)
    } catch (err) {
      console.error('Scan failed:', err)
      setScanning(false)
      setProgress(null)
    }
  }, [directory, sensitivity])

  async function loadGroups(id: string): Promise<void> {
    try {
      const progressStatus = await photosApi.progress(id)
      setTotalScanned(progressStatus.total)

      const result = await photosApi.getGroups(id)
      setGroups(result.groups)

      const toDelete = new Set<string>()
      for (const group of result.groups) {
        group.photos.forEach((photo, idx) => {
          if (idx !== group.bestIndex) {
            toDelete.add(photo.path)
          }
        })
      }
      setMarkedForDeletion(toDelete)
    } finally {
      setScanning(false)
      setScanComplete(true)
      setProgress(null)
    }
  }

  const togglePhoto = useCallback((path: string) => {
    setMarkedForDeletion((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleCleanup = useCallback(async () => {
    if (!jobId || markedForDeletion.size === 0) return
    try {
      const result = await photosApi.cleanup(jobId, Array.from(markedForDeletion))
      setCleanupResult({ count: result.deletedCount, bytes: result.freedBytes })
      setScanComplete(false)
      setGroups([])
      setMarkedForDeletion(new Set())
    } catch (err) {
      console.error('Cleanup failed:', err)
    }
  }, [jobId, markedForDeletion])

  const progressPercent =
    progress && progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  const totalMarked = markedForDeletion.size
  const totalMarkedBytes = groups.reduce((acc, group) => {
    return (
      acc +
      group.photos
        .filter((p) => markedForDeletion.has(p.path))
        .reduce((sum, p) => sum + p.fileSize, 0)
    )
  }, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Photo Deduplication</h2>
        <p className="text-muted-foreground mt-1">
          Scan a directory for duplicate photos and choose which ones to delete.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleSelectDirectory} disabled={scanning}>
              <FolderOpen className="h-4 w-4 mr-2" />
              {directory ? 'Change' : 'Browse'}
            </Button>
            {directory && (
              <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {directory}
              </code>
            )}
            <div className="flex-1" />
            <Button onClick={handleScan} disabled={!directory || scanning}>
              <Play className="h-4 w-4 mr-2" />
              {scanning ? 'Scanning...' : 'Start Scan'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground shrink-0">Sensitivity</label>
            <span className="text-[10px] text-muted-foreground/60">Loose</span>
            <input
              type="range"
              min={0}
              max={100}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              disabled={scanning}
              className="w-32 h-1.5 accent-primary"
            />
            <span className="text-[10px] text-muted-foreground/60">Strict</span>
            <span className="text-xs text-muted-foreground w-6 text-right tabular-nums tracking-tight">
              {sensitivity}
            </span>
          </div>
        </CardContent>
      </Card>

      {progress && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="capitalize font-medium">{progress.phase}</span>
              <span className="text-muted-foreground">{progress.message}</span>
            </div>
            <Progress value={progressPercent} />
            <p className="text-xs text-muted-foreground text-right">
              {progress.current} / {progress.total}
            </p>
          </CardContent>
        </Card>
      )}

      {cleanupResult && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Trash2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold">
              {cleanupResult.count} photo{cleanupResult.count !== 1 && 's'} removed
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Freed {formatBytes(cleanupResult.bytes)} of space. Files moved to Trash.
            </p>
          </CardContent>
        </Card>
      )}

      {scanComplete && groups.length === 0 && !cleanupResult && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Check className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No duplicates found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Scanned {totalScanned} images — all photos are unique.
            </p>
          </CardContent>
        </Card>
      )}

      {groups.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found <strong>{groups.length}</strong> duplicate group{groups.length !== 1 && 's'} &middot;{' '}
              <strong>{totalMarked}</strong> selected for deletion ({formatBytes(totalMarkedBytes)})
            </p>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={totalMarked === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {totalMarked} Photo{totalMarked !== 1 && 's'}
            </Button>
          </div>

          <div className="space-y-6">
            {groups.map((group, groupIdx) => {
              const bestPhoto = group.photos[group.bestIndex]
              return (
                <Card key={group.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Group {groupIdx + 1} &middot; {group.photos.length} photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {group.photos.map((photo, idx) => {
                        const isMarked = markedForDeletion.has(photo.path)
                        const isBest = idx === group.bestIndex
                        return (
                          <div key={photo.path} className="relative group/photo">
                            <button
                              onClick={() => togglePhoto(photo.path)}
                              className={cn(
                                'relative rounded-lg overflow-hidden border-2 transition-all text-left w-full',
                                isMarked
                                  ? 'border-destructive opacity-60'
                                  : 'border-primary'
                              )}
                            >
                              <img
                                src={photo.thumbnailUrl}
                                alt={photo.filename}
                                className="w-full aspect-square object-cover"
                                loading="lazy"
                              />

                              {isMarked && (
                                <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                                  <Trash2 className="h-6 w-6 text-destructive" />
                                </div>
                              )}

                              {!isMarked && (
                                <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}

                              {isBest && (
                                <Badge className="absolute top-1.5 left-1.5 text-[10px] bg-green-600 hover:bg-green-600">
                                  Best
                                </Badge>
                              )}

                              <div className="absolute bottom-0 inset-x-0 bg-black/70 px-2 py-1">
                                <p className="text-[11px] text-white truncate">
                                  {photo.filename}
                                </p>
                                <p className="text-[10px] text-white/60">
                                  {photo.width}&times;{photo.height} &middot;{' '}
                                  {formatBytes(photo.fileSize)}
                                </p>
                              </div>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                window.api.openFile(photo.path)
                              }}
                              className="absolute top-1.5 right-8 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
                              title="Open image"
                            >
                              <ExternalLink className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
