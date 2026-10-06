import { Link } from 'react-router-dom'
import { Plus, BookOpen, Cloud, HardDrive, Trash2, Pencil } from 'lucide-react'
import { useDecks } from '../contexts/DeckContext'

export default function Dashboard() {
  const { decks, loading, deleteDeck } = useDecks()
  return <section>
    <div className="page-head">
      <div><h1>Your Flashcard Decks</h1><p>Study from your own materials with source-grounded AI cards.</p></div>
      <Link className="primary-btn" to="/create"><Plus size={18}/>Create New Deck</Link>
    </div>
    {loading ? <div className="empty">Loading decks…</div> : decks.length === 0 ? (
      <div className="empty card"><BookOpen size={42}/><h2>No flashcard decks yet</h2><p>Upload your study materials or create a manual deck.</p><Link className="primary-btn" to="/create">Create Your First Deck</Link></div>
    ) : <div className="deck-grid">{decks.map(deck => <article key={deck.id} className="card deck-card">
      <div className="deck-title-row"><h3>{deck.title}</h3>{deck.syncState === 'synced' ? <Cloud size={16}/> : <HardDrive size={16}/>}</div>
      <p>{deck.cards.length} cards • {deck.sources.length} source file{deck.sources.length === 1 ? '' : 's'}</p>
      <small>Updated {new Date(deck.updatedAt).toLocaleString()}</small>
      <div className="row-actions">
        <Link className="secondary-btn" to={`/study/${deck.id}`}><BookOpen size={16}/>Study</Link>
        <Link className="secondary-btn" to={`/deck/${deck.id}`}><Pencil size={16}/>Edit</Link>
        <button className="icon-btn danger" title="Delete deck" onClick={() => { if (confirm(`Delete “${deck.title}”?`)) void deleteDeck(deck.id) }}><Trash2 size={17}/></button>
      </div>
    </article>)}</div>}
  </section>
}
