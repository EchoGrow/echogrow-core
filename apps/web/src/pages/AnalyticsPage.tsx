import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flag,
  Layers,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Logo } from '../components/brand/Logo'
import { SEO } from '../components/SEO'
import { ThemeToggle } from '../components/ThemeToggle'
import { Alert, Button, Spinner } from '../components/ui'
import { KpiCard } from '../components/analytics/KpiCard'
import { ChartCard } from '../components/analytics/ChartCard'
import { RecentInterviewsTable } from '../components/analytics/RecentInterviewsTable'
import { CustomTooltip } from '../components/analytics/CustomTooltip'
import { AnalyticsDetailModal } from '../components/analytics/AnalyticsDetailModal'
import { InsightsSection } from '../components/analytics/InsightsSection'
import { ExportReportButton } from '../components/analytics/ExportReportButton'
import {
  getAnalyticsSummary,
  ApiError,
} from '../lib/api'
import type {
  AnalyticsRange,
  AnalyticsSummary,
  AnalyticsDetailType,
} from '@echogrow/shared'
import { cn } from '../lib/cn'
import { fadeUp, staggerContainer } from '../lib/animations'
import { useTheme } from '../lib/theme/ThemeContext'

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

const SKILL_COLORS = [
  '#22a985',
  '#3dd9a4',
  '#6ee7bd',
  '#178a6c',
  '#146c57',
  '#11473b',
  '#a7f3d6',
  '#d1fae9',
  '#ecfdf7',
  '#f0fdf4',
]

const MODAL_META: Record<
  AnalyticsDetailType,
  { title: string; description: string }
