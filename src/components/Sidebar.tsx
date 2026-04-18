import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Images, FolderDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/photos', label: 'Photo Dedup', icon: Images },
  { to: '/downloads', label: 'Downloads', icon: FolderDown }
]

export function Sidebar(): React.ReactElement {
  return (
    <aside className="w-56 flex flex-col border-r bg-card">
      <div className="drag-region h-12 flex items-center pl-[78px] pr-5 border-b">
        <h1 className="no-drag text-base font-bold tracking-tight">Tidify</h1>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
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
        ))}
      </nav>

      <div className="p-3 border-t">
        <p className="text-xs text-muted-foreground text-center">v0.1.0</p>
      </div>
    </aside>
  )
}
