import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Plus, BookOpen, Download, Save } from 'lucide-react'
import type { Deck, Flashcard } from '../types'
import { getDeck } from '../services/localStore'
import { makeId } from '../lib/id'
import { useDecks } from '../contexts/DeckContext'
import { FlashcardEditor } from '../components/FlashcardEditor'
import { downloadJson } from '../services/download'

export default function DeckPage() {
  const { id } = useParams()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [message, setMessage] = useState('')
  const { saveDeck } = useDecks()
  const navigate = useNavigate()

  useEffect(()=>{ if(id) void getDeck(id).then(d=>d?setDeck(d):navigate('/')) },[id,navigate])
  if (!deck) return <div className="empty">Loading deck…</div>

  const updateCard = (card: Flashcard) => setDeck({ ...deck, cards: deck.cards.map(c=>c.id===card.id?card:c) })
  const addCard = () => {
    const now = new Date().toISOString()
    setDeck({ ...deck, cards:[...deck.cards,{id:makeId(),front:'',back:'',favorite:false,createdAt:now,updatedAt:now}] })
  }
  const save = async () => { await saveDeck(deck); setMessage('Saved locally' + (deck.userId ? ' and synced.' : '.')); setTimeout(()=>setMessage(''),1800) }

  return <section>
    <div className="page-head"><div><input className="title-input" value={deck.title} onChange={e=>setDeck({...deck,title:e.target.value})}/><p>{deck.cards.length} cards • {deck.sources.length} sources</p></div>
      <div className="head-actions"><button className="secondary-btn" onClick={()=>downloadJson(`${deck.title.replace(/\W+/g,'-').toLowerCase()||'deck'}.json`,deck)}><Download size={17}/>Export</button><Link className="secondary-btn" to={`/study/${deck.id}`}><BookOpen size={17}/>Study</Link><button className="primary-btn" onClick={()=>void save()}><Save size={17}/>Save</button></div>
    </div>
    {message && <div className="notice">{message}</div>}
    <div className="card-list">{deck.cards.map(card=><FlashcardEditor key={card.id} card={card} onChange={updateCard} onDelete={()=>setDeck({...deck,cards:deck.cards.filter(c=>c.id!==card.id)})}/>)}</div>
    <button className="secondary-btn full" onClick={addCard}><Plus size={18}/>Add Flashcard</button>
  </section>
}
