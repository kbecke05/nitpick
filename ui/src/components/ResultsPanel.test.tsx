import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Review } from '../types'
import { ResultsPanel } from './ResultsPanel'

const SAMPLE_REVIEW: Review = {
  summary: 'A well-structured utility function.',
  score: 8,
  bugs: [
    { line: 5, severity: 'high', message: 'Division by zero possible.' },
    { line: null, severity: 'low', message: 'Unused import.' },
  ],
  style_issues: [
    { line: 3, message: 'Missing type annotation.' },
  ],
  suggestions: ['Add docstring.', 'Consider edge cases.'],
}

const CLEAN_REVIEW: Review = {
  summary: 'Looks great.',
  score: 9,
  bugs: [],
  style_issues: [],
  suggestions: [],
}

// ---------------------------------------------------------------------------
// Null / loading states
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('renders nothing when review is null and not loading', () => {
    const { container } = render(<ResultsPanel review={null} isLoading={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('loading state', () => {
  it('shows loading message while loading', () => {
    render(<ResultsPanel review={null} isLoading={true} />)
    expect(screen.getByText('Reviewing with Claude…')).toBeInTheDocument()
  })

  it('does not show score while loading', () => {
    render(<ResultsPanel review={null} isLoading={true} />)
    expect(screen.queryByText('/10')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Score and summary
// ---------------------------------------------------------------------------

describe('score and summary', () => {
  it('displays the numeric score', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('displays the summary text', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    expect(screen.getByText('A well-structured utility function.')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Bugs section
// ---------------------------------------------------------------------------

describe('bugs section', () => {
  it('shows "No bugs found" when bugs array is empty', () => {
    render(<ResultsPanel review={CLEAN_REVIEW} isLoading={false} />)
    expect(screen.getByText('No bugs found.')).toBeInTheDocument()
  })

  it('renders bug messages when bugs are present', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    expect(screen.getByText('Division by zero possible.')).toBeInTheDocument()
    expect(screen.getByText('Unused import.')).toBeInTheDocument()
  })

  it('renders severity badges', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('low')).toBeInTheDocument()
  })

  it('renders line number when present', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    expect(screen.getByText('L5')).toBeInTheDocument()
  })

  it('renders "—" when line is null', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    // The null-line bug should show the dash placeholder
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('shows bug count in section header', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    expect(screen.getByText('Bugs (2)')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Style issues section
// ---------------------------------------------------------------------------

describe('style issues section', () => {
  it('omits style issues section when array is empty', () => {
    render(<ResultsPanel review={CLEAN_REVIEW} isLoading={false} />)
    expect(screen.queryByText(/style issues/i)).not.toBeInTheDocument()
  })

  it('renders style issue messages when present', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    expect(screen.getByText('Missing type annotation.')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Suggestions section
// ---------------------------------------------------------------------------

describe('suggestions section', () => {
  it('omits suggestions section when array is empty', () => {
    render(<ResultsPanel review={CLEAN_REVIEW} isLoading={false} />)
    expect(screen.queryByText('Suggestions')).not.toBeInTheDocument()
  })

  it('renders each suggestion', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    expect(screen.getByText('Add docstring.')).toBeInTheDocument()
    expect(screen.getByText('Consider edge cases.')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

describe('copy button', () => {
  beforeEach(() => {
    // jsdom doesn't implement clipboard — mock it so the test doesn't crash
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('renders a Copy button', () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('calls clipboard.writeText when Copy is clicked', async () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce()
  })

  it('shows "Copied!" briefly after clicking', async () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
  })

  it('copied text includes score and summary', async () => {
    render(<ResultsPanel review={SAMPLE_REVIEW} isLoading={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))
    const written = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(written).toContain('Score: 8/10')
    expect(written).toContain('A well-structured utility function.')
  })
})
