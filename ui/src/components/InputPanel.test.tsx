import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputPanel } from './InputPanel'

// Helper: render with sensible defaults so each test only overrides what it cares about
function renderInputPanel(overrides: Partial<React.ComponentProps<typeof InputPanel>> = {}) {
  const props = {
    code: '',
    mode: 'file' as const,
    isLoading: false,
    onCodeChange: vi.fn(),
    onModeChange: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  }
  render(<InputPanel {...props} />)
  return props
}

// ---------------------------------------------------------------------------
// Mode toggle
// ---------------------------------------------------------------------------

describe('mode toggle', () => {
  it('renders File and Git Diff buttons', () => {
    renderInputPanel()
    expect(screen.getByRole('button', { name: 'File' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Git Diff' })).toBeInTheDocument()
  })

  it('calls onModeChange with "diff" when Git Diff is clicked', async () => {
    const { onModeChange } = renderInputPanel({ mode: 'file' })
    await userEvent.click(screen.getByRole('button', { name: 'Git Diff' }))
    expect(onModeChange).toHaveBeenCalledWith('diff')
  })

  it('calls onModeChange with "file" when File is clicked', async () => {
    const { onModeChange } = renderInputPanel({ mode: 'diff' })
    await userEvent.click(screen.getByRole('button', { name: 'File' }))
    expect(onModeChange).toHaveBeenCalledWith('file')
  })

  it('shows file-specific hint text in file mode', () => {
    renderInputPanel({ mode: 'file' })
    expect(screen.getByText('Paste a file to review')).toBeInTheDocument()
  })

  it('shows diff-specific hint text in diff mode', () => {
    renderInputPanel({ mode: 'diff' })
    expect(screen.getByText('Paste a git diff to review')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------

describe('textarea', () => {
  it('reflects the code prop as its value', () => {
    renderInputPanel({ code: 'print("hello")' })
    expect(screen.getByRole('textbox')).toHaveValue('print("hello")')
  })

  it('calls onCodeChange when the user types', async () => {
    const { onCodeChange } = renderInputPanel()
    await userEvent.type(screen.getByRole('textbox'), 'x')
    expect(onCodeChange).toHaveBeenCalled()
  })

  it('shows file placeholder in file mode', () => {
    renderInputPanel({ mode: 'file', code: '' })
    expect(screen.getByPlaceholderText('# Paste your code here...')).toBeInTheDocument()
  })

  it('shows diff placeholder in diff mode', () => {
    renderInputPanel({ mode: 'diff', code: '' })
    expect(screen.getByPlaceholderText('Paste git diff output here...')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Character counter
// ---------------------------------------------------------------------------

describe('character counter', () => {
  it('shows "No input" when code is empty', () => {
    renderInputPanel({ code: '' })
    expect(screen.getByText('No input')).toBeInTheDocument()
  })

  it('shows character count when code is non-empty', () => {
    renderInputPanel({ code: 'hello' })
    expect(screen.getByText('5 characters')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Submit button
// ---------------------------------------------------------------------------

describe('submit button', () => {
  it('is disabled when code is empty', () => {
    renderInputPanel({ code: '' })
    expect(screen.getByRole('button', { name: 'Review →' })).toBeDisabled()
  })

  it('is disabled when code is only whitespace', () => {
    renderInputPanel({ code: '   ' })
    expect(screen.getByRole('button', { name: 'Review →' })).toBeDisabled()
  })

  it('is enabled when code has content', () => {
    renderInputPanel({ code: 'x = 1' })
    expect(screen.getByRole('button', { name: 'Review →' })).toBeEnabled()
  })

  it('is disabled while loading', () => {
    renderInputPanel({ code: 'x = 1', isLoading: true })
    expect(screen.getByRole('button', { name: 'Reviewing…' })).toBeDisabled()
  })

  it('shows "Reviewing…" label while loading', () => {
    renderInputPanel({ isLoading: true })
    expect(screen.getByRole('button', { name: 'Reviewing…' })).toBeInTheDocument()
  })

  it('calls onSubmit when clicked with valid code', async () => {
    const { onSubmit } = renderInputPanel({ code: 'x = 1' })
    await userEvent.click(screen.getByRole('button', { name: 'Review →' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('does not call onSubmit when disabled', async () => {
    const { onSubmit } = renderInputPanel({ code: '' })
    await userEvent.click(screen.getByRole('button', { name: 'Review →' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
