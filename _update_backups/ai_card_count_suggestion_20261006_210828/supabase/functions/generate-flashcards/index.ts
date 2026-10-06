const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Settings = {
  cardCount?: number
  cardType?: string
  difficulty?: string
  sourceFidelity?: string
  contentFocus?: string[]
  customInstructions?: string
}

type GeneratedCard = {
  front: string
  back: string
  sourceFile?: string
  sourceExcerpt?: string
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

const systemPrompt = `You are a document-grounded educational flashcard generator.
The supplied source material is the PRIMARY AND AUTHORITATIVE source.

STRICT RULES:
1. Generate cards ONLY from the supplied source unless the user explicitly requests external knowledge.
2. Preserve the EXACT WORDING from the source as much as possible, especially definitions, technical terms, names, dates, formulas, classifications, enumerations, laws, theories, procedures, quotations, principles, and specialized vocabulary.
3. Do not replace a usable source term with your preferred synonym.
4. Do not unnecessarily paraphrase definitions. Questions may be restructured, but answers should remain very close to the source wording.
5. Never invent facts or imply that information appears in the source when it does not.
6. If a question cannot be answered confidently from the source, do not create it.
7. Preserve qualifiers, numbers, units, symbols, order of steps, and list order when meaningful.
8. Avoid duplicate cards and test one primary idea per card.
9. Every card must include sourceFile and a short verbatim sourceExcerpt that directly supports the answer.
10. Return JSON only. No markdown, no commentary.`

function makePrompt(source: string, settings: Settings, count: number, title: string) {
  return `DECK TITLE: ${title || 'Untitled'}
REQUESTED CARD COUNT: ${count}
CARD TYPE: ${settings.cardType || 'mixed'}
DIFFICULTY: ${settings.difficulty || 'mixed'}
SOURCE WORDING PREFERENCE: ${settings.sourceFidelity || 'exact'}
CONTENT FOCUS: ${(settings.contentFocus || []).join(', ') || 'important educational content'}
CUSTOM INSTRUCTIONS: ${settings.customInstructions || 'None'}

When SOURCE WORDING PREFERENCE is exact, preserve definitions and key terminology almost verbatim. Change only what is needed to form a clear question.

Return exactly this JSON shape:
{
  "deckTitle": "short useful title",
  "flashcards": [
    {
      "front": "question or prompt",
      "back": "answer grounded in source wording",
      "sourceFile": "filename from source marker",
      "sourceExcerpt": "short verbatim supporting excerpt",
      "category": "Definition|Concept|Fact|Process|Formula|Date|Name|Other",
      "difficulty": "easy|medium|hard"
    }
  ]
}

SOURCE MATERIAL:
${source}`
}

function splitSource(text: string, maxChars = 45000) {
  if (text.length <= maxChars) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length)
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf('\n\n', end), text.lastIndexOf('\n--- SOURCE FILE:', end))
      if (boundary > start + maxChars * 0.6) end = boundary
    }
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks.slice(0, 12)
}

function cleanJson(text: string) {
  return text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
}

async function callAi(source: string, settings: Settings, count: number, title: string) {
  const apiKey = Deno.env.get('AI_API_KEY')
  const endpoint = Deno.env.get('AI_API_URL') || 'https://api.openai.com/v1/chat/completions'
  const model = Deno.env.get('AI_MODEL') || 'gpt-4.1-mini'
  if (!apiKey) throw new Error('AI_API_KEY is not configured in Supabase Edge Function secrets.')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: makePrompt(source, settings, count, title) },
      ],
    }),
  })
  if (!response.ok) throw new Error(`AI provider returned ${response.status}: ${await response.text()}`)
  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI provider returned no content.')
  return JSON.parse(cleanJson(content)) as { deckTitle?: string; flashcards?: GeneratedCard[] }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json()
    const sourceContent = String(body.sourceContent || '')
    const settings = (body.settings || {}) as Settings
    const title = String(body.deckTitle || '')
    const requested = Math.max(1, Math.min(100, Number(settings.cardCount) || 20))
    if (!sourceContent.trim()) throw new Error('No source content was provided.')

    const chunks = splitSource(sourceContent)
    const perChunk = Math.max(1, Math.ceil(requested / chunks.length))
    const all: GeneratedCard[] = []
    let generatedTitle = title

    for (const chunk of chunks) {
      const result = await callAi(chunk, settings, perChunk, title)
      if (result.deckTitle && !generatedTitle) generatedTitle = result.deckTitle
      if (Array.isArray(result.flashcards)) all.push(...result.flashcards)
      if (all.length >= requested * 1.5) break
    }

    const seen = new Set<string>()
    const now = new Date().toISOString()
    const flashcards = all.filter((card) => {
      const key = `${card.front || ''}|${card.back || ''}`.toLowerCase().replace(/\s+/g, ' ').trim()
      if (!card.front || !card.back || seen.has(key)) return false
      seen.add(key); return true
    }).slice(0, requested).map((card) => ({
      id: crypto.randomUUID(),
      front: String(card.front),
      back: String(card.back),
      sourceFile: card.sourceFile ? String(card.sourceFile) : undefined,
      sourceExcerpt: card.sourceExcerpt ? String(card.sourceExcerpt) : undefined,
      category: card.category ? String(card.category) : undefined,
      difficulty: ['easy','medium','hard'].includes(String(card.difficulty)) ? card.difficulty : 'medium',
      favorite: false,
      createdAt: now,
      updatedAt: now,
    }))

    return new Response(JSON.stringify({ deckTitle: generatedTitle || 'AI Flashcards', flashcards }), { status: 200, headers: { ...corsHeaders, 'Content-Type':'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Generation failed.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type':'application/json' } })
  }
})
