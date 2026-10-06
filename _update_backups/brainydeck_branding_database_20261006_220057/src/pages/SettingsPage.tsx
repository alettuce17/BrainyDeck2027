import { useRef, useState } from 'react'
import { Download, Upload, Cloud, User, Database } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDecks } from '../contexts/DeckContext'
import { exportAll, importBackup, saveDeck as saveLocalDeck } from '../services/localStore'
import { downloadJson } from '../services/download'
import type { AppBackup } from '../types'

export default function SettingsPage(){
  const { user, configured } = useAuth()
  const { refresh, syncNow } = useDecks()
  const fileRef=useRef<HTMLInputElement>(null)
  const [message,setMessage]=useState('')

  async function exportData(){const data=await exportAll();downloadJson(`flashmind-backup-${new Date().toISOString().slice(0,10)}.json`,data)}
  async function importData(file?:File){if(!file)return;try{const parsed=JSON.parse(await file.text()) as AppBackup | import('../types').Deck;if('application' in parsed){const replace=confirm('Press OK to REPLACE current local decks. Press Cancel to MERGE instead.');await importBackup(parsed,replace);setMessage('Backup imported successfully.')}else if('cards' in parsed && 'id' in parsed && 'title' in parsed){await saveLocalDeck(parsed);setMessage('Deck imported successfully.')}else{throw new Error('This is not a valid FlashMind backup or deck file.')}await refresh();}catch(e){setMessage(e instanceof Error?e.message:'Import failed.')}}

  return <section><div className="page-head"><div><h1>Settings & Data</h1><p>Configure cloud access and keep portable backups.</p></div></div>
    <div className="settings-grid">
      <div className="card"><h2><Cloud size={20}/>Cloud</h2><p><strong>Status:</strong> {configured?'Supabase configured':'Local-only mode'}</p><p><strong>Account:</strong> {user?.email||'Not signed in'}</p>{user&&<button className="secondary-btn" onClick={()=>void syncNow().then(()=>setMessage('Cloud sync complete.')).catch(e=>setMessage(e.message))}>Sync Now</button>} {!configured&&<div className="notice">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable accounts and AI.</div>}</div>
      <div className="card"><h2><Database size={20}/>Backups</h2><p>Export your decks to a JSON file you control.</p><div className="action-stack"><button className="secondary-btn full" onClick={()=>void exportData()}><Download size={17}/>Export All Data</button><button className="secondary-btn full" onClick={()=>fileRef.current?.click()}><Upload size={17}/>Import Backup</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={e=>void importData(e.target.files?.[0])}/></div></div>
      <div className="card"><h2><User size={20}/>What is stored?</h2><p>Decks and extracted text are cached in IndexedDB. Small app preferences use localStorage. Original binary uploads are not permanently stored by default.</p></div>
    </div>{message&&<div className="notice">{message}</div>}
  </section>
}
