import type { AppBackup, Deck, PromptPreset } from '../types'

const DB_NAME = 'flashmind-ai'
const DB_VERSION = 1
const DECK_STORE = 'decks'
const PRESET_KEY = 'flashmind_prompt_presets'

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DECK_STORE)) {
        db.createObjectStore(DECK_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

export async function listDecks(): Promise<Deck[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DECK_STORE, 'readonly')
    const req = tx.objectStore(DECK_STORE).getAll()
    req.onsuccess = () => resolve((req.result as Deck[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
    req.onerror = () => reject(req.error)
  })
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DECK_STORE, 'readonly')
    const req = tx.objectStore(DECK_STORE).get(id)
    req.onsuccess = () => resolve(req.result as Deck | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function saveDeck(deck: Deck): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DECK_STORE, 'readwrite')
    tx.objectStore(DECK_STORE).put(deck)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteDeck(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DECK_STORE, 'readwrite')
    tx.objectStore(DECK_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function loadPresets(): PromptPreset[] {
  try {
    return JSON.parse(localStorage.getItem(PRESET_KEY) || '[]') as PromptPreset[]
  } catch {
    return []
  }
}

export function savePresets(presets: PromptPreset[]) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets))
}

export async function exportAll(): Promise<AppBackup> {
  return {
    application: 'FlashMind AI',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    decks: await listDecks(),
    promptPresets: loadPresets(),
  }
}

export async function importBackup(backup: AppBackup, replace = false) {
  if (backup.application !== 'FlashMind AI' || backup.schemaVersion !== 1 || !Array.isArray(backup.decks)) {
    throw new Error('Invalid FlashMind backup file.')
  }
  if (replace) {
    const existing = await listDecks()
    await Promise.all(existing.map((d) => deleteDeck(d.id)))
  }
  for (const deck of backup.decks) await saveDeck(deck)
  if (Array.isArray(backup.promptPresets)) savePresets(backup.promptPresets)
}
