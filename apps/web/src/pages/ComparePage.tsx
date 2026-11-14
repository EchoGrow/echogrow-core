import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { SEO } from '../components/SEO'
import { ThemeToggle } from '../components/ThemeToggle'
import { Alert, Button, Card, Spinner, toast } from '../components/ui'
import {
  CandidateGroupCard,
  type CandidateGroup,
} from '../components/compare/CandidateGroupCard'
import { CandidateModal } from '../components/compare/CandidateModal'
import {
  compareCandidates,
  getCompletedInterviews,
  ApiError,
  type InterviewListItem,
} from '../lib/api'
import { JOB_TITLES } from '@echogrow/shared'
import { cn } from '../lib/cn'
import { fadeUp, staggerContainer } from '../lib/animations'

const MAX_CANDIDATES = 10
const PAGE_SIZE = 6

type SelectionMap = Map<string, string>

export function ComparePage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<InterviewListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionMap>(new Map())
  const [targetRole, setTargetRole] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isComparing, setIsComparing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [modalGroup, setModalGroup] = useState<CandidateGroup | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getCompletedInterviews()
      .then((data) => {
        if (!cancelled) setSessions(data.interviews)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        const message =
          cause instanceof ApiError
            ? cause.message
            : 'Could not load candidates.'
        setError(message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const groups = useMemo<CandidateGroup[]>(() => {
    const byEmail = new Map<string, InterviewListItem[]>()
    for (const s of sessions) {
      const key = s.candidateEmail.toLowerCase()
      const arr = byEmail.get(key) ?? []
      arr.push(s)
      byEmail.set(key, arr)
    }

    const result: CandidateGroup[] = []
    for (const [email, list] of byEmail) {
      const sorted = [...list].sort((a, b) => {
        const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return tb - ta
      })
      result.push({
        email,
        name: sorted[0].candidateName,
        sessions: sorted,
        latest: sorted[0],
      })
    }

    result.sort((a, b) => {
      const ta = a.latest.completedAt
        ? new Date(a.latest.completedAt).getTime()
        : 0
      const tb = b.latest.completedAt
        ? new Date(b.latest.completedAt).getTime()
        : 0
      return tb - ta
    })

    return result
  }, [sessions])

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q),
    )
  }, [groups, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / PAGE_SIZE),
  )
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredGroups.length)
  const pageGroups = filteredGroups.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const goToPage = (page: number, dir: 1 | -1) => {
    if (page < 1 || page > totalPages) return
    setDirection(dir)
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectSessionForEmail = (email: string, sessionId: string) => {
    setSelection((prev) => {
      const next = new Map(prev)
      if (next.get(email) === sessionId) {
        next.delete(email)
      } else {
        if (next.size >= MAX_CANDIDATES && !next.has(email)) {
          toast.error('Too many candidates', {
            description: `You can compare up to ${MAX_CANDIDATES} candidates at once.`,
          })
          return prev
        }
        next.set(email, sessionId)
      }
      return next
    })
  }

  const selectSessionFromModal = (sessionId: string) => {
    if (!modalGroup) return
    const belongs = modalGroup.sessions.some((s) => s.id === sessionId)
    if (!belongs) return
    selectSessionForEmail(modalGroup.email, sessionId)
  }

  const selectedByEmail = useMemo(() => {
    const map = new Map<string, InterviewListItem | null>()
    for (const g of groups) {
      const sid = selection.get(g.email)
      map.set(
        g.email,
        sid ? (g.sessions.find((s) => s.id === sid) ?? null) : null,
      )
    }
    return map
  }, [groups, selection])

  const handleCompare = async () => {
    const ids = Array.from(selection.values())
    if (ids.length < 2) {
      toast.error('Select at least 2 candidates', {
        description: 'Pick 2 or more candidates to compare.',
      })
      return
    }
    if (ids.length > MAX_CANDIDATES) {
      toast.error('Too many candidates', {
        description: `Maximum is ${MAX_CANDIDATES}.`,
      })
      return
    }

    setIsComparing(true)
    try {
      const result = await compareCandidates(
        ids,
        targetRole.trim() || undefined,
      )
      toast.success('Comparison ready', {
        description: `EchoGrow compared ${ids.length} candidate${
          ids.length === 1 ? '' : 's'
        }.`,
      })
      navigate(`/compare/results/${result.id}`)
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : 'Comparison failed.'
      toast.error('Comparison failed', { description: message })
      setIsComparing(false)
    }
  }

  const showPagination =
    !loading && !error && filteredGroups.length > PAGE_SIZE
  const selectedCount = selection.size

  const modalSelectedSession = modalGroup
    ? selectedByEmail.get(modalGroup.email) ?? null
    : null

  return (
    <>
      <SEO
        title="Compare candidates"
        description="Compare multiple candidates side by side with AI-powered analysis from EchoGrow."
        noIndex
      />
      <div className="min-h-svh bg-surface">
        <header className="sticky top-0 z-20 border-b border-line bg-surface-glass backdrop-blur">
          <div className="container-custom flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                to="/upload"
                className="rounded-lg focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <Logo size="sm" />
              </Link>
              <span
                aria-hidden="true"
                className="hidden h-6 w-px bg-line sm:block"
              />
              <span className="hidden text-sm text-fg-muted sm:block">
                Compare
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/analytics">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </Button>
              </Link>
              <Link to="/upload">
                <Button variant="ghost" size="sm">
                  <Sparkles className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New analysis</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <motion.main
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="container-custom w-full py-8 lg:py-12"
        >
          <motion.div variants={fadeUp} className="mb-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
              Compare
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl lg:text-4xl">
              Compare candidates with AI
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
              Select 2 or more candidates. EchoGrow will analyze their verified
              interview evidence, rank them, and highlight strengths and
              concerns using AI. Optionally specify a target role for a
              role-fit comparison. If a candidate has multiple interviews, pick
              one to represent them.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <motion.div variants={fadeUp}>
                <Card className="p-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-line-strong bg-surface-card py-2 pl-9 pr-3 text-sm text-fg transition-all focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                    />
                  </div>
                  {searchQuery.trim() && !loading && !error && (
                    <p className="mt-2 text-xs text-fg-muted">
                      {filteredGroups.length === 0
                        ? 'No matches found'
                        : `${filteredGroups.length} candidate${
                            filteredGroups.length === 1 ? '' : 's'
                          } match`}
                    </p>
                  )}
                </Card>
              </motion.div>

              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Spinner className="h-8 w-8 text-accent-600" />
                  <p className="text-sm text-fg-muted">Loading candidates…</p>
                </div>
              )}

              {error && (
                <Alert variant="error" title="Could not load candidates">
                  {error}
                </Alert>
              )}

              {!loading && !error && groups.length === 0 && (
                <Card className="p-8 text-center">
                  <Users className="mx-auto h-10 w-10 text-fg-muted" />
                  <h3 className="mt-3 text-base font-semibold text-fg-strong">
                    No completed candidates yet
                  </h3>
                  <p className="mt-1 text-sm text-fg-muted">
                    Analyze an interview first, then come back to compare.
                  </p>
                  <Link to="/upload">
                    <Button className="mt-4" variant="primary">
                      Analyze an interview
                    </Button>
                  </Link>
                </Card>
              )}

              {!loading && !error && filteredGroups.length > 0 && (
                <>
                  <motion.div
                    variants={fadeUp}
                    className="flex items-center justify-between text-xs text-fg-muted"
                  >
                    <span>
                      Showing{' '}
                      <strong className="font-semibold text-fg-strong">
                        {startIndex + 1}–{endIndex}
                      </strong>{' '}
                      of{' '}
                      <strong className="font-semibold text-fg-strong">
                        {filteredGroups.length}
                      </strong>{' '}
                      {filteredGroups.length === 1
                        ? 'candidate'
                        : 'candidates'}
                    </span>
                    {showPagination && (
                      <span className="tabular-nums">
                        Page {safePage} of {totalPages}
                      </span>
                    )}
                  </motion.div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={safePage}
                      initial={{
                        opacity: 0,
                        x: direction > 0 ? 40 : -40,
                      }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{
                        opacity: 0,
                        x: direction > 0 ? -40 : 40,
                      }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="grid gap-3 sm:grid-cols-2"
                    >
                      {pageGroups.map((group) => (
                        <CandidateGroupCard
                          key={group.email}
                          group={group}
                          selectedSession={
                            selectedByEmail.get(group.email) ?? null
                          }
                          onSelectSession={(sessionId) =>
                            selectSessionForEmail(group.email, sessionId)
                          }
                          onOpenModal={() => setModalGroup(group)}
                          disabled={isComparing}
                        />
                      ))}
                    </motion.div>
                  </AnimatePresence>

                  {showPagination && (
                    <motion.div
                      variants={fadeUp}
                      className="mt-2 flex items-center justify-center gap-2"
                    >
                      <PaginationButton
                        onClick={() => goToPage(safePage - 1, -1)}
                        disabled={safePage === 1}
                        ariaLabel="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </PaginationButton>

                      <div className="flex items-center gap-1">
                        {buildPageNumbers(safePage, totalPages).map(
                          (page, idx) => {
                            if (page === '...') {
                              return (
                                <span
                                  key={`ellipsis-${idx}`}
                                  className="px-2 text-xs text-fg-muted"
                                >
                                  …
                                </span>
                              )
                            }
                            const isActive = page === safePage
                            return (
                              <motion.button
                                key={page}
                                type="button"
                                onClick={() =>
                                  goToPage(
                                    page as number,
                                    (page as number) > safePage ? 1 : -1,
                                  )
                                }
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                  'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-all',
                                  isActive
                                    ? 'bg-accent-500 text-white shadow-sm'
                                    : 'border border-line bg-surface-card text-fg-muted hover:border-accent-300 hover:text-fg-strong',
                                )}
                                aria-current={isActive ? 'page' : undefined}
                              >
                                {page}
                              </motion.button>
                            )
                          },
                        )}
                      </div>

                      <PaginationButton
                        onClick={() => goToPage(safePage + 1, 1)}
                        disabled={safePage === totalPages}
                        ariaLabel="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </PaginationButton>
                    </motion.div>
                  )}
                </>
              )}

              {!loading &&
                !error &&
                groups.length > 0 &&
                filteredGroups.length === 0 && (
                  <Card className="p-6 text-center text-sm text-fg-muted">
                    No candidates match your search.
                  </Card>
                )}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <motion.div variants={fadeUp}>
                <Card className="p-5">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                    <h2 className="text-sm font-semibold text-fg-strong">
                      Target role (optional)
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    Specify a role to get a fit score and role-specific ranking.
                  </p>

                  <input
                    type="text"
                    placeholder="e.g. Senior Backend Developer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    disabled={isComparing}
                    className="mt-3 w-full rounded-lg border border-line-strong bg-surface-card px-3 py-2 text-sm text-fg transition-all focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                    list="job-titles-list"
                  />
                  <datalist id="job-titles-list">
                    {JOB_TITLES.slice(0, 200).map((j) => (
                      <option key={j.id} value={j.title} />
                    ))}
                  </datalist>

                  <p className="mt-2 text-[11px] text-fg-muted">
                    Tip: start typing to see suggestions.
                  </p>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-fg-strong">
                    Selection
                  </h2>
                  <p className="mt-1 text-xs text-fg-muted">
                    {selectedCount} of {MAX_CANDIDATES} candidates selected
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-chip">
                    <div
                      className="h-full rounded-full bg-accent-500 transition-all duration-300"
                      style={{
                        width: `${(selectedCount / MAX_CANDIDATES) * 100}%`,
                      }}
                    />
                  </div>

                  <Button
                    size="md"
                    className="mt-4 w-full"
                    onClick={handleCompare}
                    loading={isComparing}
                    disabled={selectedCount < 2 || isComparing}
                  >
                    {isComparing ? (
                      'Comparing with AI…'
                    ) : (
                      <>
                        Compare {selectedCount} candidate
                        {selectedCount === 1 ? '' : 's'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="mt-2 text-center text-[10px] text-fg-muted">
                    Simulating Agent David's matching logic · Powered by AI
                  </p>
                </Card>
              </motion.div>
            </aside>
          </div>
        </motion.main>
      </div>

      <CandidateModal
        group={modalGroup}
        selectedSession={modalSelectedSession}
        onSelectSession={selectSessionFromModal}
        onClose={() => setModalGroup(null)}
        disabled={isComparing}
      />
    </>
  )
}

interface PaginationButtonProps {
  onClick: () => void
  disabled: boolean
  ariaLabel: string
  children: React.ReactNode
}

function PaginationButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: PaginationButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileHover={disabled ? undefined : { scale: 1.05 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border transition-all',
        disabled
          ? 'cursor-not-allowed border-line bg-chip text-fg-muted/40'
          : 'border-line bg-surface-card text-fg-muted hover:border-accent-300 hover:text-fg-strong hover:shadow-sm',
      )}
    >
      {children}
    </motion.button>
  )
}

function buildPageNumbers(
  current: number,
  total: number,
): Array<number | '...'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: Array<number | '...'> = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}