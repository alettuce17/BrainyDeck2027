import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, BookOpen, Cloud, HardDrive, Trash2, Pencil, Search,
  Layers3, Sparkles, Clock3, Star, ChevronRight, BrainCircuit,
} from 'lucide-react'
import { useDecks } from '../contexts/DeckContext'
import { useAuth } from '../contexts/AuthContext'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { decks, loading, deleteDeck } = useDecks()
  const { user } = useAuth()
  const [query, setQuery] = useState('')

  const displayName = (user?.user_metadata?.display_name as string | undefined)?.trim()
    || user?.email?.split('@')[0]
    || 'Student'

  const allCards = useMemo(() => decks.flatMap(deck => deck.cards), [decks])
  const totalCards = allCards.length
  const reviewedCards = allCards.filter(card => (card.timesReviewed || 0) > 0).length
  const favoriteCards = allCards.filter(card => card.favorite).length
  const dueCards = allCards.filter(card => {
    if (!card.nextReviewAt) return false
    return new Date(card.nextReviewAt).getTime() <= Date.now()
  }).length

  const filteredDecks = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...decks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    if (!q) return sorted
    return sorted.filter(deck =>
      deck.title.toLowerCase().includes(q)
      || deck.sources.some(source => source.name.toLowerCase().includes(q))
      || deck.cards.some(card => card.front.toLowerCase().includes(q) || card.back.toLowerCase().includes(q))
    )
  }, [decks, query])

  const recentDecks = useMemo(
    () => [...decks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3),
    [decks],
  )

  const firstStudyDeck = decks.find(deck => deck.cards.length > 0)

  return <section className="ios-dashboard">
    <div className="ios-topline">
      <div className="ios-search">
        <Search size={19}/>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search decks, cards, or source files..."
          aria-label="Search decks"
        />
      </div>
      <div className="ios-mini-profile" title={user?.email || 'Local profile'}>
        <span>{displayName.slice(0,1).toUpperCase()}</span>
      </div>
    </div>

    <div className="ios-dashboard-columns">
      <div className="ios-dashboard-main">
        <section className="ios-hero">
          <div className="ios-hero-copy">
            <span className="ios-eyebrow">Your study space</span>
            <h1>{greeting()}, {displayName}! <span aria-hidden="true">👋</span></h1>
            <p>Build source-grounded flashcards and keep your review momentum going.</p>
            <div className="ios-hero-actions">
              {firstStudyDeck
                ? <Link className="primary-btn ios-primary" to={`/study/${firstStudyDeck.id}`}><BookOpen size={18}/>Start Studying</Link>
                : <Link className="primary-btn ios-primary" to="/create"><Sparkles size={18}/>Create First Deck</Link>}
              <Link className="secondary-btn ios-secondary" to="/create"><Plus size={18}/>New Deck</Link>
            </div>
          </div>
          <div className="ios-hero-art" aria-hidden="true">
            <span className="ios-orb ios-orb-one"/>
            <span className="ios-orb ios-orb-two"/>
            <span className="ios-orb ios-orb-three"/>
            <div className="ios-floating-card ios-floating-card-back"/>
            <div className="ios-floating-card ios-floating-card-front"><BrainCircuit size={46}/></div>
          </div>
        </section>

        <div className="ios-stat-grid">
          <article className="ios-stat-card">
            <span className="ios-stat-icon blue"><Layers3 size={21}/></span>
            <div><strong>{decks.length}</strong><small>Total Decks</small></div>
          </article>
          <article className="ios-stat-card">
            <span className="ios-stat-icon green"><BookOpen size={21}/></span>
            <div><strong>{totalCards}</strong><small>Total Cards</small></div>
          </article>
          <article className="ios-stat-card">
            <span className="ios-stat-icon orange"><Clock3 size={21}/></span>
            <div><strong>{dueCards}</strong><small>Due Now</small></div>
          </article>
          <article className="ios-stat-card">
            <span className="ios-stat-icon purple"><Star size={21}/></span>
            <div><strong>{favoriteCards}</strong><small>Favorites</small></div>
          </article>
        </div>

        <div className="ios-section-head">
          <div><h2>My Decks</h2><p>{filteredDecks.length === decks.length ? `${decks.length} deck${decks.length === 1 ? '' : 's'}` : `${filteredDecks.length} result${filteredDecks.length === 1 ? '' : 's'}`}</p></div>
          <Link className="ios-link" to="/create">Add deck <ChevronRight size={16}/></Link>
        </div>

        {loading ? <div className="empty ios-loading-card">Loading decks…</div> : decks.length === 0 ? (
          <div className="empty card ios-empty-state">
            <span className="ios-empty-icon"><BookOpen size={34}/></span>
            <h2>No flashcard decks yet</h2>
            <p>Upload your notes, PDFs, or other study materials and let Brainy Deck build your first study set.</p>
            <Link className="primary-btn ios-primary" to="/create">Create Your First Deck</Link>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="empty card ios-empty-state"><Search size={32}/><h2>No matching decks</h2><p>Try another search term.</p></div>
        ) : <div className="deck-grid ios-deck-grid">{filteredDecks.map((deck, deckIndex) => {
          const reviewed = deck.cards.filter(card => (card.timesReviewed || 0) > 0).length
          const progress = deck.cards.length ? Math.round((reviewed / deck.cards.length) * 100) : 0
          return <article key={deck.id} className="card deck-card ios-deck-card" style={{'--deck-index': deckIndex} as React.CSSProperties}>
            <div className="ios-deck-top">
              <span className={`ios-folder-icon folder-${deckIndex % 4}`}><BookOpen size={22}/></span>
              <span className="ios-sync-pill" title={deck.syncState || 'local'}>{deck.syncState === 'synced' ? <Cloud size={14}/> : <HardDrive size={14}/>}</span>
            </div>
            <div className="deck-title-row"><h3>{deck.title}</h3></div>
            <p>{deck.cards.length} cards • {deck.sources.length} source file{deck.sources.length === 1 ? '' : 's'}</p>
            <div className="ios-deck-progress-row"><div className="ios-mini-progress"><span style={{width:`${progress}%`}}/></div><small>{progress}%</small></div>
            <small>Updated {new Date(deck.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</small>
            <div className="row-actions ios-row-actions">
              <Link className="secondary-btn" to={`/study/${deck.id}`}><BookOpen size={16}/>Study</Link>
              <Link className="icon-btn" title="Edit deck" to={`/deck/${deck.id}`}><Pencil size={17}/></Link>
              <button className="icon-btn danger" title="Delete deck" onClick={() => { if (confirm(`Delete “${deck.title}”?`)) void deleteDeck(deck.id) }}><Trash2 size={17}/></button>
            </div>
          </article>
        })}</div>}
      </div>

      <aside className="ios-dashboard-rail">
        <section className="card ios-rail-card ios-progress-card">
          <div className="ios-rail-title"><div><span className="ios-eyebrow">Study progress</span><h3>Today</h3></div><Clock3 size={20}/></div>
          <div className="ios-progress-ring" style={{'--progress': `${totalCards ? Math.round((reviewedCards / totalCards) * 100) : 0}%`} as React.CSSProperties}>
            <span>{totalCards ? Math.round((reviewedCards / totalCards) * 100) : 0}%</span>
          </div>
          <p><strong>{reviewedCards}</strong> of {totalCards} cards reviewed at least once.</p>
          <div className="ios-rail-stats"><span><strong>{dueCards}</strong> due</span><span><strong>{favoriteCards}</strong> saved</span></div>
        </section>

        <section className="card ios-ai-callout">
          <span className="ios-sparkle"><Sparkles size={20}/></span>
          <h3>Turn your materials into flashcards with AI</h3>
          <p>Upload study files and keep important wording grounded in your source.</p>
          <Link className="secondary-btn ios-callout-btn" to="/create"><Sparkles size={16}/>Generate Now</Link>
        </section>

        <section className="card ios-recent-card">
          <div className="ios-rail-title"><div><span className="ios-eyebrow">Recently updated</span><h3>Activity</h3></div></div>
          {recentDecks.length === 0 ? <p className="ios-muted">Your recent decks will appear here.</p> : <div className="ios-recent-list">
            {recentDecks.map(deck => <Link to={`/deck/${deck.id}`} key={deck.id} className="ios-recent-item">
              <span className="ios-recent-dot"/>
              <span><strong>{deck.title}</strong><small>{deck.cards.length} cards · {new Date(deck.updatedAt).toLocaleDateString()}</small></span>
              <ChevronRight size={15}/>
            </Link>)}
          </div>}
        </section>
      </aside>
    </div>
  </section>
}
