import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, Sparkles, Plus, X, LoaderCircle, Lightbulb } from 'lucide-react'
import type { CardType, Deck, Difficulty, GenerationSettings, SourceFidelity, SourceFileData } from '../types'
import { makeId } from '../lib/id'
import { extractFile } from '../services/fileExtraction'
import { generateFlashcards, suggestFlashcardCount } from '../services/aiService'
import { useDecks } from '../contexts/DeckContext'

const defaultSettings: GenerationSettings = { cardCount: 20, cardType: 'mixed', difficulty: 'mixed', sourceFidelity: 'exact', contentFocus: ['Important Facts','Definitions','Concepts'], customInstructions: '' }

export default function CreateDeck() {
  const [title, setTitle] = useState('')
  const [sources, setSources] = useState<SourceFileData[]>([])
  const [settings, setSettings] = useState(defaultSettings)
  const [busy, setBusy] = useState(false)
  const [suggestingCount, setSuggestingCount] = useState(false)
  const [countSuggestion, setCountSuggestion] = useState<{ recommendedCount: number; topicCount: number; topics: string[]; reason: string } | null>(null)
  const [message, setMessage] = useState('')
  const { saveDeck } = useDecks()
  const navigate = useNavigate()

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true); setMessage('Extracting file content…')
    const extracted: SourceFileData[] = []
    for (const file of Array.from(files)) extracted.push(await extractFile(file))
    setSources(prev => [...prev, ...extracted]); setCountSuggestion(null); setBusy(false); setMessage('')
  }

  async function createManual() {
    const now = new Date().toISOString()
    const deck: Deck = { id: makeId(), title: title.trim() || 'Untitled Deck', cards: [], sources, settings, createdAt: now, updatedAt: now, syncState:'local' }
    await saveDeck(deck); navigate(`/deck/${deck.id}`)
  }


  async function suggestCount() {
    setMessage(''); setSuggestingCount(true)
    try {
      const suggestion = await suggestFlashcardCount({ sources, settings })
      setCountSuggestion(suggestion)
      setSettings(prev => ({ ...prev, cardCount: suggestion.recommendedCount }))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not suggest a card count.')
    } finally {
      setSuggestingCount(false)
    }
  }

  async function generate() {
    setMessage(''); setBusy(true)
    try {
      const result = await generateFlashcards({ title, sources, settings })
      const now = new Date().toISOString()
      const deck: Deck = { id: makeId(), title: result.title, cards: result.cards, sources, settings, createdAt: now, updatedAt: now, syncState:'local' }
      await saveDeck(deck); navigate(`/deck/${deck.id}`)
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Generation failed.') }
    finally { setBusy(false) }
  }

  return <section>
    <div className="page-head"><div><h1>Create Flashcards</h1><p>Upload materials, preserve source wording, and generate a study deck.</p></div></div>
    <div className="create-grid">
      <div className="stack">
        <div className="card"><h2>1. Deck & Files</h2>
          <label>Deck title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Database Systems Midterm"/></label>
          <label className="dropzone"><FileUp size={30}/><strong>Upload study materials</strong><span>PDF, DOCX, PPTX, XLS/XLSX, TXT, CSV, JSON, images and text-like files</span><input hidden multiple type="file" onChange={e=>void addFiles(e.target.files)}/></label>
          <div className="file-list">{sources.map(s=><div className="file-row" key={s.id}><div><strong>{s.name}</strong><small>{s.status === 'ready' ? `${s.extractedText.split(/\s+/).length} words extracted` : s.error || s.status}</small></div><button className="icon-btn" onClick={()=>{setCountSuggestion(null);setSources(x=>x.filter(v=>v.id!==s.id))}}><X size={16}/></button></div>)}</div>
          {busy && <div className="notice"><LoaderCircle className="spin" size={16}/>{message || 'Working…'}</div>}
        </div>
        {sources.some(s=>s.status==='ready') && <div className="card"><h2>2. Extracted Content Preview</h2>{sources.filter(s=>s.status==='ready').map(s=><details key={s.id}><summary>{s.name}</summary><textarea rows={8} value={s.extractedText} onChange={e=>{setCountSuggestion(null);setSources(all=>all.map(x=>x.id===s.id?{...x,extractedText:e.target.value}:x))}}/></details>)}</div>}
      </div>
      <div className="stack">
        <div className="card"><h2>3. Customize AI</h2>
          <div className="two-col"><label>Number of cards<div className="inline-actions"><input type="number" min={1} max={100} value={settings.cardCount} onChange={e=>{setCountSuggestion(null);setSettings({...settings,cardCount:Math.max(1,Math.min(100,Number(e.target.value)||1))})}}/><button type="button" className="secondary-btn" disabled={busy || suggestingCount || !sources.some(s=>s.status==='ready')} onClick={()=>void suggestCount()}>{suggestingCount ? <LoaderCircle className="spin" size={16}/> : <Lightbulb size={16}/>}Suggest</button></div></label>
          <label>Card type<select value={settings.cardType} onChange={e=>setSettings({...settings,cardType:e.target.value as CardType})}><option value="mixed">Mixed</option><option value="qa">Question & Answer</option><option value="term-definition">Term & Definition</option><option value="identification">Identification</option><option value="fill-blank">Fill in the Blank</option><option value="concept">Concept & Explanation</option></select></label></div>
          {countSuggestion && <div className="notice"><Lightbulb size={16}/><span><strong>AI suggests {countSuggestion.recommendedCount} cards</strong> to cover {countSuggestion.topicCount} detected topic{countSuggestion.topicCount === 1 ? '' : 's'}. {countSuggestion.reason}{countSuggestion.topics.length > 0 ? ` Topics: ${countSuggestion.topics.join(', ')}.` : ''}</span></div>}
          <div className="two-col"><label>Difficulty<select value={settings.difficulty} onChange={e=>setSettings({...settings,difficulty:e.target.value as Difficulty})}><option value="mixed">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
          <label>Source wording<select value={settings.sourceFidelity} onChange={e=>setSettings({...settings,sourceFidelity:e.target.value as SourceFidelity})}><option value="exact">Exact</option><option value="balanced">Balanced</option><option value="simplified">Simplified</option></select></label></div>
          <label>Content focus<input value={settings.contentFocus.join(', ')} onChange={e=>setSettings({...settings,contentFocus:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} placeholder="Definitions, Processes, Formulas"/></label>
          <label>Custom AI instructions<textarea rows={6} value={settings.customInstructions} onChange={e=>setSettings({...settings,customInstructions:e.target.value})} placeholder="Focus on Chapters 2–4. Keep answers exactly as written in the document."/></label>
          <div className="notice">Exact mode prioritizes definitions, terminology, dates, formulas and wording from your uploaded source.</div>
          {message && !busy && <div className="error-box">{message}</div>}
          <div className="action-stack"><button className="primary-btn full" disabled={busy || !sources.some(s=>s.status==='ready')} onClick={()=>void generate()}><Sparkles size={18}/>Generate with AI</button><button className="secondary-btn full" disabled={busy} onClick={()=>void createManual()}><Plus size={18}/>Create Manual Deck</button></div>
        </div>
      </div>
    </div>
  </section>
}
