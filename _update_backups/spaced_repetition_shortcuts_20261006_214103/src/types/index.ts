export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed'
export type CardType = 'qa' | 'term-definition' | 'identification' | 'fill-blank' | 'concept' | 'mixed'
export type SourceFidelity = 'exact' | 'balanced' | 'simplified'

export interface Flashcard {
  id: string
  front: string
  back: string
  sourceFile?: string
  sourceExcerpt?: string
  category?: string
  difficulty?: Exclude<Difficulty, 'mixed'>
  favorite: boolean
  createdAt: string
  updatedAt: string
  rating?: 'again' | 'hard' | 'good' | 'easy'
  timesReviewed?: number
  lastReviewed?: string
}

export interface SourceFileData {
  id: string
  name: string
  type: string
  size: number
  extractedText: string
  status: 'waiting' | 'processing' | 'ready' | 'failed'
  error?: string
}

export interface GenerationSettings {
  cardCount: number
  cardType: CardType
  difficulty: Difficulty
  sourceFidelity: SourceFidelity
  contentFocus: string[]
  customInstructions: string
}

export interface Deck {
  id: string
  userId?: string
  title: string
  description?: string
  cards: Flashcard[]
  sources: SourceFileData[]
  settings: GenerationSettings
  createdAt: string
  updatedAt: string
  syncState?: 'local' | 'syncing' | 'synced' | 'error'
}

export interface PromptPreset {
  id: string
  name: string
  prompt: string
}

export interface AppBackup {
  application: 'FlashMind AI'
  schemaVersion: 1
  exportedAt: string
  decks: Deck[]
  promptPresets: PromptPreset[]
}
