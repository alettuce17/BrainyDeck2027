import { BookOpen, Plus, Settings, LogIn, LogOut, Home } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const navClass = ({ isActive }: { isActive: boolean }) => isActive ? 'active' : ''

export default function Layout() {
  const { user, signOut, configured } = useAuth()
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="./branding/app-icon.png" alt="Brainy Deck" />
          <div><strong>Brainy Deck</strong><small>Source-grounded study</small></div>
        </div>
        <nav>
          <NavLink className={navClass} to="/"><Home size={18}/>Dashboard</NavLink>
          <NavLink className={navClass} to="/create"><Plus size={18}/>Create Deck</NavLink>
          <NavLink className={navClass} to="/study"><BookOpen size={18}/>Study</NavLink>
          <NavLink className={navClass} to="/settings"><Settings size={18}/>Settings</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div><span className={`status-dot ${configured ? 'ok' : ''}`}></span> <small>{configured ? 'Supabase configured' : 'Local mode'}</small></div>
          {user ? (
            <button className="ghost" onClick={() => void signOut()}><LogOut size={16}/>Sign out</button>
          ) : (
            <NavLink className="ghost" to="/auth"><LogIn size={16}/>Sign in</NavLink>
          )}
        </div>
      </aside>
      <main className="main"><Outlet /></main>
      <div className="mobile-nav">
        <NavLink className={navClass} to="/"><Home size={19}/><span>Home</span></NavLink>
        <NavLink className={navClass} to="/create"><Plus size={19}/><span>Create</span></NavLink>
        <NavLink className={navClass} to="/study"><BookOpen size={19}/><span>Study</span></NavLink>
        <NavLink className={navClass} to="/settings"><Settings size={19}/><span>Settings</span></NavLink>
      </div>
    </div>
  )
}
