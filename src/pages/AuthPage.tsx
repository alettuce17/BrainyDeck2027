import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const { signIn, signUp, resetPassword, configured } = useAuth()
  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMessage('')
    if (!configured) { setMessage('Supabase is not configured yet. Add your project URL and public key first.'); return }
    if (mode === 'signup' && password !== confirmPassword) { setMessage('Passwords do not match.'); return }
    setBusy(true)
    try {
      if (mode === 'signup') {
        const msg = await signUp(name.trim(), email.trim(), password)
        setMessage(msg)
        if (msg.includes('signed in')) navigate('/')
      } else {
        await signIn(email.trim(), password)
        navigate('/')
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Authentication failed.') }
    finally { setBusy(false) }
  }

  return <div className="auth-wrap"><form className="card auth-card" onSubmit={submit}>
    <h1>{mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}</h1>
    <p>{mode === 'signin' ? 'Sign in to sync your decks and use AI generation.' : 'No admin approval is required.'}</p>
    {mode === 'signup' && <label>Name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}
    <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
    <label>Password<input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
    {mode === 'signup' && <label>Confirm Password<input required type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label>}
    {message && <div className="notice">{message}</div>}
    <button className="primary-btn full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}</button>
    <button type="button" className="text-btn" onClick={()=>setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button>
    {mode === 'signin' && <button type="button" className="text-btn" onClick={async()=>{ if(!email) return setMessage('Enter your email first.'); try { await resetPassword(email); setMessage('Password reset email sent.'); } catch(e){setMessage(e instanceof Error ? e.message : 'Could not send reset email.')} }}>Forgot password?</button>}
  </form></div>
}