> = {
  interviews: {
    title: 'All interviews',
    description: 'Every interview session in the selected range',
  },
  'completion-breakdown': {
    title: 'Completion breakdown',
    description: 'How interviews are distributed across statuses',
  },
  'processing-times': {
    title: 'Processing times',
    description: 'Time saved per interview vs manual review',
  },
  discrepancies: {
    title: 'Discrepancy details',
    description: 'Pending, confirmed, and dismissed flags per candidate',
  },
  scores: {
    title: 'Score details',
    description: 'Per-candidate dimension scores and distribution',
  },
  skills: {
    title: 'Skill gaps details',
    description: 'All skill gaps by candidate',
  },
  'needs-review': {
    title: 'Needs review',
    description: 'Interviews waiting for human review',
  },
}

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalType, setModalType] = useState<AnalyticsDetailType | null>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const load = (r: AnalyticsRange) => {
    setLoading(true)
    setError(null)
    getAnalyticsSummary(r)
      .then(setData)
      .catch((cause: unknown) => {
        const message =
          cause instanceof ApiError
            ? cause.message
            : 'Could not load analytics.'
        setError(message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const axisColor = isDark ? '#a3b4cc' : '#5a6b85'
  const gridColor = isDark ? '#223049' : '#e3e9f2'

  const radarData = data
    ? [
        {
          dimension: 'Technical',
          score: data.charts.dimensionAverages.technicalDepth,
        },
        {
          dimension: 'Communication',
          score: data.charts.dimensionAverages.communication,
        },
        {
          dimension: 'Domain',
          score: data.charts.dimensionAverages.domainExperience,
        },
        {
          dimension: 'Problem Solving',
          score: data.charts.dimensionAverages.problemSolving,
        },
      ]
    : []

  const openModal = (type: AnalyticsDetailType) => setModalType(type)

  return (
    <>
      <SEO
        title="Analytics"
        description="Aggregate metrics across all interviews, powered by EchoGrow."
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
                Analytics
              </span>
            </div>
            <div className="flex items-center gap-2">
              {data && <ExportReportButton data={data} />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => load(range)}
                disabled={loading}
              >
                <RefreshCw
                  className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
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
          <motion.div
            variants={fadeUp}
            className="mb-6 flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-accent-700 uppercase dark:text-accent-300">
                System Analytics
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl lg:text-4xl">
                EchoGrow Analytics
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
                Aggregate metrics across all interviews. Click any card to see
                the underlying data.
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-line bg-surface-card p-1">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRange(opt.value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                    range === opt.value
                      ? 'bg-accent-500 text-white shadow-sm'
                      : 'text-fg-muted hover:text-fg-strong',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Spinner className="h-8 w-8 text-accent-600" />
              <p className="text-sm text-fg-muted">Loading analytics…</p>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <Alert variant="error" title="Could not load analytics">
                {error}
              </Alert>
              <Button variant="secondary" onClick={() => load(range)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-6">
              <motion.div
                variants={fadeUp}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <KpiCard
                  label="Total interviews"
                  value={data.kpis.totalInterviews}
                  hint={`${data.kpis.completedInterviews} completed · ${data.kpis.failedInterviews} failed`}
                  icon={Layers}
                  tone="accent"
                  onClick={() => openModal('interviews')}
                />
                <KpiCard
                  label="Completion rate"
                  value={`${data.kpis.completionRate}%`}
                  hint="Completed / Total"
                  icon={CheckCircle2}
                  tone={
                    data.kpis.completionRate >= 70
                      ? 'success'
                      : data.kpis.completionRate >= 40
                        ? 'warning'
                        : 'danger'
                  }
                  onClick={() => openModal('completion-breakdown')}
                />
                <KpiCard
                  label="Avg processing time"
                  value={data.kpis.avgProcessingTimeSeconds}
                  suffix="sec"
                  hint="From upload to scored"
                  icon={Clock}
                  tone="accent"
                  onClick={() => openModal('processing-times')}
                />
                <KpiCard
                  label="Avg discrepancies"
                  value={data.kpis.avgDiscrepanciesPerInterview}
                  hint="Per completed interview"
                  icon={Flag}
                  tone="warning"
                  onClick={() => openModal('discrepancies')}
                />
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <KpiCard
                  label="Avg overall score"
                  value={data.kpis.avgOverallScore}
                  suffix="/ 5"
                  icon={Target}
                  tone="success"
                  onClick={() => openModal('scores')}
                />
                <KpiCard
                  label="Avg skill gaps"
                  value={data.kpis.avgSkillGapsPerInterview}
                  hint="Per completed interview"
                  icon={TrendingUp}
                  tone="warning"
                  onClick={() => openModal('skills')}
                />
                <KpiCard
                  label="Needs review"
                  value={data.kpis.needsReviewInterviews}
                  hint={`${data.kpis.rejectedInterviews} rejected`}
                  icon={AlertCircle}
                  tone={
                    data.kpis.needsReviewInterviews > 0 ? 'warning' : 'success'
                  }
                  onClick={() => openModal('needs-review')}
                />
              </motion.div>

              <InsightsSection data={data} onModalOpen={openModal} />

              <motion.div
                variants={fadeUp}
                className="grid gap-4 lg:grid-cols-2"
              >
                <ChartCard
                  title="Top missing skills"
                  description={`Showing data for ${range}`}
                >
                  {data.charts.topMissingSkills.length === 0 ? (
                    <p className="py-8 text-center text-sm text-fg-muted">
                      No skill gaps recorded.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={data.charts.topMissingSkills}
                        layout="vertical"
                        margin={{ left: 10, right: 16, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={gridColor}
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          stroke={axisColor}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="skill"
                          stroke={axisColor}
                          tick={{ fontSize: 10 }}
                          width={120}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: isDark ? '#1c273d' : '#f1f5fb' }}
                        />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                          {data.charts.topMissingSkills.map((_, i) => (
                            <Cell
                              key={i}
                              fill={SKILL_COLORS[i % SKILL_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>

                <ChartCard
                  title="Dimension averages"
                  description={`Average score per dimension · ${range}`}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={gridColor} />
                      <PolarAngleAxis
                        dataKey="dimension"
                        stroke={axisColor}
                        tick={{ fontSize: 11 }}
                      />
                      <Radar
                        name="Average score"
                        dataKey="score"
                        stroke="#22a985"
                        fill="#22a985"
                        fillOpacity={0.35}
                      />
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </motion.div>

              <motion.div variants={fadeUp}>
                <ChartCard
                  title="Interviews per day"
                  description={`Activity for ${range}`}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                      data={data.charts.interviewsPerDay}
                      margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={gridColor}
                      />
                      <XAxis
                        dataKey="date"
                        stroke={axisColor}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => v.slice(5)}
                      />
                      <YAxis
                        stroke={axisColor}
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Total"
                        stroke="#22a985"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </motion.div>

              <motion.div variants={fadeUp}>
                <ChartCard
                  title="Top discrepancy claims"
                  description={`Most frequent claims · ${range}`}
                >
                  {data.charts.topDiscrepancyClaims.length === 0 ? (
                    <p className="py-8 text-center text-sm text-fg-muted">
                      No discrepancies recorded.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={data.charts.topDiscrepancyClaims}
                        layout="vertical"
                        margin={{ left: 40, right: 16, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={gridColor}
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          stroke={axisColor}
                          tick={{ fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="claim"
                          stroke={axisColor}
                          tick={{ fontSize: 11 }}
                          width={180}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: isDark ? '#1c273d' : '#f1f5fb' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar
                          dataKey="highSeverityCount"
                          name="High"
                          stackId="a"
                          fill="#ef4444"
                        />
                        <Bar
                          dataKey="mediumSeverityCount"
                          name="Medium"
                          stackId="a"
                          fill="#eab308"
                        />
                        <Bar
                          dataKey="lowSeverityCount"
                          name="Low"
                          stackId="a"
                          fill="#22c55e"
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartCard>
              </motion.div>

              <motion.div variants={fadeUp}>
                <ChartCard
                  title="Recent interviews"
                  description="Last 10 interviews in the selected range"
                >
                  <RecentInterviewsTable
                    interviews={data.tables.recentInterviews}
                  />
                </ChartCard>
              </motion.div>

              <p className="pt-2 text-center text-xs text-fg-muted">
                Generated {new Date(data.generatedAt).toLocaleString('en-GB')} ·
                Range: {data.range}
              </p>
            </div>
          )}
        </motion.main>
      </div>

      <AnalyticsDetailModal
        type={modalType}
        range={range}
        title={modalType ? MODAL_META[modalType].title : ''}
        description={modalType ? MODAL_META[modalType].description : ''}
        onClose={() => setModalType(null)}
      />
    </>
  )
}