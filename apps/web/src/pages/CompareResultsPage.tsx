import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { SEO } from '../components/SEO'
import { ThemeToggle } from '../components/ThemeToggle'
import { Alert, Button, Card, Spinner } from '../components/ui'
import { AiComparisonResult } from '../components/compare/AiComparisonResult'
import { getComparison, ApiError, type ComparisonDetailResponse } from '../lib/api'
import { fadeUp, staggerContainer } from '../lib/animations'

export function CompareResultsPage() {
  const { id = '' } = useParams<{ id: string }>()
  const [data, setData] = useState<ComparisonDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    setError(null)

    getComparison(id)
      .then(setData)
      .catch((cause: unknown) => {
        const message =
          cause instanceof ApiError
            ? cause.message
            : 'Could not load the comparison.'
        setError(message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <>
      <SEO
        title="Comparison results"
        description="AI-powered comparison of candidates from EchoGrow."
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
                Comparison results
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/compare">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Back to compare</span>
                  <span className="sm:hidden">Back</span>
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
          className="container-custom w-full max-w-5xl py-8 lg:py-12"
        >
          <motion.div variants={fadeUp} className="mb-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
              Comparison
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl">
              AI-powered comparison
            </h1>
          </motion.div>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Spinner className="h-8 w-8 text-accent-600" />
              <p className="text-sm text-fg-muted">Loading comparison…</p>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <Alert variant="error" title="Could not load the comparison">
                {error}
              </Alert>
              <Button variant="secondary" onClick={load}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && data && data.status === 'PROCESSING' && (
            <Card className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent-600" />
              <h2 className="mt-4 text-base font-semibold text-fg-strong">
                Comparison is still processing
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                EchoGrow is analyzing the candidates using AI. This usually
                takes less than a minute.
              </p>
              <Button className="mt-4" variant="secondary" onClick={load}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </Card>
          )}

          {!loading && !error && data && data.status === 'FAILED' && (
            <Card className="border-danger-500/30 bg-danger-50 p-6 dark:bg-danger-500/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600 dark:text-danger-500" />
                <div>
                  <h2 className="text-sm font-semibold text-danger-700 dark:text-danger-500">
                    Comparison failed
                  </h2>
                  <p className="mt-1 text-sm text-danger-700/80 dark:text-danger-500/80">
                    {data.error ??
                      'The LLM could not produce a valid comparison. Please try again.'}
                  </p>
                  <Link to="/compare">
                    <Button className="mt-3" variant="secondary" size="sm">
                      Start a new comparison
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {!loading && !error && data && data.status === 'COMPLETED' && data.result && (
            <div className="space-y-6">
              <AiComparisonResult result={data.result} />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-card p-4">
                <p className="text-xs text-fg-muted">
                  Compared on{' '}
                  {new Date(data.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link to="/compare">
                    <Button variant="secondary" size="sm">
                      <Sparkles className="mr-2 h-4 w-4" />
                      New comparison
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </motion.main>
      </div>
    </>
  )
}