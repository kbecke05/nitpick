export interface Bug {
  line: number | null
  severity: 'high' | 'medium' | 'low'
  message: string
}

export interface StyleIssue {
  line: number | null
  message: string
}

export interface Review {
  summary: string
  bugs: Bug[]
  style_issues: StyleIssue[]
  suggestions: string[]
  score: number
}

export type Mode = 'file' | 'diff'

export interface HistoryEntry {
  id: string
  timestamp: number
  mode: Mode
  review: Review
  codeSnippet: string
}
