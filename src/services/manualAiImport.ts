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

  return `You are the Brainy Deck flashcard generator.

Your job is to turn ALL of the source files below into one complete, source-grounded flashcard deck.

STRICT RULES:
1. Read and analyze ALL source files before generating the deck.
2. Use ONLY information found in the supplied source files. Do not add outside knowledge.
3. Preserve the source's exact wording as much as possible, especially definitions, terminology, names, dates, formulas, laws, lists, sequences, procedures, and technical phrases.
4. You may restructure a sentence into a question, but keep the answer as close as possible to the wording in the source.
5. Do not invent facts or make unsupported assumptions.
6. Keep related information within its original file/section context.
7. Avoid duplicate or near-duplicate cards.
8. Each card should test one clear idea whenever possible.
9. Cover all important topics and subtopics across ALL supplied files, not only the first file.
10. Determine how many flashcards are reasonably needed for broad coverage. Use fewer cards for short/simple materials and more cards for dense materials.
11. Maximum: 100 flashcards. If complete coverage would need more than 100, prioritize the most important concepts while still representing every major topic.
12. For each card, include the source filename and a short verbatim source excerpt whenever possible.
13. Create a useful mixture of question-and-answer, term-and-definition, identification, concept, process, list, date/name, and formula cards when the source supports them.
14. Prefer useful study questions over trivial details.

DECK TITLE:
${params.title.trim() || 'Choose a concise title based on all supplied files.'}

OUTPUT FORMAT:
Return ONLY valid JSON.
Do not use markdown.
Do not use triple backticks.
Do not write any explanation before or after the JSON.

Use this exact structure:
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

VALID difficulty values: "easy", "medium", or "hard".
The number of items in flashcards[] should match suggestedCardCount as closely as possible, up to 100 cards.

ALL SOURCE FILES:
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
