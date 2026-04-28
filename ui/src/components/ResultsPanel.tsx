import { useState } from 'react'
import type { Bug, Review, StyleIssue } from '../types'

interface ResultsPanelProps {
  review: Review | null
  isLoading: boolean
}

const SEVERITY_STYLES: Record<Bug['severity'], string> = {
  high:   'bg-red-900/50 text-red-400 border border-red-800',
  medium: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
  low:    'bg-cyan-900/50 text-cyan-400 border border-cyan-800',
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-green-400'
  if (score >= 5) return 'text-yellow-400'
  return 'text-red-400'
}

function BugRow({ bug }: { bug: Bug }) {
  return (
    <div className="flex gap-3 py-2 border-b border-zinc-800 last:border-0">
      <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-mono uppercase ${SEVERITY_STYLES[bug.severity]}`}>
        {bug.severity}
      </span>
      <span className="text-zinc-500 text-xs font-mono shrink-0 pt-0.5">
        {bug.line != null ? `L${bug.line}` : '—'}
      </span>
      <span className="text-zinc-300 text-sm">{bug.message}</span>
    </div>
  )
}

function StyleRow({ issue }: { issue: StyleIssue }) {
  return (
    <div className="flex gap-3 py-2 border-b border-zinc-800 last:border-0">
      <span className="text-zinc-500 text-xs font-mono shrink-0 pt-0.5">
        {issue.line != null ? `L${issue.line}` : '—'}
      </span>
      <span className="text-zinc-300 text-sm">{issue.message}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-2 border-b border-zinc-700 text-xs font-mono text-zinc-400 uppercase tracking-wider">
        {title}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[80, 60, 90, 50].map((w, i) => (
        <div key={i} className={`h-4 bg-zinc-800 rounded`} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

function buildCopyText(review: Review): string {
  const lines: string[] = [`Score: ${review.score}/10`, '', review.summary]
  if (review.bugs.length > 0) {
    lines.push('', 'Bugs:')
    review.bugs.forEach(b => {
      const loc = b.line != null ? ` (L${b.line})` : ''
      lines.push(`  [${b.severity.toUpperCase()}]${loc} ${b.message}`)
    })
  }
  if (review.style_issues.length > 0) {
    lines.push('', 'Style Issues:')
    review.style_issues.forEach(i => {
      const loc = i.line != null ? ` (L${i.line})` : ''
      lines.push(`  ${loc} ${i.message}`)
    })
  }
  if (review.suggestions.length > 0) {
    lines.push('', 'Suggestions:')
    review.suggestions.forEach(s => lines.push(`  → ${s}`))
  }
  return lines.join('\n')
}

export function ResultsPanel({ review, isLoading }: ResultsPanelProps) {
  const [copied, setCopied] = useState(false)

  if (!review && !isLoading) return null

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
        <div className="text-xs font-mono text-zinc-500 mb-4">Reviewing with Claude…</div>
        <LoadingSkeleton />
      </div>
    )
  }

  // At this point TypeScript knows review is not null
  const { summary, bugs, style_issues, suggestions, score } = review!

  function handleCopy() {
    navigator.clipboard.writeText(buildCopyText(review!))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">

      {/* Score + summary */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 flex gap-4 items-start">
        <div className="text-center shrink-0">
          <div className={`text-3xl font-mono font-bold ${scoreColor(score)}`}>{score}</div>
          <div className="text-xs text-zinc-500">/10</div>
        </div>
        <p className="text-zinc-300 text-sm leading-relaxed pt-1 flex-1">{summary}</p>
        <button
          onClick={handleCopy}
          className="shrink-0 text-xs font-mono px-2 py-1 rounded border border-zinc-700
                     text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Bugs */}
      <Section title={`Bugs (${bugs.length})`}>
        {bugs.length === 0
          ? <p className="text-green-400 text-sm">No bugs found.</p>
          : bugs.map((bug, i) => <BugRow key={i} bug={bug} />)
        }
      </Section>

      {/* Style issues */}
      {style_issues.length > 0 && (
        <Section title={`Style Issues (${style_issues.length})`}>
          {style_issues.map((issue, i) => <StyleRow key={i} issue={issue} />)}
        </Section>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Section title="Suggestions">
          <ul className="space-y-2">
            {suggestions.map((s, i) => (
              <li key={i} className="text-zinc-300 text-sm flex gap-2">
                <span className="text-violet-400 shrink-0">→</span>
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
