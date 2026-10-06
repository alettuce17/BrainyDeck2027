import { Trash2, Star } from 'lucide-react'
import type { Flashcard } from '../types'

export function FlashcardEditor({ card, onChange, onDelete }: {
  card: Flashcard
  onChange: (card: Flashcard) => void
  onDelete: () => void
}) {
  return <div className="card editor-card">
    <div className="editor-top">
      <span className="badge">{card.category || 'Card'}</span>
      <div className="inline-actions">
        <button className="icon-btn" title="Favorite" onClick={() => onChange({ ...card, favorite: !card.favorite, updatedAt: new Date().toISOString() })}><Star size={17} fill={card.favorite ? 'currentColor' : 'none'}/></button>
        <button className="icon-btn danger" title="Delete" onClick={onDelete}><Trash2 size={17}/></button>
      </div>
    </div>
    <label>Question<input value={card.front} onChange={(e) => onChange({ ...card, front: e.target.value, updatedAt: new Date().toISOString() })}/></label>
    <label>Answer<textarea rows={3} value={card.back} onChange={(e) => onChange({ ...card, back: e.target.value, updatedAt: new Date().toISOString() })}/></label>
    {card.sourceExcerpt && <details><summary>View source</summary><p className="source-excerpt">{card.sourceExcerpt}</p></details>}
    <div className="meta">{card.sourceFile || 'Manual card'} {card.difficulty ? `• ${card.difficulty}` : ''}</div>
  </div>
}
