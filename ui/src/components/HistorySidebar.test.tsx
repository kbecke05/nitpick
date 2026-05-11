import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HistoryEntry } from '../types'
import { HistorySidebar } from './HistorySidebar'

// Frozen reference time — all timestamps are relative to this.
const NOW = new Date('2026-01-15T12:00:00Z').getTime()

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'entry-1',
    timestamp: NOW - 30_000, // 30 seconds ago → "just now"
    mode: 'file',
    review: {
      summary: 'Looks good.',
      score: 9,
      bugs: [],
      style_issues: [],
      suggestions: [],
    },
    codeSnippet: 'print("hello")',
    ...overrides,
  }
}

// Fake timers are only used inside the timeAgo describe block below.
// Interaction tests use real timers so userEvent click events complete normally.

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('shows "No reviews yet." when history is empty', () => {
    render(<HistorySidebar history={[]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('No reviews yet.')).toBeInTheDocument()
  })

  it('does not show the clear button when history is empty', () => {
    render(<HistorySidebar history={[]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.queryByTitle('Clear history')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Rendering entries
// ---------------------------------------------------------------------------

describe('entries', () => {
  it('renders the score for each entry', () => {
    const entry = makeEntry({ review: { ...makeEntry().review, score: 7 } })
    render(<HistorySidebar history={[entry]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('7/10')).toBeInTheDocument()
  })

  it('renders the mode label', () => {
    render(<HistorySidebar history={[makeEntry({ mode: 'diff' })]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('diff')).toBeInTheDocument()
  })

  it('renders the code snippet', () => {
    render(<HistorySidebar history={[makeEntry()]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('print("hello")')).toBeInTheDocument()
  })

  it('renders "—" when code snippet is empty', () => {
    render(<HistorySidebar history={[makeEntry({ codeSnippet: '' })]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders multiple entries', () => {
    const entries = [
      makeEntry({ id: 'a', review: { ...makeEntry().review, score: 5 } }),
      makeEntry({ id: 'b', review: { ...makeEntry().review, score: 9 } }),
    ]
    render(<HistorySidebar history={entries} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('5/10')).toBeInTheDocument()
    expect(screen.getByText('9/10')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// timeAgo formatting
// ---------------------------------------------------------------------------

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "just now" for timestamps less than 60s ago', () => {
    render(<HistorySidebar history={[makeEntry({ timestamp: NOW - 30_000 })]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  it('shows minutes ago for timestamps between 1–60 min', () => {
    render(<HistorySidebar history={[makeEntry({ timestamp: NOW - 5 * 60_000 })]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('5m ago')).toBeInTheDocument()
  })

  it('shows hours ago for timestamps between 1–24 hours', () => {
    render(<HistorySidebar history={[makeEntry({ timestamp: NOW - 3 * 3600_000 })]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('3h ago')).toBeInTheDocument()
  })

  it('shows days ago for timestamps older than 24 hours', () => {
    render(<HistorySidebar history={[makeEntry({ timestamp: NOW - 2 * 86400_000 })]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByText('2d ago')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

describe('interactions', () => {
  it('calls onSelect with the entry when clicked', async () => {
    const entry = makeEntry()
    const onSelect = vi.fn()
    render(<HistorySidebar history={[entry]} onSelect={onSelect} onClear={vi.fn()} />)

    await userEvent.click(screen.getByText('print("hello")'))
    expect(onSelect).toHaveBeenCalledWith(entry)
  })

  it('shows the clear button when history has entries', () => {
    render(<HistorySidebar history={[makeEntry()]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByTitle('Clear history')).toBeInTheDocument()
  })

  it('calls onClear when the clear button is clicked', async () => {
    const onClear = vi.fn()
    render(<HistorySidebar history={[makeEntry()]} onSelect={vi.fn()} onClear={onClear} />)
    await userEvent.click(screen.getByTitle('Clear history'))
    expect(onClear).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// Score color coding (via class names)
// ---------------------------------------------------------------------------

describe('score color', () => {
  it('uses green color class for scores >= 8', () => {
    const entry = makeEntry({ review: { ...makeEntry().review, score: 8 } })
    render(<HistorySidebar history={[entry]} onSelect={vi.fn()} onClear={vi.fn()} />)
    const scoreEl = screen.getByText('8/10')
    expect(scoreEl.className).toContain('green')
  })

  it('uses yellow color class for scores 5–7', () => {
    const entry = makeEntry({ review: { ...makeEntry().review, score: 6 } })
    render(<HistorySidebar history={[entry]} onSelect={vi.fn()} onClear={vi.fn()} />)
    const scoreEl = screen.getByText('6/10')
    expect(scoreEl.className).toContain('yellow')
  })

  it('uses red color class for scores < 5', () => {
    const entry = makeEntry({ review: { ...makeEntry().review, score: 3 } })
    render(<HistorySidebar history={[entry]} onSelect={vi.fn()} onClear={vi.fn()} />)
    const scoreEl = screen.getByText('3/10')
    expect(scoreEl.className).toContain('red')
  })
})
