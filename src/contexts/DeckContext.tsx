import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Deck } from '../types'
import { deleteDeck as deleteLocalDeck, listDecks, saveDeck as saveLocalDeck } from '../services/localStore'
import { pullCloudDecks, pushCloudDeck, removeCloudDeck } from '../services/cloudStore'
import { useAuth } from './AuthContext'

type DeckContextValue = {
  decks: Deck[]
  loading: boolean
  refresh: () => Promise<void>
  saveDeck: (deck: Deck) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  syncNow: () => Promise<void>
}

const DeckContext = createContext<DeckContextValue | null>(null)

export function DeckProvider({ children }: { children: React.ReactNode }) {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const refresh = async () => {
    setLoading(true)
    try { setDecks(await listDecks()) } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  useEffect(() => {
    if (user) void syncNow()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const saveDeck = async (deck: Deck) => {
    const localDeck: Deck = { ...deck, updatedAt: new Date().toISOString(), syncState: user ? 'syncing' : 'local' }
    await saveLocalDeck(localDeck)
    await refresh()
    if (user) {
      try {
        await pushCloudDeck(localDeck, user.id)
        await saveLocalDeck({ ...localDeck, userId: user.id, syncState: 'synced' })
      } catch {
        await saveLocalDeck({ ...localDeck, syncState: 'error' })
      }
      await refresh()
    }
  }

  const deleteDeck = async (id: string) => {
    await deleteLocalDeck(id)
    if (user) {
      try { await removeCloudDeck(id, user.id) } catch { /* local deletion still succeeds */ }
    }
    await refresh()
  }

  const syncNow = async () => {
    if (!user) return
    const local = await listDecks()
    const cloud = await pullCloudDecks(user.id)
    const byId = new Map<string, Deck>()
    for (const deck of [...local, ...cloud]) {
      const existing = byId.get(deck.id)
      if (!existing || deck.updatedAt > existing.updatedAt) byId.set(deck.id, deck)
    }
    for (const deck of byId.values()) {
      const normalized = { ...deck, userId: user.id, syncState: 'synced' as const }
      await saveLocalDeck(normalized)
      try { await pushCloudDeck(normalized, user.id) } catch { /* keep local */ }
    }
    await refresh()
  }

  const value = useMemo(() => ({ decks, loading, refresh, saveDeck, deleteDeck, syncNow }), [decks, loading, user?.id])
  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
}

export function useDecks() {
  const ctx = useContext(DeckContext)
  if (!ctx) throw new Error('useDecks must be used within DeckProvider')
  return ctx
}
