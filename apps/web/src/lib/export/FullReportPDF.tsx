import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Image,
} from '@react-pdf/renderer'
import type { ScorecardDimension, DiscrepancyRecord, RoadmapResponse } from '../api'

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
  logo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  brandName: { fontSize: 14, fontWeight: 'bold', color: COLORS.navyDeep },
  brandTagline: {
    fontSize: 7,
    color: COLORS.navyMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.navyDeep,
    marginBottom: 4,
  },
  subtitle: { fontSize: 9, color: COLORS.navyMuted, marginBottom: 16 },
  metaGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    marginBottom: 16,
  },
  metaItem: { flex: 1 },
  metaLabel: {
    fontSize: 7,
    color: COLORS.navyMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: { fontSize: 9.5, color: COLORS.navy, fontWeight: 'bold' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.navyDeep,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },

  // Dimensions
  dimensionRow: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
  },
  dimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dimName: { fontSize: 10.5, fontWeight: 'bold', color: COLORS.navyDeep },
  dimScore: { fontSize: 10.5, fontWeight: 'bold', color: COLORS.accentDeep },
  dimReason: { fontSize: 9, color: COLORS.navyMid, lineHeight: 1.4, marginTop: 2 },
  dimEvidence: {
    fontSize: 8.5,
    color: COLORS.navyMuted,
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 1.3,
  },

  // Discrepancies
  discrepancyCard: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    borderLeftWidth: 3,
  },
  discHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  discField: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: COLORS.navyDeep,
    marginBottom: 4,
  },
  severityChipContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  severityChipText: {
    fontSize: 7.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  discClaims: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  discClaim: {
    flex: 1,
    padding: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  discLabel: {
    fontSize: 7.5,
    color: COLORS.navyMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  discText: { fontSize: 9, color: COLORS.navy, lineHeight: 1.3 },
  discQuote: {
    fontSize: 8.5,
    color: COLORS.navyMuted,
    fontStyle: 'italic',
    marginTop: 3,
    lineHeight: 1.3,
  },
  reviewerNote: {
    fontSize: 8.5,
    color: COLORS.accentDeep,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },

  // Roadmap
  weekCard: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  skillName: { fontSize: 10.5, fontWeight: 'bold', color: COLORS.navyDeep },
  weekBadgeContainer: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  weekBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  task: { fontSize: 9, color: COLORS.navyMid, lineHeight: 1.4 },
  resourceLink: {
    fontSize: 8,
    color: COLORS.accentDeep,
    marginTop: 3,
    textDecoration: 'underline',
  },
  gapChipContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 4,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  gapChipText: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },

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
    lineHeight: 1.4,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.navyMuted,
    fontSize: 10,
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
  },
})

export interface FullReportProps {
  candidateName: string
  interviewDate: string
  dimensions: ScorecardDimension[]
  overallConfidence: number
  pendingDiscrepancies: number
  skillGaps: number
  discrepancies: DiscrepancyRecord[]
  roadmap: RoadmapResponse
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

const PRIORITY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  HIGH: { bg: COLORS.dangerSoft, text: COLORS.danger, border: '#fecaca' },
  MEDIUM: { bg: COLORS.warningSoft, text: '#a16207', border: '#fde68a' },
  LOW: { bg: COLORS.successSoft, text: '#15803d', border: '#bbf7d0' },
}

const SEVERITY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  high: { bg: COLORS.dangerSoft, text: COLORS.danger, border: COLORS.danger },
  medium: {
    bg: COLORS.warningSoft,
    text: '#a16207',
    border: COLORS.warning,
  },
  low: { bg: COLORS.successSoft, text: '#15803d', border: COLORS.success },
}

