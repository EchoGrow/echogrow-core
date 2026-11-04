import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, ListChecks, ShieldAlert, TrendingUp, Plus } from 'lucide-react'
import { Logo } from '../brand/Logo'
import { ThemeToggle } from '../ThemeToggle'
import { Button, toast } from '../ui'
import { cn } from '../../lib/cn'
import { ScorecardProvider } from '../../lib/scorecard/ScorecardContext'
import { useScorecard } from '../../lib/scorecard/useScorecard'
import { staggerContainer } from '../../lib/animations'

function DashboardHeader() {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface-glass backdrop-blur">
      <div className="container-custom flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/upload" className="rounded-lg focus-visible:ring-2 focus-visible:ring-accent-500">
            <Logo size="sm" />
          </Link>
          <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />
          <span className="hidden truncate text-sm text-fg-muted sm:block">Interview report</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/upload')}>
            <Plus className="h-4 w-4" />
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
  badge?: number
}

function DashboardTabs() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  const { scorecard } = useScorecard()
  const base = `/dashboard/${interviewId}`
  
  const isScored = scorecard && scorecard.status === 'scored'
  
  const tabs: TabDefinition[] = [
    { to: `${base}/overview`, label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: `${base}/evaluation`, label: 'Evaluation', icon: <ListChecks className="h-4 w-4" /> },
    { to: `${base}/discrepancies`, label: 'Claim verification', icon: <ShieldAlert className="h-4 w-4" />, badge: isScored ? scorecard.pendingDiscrepancies : undefined },
    { to: `${base}/roadmap`, label: 'Growth plan', icon: <TrendingUp className="h-4 w-4" />, badge: isScored ? scorecard.skillGaps : undefined },
  ]
  
  return (
    <nav aria-label="Interview report tabs" className="border-b border-line bg-surface-card/70">
      <div className="container-custom flex justify-center gap-1 overflow-x-auto sm:gap-4">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'relative inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors sm:px-4',
                isActive ? 'border-accent-500 text-fg-strong' : 'border-transparent text-fg-muted hover:border-line-strong hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 ? (
                  <span className="rounded-full bg-accent-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-accent-700 dark:text-accent-300">
                    {tab.badge}
                  </span>
                ) : null}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-500"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function DashboardShell() {
  const navigate = useNavigate()
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  const { status } = useScorecard()

  useEffect(() => {
    if (status === 'needs-review' && interviewId) {
      navigate(`/dashboard/${interviewId}/review`, { replace: true })
    } else if (status === 'rejected' && interviewId) {
      toast.error('Session Rejected', { description: 'This interview was rejected. Please start a new analysis.' })
      navigate('/upload', { replace: true })
    }
  }, [status, interviewId, navigate])

  return (
    <div className="min-h-svh bg-surface flex flex-col">
      <DashboardHeader />
      {status === 'ready' && <DashboardTabs />}
      <motion.main 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="container-custom w-full max-w-5xl flex-1 py-8 lg:py-12"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}

export function DashboardLayout() {
  const { interviewId = '' } = useParams<{ interviewId: string }>()
  return (
    <ScorecardProvider key={interviewId} interviewId={interviewId}>
      <DashboardShell />
    </ScorecardProvider>
  )
}