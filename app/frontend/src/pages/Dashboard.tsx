import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useScanStats } from '@/context/ScanStatsContext'

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Dashboard(): React.ReactElement {
  const navigate = useNavigate()
  const { stats } = useScanStats()

  const lastScanValue = stats.lastScanTime ? formatTimeAgo(stats.lastScanTime) : 'Never'
  const lastScanDesc = stats.lastScanTime
    ? stats.lastScanTime.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Run a scan from Photo Dedup'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your file organization status.</p>
      </div>

      <Card className="max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Last scan</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{lastScanValue}</div>
          <p className="text-xs text-muted-foreground mt-1">{lastScanDesc}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Photo Deduplication</CardTitle>
            <CardDescription>
              Find and remove duplicate photos using CNN embeddings. Scans thousands of images and
              groups near-identical copies together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/photos')}>Open Photo Dedup</Button>
          </CardContent>
        </Card>

        <Card className="opacity-50">
          <CardHeader>
            <CardTitle>Downloads Cleanup (WIP)</CardTitle>
            <CardDescription>
              Use AI to classify and organize files in your Downloads folder. Get smart suggestions
              for where to move or delete files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>Coming Soon</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
