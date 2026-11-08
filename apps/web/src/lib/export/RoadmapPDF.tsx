import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  Image,
} from '@react-pdf/renderer';
import type { RoadmapResponse } from '../api';

const COLORS = {
  navy: '#0e1e37',
  navyDeep: '#071120',
  navyMid: '#2c3e58',
  navyMuted: '#5a6b85',
  accent: '#22a985',
  accentDeep: '#146c57',
  accentSoft: '#ecfdf7',
  surface: '#f7f9fc',
  surfaceCard: '#ffffff',
  line: '#e3e9f2',
  warning: '#eab308',
  warningSoft: '#fefce8',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  success: '#22c55e',
  successSoft: '#f0fdf4',
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HIGH: { bg: COLORS.dangerSoft, text: COLORS.danger, border: '#fecaca' },
  MEDIUM: { bg: COLORS.warningSoft, text: '#a16207', border: '#fde68a' },
  LOW: { bg: COLORS.successSoft, text: '#15803d', border: '#bbf7d0' },
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: COLORS.navy,
    backgroundColor: COLORS.surfaceCard,
  },

  // Header
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
  brandName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.navyDeep,
  },
  brandTagline: {
    fontSize: 7,
    color: COLORS.navyMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  // Title section
  titleSection: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.navyDeep,
    marginBottom: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    color: COLORS.navyMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9.5,
    color: COLORS.navy,
    fontWeight: 'bold',
  },

  // Gaps
  section: {
    marginBottom: 16,
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
  gapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gapChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 8.5,
    fontWeight: 'bold',
    borderWidth: 1,
  },

  // Week card
  weekCard: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  skillName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.navyDeep,
  },
  weekBadge: {
    backgroundColor: COLORS.accent,
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 8,
    fontWeight: 'bold',
  },
  task: {
    fontSize: 9.5,
    color: COLORS.navyMid,
    lineHeight: 1.4,
    marginTop: 2,
  },
  resourceLink: {
    fontSize: 8.5,
    color: COLORS.accentDeep,
    marginTop: 4,
    textDecoration: 'underline',
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    color: COLORS.navyMid,
    fontSize: 10,
    marginTop: 30,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 6,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7.5,
    color: COLORS.navyMuted,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 8,
    lineHeight: 1.5,
  },
});

interface RoadmapPDFProps {
  candidateName: string;
  interviewDate: string;
  data: RoadmapResponse;
  sessionId?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDocId(sessionId?: string): string {
  if (sessionId) {
    return sessionId.slice(-8).toUpperCase();
  }
  return Date.now().toString(36).toUpperCase().slice(-8);
}

export function RoadmapPDF({
  candidateName,
  interviewDate,
  data,
  sessionId,
}: RoadmapPDFProps) {
  const { gaps, roadmap } = data;
  const hasGaps = gaps.length > 0;
  const generatedAt = new Date();
  const docId = getDocId(sessionId);

  const priorityMap = new Map(gaps.map((g) => [g.skillName, g.priority]));

  const logoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/logo.png`
      : '/logo.png';

  return (
    <Document
      title={`Growth Plan — ${candidateName}`}
      author="EchoGrow"
      subject="Personalized Upskilling Roadmap"
    >
      <Page size="A4" style={styles.page}>
        {/* ============ HEADER ============ */}
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>EchoGrow</Text>
            <Text style={styles.brandTagline}>Interview Verification</Text>
          </View>
        </View>

        {/* ============ TITLE ============ */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Personalized Upskilling Roadmap</Text>
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
              <Text style={styles.metaLabel}>Generated</Text>
              <Text style={styles.metaValue}>{formatDate(generatedAt.toISOString())}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Document ID</Text>
              <Text style={styles.metaValue}>{docId}</Text>
            </View>
          </View>
        </View>

        {/* ============ GAPS ============ */}
        {hasGaps && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Identified Skill Gaps ({gaps.length})
            </Text>
            <View style={styles.gapRow}>
              {gaps.map((gap, i) => {
                const colors = PRIORITY_COLORS[gap.priority] ?? PRIORITY_COLORS.MEDIUM;
                return (
                  <Text
                    key={i}
                    style={[
                      styles.gapChip,
                      {
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {gap.skillName}
                  </Text>
                );
              })}
            </View>
          </View>
        )}

        {/* ============ WEEKLY PLAN ============ */}
        {hasGaps ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Week-by-Week Plan ({roadmap.length} weeks)
            </Text>
            {roadmap.map((item, i) => {
              const priority = priorityMap.get(item.skillName) ?? 'MEDIUM';
              const colors = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.MEDIUM;
              const isFallback = item.resourceUrl?.startsWith('https://www.google.com/search');

              return (
                <View key={i} style={styles.weekCard} wrap={false}>
                  <View style={styles.weekHeader}>
                    <Text style={styles.skillName}>{item.skillName}</Text>
                    <Text
                      style={[
                        styles.gapChip,
                        {
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      WEEK {item.week}
                    </Text>
                  </View>
                  <Text style={styles.task}>{item.task}</Text>
                  {item.resourceUrl && (
                    <Link src={item.resourceUrl} style={styles.resourceLink}>
                      {isFallback ? 'Search for a resource' : item.resourceUrl}
                    </Link>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyState}>
            No skill gaps detected. This candidate performed well across all dimensions.
          </Text>
        )}

        {/* ============ FOOTER ============ */}
        <Text style={styles.footer} fixed>
          This roadmap is extracted from the candidate's own admissions during the interview — not
          from a fixed template. Every learning resource comes from a vetted library of official
          documentation and trusted tutorials.{'\n'}
          Generated by EchoGrow · echogrow.app · Doc ID: {docId}
        </Text>
      </Page>
    </Document>
  );
}