import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, Sparkles, Plus, X, LoaderCircle, Lightbulb, Copy, ClipboardPaste } from 'lucide-react'
import type { CardType, Deck, Difficulty, GenerationSettings, SourceFidelity, SourceFileData } from '../types'
import { makeId } from '../lib/id'
import { extractFile } from '../services/fileExtraction'
import { generateFlashcards, suggestFlashcardCount } from '../services/aiService'
import { buildManualAiPrompt, parseManualAiResponse } from '../services/manualAiImport'
import { useDecks } from '../contexts/DeckContext'

const defaultSettings: GenerationSettings = {
  cardCount: 20,
  cardType: 'mixed',
  difficulty: 'mixed',
  sourceFidelity: 'exact',
  contentFocus: ['Important Facts', 'Definitions', 'Concepts'],
  customInstructions: '',
}

export default function CreateDeck() {
  const [title, setTitle] = useState('')
  const [sources, setSources] = useState<SourceFileData[]>([])
  const [settings, setSettings] = useState(defaultSettings)
  const [busy, setBusy] = useState(false)
  const [suggestingCount, setSuggestingCount] = useState(false)
  const [countSuggestion, setCountSuggestion] = useState<{ recommendedCount: number; topicCount: number; topics: string[]; reason: string } | null>(null)
  const [message, setMessage] = useState('')
  const [manualPrompt, setManualPrompt] = useState('')
  const [manualResponse, setManualResponse] = useState('')
  const [manualStatus, setManualStatus] = useState('')
  const { saveDeck } = useDecks()
  const navigate = useNavigate()

  const hasReadySource = sources.some((source) => source.status === 'ready')

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setMessage('Extracting file content…')
    const extracted: SourceFileData[] = []
    for (const file of Array.from(files)) extracted.push(await extractFile(file))
    setSources((prev) => [...prev, ...extracted])
    setCountSuggestion(null)
    setManualPrompt('')
    setBusy(false)
    setMessage('')
  }

  async function createManual() {
    const now = new Date().toISOString()
    const deck: Deck = {
      id: makeId(),
      title: title.trim() || 'Untitled Deck',
      cards: [],
      sources,
      settings,
      createdAt: now,
      updatedAt: now,
      syncState: 'local',
    }
    await saveDeck(deck)
    navigate(`/deck/${deck.id}`)
  }

  async function suggestCount() {
    setMessage('')
    setSuggestingCount(true)
    try {
      const suggestion = await suggestFlashcardCount({ sources, settings })
      setCountSuggestion(suggestion)
      setSettings((prev) => ({ ...prev, cardCount: suggestion.recommendedCount }))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not suggest a card count.')
    } finally {
      setSuggestingCount(false)
    }
  }

  async function generate() {
    setMessage('')
    setBusy(true)
    try {
      const result = await generateFlashcards({ title, sources, settings })
      const now = new Date().toISOString()
      const deck: Deck = {
        id: makeId(),
        title: result.title,
        cards: result.cards,
        sources,
        settings,
        createdAt: now,
        updatedAt: now,
        syncState: 'local',
      }
      await saveDeck(deck)
      navigate(`/deck/${deck.id}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setBusy(false)
    }
  }

  async function prepareManualPrompt() {
    setMessage('')
    setManualStatus('')
    try {
      const prompt = buildManualAiPrompt({ title, sources, settings })
      setManualPrompt(prompt)
      try {
        await navigator.clipboard.writeText(prompt)
        setManualStatus('Prompt copied. Paste it into Gemini, ChatGPT, Claude, or another AI.')
      } catch {
        setManualStatus('Prompt prepared below. Select it and copy it manually.')
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not prepare the manual AI prompt.')
    }
  }

  async function importManualAi(raw = manualResponse) {
    setMessage('')
    setManualStatus('')
    setBusy(true)
    try {
      const result = parseManualAiResponse(raw, title.trim() || 'Imported AI Deck')
      const now = new Date().toISOString()
      const importedSettings: GenerationSettings = {
        ...settings,
        cardCount: result.cards.length,
      }
      const deck: Deck = {
        id: makeId(),
        title: result.title,
        cards: result.cards,
        sources,
        settings: importedSettings,
        createdAt: now,
        updatedAt: now,
        syncState: 'local',
      }
      await saveDeck(deck)
      navigate(`/deck/${deck.id}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not import the AI response.')
    } finally {
      setBusy(false)
    }
  }

  async function importManualJsonFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    try {
      const raw = await file.text()
      setManualResponse(raw)
      await importManualAi(raw)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not read the JSON file.')
    }
  }

  return <section>
    <div className="page-head">
      <div>
        <h1>Create Flashcards</h1>
        <p>Upload materials, preserve source wording, and generate a study deck.</p>
      </div>
    </div>

    <div className="create-grid">
      <div className="stack">
        <div className="card">
          <h2>1. Deck & Files</h2>
          <label>
            Deck title
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Database Systems Midterm" />
          </label>
          <label className="dropzone">
            <FileUp size={30} />
            <strong>Upload study materials</strong>
            <span>PDF, DOCX, PPTX, XLS/XLSX, TXT, CSV, JSON, images and text-like files</span>
            <input hidden multiple type="file" onChange={(event) => void addFiles(event.target.files)} />
          </label>
          <div className="file-list">
            {sources.map((source) => <div className="file-row" key={source.id}>
              <div>
                <strong>{source.name}</strong>
                <small>{source.status === 'ready' ? `${source.extractedText.split(/\s+/).length} words extracted` : source.error || source.status}</small>
              </div>
              <button className="icon-btn" onClick={() => {
                setCountSuggestion(null)
                setManualPrompt('')
                setSources((all) => all.filter((item) => item.id !== source.id))
              }}>
                <X size={16} />
              </button>
            </div>)}
          </div>
          {busy && <div className="notice"><LoaderCircle className="spin" size={16} />{message || 'Working…'}</div>}
        </div>

        {hasReadySource && <div className="card">
          <h2>2. Extracted Content Preview</h2>
          {sources.filter((source) => source.status === 'ready').map((source) => <details key={source.id}>
            <summary>{source.name}</summary>
            <textarea
              rows={8}
              value={source.extractedText}
              onChange={(event) => {
                setCountSuggestion(null)
                setManualPrompt('')
                setSources((all) => all.map((item) => item.id === source.id ? { ...item, extractedText: event.target.value } : item))
              }}
            />
          </details>)}
        </div>}
      </div>

      <div className="stack">
        <div className="card">
          <h2>3. Customize AI</h2>
          <div className="two-col">
            <label>
              Number of cards
              <div className="inline-actions">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.cardCount}
                  onChange={(event) => {
                    setCountSuggestion(null)
                    setManualPrompt('')
                    setSettings({ ...settings, cardCount: Math.max(1, Math.min(100, Number(event.target.value) || 1)) })
                  }}
                />
                <button type="button" className="secondary-btn" disabled={busy || suggestingCount || !hasReadySource} onClick={() => void suggestCount()}>
                  {suggestingCount ? <LoaderCircle className="spin" size={16} /> : <Lightbulb size={16} />}
                  Suggest
                </button>
              </div>
            </label>
            <label>
              Card type
              <select value={settings.cardType} onChange={(event) => { setManualPrompt(''); setSettings({ ...settings, cardType: event.target.value as CardType }) }}>
                <option value="mixed">Mixed</option>
                <option value="qa">Question & Answer</option>
                <option value="term-definition">Term & Definition</option>
                <option value="identification">Identification</option>
                <option value="fill-blank">Fill in the Blank</option>
                <option value="concept">Concept & Explanation</option>
              </select>
            </label>
          </div>

          {countSuggestion && <div className="notice">
            <Lightbulb size={16} />
            <span>
              <strong>AI suggests {countSuggestion.recommendedCount} cards</strong> to cover {countSuggestion.topicCount} detected topic{countSuggestion.topicCount === 1 ? '' : 's'}. {countSuggestion.reason}
              {countSuggestion.topics.length > 0 ? ` Topics: ${countSuggestion.topics.join(', ')}.` : ''}
            </span>
          </div>}

          <div className="two-col">
            <label>
              Difficulty
              <select value={settings.difficulty} onChange={(event) => { setManualPrompt(''); setSettings({ ...settings, difficulty: event.target.value as Difficulty }) }}>
                <option value="mixed">Mixed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label>
              Source wording
              <select value={settings.sourceFidelity} onChange={(event) => { setManualPrompt(''); setSettings({ ...settings, sourceFidelity: event.target.value as SourceFidelity }) }}>
                <option value="exact">Exact</option>
                <option value="balanced">Balanced</option>
                <option value="simplified">Simplified</option>
              </select>
            </label>
          </div>

          <label>
            Content focus
            <input
              value={settings.contentFocus.join(', ')}
              onChange={(event) => {
                setManualPrompt('')
                setSettings({ ...settings, contentFocus: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })
              }}
              placeholder="Definitions, Processes, Formulas"
            />
          </label>

          <label>
            Custom AI instructions
            <textarea
              rows={6}
              value={settings.customInstructions}
              onChange={(event) => { setManualPrompt(''); setSettings({ ...settings, customInstructions: event.target.value }) }}
              placeholder="Focus on Chapters 2–4. Keep answers exactly as written in the document."
            />
          </label>

          <div className="notice">Exact mode prioritizes definitions, terminology, dates, formulas and wording from your uploaded source.</div>
          {message && !busy && <div className="error-box">{message}</div>}

          <div className="action-stack">
            <button className="primary-btn full" disabled={busy || !hasReadySource} onClick={() => void generate()}>
              <Sparkles size={18} />Generate with AI API
            </button>
            <button className="secondary-btn full" disabled={busy || !hasReadySource} onClick={() => void prepareManualPrompt()}>
              <Copy size={18} />Use Gemini / ChatGPT Manually
            </button>
            <button className="secondary-btn full" disabled={busy} onClick={() => void createManual()}>
              <Plus size={18} />Create Manual Deck
            </button>
          </div>
        </div>

        {manualPrompt && <div className="card">
          <h2>4. Manual AI Import</h2>
          <p className="muted">Use this when your API quota is unavailable. The AI website does not need direct access to Brainy Deck.</p>
          {manualStatus && <div className="notice"><Copy size={16} />{manualStatus}</div>}

          <label>
            Ready-made AI prompt
            <textarea rows={10} readOnly value={manualPrompt} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <button className="secondary-btn full" type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(manualPrompt)
              setManualStatus('Prompt copied. Paste it into Gemini, ChatGPT, Claude, or another AI.')
            } catch {
              setManualStatus('Clipboard access was blocked. Select the prompt above and copy it manually.')
            }
          }}>
            <Copy size={18} />Copy Prompt Again
          </button>

          <ol className="manual-ai-steps">
            <li>Paste the prompt into Gemini, ChatGPT, Claude, or another AI.</li>
            <li>Wait for it to return the JSON flashcards.</li>
            <li>Copy the entire JSON response and paste it below.</li>
            <li>Click <strong>Import AI Flashcards</strong>.</li>
          </ol>

          <label>
            Paste AI JSON response
            <textarea
              rows={12}
              value={manualResponse}
              onChange={(event) => setManualResponse(event.target.value)}
              placeholder={'{"deckTitle":"...","suggestedCardCount":25,"topics":[...],"flashcards":[...]}' }
            />
          </label>

          <div className="action-stack">
            <button className="primary-btn full" disabled={busy || !manualResponse.trim()} onClick={() => void importManualAi()}>
              <ClipboardPaste size={18} />Import AI Flashcards
            </button>
            <label className="secondary-btn full" style={{ cursor: 'pointer' }}>
              <FileUp size={18} />Import AI JSON File
              <input hidden type="file" accept="application/json,.json,text/plain" onChange={(event) => void importManualJsonFile(event.target.files)} />
            </label>
          </div>

          <div className="notice">Manual AI import does not use your Gemini API quota. The imported deck is saved through Brainy Deck like any other deck.</div>
        </div>}
      </div>
    </div>
  </section>
}
