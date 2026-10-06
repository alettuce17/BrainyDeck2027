import { BookOpen, Plus, Settings, LogIn, LogOut, Home, Cloud, HardDrive } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navClass = ({ isActive }: { isActive: boolean }) => isActive ? 'active' : ''

export default function Layout() {
  const { user, signOut, configured } = useAuth()
  const displayName = (user?.user_metadata?.display_name as string | undefined)?.trim()
    || user?.email?.split('@')[0]
    || 'Student'
  const initial = displayName.slice(0, 1).toUpperCase()

  return (
    <div className="app-shell ios-shell">
      <aside className="sidebar ios-sidebar">
        <NavLink className="brand ios-brand" to="/" aria-label="Brainy Deck home">
          <span className="brand-logo-shell">
            <img className="brand-logo" src="./branding/app-icon.png" alt="" />
          </span>
          <div><strong>Brainy Deck</strong><small>Study smarter</small></div>
        </NavLink>

        <nav className="ios-nav" aria-label="Main navigation">
          <NavLink className={navClass} to="/"><Home size={19}/>Home</NavLink>
          <NavLink className={navClass} to="/create"><Plus size={19}/>New Deck</NavLink>
          <NavLink className={navClass} to="/study"><BookOpen size={19}/>Study</NavLink>
          <NavLink className={navClass} to="/settings"><Settings size={19}/>Settings</NavLink>
        </nav>

        <div className="sidebar-bottom ios-sidebar-bottom">
          <div className="ios-account-chip">
            <span className="ios-avatar">{initial}</span>
            <span className="ios-account-copy">
              <strong>{displayName}</strong>
              <small>{user?.email || 'Local profile'}</small>
            </span>
          </div>

          <div className="ios-connection-chip">
            {configured ? <Cloud size={15}/> : <HardDrive size={15}/>} 
            <span>{configured ? 'Cloud ready' : 'Local mode'}</span>
            <span className={`status-dot ${configured ? 'ok' : ''}`}/>
          </div>

          {user ? (
            <button className="ghost ios-ghost" onClick={() => void signOut()}><LogOut size={17}/>Sign out</button>
          ) : (
            <NavLink className="ghost ios-ghost" to="/auth"><LogIn size={17}/>Sign in</NavLink>
          )}
        </div>
      </aside>

      <main className="main ios-main">
        <Outlet />
      </main>

      <div className="mobile-nav ios-mobile-nav">
        <NavLink className={navClass} to="/"><Home size={20}/><span>Home</span></NavLink>
        <NavLink className={navClass} to="/create"><Plus size={20}/><span>Create</span></NavLink>
        <NavLink className={navClass} to="/study"><BookOpen size={20}/><span>Study</span></NavLink>
        <NavLink className={navClass} to="/settings"><Settings size={20}/><span>Settings</span></NavLink>
      </div>
    </div>
  )
}
