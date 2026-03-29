import { NavLink } from 'react-router-dom'
import { Building2, LayoutDashboard, Tag, LogOut, X, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/auth'
import { useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/properties', label: 'Properties', icon: Building2, exact: false },
  { to: '/categories', label: 'Categories', icon: Tag, exact: false },
  { to: '/reports', label: 'Reports', icon: FileSpreadsheet, exact: false },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 rounded-lg p-1.5">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none">Rental Manager</p>
            <p className="text-gray-400 text-xs mt-0.5">Property Portfolio</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-700">
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile.username}</p>
              <p className="text-xs text-gray-400 capitalize">{profile.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
