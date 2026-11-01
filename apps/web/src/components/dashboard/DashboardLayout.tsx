import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { Logo } from '../brand/Logo'
import { ThemeToggle } from '../ThemeToggle'
import { Button } from '../ui'
import { cn } from '../../lib/cn'
import { ScorecardProvider } from '../../lib/scorecard/ScorecardContext'
import { useScorecard } from '../../lib/scorecard/useScorecard'

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function IconOverview() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 5h7v6H4V5Zm9 0h7v3h-7V5ZM4 14h7v5H4v-5Zm9-3h7v8h-7v-8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconEvaluation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconFlag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 21V4m0 0h9l-1.5 4H5m0 4h11l-1.5 4H5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconGrowth() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 19h4v-6H4v6Zm6 0h4V9h-4v10Zm6 0h4V5h-4v14Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/* Chrome                                                                     */
/* -------------------------------------------------------------------------- */

function DashboardHeader() {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface-glass backdrop-blur">
      <div className="container-custom flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/upload"
            className="rounded-lg focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Logo size="sm" />
          </Link>
          <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />
          <span className="hidden truncate text-sm text-fg-muted sm:block">Interview report</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/upload')}>
            <span aria-hidden="true" className="text-base leading-none">
              +
            </span>
            <span className="hidden sm:inline">New analysis</span>
            <span className="sm:hidden">New</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

interface TabDefinition {
  to: string
  label: string
  icon: ReactNode
  /** Rendered as a count pill when the scorecard provides one. */
  badge?: number
}

function DashboardTabs() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  const { scorecard } = useScorecard()

  const base = `/dashboard/${interviewId}`
  const tabs: TabDefinition[] = [
    { to: `${base}/overview`, label: 'Overview', icon: <IconOverview /> },
    { to: `${base}/evaluation`, label: 'Evaluation', icon: <IconEvaluation /> },
    {
      to: `${base}/discrepancies`,
      label: 'Claim verification',
      icon: <IconFlag />,
      badge: scorecard?.pendingDiscrepancies,
    },
    { to: `${base}/roadmap`, label: 'Growth plan', icon: <IconGrowth />, badge: scorecard?.skillGaps },
  ]

  return (
    <nav aria-label="Interview report tabs" className="border-b border-line bg-surface-card/70">
      <div className="container-custom flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors sm:px-4',
                isActive
                  ? 'border-accent-500 text-fg-strong'
                  : 'border-transparent text-fg-muted hover:border-line-strong hover:text-fg',
              )
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.badge === 'number' && tab.badge > 0 ? (
              <span className="rounded-full bg-accent-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-accent-700 dark:text-accent-300">
                {tab.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function DashboardShell() {
  return (
    <div className="min-h-svh bg-surface">
      <DashboardHeader />
      <DashboardTabs />
      <main className="container-custom max-w-5xl py-8 lg:py-12">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Shell for `/dashboard/:interviewId/*`. Owns the scorecard request so every
 * tab reads the same data from `useScorecard()`.
 */
export function DashboardLayout() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()

  return (
    <ScorecardProvider key={interviewId} interviewId={interviewId}>
      <DashboardShell />
    </ScorecardProvider>
  )
}
