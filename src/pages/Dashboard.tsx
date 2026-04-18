import { Images, FolderDown, HardDrive, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

interface StatCardProps {
  title: string
  value: string
  description: string
  icon: React.ElementType
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

export function Dashboard(): React.ReactElement {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Overview of your file organization status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Duplicate Groups"
          value="--"
          description="Run a photo scan to detect"
          icon={Images}
        />
        <StatCard
          title="Downloads to Clean"
          value="--"
          description="Run a downloads scan to detect"
          icon={FolderDown}
        />
        <StatCard
          title="Space Reclaimable"
          value="--"
          description="Potential storage savings"
          icon={HardDrive}
        />
        <StatCard
          title="Last Scan"
          value="Never"
          description="No scans run yet"
          icon={Clock}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Photo Deduplication</CardTitle>
            <CardDescription>
              Find and remove duplicate photos using perceptual hashing. Scans thousands of images
              and groups near-identical copies together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/photos')}>Open Photo Dedup</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Downloads Cleanup</CardTitle>
            <CardDescription>
              Use AI to classify and organize files in your Downloads folder. Get smart suggestions
              for where to move or delete files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/downloads')}>Open Downloads Cleanup</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
