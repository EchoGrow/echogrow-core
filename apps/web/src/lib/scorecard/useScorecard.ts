import { useContext } from 'react'
import { ScorecardContext } from './context'
import type { ScorecardContextValue } from './context'

export function useScorecard(): ScorecardContextValue {
  const context = useContext(ScorecardContext)
  if (!context) throw new Error('useScorecard must be used within a ScorecardProvider')
  return context
}