import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { RotateCcw, Shuffle, ArrowLeft, ArrowRight, Brain, Layers3, Keyboard } from 'lucide-react'
import type { Deck, Flashcard, ReviewRating } from '../types'
import { getDeck } from '../services/localStore'
import { useDecks } from '../contexts/DeckContext'
import { calculateReviewSchedule, getReviewIntervalPreview, isCardDue } from '../services/spacedRepetition'

type StudyMode = 'all' | 'spaced'

export default function StudyPage() {
  const { id } = useParams()
  const { decks, saveDeck } = useDecks()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [index, setIndex] = useState(0)
  const [show, setShow] = useState(false)
  const [order, setOrder] = useState<string[]>([])
  const [mode, setMode] = useState<StudyMode>('all')

  const buildOrder = useCallback((sourceDeck: Deck, nextMode: StudyMode) => {
    const sourceCards = nextMode === 'spaced'
      ? sourceDeck.cards.filter((card) => isCardDue(card))
      : sourceDeck.cards
    return sourceCards.map((card) => card.id)
  }, [])

  useEffect(() => {
    const target = id || decks[0]?.id
    if (!target) return
    void getDeck(target).then((found) => {
      if (!found) return
      setDeck(found)
      setOrder(buildOrder(found, mode))
      setIndex(0)
      setShow(false)
    })
  // mode is intentionally handled by changeMode so switching does not refetch from storage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, decks.length, buildOrder])

  const cards = useMemo(
    () => deck
      ? order.map((cardId) => deck.cards.find((card) => card.id === cardId)).filter(Boolean) as Flashcard[]
      : [],
    [deck, order],
  )
  const card = cards[index]
  const dueCount = useMemo(() => deck?.cards.filter((item) => isCardDue(item)).length ?? 0, [deck])

  const next = useCallback(() => {
    if (!cards.length) return
    setIndex((current) => (current + 1) % cards.length)
    setShow(false)
  }, [cards.length])

  const prev = useCallback(() => {
    if (!cards.length) return
    setIndex((current) => (current - 1 + cards.length) % cards.length)
    setShow(false)
  }, [cards.length])

  function shuffle() {
    setOrder((current) => [...current].sort(() => Math.random() - 0.5))
    setIndex(0)
    setShow(false)
  }

  function changeMode(nextMode: StudyMode) {
    if (!deck) return
    setMode(nextMode)
    setOrder(buildOrder(deck, nextMode))
    setIndex(0)
    setShow(false)
  }

  async function rate(rating: ReviewRating) {
    if (!deck || !card) return

    const reviewSchedule = calculateReviewSchedule(card, rating)
    const updated: Flashcard = {
      ...card,
      rating,
      timesReviewed: (card.timesReviewed || 0) + 1,
      lastReviewed: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...reviewSchedule,
    }
    const nextDeck: Deck = {
      ...deck,
      cards: deck.cards.map((item) => item.id === card.id ? updated : item),
    }

    setDeck(nextDeck)

    if (mode === 'spaced') {
      const nextOrder = order.filter((cardId) => cardId !== card.id)
      setOrder(nextOrder)
      if (nextOrder.length === 0) setIndex(0)
      else if (index >= nextOrder.length) setIndex(0)
      setShow(false)
    } else {
      next()
    }

    await saveDeck(nextDeck)
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      if (!card) return

      if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault()
        setShow((visible) => !visible)
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        next()
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        prev()
        return
      }

      if (show && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault()
        const ratings: ReviewRating[] = ['again', 'hard', 'good', 'easy']
        void rate(ratings[Number(event.key) - 1])
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [card?.id, show, next, prev, deck, mode, index, order])

  if (!deck) {
    return <section>
      <div className="page-head"><div><h1>Study</h1><p>Create or choose a deck to begin.</p></div></div>
      {decks.length > 0
        ? <div className="deck-grid">{decks.map((item) => <Link className="card deck-card" key={item.id} to={`/study/${item.id}`}><h3>{item.title}</h3><p>{item.cards.length} cards</p></Link>)}</div>
        : <div className="empty card">No decks available.</div>}
    </section>
  }

  if (!deck.cards.length) {
    return <div className="empty card"><h2>{deck.title}</h2><p>This deck has no cards yet.</p><Link className="primary-btn" to={`/deck/${deck.id}`}>Add cards</Link></div>
  }

  if (mode === 'spaced' && !card) {
    return <section className="study-page">
      <div className="page-head">
        <div><h1>{deck.title}</h1><p>Spaced repetition</p></div>
        <button className="secondary-btn" onClick={() => changeMode('all')}><Layers3 size={17}/>Review all cards</button>
      </div>
      <div className="card study-complete">
        <Brain size={42}/>
        <h2>You're caught up</h2>
        <p>No cards are due for spaced-repetition review right now. BrainyDeck saved your next review dates locally.</p>
        <button className="primary-btn" onClick={() => changeMode('all')}>Study all cards anyway</button>
      </div>
    </section>
  }

  if (!card) return null

  return <section className="study-page">
    <div className="page-head">
      <div>
        <h1>{deck.title}</h1>
        <p>{index + 1} / {cards.length} · {dueCount} due</p>
      </div>
      <div className="head-actions">
        <label className="study-mode-control">
          <span>Review mode</span>
          <select value={mode} onChange={(event) => changeMode(event.target.value as StudyMode)}>
            <option value="all">All cards</option>
            <option value="spaced">Spaced repetition ({dueCount} due)</option>
          </select>
        </label>
        <button className="secondary-btn" onClick={shuffle}><Shuffle size={17}/>Shuffle</button>
        <button className="secondary-btn" onClick={() => { setOrder(buildOrder(deck, mode)); setIndex(0); setShow(false) }}><RotateCcw size={17}/>Restart</button>
      </div>
    </div>

    <div className="progress"><span style={{ width: `${((index + 1) / cards.length) * 100}%` }}/></div>

    <button className={`study-card ${show ? 'flipped' : ''}`} onClick={() => setShow(!show)}>
      <small>{show ? 'Answer' : 'Question'}</small>
      <div>{show ? card.back : card.front}</div>
      <em>{show ? 'Press 1–4 to rate, or Enter / Space to flip back' : 'Tap, Enter, or Space to reveal the answer'}</em>
    </button>

    <div className="study-nav">
      <button className="secondary-btn" onClick={prev}><ArrowLeft size={18}/>Previous</button>
      <button className="secondary-btn" onClick={next}>Next<ArrowRight size={18}/></button>
    </div>

    {show && <div className="rating-row spaced-rating-row">
      <button onClick={() => void rate('again')}><strong>1 · Again</strong><small>{getReviewIntervalPreview(card, 'again')}</small></button>
      <button onClick={() => void rate('hard')}><strong>2 · Hard</strong><small>{getReviewIntervalPreview(card, 'hard')}</small></button>
      <button onClick={() => void rate('good')}><strong>3 · Good</strong><small>{getReviewIntervalPreview(card, 'good')}</small></button>
      <button onClick={() => void rate('easy')}><strong>4 · Easy</strong><small>{getReviewIntervalPreview(card, 'easy')}</small></button>
    </div>}

    <div className="shortcut-bar card">
      <Keyboard size={18}/>
      <span><kbd>Enter</kbd> / <kbd>Space</kbd> Flip</span>
      <span><kbd>1</kbd> Again</span>
      <span><kbd>2</kbd> Hard</span>
      <span><kbd>3</kbd> Good</span>
      <span><kbd>4</kbd> Easy</span>
      <span><kbd>←</kbd> / <kbd>→</kbd> Navigate</span>
    </div>

    {card.nextReviewAt && <div className="review-meta">Next scheduled review: {new Date(card.nextReviewAt).toLocaleString()}</div>}

    {card.sourceExcerpt && <details className="card source-card"><summary>View original source</summary><p>{card.sourceExcerpt}</p></details>}
  </section>
}
