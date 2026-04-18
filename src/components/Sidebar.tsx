import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Images, FolderDown, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, disabled: false },
  { to: '/photos', label: 'Photo Dedup', icon: Images, disabled: false },
  { to: '/downloads', label: 'Downloads (WIP)', icon: FolderDown, disabled: true }
]

export function Sidebar(): React.ReactElement {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <aside className="w-56 flex flex-col border-r bg-card">
      <div className="drag-region h-12 flex items-center pl-[78px] pr-5 border-b">
        <h1 className="no-drag text-base font-bold tracking-tight">Tidify</h1>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, disabled }) =>
          disabled ? (
            <span
              key={to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
            >
              <Icon className="h-4 w-4" />
              {label}
            </span>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )
              }
              end={to === '/'}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          )
        )}
      </nav>

      <div className="p-3 border-t space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-xs text-muted-foreground">Created by Kevin Kang</p>
          <button
            onClick={() => setShowInfo(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-xl shadow-lg w-[420px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">About Tidify</h2>
              <button onClick={() => setShowInfo(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <h3 className="font-medium mb-1">v0.1.0 — Initial Release</h3>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Photo deduplication using CNN embeddings</li>
                  <li>Adjustable sensitivity slider</li>
                  <li>Quality-based ranking (resolution, sharpness, EXIF)</li>
                  <li>Content-aware autocrop for border detection</li>
                  <li>HEIC/HEIF support</li>
                </ul>
              </div>
              <div className="pt-2 border-t">
                <h3 className="font-medium mb-1">Disclaimer</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  This project is a work in progress. While all deletions go to Trash by
                  default, use at your own risk. The author is not responsible for any
                  data or file loss.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
