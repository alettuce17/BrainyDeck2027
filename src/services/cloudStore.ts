import type { Deck, Flashcard, ReviewRating } from '../types'
import { supabase } from '../lib/supabase'

type StudyProgressRow = {
  user_id: string
  deck_id: string
  card_id: string
  rating: ReviewRating | null
  times_reviewed: number
  last_reviewed: string | null
  next_review_at: string | null
  interval_minutes: number | null
  ease_factor: number | null
  repetitions: number | null
  updated_at: string
}

export async function pullCloudDecks(userId: string): Promise<Deck[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('decks')
    .select('payload')
    .eq('user_id', userId)
  if (error) throw error
  return (data || []).map((row) => row.payload as Deck)
}

export async function pushCloudDeck(deck: Deck, userId: string) {
  if (!supabase) return
  const payload = { ...deck, userId, syncState: 'synced' as const }
  const { error } = await supabase.from('decks').upsert({
    id: deck.id,
    user_id: userId,
    title: deck.title,
    updated_at: deck.updatedAt,
    payload,
  })
  if (error) throw error
}

export async function removeCloudDeck(id: string, userId: string) {
  if (!supabase) return
  const { error } = await supabase.from('decks').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function pushStudyProgress(deck: Deck, userId: string) {
  if (!supabase) return

  const reviewedCards = deck.cards.filter((card) =>
    Boolean(card.rating || card.timesReviewed || card.lastReviewed || card.nextReviewAt),
  )

  if (!reviewedCards.length) return

  const rows: StudyProgressRow[] = reviewedCards.map((card) => ({
    user_id: userId,
    deck_id: deck.id,
    card_id: card.id,
    rating: card.rating ?? null,
    times_reviewed: card.timesReviewed ?? 0,
    last_reviewed: card.lastReviewed ?? null,
    next_review_at: card.nextReviewAt ?? null,
    interval_minutes: card.reviewIntervalMinutes ?? null,
    ease_factor: card.reviewEase ?? null,
    repetitions: card.reviewRepetitions ?? null,
    updated_at: card.lastReviewed ?? card.updatedAt ?? new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('study_progress')
    .upsert(rows, { onConflict: 'user_id,deck_id,card_id' })

  if (error) throw error
}

export async function pullStudyProgress(userId: string): Promise<StudyProgressRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('study_progress')
    .select('user_id,deck_id,card_id,rating,times_reviewed,last_reviewed,next_review_at,interval_minutes,ease_factor,repetitions,updated_at')
    .eq('user_id', userId)

  if (error) throw error
  return (data || []) as StudyProgressRow[]
}

function applyProgressToCard(card: Flashcard, row: StudyProgressRow): Flashcard {
  const localReviewTime = card.lastReviewed ? Date.parse(card.lastReviewed) : 0
  const cloudReviewTime = row.last_reviewed ? Date.parse(row.last_reviewed) : 0

  // Never overwrite a newer local review with older cloud progress.
  if (localReviewTime > cloudReviewTime) return card

  return {
    ...card,
    rating: row.rating ?? undefined,
    timesReviewed: row.times_reviewed ?? 0,
    lastReviewed: row.last_reviewed ?? undefined,
    nextReviewAt: row.next_review_at ?? undefined,
    reviewIntervalMinutes: row.interval_minutes ?? undefined,
    reviewEase: row.ease_factor ?? undefined,
    reviewRepetitions: row.repetitions ?? undefined,
    updatedAt: row.updated_at || card.updatedAt,
  }
}

export function mergeStudyProgress(deck: Deck, rows: StudyProgressRow[]): Deck {
  const deckRows = rows.filter((row) => row.deck_id === deck.id)
  if (!deckRows.length) return deck

  const byCard = new Map(deckRows.map((row) => [row.card_id, row]))
  const cards = deck.cards.map((card) => {
    const row = byCard.get(card.id)
    return row ? applyProgressToCard(card, row) : card
  })

  const newestProgressTime = deckRows.reduce((latest, row) => {
    return row.updated_at > latest ? row.updated_at : latest
  }, deck.updatedAt)

  return {
    ...deck,
    cards,
    updatedAt: newestProgressTime > deck.updatedAt ? newestProgressTime : deck.updatedAt,
  }
}
