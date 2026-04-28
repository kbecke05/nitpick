import type { Mode } from '../types'

interface InputPanelProps {
  code: string
  mode: Mode
  isLoading: boolean
  onCodeChange: (code: string) => void
  onModeChange: (mode: Mode) => void
  onSubmit: () => void
}

export function InputPanel({ code, mode, isLoading, onCodeChange, onModeChange, onSubmit }: InputPanelProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">

      {/* Mode toggle — file vs diff */}
      <div className="flex border-b border-zinc-700">
        {(['file', 'diff'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-4 py-2 text-sm font-mono transition-colors ${
              mode === m
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {m === 'file' ? 'File' : 'Git Diff'}
          </button>
        ))}
        <span className="ml-auto px-4 py-2 text-xs text-zinc-500 self-center">
          {mode === 'file' ? 'Paste a file to review' : 'Paste a git diff to review'}
        </span>
      </div>

      {/* Code textarea */}
      <textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder={mode === 'file'
          ? '# Paste your code here...'
          : 'Paste git diff output here...'
        }
        spellCheck={false}
        className="w-full h-64 bg-transparent p-4 font-mono text-sm text-zinc-200
                   placeholder-zinc-600 resize-none outline-none"
      />

      {/* Submit bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-700">
        <span className="text-xs text-zinc-500">
          {code.length > 0 ? `${code.length} characters` : 'No input'}
        </span>
        <button
          onClick={onSubmit}
          disabled={isLoading || !code.trim()}
          className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-500
                     disabled:opacity-40 disabled:cursor-not-allowed
                     text-sm font-mono text-white transition-colors"
        >
          {isLoading ? 'Reviewing…' : 'Review →'}
        </button>
      </div>
    </div>
  )
}