export function FullReportPDF({
  candidateName,
  interviewDate,
  dimensions,
  overallConfidence,
  pendingDiscrepancies,
  skillGaps,
  discrepancies,
  roadmap,
}: FullReportProps) {
  const generatedAt = new Date()
  const { gaps, roadmap: items } = roadmap

  const footerText = `Generated by EchoGrow — Evidence-based interview analysis  ·  ${generatedAt.toLocaleDateString('en-GB')}  ·  ${candidateName}`

  // Logo URL (safe fallback if window is unavailable)
  const logoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/logo.png`
      : '/logo.png'

  // Sort discrepancies by severity (high → medium → low)
  const sortedDiscrepancies = [...discrepancies].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return (order[a.severity] ?? 1) - (order[b.severity] ?? 1)
  })

  // Review status
  const reviewStatus =
    pendingDiscrepancies === 0
      ? 'Approved (all discrepancies reviewed)'
      : `${pendingDiscrepancies} pending review`

  return (
    <Document
      title={`Interview Report — ${candidateName}`}
      author="EchoGrow"
      subject="Interview scorecard, discrepancies and roadmap"
    >
      {/* ============================================================
          Page 1: Scorecard + Executive Summary
          ============================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>EchoGrow</Text>
            <Text style={styles.brandTagline}>Interview Verification</Text>
          </View>
        </View>
        <Text style={styles.title}>Interview Report</Text>
        <Text style={styles.subtitle}>Scorecard overview</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Candidate</Text>
            <Text style={styles.metaValue}>{candidateName}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Interview Date</Text>
            <Text style={styles.metaValue}>{formatDate(interviewDate)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Average Score</Text>
            <Text style={styles.metaValue}>
              {(
                dimensions.reduce((s, d) => s + d.score, 0) /
                (dimensions.length || 1)
              ).toFixed(1)}{' '}
              / 5
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Confidence</Text>
            <Text style={styles.metaValue}>
              {Math.round(overallConfidence * 100)}%
            </Text>
          </View>
        </View>

        {/* Executive Summary Row */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: COLORS.surface,
              borderRadius: 4,
            }}
          >
            <Text style={styles.metaLabel}>Review Status</Text>
            <Text
              style={[
                styles.metaValue,
                {
                  color:
                    pendingDiscrepancies > 0 ? COLORS.danger : COLORS.success,
                },
              ]}
            >
              {reviewStatus}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 8,
              backgroundColor: COLORS.surface,
              borderRadius: 4,
            }}
          >
            <Text style={styles.metaLabel}>Skill Gaps</Text>
            <Text style={styles.metaValue}>{skillGaps}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dimensions</Text>
        {dimensions.map((d, i) => (
          <View key={i} style={styles.dimensionRow}>
            <View style={styles.dimHeader}>
              <Text style={styles.dimName}>{d.name}</Text>
              <Text style={styles.dimScore}>{d.score} / 5</Text>
            </View>
            <Text style={styles.dimReason}>{d.reason}</Text>
            {d.evidenceQuote ? (
              <Text style={styles.dimEvidence}>"{d.evidenceQuote}"</Text>
            ) : null}
          </View>
        ))}
        <Text style={styles.footer} fixed>
          {footerText}
        </Text>
      </Page>

      {/* ============================================================
          Page 2: Discrepancies (sorted by severity, with reviewer notes)
          ============================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>EchoGrow</Text>
            <Text style={styles.brandTagline}>Interview Verification</Text>
          </View>
        </View>
        <Text style={styles.title}>Claim Verification</Text>
        <Text style={styles.subtitle}>
          {discrepancies.length} discrepancy(ies) flagged for review
        </Text>

        {discrepancies.length === 0 ? (
          <Text style={styles.empty}>
            No discrepancies detected for this interview.
          </Text>
        ) : (
          sortedDiscrepancies.map((d, i) => {
            const severity = d.severity
            const severityColors =
              SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.medium

            return (
              <View
                key={i}
                style={[
                  styles.discrepancyCard,
                  { borderLeftColor: severityColors.border },
                ]}
              >
                <View style={styles.discHeader}>
                  <Text style={styles.discField}>{d.field}</Text>
                  <View
                    style={[
                      styles.severityChipContainer,
                      {
                        backgroundColor: severityColors.bg,
                        borderColor: severityColors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityChipText,
                        { color: severityColors.text },
                      ]}
                    >
                      {severity.toUpperCase()} SEVERITY
                    </Text>
                  </View>
                </View>

                <View style={styles.discClaims}>
                  <View style={styles.discClaim}>
                    <Text style={styles.discLabel}>CV says</Text>
                    <Text style={styles.discText}>{d.cvSays}</Text>
                  </View>
                  <View style={styles.discClaim}>
                    <Text style={styles.discLabel}>Interview says</Text>
                    <Text style={styles.discText}>{d.interviewSays}</Text>
                  </View>
                </View>

                <Text
                  style={{
                    fontSize: 8,
                    color: COLORS.navyMuted,
                    marginBottom: 2,
                  }}
                >
                  Confidence: {Math.round(d.confidence * 100)}% · Status:{' '}
                  {d.status}
                </Text>

                {d.cvQuote ? (
                  <Text style={styles.discQuote}>CV: "{d.cvQuote}"</Text>
                ) : null}
                {d.interviewQuote ? (
                  <Text style={styles.discQuote}>
                    Interview: "{d.interviewQuote}"
                  </Text>
                ) : null}

                {d.reviewerNotes ? (
                  <Text style={styles.reviewerNote}>
                    <Text style={{ fontWeight: 'bold' }}>
                      Reviewer note:{' '}
                    </Text>
                    {d.reviewerNotes}
                  </Text>
                ) : null}
              </View>
            )
          })
        )}
        <Text style={styles.footer} fixed>
          {footerText}
        </Text>
      </Page>

      {/* ============================================================
          Page 3: Roadmap
          ============================================================ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>EchoGrow</Text>
            <Text style={styles.brandTagline}>Interview Verification</Text>
          </View>
        </View>
        <Text style={styles.title}>Growth Plan</Text>
        <Text style={styles.subtitle}>
          {gaps.length} skill gap(s) · {items.length} week(s)
        </Text>

        {gaps.length > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            {gaps.map((g, i) => {
              const colors = PRIORITY_COLORS[g.priority] ?? PRIORITY_COLORS.MEDIUM
              return (
                <View
                  key={i}
                  style={[
                    styles.gapChipContainer,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.gapChipText, { color: colors.text }]}
                  >
                    {g.skillName} ({g.priority})
                  </Text>
                </View>
              )
            })}
          </View>
        ) : null}

        {items.length === 0 ? (
          <Text style={styles.empty}>
            No skill gaps detected. This candidate performed well across all
            dimensions.
          </Text>
        ) : (
          items.map((item, i) => (
            <View key={i} style={styles.weekCard}>
              <View style={styles.weekHeader}>
                <Text style={styles.skillName}>{item.skillName}</Text>
                <View style={styles.weekBadgeContainer}>
                  <Text style={styles.weekBadgeText}>
                    WEEK {item.week}
                  </Text>
                </View>
              </View>
              <Text style={styles.task}>{item.task}</Text>
              {item.resourceUrl ? (
                <Link src={item.resourceUrl} style={styles.resourceLink}>
                  {item.resourceUrl}
                </Link>
              ) : null}
            </View>
          ))
        )}
        <Text style={styles.footer} fixed>
          {footerText}
        </Text>
      </Page>
    </Document>
  )
}