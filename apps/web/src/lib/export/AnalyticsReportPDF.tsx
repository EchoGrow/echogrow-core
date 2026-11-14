import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import type { AnalyticsSummary } from '@echogrow/shared'

const COLORS = {
  navy: '#0e1e37',
  navyDeep: '#071120',
  navyMid: '#2c3e58',
  navyMuted: '#5a6b85',
  accent: '#22a985',
  accentDeep: '#146c57',
  surface: '#f7f9fc',
  line: '#e3e9f2',
  warning: '#eab308',
  warningSoft: '#fefce8',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  success: '#22c55e',
  successSoft: '#f0fdf4',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.navy,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  logo: { width: 32, height: 32, marginRight: 10 },
  brandName: { fontSize: 14, fontWeight: 'bold', color: COLORS.navyDeep },
  brandTagline: {
    fontSize: 7,
    color: COLORS.navyMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.navyDeep,
    marginBottom: 4,
  },
  subtitle: { fontSize: 9, color: COLORS.navyMuted, marginBottom: 20 },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: '31%',
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  kpiLabel: {
    fontSize: 7,
    color: COLORS.navyMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.navyDeep,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.navyDeep,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },

  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.navyMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: { fontSize: 9, color: COLORS.navy },
  tableCellMuted: { fontSize: 8.5, color: COLORS.navyMuted },

  insight: {
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  insightText: { fontSize: 9, color: COLORS.navyMid, lineHeight: 1.4 },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7.5,
    color: COLORS.navyMuted,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 6,
  },
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function generateInsights(data: AnalyticsSummary): string[] {
  const insights: string[] = []

  // Top skill
  if (data.charts.topMissingSkills.length > 0) {
    const top = data.charts.topMissingSkills[0]
    insights.push(
      `Top skill gap: "${top.skill}" appears in ${top.count} candidate${top.count === 1 ? '' : 's'}. Consider adding a dedicated upskilling module for this skill.`,
    )
  }

  // Completion rate
  if (data.kpis.completionRate < 70) {
    insights.push(
      `Completion rate is ${data.kpis.completionRate}% (${data.kpis.failedInterviews} failed, ${data.kpis.needsReviewInterviews} need review). Investigate failed interviews to identify systemic issues.`,
    )
  } else {
    insights.push(
      `Completion rate is healthy at ${data.kpis.completionRate}%.`,
    )
  }

  // Processing time savings (accurate now)
  if (data.kpis.avgProcessingTimeSeconds > 0) {
    const manualMinutes =
      5 +
      data.kpis.avgDiscrepanciesPerInterview * 3 +
      data.kpis.avgSkillGapsPerInterview * 4
    const manualSeconds = manualMinutes * 60
    const savedSeconds = manualSeconds - data.kpis.avgProcessingTimeSeconds
    if (savedSeconds > 0) {
      const savedMinutes = Math.round(savedSeconds / 60)
      const savedPercent = Math.round((savedSeconds / manualSeconds) * 100)
      insights.push(
        `Each interview saves ~${savedMinutes} min vs manual review (${Math.round(manualMinutes)} min manual vs ${data.kpis.avgProcessingTimeSeconds}s EchoGrow, ${savedPercent}% faster).`,
      )
    }
  }

  // Retry tracking
  if (data.kpis.retriedInterviews > 0) {
    const retryRate =
      data.kpis.completedInterviews > 0
        ? Math.round(
            (data.kpis.retriedInterviews / data.kpis.completedInterviews) * 100,
          )
        : 0
    insights.push(
      `${data.kpis.retriedInterviews} interview${data.kpis.retriedInterviews === 1 ? '' : 's'} required retries (avg ${data.kpis.avgProcessingAttempts} attempts, ${retryRate}% retry rate). ${retryRate > 20 ? 'Consider a fallback LLM provider.' : 'Within normal range.'}`,
    )
  }

  // Top discrepancy
  if (data.charts.topDiscrepancyClaims.length > 0) {
    const top = data.charts.topDiscrepancyClaims[0]
    insights.push(
      `Most frequent discrepancy: "${top.claim}" (${top.count} occurrences, ${top.highSeverityCount} high severity). Review screening questions to reduce false claims.`,
    )
  }

  // Dimension with lowest average
  const dims = data.charts.dimensionAverages
  const dimEntries = [
    { name: 'Technical Depth', value: dims.technicalDepth },
    { name: 'Communication', value: dims.communication },
    { name: 'Domain Experience', value: dims.domainExperience },
    { name: 'Problem Solving', value: dims.problemSolving },
  ]
  const lowest = dimEntries.reduce((min, d) => (d.value < min.value ? d : min))
  insights.push(
    `Lowest-scoring dimension: "${lowest.name}" (avg ${lowest.value.toFixed(2)}/5). Consider focusing upskilling content on this area.`,
  )

  return insights
}

export interface AnalyticsReportPDFProps {
  data: AnalyticsSummary
}

export function AnalyticsReportPDF({ data }: AnalyticsReportPDFProps) {
  const generatedAt = new Date(data.generatedAt)
  const logoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/logo.png`
      : '/logo.png'
  const insights = generateInsights(data)
  const footerText = `Generated by EchoGrow — Analytics Report  ·  ${generatedAt.toLocaleDateString('en-GB')}  ·  Range: ${data.range}`

  return (
    <Document
      title="EchoGrow Analytics Report"
      author="EchoGrow"
      subject="Aggregate analytics across interviews"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>EchoGrow</Text>
            <Text style={styles.brandTagline}>Analytics Report</Text>
          </View>
        </View>

        <Text style={styles.title}>System Analytics</Text>
        <Text style={styles.subtitle}>
          Range: {data.range} · Generated {formatDate(data.generatedAt)}
        </Text>

        {/* KPIs */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Interviews</Text>
            <Text style={styles.kpiValue}>{data.kpis.totalInterviews}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Completion Rate</Text>
            <Text style={styles.kpiValue}>{data.kpis.completionRate}%</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Avg Processing</Text>
            <Text style={styles.kpiValue}>
              {data.kpis.avgProcessingTimeSeconds}s
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Avg Discrepancies</Text>
            <Text style={styles.kpiValue}>
              {data.kpis.avgDiscrepanciesPerInterview}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Avg Overall Score</Text>
            <Text style={styles.kpiValue}>
              {data.kpis.avgOverallScore} / 5
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Avg Skill Gaps</Text>
            <Text style={styles.kpiValue}>
              {data.kpis.avgSkillGapsPerInterview}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Retried Interviews</Text>
            <Text style={styles.kpiValue}>{data.kpis.retriedInterviews}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Avg Attempts</Text>
            <Text style={styles.kpiValue}>
              {data.kpis.avgProcessingAttempts}
            </Text>
          </View>
        </View>

        {/* Insights */}
        <Text style={styles.sectionTitle}>Insights</Text>
        {insights.map((insight, i) => (
          <View key={i} style={styles.insight}>
            <Text style={styles.insightText}>
              <Text style={{ fontWeight: 'bold' }}>• </Text>
              {insight}
            </Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          {footerText}
        </Text>
      </Page>

      {/* Page 2 — Top skills + Discrepancies */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>EchoGrow</Text>
            <Text style={styles.brandTagline}>Analytics Report</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Top Missing Skills</Text>
        {data.charts.topMissingSkills.map((skill, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 0.5 }]}>{i + 1}.</Text>
            <Text style={[styles.tableCell, { flex: 4 }]}>{skill.skill}</Text>
            <Text
              style={[
                styles.tableCellMuted,
                { flex: 1, textAlign: 'right' },
              ]}
            >
              {skill.count}×
            </Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          Top Discrepancy Claims
        </Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 4 }]}>Claim</Text>
          <Text
            style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
          >
            Total
          </Text>
          <Text
            style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
          >
            High
          </Text>
          <Text
            style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
          >
            Medium
          </Text>
          <Text
            style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
          >
            Low
          </Text>
        </View>
        {data.charts.topDiscrepancyClaims.map((claim, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 4 }]}>{claim.claim}</Text>
            <Text
              style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}
            >
              {claim.count}
            </Text>
            <Text
              style={[
                styles.tableCell,
                { flex: 1, textAlign: 'center', color: COLORS.danger },
              ]}
            >
              {claim.highSeverityCount}
            </Text>
            <Text
              style={[
                styles.tableCell,
                { flex: 1, textAlign: 'center', color: COLORS.warning },
              ]}
            >
              {claim.mediumSeverityCount}
            </Text>
            <Text
              style={[
                styles.tableCell,
                { flex: 1, textAlign: 'center', color: COLORS.success },
              ]}
            >
              {claim.lowSeverityCount}
            </Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          {footerText}
        </Text>
      </Page>

      {/* Page 3 — Recent interviews (with Attempts) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>EchoGrow</Text>
            <Text style={styles.brandTagline}>Analytics Report</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Interviews</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 3 }]}>Candidate</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Status</Text>
          <Text
            style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
          >
            Score
          </Text>
          <Text
            style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
          >
            Pending
          </Text>
          <Text
            style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}
          >
            Attempts
          </Text>
        </View>
        {data.tables.recentInterviews.map((r, i) => (
          <View key={i} style={styles.tableRow}>
            <View style={{ flex: 3 }}>
              <Text style={styles.tableCell}>{r.candidateName}</Text>
              <Text style={styles.tableCellMuted}>{r.candidateEmail}</Text>
            </View>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              {r.status}
            </Text>
            <Text
              style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}
            >
              {r.overallScore !== null ? r.overallScore.toFixed(1) : '—'}
            </Text>
            <Text
              style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}
            >
              {r.pendingDiscrepancies}
            </Text>
            <Text
              style={[
                styles.tableCell,
                {
                  flex: 1,
                  textAlign: 'center',
                  color: (r.processingAttempts ?? 1) > 1 ? COLORS.warning : COLORS.navyMuted,
                  fontWeight: (r.processingAttempts ?? 1) > 1 ? 'bold' : 'normal',
                },
              ]}
            >
              {r.processingAttempts ?? 1}×
            </Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          {footerText}
        </Text>
      </Page>
    </Document>
  )
}