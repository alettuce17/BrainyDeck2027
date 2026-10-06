import type { Deck } from '../types'
import { supabase } from '../lib/supabase'

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
