import { createContext } from 'react'
import type { ScorecardResponse } from '../api'

export type ScorecardStatus = 'loading' | 'ready' | 'processing' | 'not-found' | 'error'

export interface ScorecardState {
  status: ScorecardStatus
  scorecard: ScorecardResponse | null
  error: string | null
}

export interface ScorecardContextValue extends ScorecardState {
  refresh: () => void
}

export const INITIAL_SCORECARD_STATE: ScorecardState = {
  status: 'loading',
  scorecard: null,
  error: null,
}

export const ScorecardContext = createContext<ScorecardContextValue | undefined>(undefined)