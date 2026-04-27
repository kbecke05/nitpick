import { useEffect, useState } from 'react'
import { HistorySidebar } from './components/HistorySidebar'
import { InputPanel } from './components/InputPanel'
import { ResultsPanel } from './components/ResultsPanel'
import type { HistoryEntry, Mode, Review } from './types'

export default function App() {
  // --- State ---

  const [mode, setMode] = useState<Mode>('file')
  // Each mode tracks its own input independently so switching tabs doesn't wipe your work.
  const [codes, setCodes] = useState<Record<Mode, string>>({ file: '', diff: '' })
  const code = codes[mode]
  const handleCodeChange = (value: string) => setCodes(prev => ({ ...prev, [mode]: value }))
  const [review, setReview] = useState<Review | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize history from localStorage on first render only.
  // The function form of useState runs once — not on every render.
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('nitpick-history')
    return saved ? JSON.parse(saved) : []
  })

  // Sync history to localStorage every time it changes.
  useEffect(() => {
    localStorage.setItem('nitpick-history', JSON.stringify(history))
  }, [history])

  // --- API call ---

  async function handleSubmit() {
    if (!code.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, mode }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail ?? 'Review failed. Is the server running?')
      }

      const data: Review = await res.json()
      setReview(data)

      // Save to history — keep at most 20 entries
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        mode,
        review: data,
        codeSnippet: code.slice(0, 80),
      }
      setHistory(prev => [entry, ...prev].slice(0, 20))

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      // Always runs — turns off the spinner whether we succeeded or failed
      setIsLoading(false)
    }
  }

  // --- Render ---

  return (
    <div className="flex h-screen text-zinc-200 overflow-hidden">

      <HistorySidebar
        history={history}
        onSelect={(entry) => setReview(entry.review)}
        onClear={() => setHistory([])}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header — h-14 matches the sidebar header exactly */}
        <header className="h-14 shrink-0 px-6 border-b border-zinc-700 flex items-center gap-3">
          <span className="text-lg font-mono font-bold text-violet-400">nitpick</span>
          <span className="text-zinc-600 text-sm">AI code review</span>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <InputPanel
            code={code}
            mode={mode}
            isLoading={isLoading}
            onCodeChange={handleCodeChange}
            onModeChange={setMode}
            onSubmit={handleSubmit}
          />

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-red-400 text-sm font-mono">
              {error}
            </div>
          )}

          <ResultsPanel review={review} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
