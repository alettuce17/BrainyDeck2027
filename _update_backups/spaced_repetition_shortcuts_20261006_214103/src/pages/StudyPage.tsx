import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { RotateCcw, Shuffle, ArrowLeft, ArrowRight } from 'lucide-react'
import type { Deck, Flashcard } from '../types'
import { getDeck } from '../services/localStore'
import { useDecks } from '../contexts/DeckContext'

export default function StudyPage() {
  const { id } = useParams()
  const { decks, saveDeck } = useDecks()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [index, setIndex] = useState(0)
  const [show, setShow] = useState(false)
  const [order, setOrder] = useState<string[]>([])

  useEffect(()=>{
    const target = id || decks[0]?.id
    if(target) void getDeck(target).then(d=>{ if(d){setDeck(d);setOrder(d.cards.map(c=>c.id));setIndex(0);setShow(false)} })
  },[id,decks.length])

  const cards = useMemo(()=> deck ? order.map(cid=>deck.cards.find(c=>c.id===cid)).filter(Boolean) as Flashcard[] : [], [deck,order])
  const card = cards[index]

  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if(!card) return
      if(e.code==='Space'){e.preventDefault();setShow(s=>!s)}
      if(e.key==='ArrowRight') next()
      if(e.key==='ArrowLeft') prev()
      if(['1','2','3','4'].includes(e.key)) rate((['again','hard','good','easy'] as const)[Number(e.key)-1])
    }
    window.addEventListener('keydown',handler); return()=>window.removeEventListener('keydown',handler)
  })

  function next(){ if(cards.length){setIndex(i=>(i+1)%cards.length);setShow(false)} }
  function prev(){ if(cards.length){setIndex(i=>(i-1+cards.length)%cards.length);setShow(false)} }
  function shuffle(){ setOrder([...order].sort(()=>Math.random()-.5));setIndex(0);setShow(false) }
  async function rate(rating: Flashcard['rating']){
    if(!deck||!card) return
    const updated={...card,rating,timesReviewed:(card.timesReviewed||0)+1,lastReviewed:new Date().toISOString(),updatedAt:new Date().toISOString()}
    const nextDeck={...deck,cards:deck.cards.map(c=>c.id===card.id?updated:c)}
    setDeck(nextDeck); await saveDeck(nextDeck); next()
  }

  if (!deck) return <section><div className="page-head"><div><h1>Study</h1><p>Create or choose a deck to begin.</p></div></div>{decks.length>0?<div className="deck-grid">{decks.map(d=><Link className="card deck-card" key={d.id} to={`/study/${d.id}`}><h3>{d.title}</h3><p>{d.cards.length} cards</p></Link>)}</div>:<div className="empty card">No decks available.</div>}</section>
  if (!card) return <div className="empty card"><h2>{deck.title}</h2><p>This deck has no cards yet.</p><Link className="primary-btn" to={`/deck/${deck.id}`}>Add cards</Link></div>

  return <section className="study-page"><div className="page-head"><div><h1>{deck.title}</h1><p>{index+1} / {cards.length}</p></div><div className="head-actions"><button className="secondary-btn" onClick={shuffle}><Shuffle size={17}/>Shuffle</button><button className="secondary-btn" onClick={()=>{setIndex(0);setShow(false)}}><RotateCcw size={17}/>Restart</button></div></div>
    <div className="progress"><span style={{width:`${((index+1)/cards.length)*100}%`}}/></div>
    <button className={`study-card ${show?'flipped':''}`} onClick={()=>setShow(!show)}>
      <small>{show?'Answer':'Question'}</small><div>{show?card.back:card.front}</div><em>{show?'Tap to show question':'Tap or press Space to reveal answer'}</em>
    </button>
    <div className="study-nav"><button className="secondary-btn" onClick={prev}><ArrowLeft size={18}/>Previous</button><button className="secondary-btn" onClick={next}>Next<ArrowRight size={18}/></button></div>
    {show&&<div className="rating-row"><button onClick={()=>void rate('again')}>1 · Again</button><button onClick={()=>void rate('hard')}>2 · Hard</button><button onClick={()=>void rate('good')}>3 · Good</button><button onClick={()=>void rate('easy')}>4 · Easy</button></div>}
    {card.sourceExcerpt&&<details className="card source-card"><summary>View original source</summary><p>{card.sourceExcerpt}</p></details>}
  </section>
}
