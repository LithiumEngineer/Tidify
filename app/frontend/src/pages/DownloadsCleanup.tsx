import { useState, useCallback } from 'react'
import { Play, Trash2, FolderInput, FileCheck, CheckCircle2, XCircle, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { downloadsApi } from '@/api/client'
import { formatBytes, formatDate } from '@/lib/utils'
import type { ActionPlan, ActionPlanItem } from '@/types'

const actionIcons: Record<string, React.ElementType> = {
  delete: Trash2,
  move: FolderInput,
  keep: FileCheck,
}

const actionColors: Record<string, 'destructive' | 'default' | 'secondary'> = {
  delete: 'destructive',
  move: 'default',
  keep: 'secondary',
}

export function DownloadsCleanup(): React.ReactElement {
  const [scanning, setScanning] = useState(false)
  const [plan, setPlan] = useState<ActionPlan | null>(null)
  const [items, setItems] = useState<ActionPlanItem[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [executed, setExecuted] = useState(false)

  const handleScan = useCallback(async () => {
    setScanning(true)
    setPlan(null)
    setItems([])
    setExecuted(false)

    try {
      const { jobId: newJobId } = await downloadsApi.scan()
      setJobId(newJobId)

      const result = await downloadsApi.getPlan(newJobId)
      setPlan(result)
      setItems(result.items.map((item) => ({ ...item, approved: item.action !== 'keep' })))
    } catch (err) {
      console.error('Scan failed:', err)
    } finally {
      setScanning(false)
    }
  }, [])

  const toggleApproval = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, approved: !item.approved } : item))
    )
  }, [])

  const approveAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, approved: item.action !== 'keep' })))
  }, [])

  const rejectAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, approved: false })))
  }, [])

  const handleExecute = useCallback(async () => {
    if (!jobId) return
    const approvedIds = items.filter((i) => i.approved).map((i) => i.id)
    if (approvedIds.length === 0) return

    try {
      const result = await downloadsApi.execute(jobId, approvedIds)
      alert(`Executed ${result.executedCount} actions (freed ${formatBytes(result.freedBytes)})`)
      setExecuted(true)
    } catch (err) {
      console.error('Execute failed:', err)
    }
  }, [jobId, items])

  const handleUndo = useCallback(async () => {
    if (!jobId) return
    try {
      const result = await downloadsApi.undo(jobId)
      alert(`Undid ${result.undoneCount} actions`)
      setExecuted(false)
    } catch (err) {
      console.error('Undo failed:', err)
    }
  }, [jobId])

  const filteredItems = filter ? items.filter((i) => i.action === filter) : items
  const approvedCount = items.filter((i) => i.approved).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Downloads Cleanup</h2>
        <p className="text-muted-foreground mt-1">
          AI-powered classification and cleanup of your Downloads folder.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan Downloads</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button onClick={handleScan} disabled={scanning}>
            <Play className="h-4 w-4 mr-2" />
            {scanning ? 'Scanning & Classifying...' : 'Scan ~/Downloads'}
          </Button>
          {plan && (
            <p className="text-sm text-muted-foreground">
              {plan.totalFiles} files analyzed &middot; {formatBytes(plan.reclaimableBytes)}{' '}
              reclaimable
            </p>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium mr-2">Filter:</span>
            {['all', 'delete', 'move', 'keep'].map((f) => (
              <Button
                key={f}
                variant={(f === 'all' && !filter) || filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f === 'all' ? null : f)}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && plan && (
                  <span className="ml-1 opacity-70">
                    (
                    {f === 'delete'
                      ? plan.deleteCount
                      : f === 'move'
                        ? plan.moveCount
                        : plan.keepCount}
                    )
                  </span>
                )}
              </Button>
            ))}

            <div className="flex-1" />

            <Button variant="outline" size="sm" onClick={approveAll}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Approve All
            </Button>
            <Button variant="outline" size="sm" onClick={rejectAll}>
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject All
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">File</th>
                  <th className="text-left p-3 font-medium w-20">Size</th>
                  <th className="text-left p-3 font-medium w-24">Modified</th>
                  <th className="text-left p-3 font-medium w-20">Action</th>
                  <th className="text-left p-3 font-medium">Destination / Reason</th>
                  <th className="text-center p-3 font-medium w-24">Approved</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const Icon = actionIcons[item.action] || FileCheck
                  return (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[250px]">{item.file.filename}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{formatBytes(item.file.size)}</td>
                      <td className="p-3 text-muted-foreground">
                        {formatDate(item.file.modifiedAt)}
                      </td>
                      <td className="p-3">
                        <Badge variant={actionColors[item.action]}>{item.action}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {item.destination && <span className="font-mono">{item.destination}</span>}
                        {item.destination && ' — '}
                        {item.reason}
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => toggleApproval(item.id)} className="mx-auto block">
                          {item.approved ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {approvedCount} of {items.length} actions approved
            </p>
            <div className="flex gap-2">
              {executed && (
                <Button variant="outline" onClick={handleUndo}>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Undo Last Batch
                </Button>
              )}
              <Button onClick={handleExecute} disabled={approvedCount === 0 || executed}>
                Execute {approvedCount} Actions
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
