import { makeId } from '../lib/id'
import type { Flashcard, GenerationSettings, SourceFileData } from '../types'

export interface ManualAiImportResult {
  title: string
  cards: Flashcard[]
  suggestedCardCount?: number
  topics: string[]
}

function buildSourceContent(sources: SourceFileData[]) {
  return sources
    .filter((source) => source.status === 'ready' && source.extractedText.trim())
    .map((source) => `--- SOURCE FILE: ${source.name} ---\n${source.extractedText}`)
    .join('\n\n')
}

export function buildManualAiPrompt(params: {
  title: string
  sources: SourceFileData[]
  settings: GenerationSettings
}) {
  const sourceContent = buildSourceContent(params.sources)
  if (!sourceContent.trim()) throw new Error('No extracted source text is available.')

  const settings = params.settings

  return `You are generating flashcards for Brainy Deck.

IMPORTANT SOURCE-GROUNDING RULES:
1. Use ONLY the source material provided below.
2. Preserve the exact wording from the source as much as possible.
3. Do not invent facts or add outside knowledge.
4. Preserve exact definitions, terminology, names, dates, formulas, lists, sequences, procedures, and technical phrases.
5. Questions may be restructured for clarity, but answers should remain as close as possible to the source wording.
6. Do not create a card if the answer is not directly supported by the source.
7. Avoid duplicate or near-duplicate cards.
8. Each flashcard should test one main idea whenever possible.
9. Keep necessary qualifiers and context so the card remains accurate.
10. Use the source filename in sourceFile whenever you can identify it from the SOURCE FILE markers.
11. sourceExcerpt should be a short verbatim excerpt that directly supports the card.

COVERAGE TASK:
First analyze the full source material and identify the important topics and subtopics.
Then determine the practical number of flashcards needed to give broad coverage of those topics without unnecessary repetition.
The application supports a maximum of 100 flashcards. If ideal coverage would exceed 100 cards, use 100 and prioritize the most important material.

CURRENT BRAINY DECK SETTINGS:
Deck title preference: ${params.title.trim() || 'Let the AI choose a concise title'}
Card type: ${settings.cardType}
Difficulty: ${settings.difficulty}
Source wording preference: ${settings.sourceFidelity}
Content focus: ${settings.contentFocus.join(', ') || 'All important educational content'}
Custom instructions: ${settings.customInstructions.trim() || 'None'}

SOURCE WORDING MODE:
${settings.sourceFidelity === 'exact'
  ? 'EXACT: Preserve definitions, terminology, factual wording, names, dates, formulas, lists, and procedures almost verbatim whenever practical. Change only what is necessary to form a clear question.'
  : settings.sourceFidelity === 'balanced'
    ? 'BALANCED: Preserve important source terminology and definitions while allowing small wording changes for clarity.'
    : 'SIMPLIFIED: You may make explanations easier to understand, but do not change the factual meaning or replace essential source terminology.'}

OUTPUT RULES:
Return ONLY valid JSON.
Do not use markdown.
Do not wrap the result in triple backticks.
Do not write any explanation before or after the JSON.

Use exactly this general structure:
{
  "deckTitle": "Short useful title",
  "suggestedCardCount": 25,
  "topics": [
    "Topic 1",
    "Topic 2"
  ],
  "flashcards": [
    {
      "front": "Question or prompt",
      "back": "Answer grounded in the source",
      "sourceFile": "filename.pdf",
      "sourceExcerpt": "Short exact supporting excerpt",
      "category": "Definition",
      "difficulty": "medium"
    }
  ]
}

VALID difficulty values are only: "easy", "medium", or "hard".
The number of flashcards in flashcards[] should match suggestedCardCount as closely as possible, up to the 100-card maximum.

SOURCE MATERIAL:
${sourceContent}`
}

function extractJsonText(raw: string) {
  let text = raw.trim()
  if (!text) throw new Error('Paste the AI response first.')

  text = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  if (text.startsWith('{') && text.endsWith('}')) return text

  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) return text.slice(first, last + 1)

  throw new Error('No valid JSON object was found in the AI response.')
}

function normalizeDifficulty(value: unknown): 'easy' | 'medium' | 'hard' {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'easy' || normalized === 'hard') return normalized
  return 'medium'
}

export function parseManualAiResponse(raw: string, fallbackTitle = 'Imported AI Deck'): ManualAiImportResult {
  let parsed: any
  try {
    parsed = JSON.parse(extractJsonText(raw))
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No valid JSON')) throw error
    if (error instanceof Error && error.message === 'Paste the AI response first.') throw error
    throw new Error('The AI response is not valid JSON. Ask the AI to return JSON only, then try again.')
  }

  const rawCards = Array.isArray(parsed?.flashcards)
    ? parsed.flashcards
    : Array.isArray(parsed?.cards)
      ? parsed.cards
      : null

  if (!rawCards) throw new Error('The JSON does not contain a flashcards array.')

  const now = new Date().toISOString()
  const cards: Flashcard[] = []

  for (const item of rawCards.slice(0, 100)) {
    const front = String(item?.front ?? item?.question ?? '').trim()
    const back = String(item?.back ?? item?.answer ?? '').trim()
    if (!front || !back) continue

    cards.push({
      id: makeId(),
      front,
      back,
      sourceFile: item?.sourceFile ? String(item.sourceFile).trim() : undefined,
      sourceExcerpt: item?.sourceExcerpt ? String(item.sourceExcerpt).trim() : undefined,
      category: item?.category ? String(item.category).trim() : undefined,
      difficulty: normalizeDifficulty(item?.difficulty),
      favorite: false,
      createdAt: now,
      updatedAt: now,
    })
  }

  if (!cards.length) throw new Error('No valid flashcards with both a front and back were found in the JSON.')

  const suggested = Number(parsed?.suggestedCardCount)
  const topics = Array.isArray(parsed?.topics)
    ? parsed.topics.map((topic: unknown) => String(topic).trim()).filter(Boolean).slice(0, 50)
    : []

  return {
    title: String(parsed?.deckTitle || parsed?.title || fallbackTitle).trim() || fallbackTitle,
    cards,
    suggestedCardCount: Number.isFinite(suggested) && suggested > 0
      ? Math.min(100, Math.max(1, Math.round(suggested)))
      : undefined,
    topics,
  }
}
