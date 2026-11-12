import { createContext } from 'react'
import type { ScorecardResponse, SpkStatus } from '../api'

export type ScorecardStatus = 
  | 'loading' 
  | 'ready' 
  | 'processing' 
  | 'needs-review' 
  | 'rejected'
  | 'failed'
  | 'not-found' 
  | 'error';

export interface ScorecardState {
  status: ScorecardStatus
  scorecard: ScorecardResponse | null
  error: string | null
}

export interface ScorecardContextValue extends ScorecardState {
  refresh: () => void
  /** Reloads the entire dashboard (scorecard + all tabs + layout). */
  retryAll: () => void
  /**
   * Optimistic update: set spkStatus immediately so the UI reacts before
   * the next poll. Used by rebuild buttons in any tab.
   */
  setSpkStatus: (status: SpkStatus, error?: string | null) => void
}

export const INITIAL_SCORECARD_STATE: ScorecardState = {
  status: 'loading',
  scorecard: null,
  error: null,
}

export const ScorecardContext = createContext<ScorecardContextValue | undefined>(undefined)