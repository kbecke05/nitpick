import { Eraser } from 'lucide-react'
import type { HistoryEntry } from '../types'

interface HistorySidebarProps {
  history: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onClear: () => void
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-green-400'
  if (score >= 5) return 'text-yellow-400'
  return 'text-red-400'
}

export function HistorySidebar({ history, onSelect, onClear }: HistorySidebarProps) {
  return (
    <div className="w-56 shrink-0 border-r border-zinc-700 bg-zinc-950 flex flex-col h-screen">

      {/* Header — h-14 matches the main panel header exactly */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-zinc-700">
        <span className="text-sm font-mono text-zinc-500">History</span>
        {history.length > 0 && (
          <button
            onClick={onClear}
            title="Clear history"
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Eraser size={14} />
          </button>
        )}
      </div>

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-xs text-zinc-600 p-3 text-center mt-4">
            No reviews yet.
          </p>
        ) : (
          history.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelect(entry)}
              className="w-full text-left px-3 py-3 border-b border-zinc-800
                         hover:bg-zinc-800 transition-colors group"
            >
              {/* Score + mode badge */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-mono font-bold ${scoreColor(entry.review.score)}`}>
                  {entry.review.score}/10
                </span>
                <span className="text-xs text-zinc-600 font-mono">{entry.mode}</span>
              </div>

              {/* Code snippet preview */}
              <p className="text-xs text-zinc-500 truncate leading-relaxed">
                {entry.codeSnippet || '—'}
              </p>

              {/* Timestamp */}
              <p className="text-xs text-zinc-700 mt-1">{timeAgo(entry.timestamp)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
