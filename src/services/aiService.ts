import { supabase } from '../lib/supabase'
import type { Flashcard, GenerationSettings, SourceFileData } from '../types'

function buildSourceContent(sources: SourceFileData[]) {
  return sources
    .filter((s) => s.status === 'ready')
    .map((s) => `--- SOURCE FILE: ${s.name} ---\n${s.extractedText}`)
    .join('\n\n')
}

async function requireAiSession() {
  if (!supabase) throw new Error('Connect Supabase first. AI generation uses a secure Supabase Edge Function.')
  const { data: auth } = await supabase.auth.getSession()
  if (!auth.session) throw new Error('Sign in before using AI features. Your local/manual decks still work without an account.')
  return supabase
}

export async function suggestFlashcardCount(params: {
  sources: SourceFileData[]
  settings: GenerationSettings
}): Promise<{ recommendedCount: number; topicCount: number; topics: string[]; reason: string }> {
  const client = await requireAiSession()
  const sourceContent = buildSourceContent(params.sources)
  if (!sourceContent.trim()) throw new Error('No extracted source text is available.')

  const { data, error } = await client.functions.invoke('generate-flashcards', {
    body: {
      action: 'suggest-card-count',
      sourceContent,
      settings: params.settings,
    },
  })

  if (error) throw error
  const recommendedCount = Number(data?.recommendedCount)
  if (!Number.isFinite(recommendedCount) || recommendedCount < 1) {
    throw new Error('The AI returned an invalid card-count suggestion.')
  }

  return {
    recommendedCount: Math.max(1, Math.min(100, Math.round(recommendedCount))),
    topicCount: Math.max(1, Number(data?.topicCount) || 1),
    topics: Array.isArray(data?.topics) ? data.topics.map(String).filter(Boolean).slice(0, 20) : [],
    reason: typeof data?.reason === 'string' ? data.reason : 'Recommended to provide broad coverage of the detected topics.',
  }
}

export async function generateFlashcards(params: {
  title: string
  sources: SourceFileData[]
  settings: GenerationSettings
}): Promise<{ title: string; cards: Flashcard[] }> {
  const client = await requireAiSession()
  const sourceContent = buildSourceContent(params.sources)
  if (!sourceContent.trim()) throw new Error('No extracted source text is available.')

  const { data, error } = await client.functions.invoke('generate-flashcards', {
    body: {
      action: 'generate',
      deckTitle: params.title,
      sourceContent,
      settings: params.settings,
    },
  })
  if (error) throw error
  if (!data?.flashcards || !Array.isArray(data.flashcards)) throw new Error('The AI returned an invalid response.')
  return { title: data.deckTitle || params.title || 'AI Flashcards', cards: data.flashcards }
}
