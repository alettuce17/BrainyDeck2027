import { supabase } from '../lib/supabase'
import type { Flashcard, GenerationSettings, SourceFileData } from '../types'

export async function generateFlashcards(params: {
  title: string
  sources: SourceFileData[]
  settings: GenerationSettings
}): Promise<{ title: string; cards: Flashcard[] }> {
  if (!supabase) throw new Error('Connect Supabase first. AI generation uses a secure Supabase Edge Function.')
  const { data: auth } = await supabase.auth.getSession()
  if (!auth.session) throw new Error('Sign in before using AI generation. Your local/manual decks still work without an account.')

  const sourceContent = params.sources
    .filter((s) => s.status === 'ready')
    .map((s) => `--- SOURCE FILE: ${s.name} ---\n${s.extractedText}`)
    .join('\n\n')

  if (!sourceContent.trim()) throw new Error('No extracted source text is available.')

  const { data, error } = await supabase.functions.invoke('generate-flashcards', {
    body: {
      deckTitle: params.title,
      sourceContent,
      settings: params.settings,
    },
  })
  if (error) throw error
  if (!data?.flashcards || !Array.isArray(data.flashcards)) throw new Error('The AI returned an invalid response.')
  return { title: data.deckTitle || params.title || 'AI Flashcards', cards: data.flashcards }
}
