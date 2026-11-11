/**
 * Unit tests for RoadmapService.mergeByAliases.
 *
 * These tests do not touch the DB and do not call the LLM. The service is
 * instantiated with empty placeholders ({}) because mergeByAliases only reads
 * from the `whitelist` constant imported from @echogrow/shared.
 *
 * Why this matters:
 *   The LLM often extracts multiple phrasings of the same concept
 *   (e.g. "EXPLAIN ANALYZE" and "PostgreSQL performance tuning" both mean
 *   "SQL Indexing and Query Optimization"). Without merging, the candidate
 *   gets 6 redundant weeks of roadmap. mergeByAliases collapses these into
 *   a single canonical skill using the `aliases` field in whitelist.json.
 */
import { describe, it, expect } from 'vitest';
import { RoadmapService } from '../../src/modules/roadmap/roadmap.service';
import { whitelist } from '@echogrow/shared';

describe('RoadmapService.mergeByAliases', () => {
  const service = new RoadmapService({} as any, {} as any);
  const merge = (input: string[]) => (service as any).mergeByAliases(input) as string[];

  // ============================================================
  // Sanity: whitelist has aliases configured
  // ============================================================
  it('whitelist.json contains aliases for at least 10 skills', () => {
    const withAliases = whitelist.filter(
      (entry: any) => Array.isArray(entry.aliases) && entry.aliases.length > 0,
    );
    expect(withAliases.length).toBeGreaterThanOrEqual(10);
  });

  // ============================================================
  // Scenario A: PostgreSQL optimization (the case that failed in S2)
  // ============================================================
  it('merges EXPLAIN / query optimization variants into one skill', () => {
    const input = [
      'EXPLAIN ANALYZE',
      'EXPLAIN execution plans',
      'PostgreSQL performance tuning',
      'PostgreSQL query optimization',
      'Database profiling',
    ];
    const result = merge(input);
    expect(result).toEqual(['SQL Indexing and Query Optimization']);
  });

  // ============================================================
  // Scenario B: Docker (the case that failed in the earlier SPK)
  // ============================================================
  it('merges Dockerfile / Docker Compose / Containerization into "Docker"', () => {
    const input = ['Dockerfile', 'Docker Compose', 'Containerization', 'Containers', 'Docker'];
    const result = merge(input);
    expect(result).toEqual(['Docker']);
  });

  // ============================================================
  // Scenario C: Kubernetes (K8s alias)
  // ============================================================
  it('merges "K8s" and "Kubernetes cluster" into "Kubernetes"', () => {
    const input = ['K8s', 'Kubernetes cluster', 'Kubernetes'];
    const result = merge(input);
    expect(result).toEqual(['Kubernetes']);
  });

  // ============================================================
  // Scenario D: OAuth / JWT / SSO
  // ============================================================
  it('merges OAuth / OIDC / JWT / SSO into one auth skill', () => {
    const input = ['OAuth', 'OIDC', 'JWT', 'SSO'];
    const result = merge(input);
    expect(result).toEqual(['Authentication and OAuth 2.0 / OIDC']);
  });

  // ============================================================
  // Scenario E: React hooks
  // ============================================================
  it('merges React variants into "React"', () => {
    const input = ['React.js', 'React hooks', 'useEffect', 'ReactJS'];
    const result = merge(input);
    expect(result).toEqual(['React']);
  });

  // ============================================================
  // Scenario F: unknown skills are preserved
  // ============================================================
  it('keeps skills that are not in the whitelist as-is', () => {
    const input = ['Some Custom Skill', 'Another Unknown Skill XYZ'];
    const result = merge(input);
    expect(result).toEqual(['Some Custom Skill', 'Another Unknown Skill XYZ']);
  });

  // ============================================================
  // Scenario G: mixed known + unknown
  // ============================================================
  it('merges known skills but preserves unknown ones', () => {
    const input = ['EXPLAIN ANALYZE', 'Some Custom Skill', 'PostgreSQL performance tuning'];
    const result = merge(input);
    expect(result).toContain('SQL Indexing and Query Optimization');
    expect(result).toContain('Some Custom Skill');
    // No duplicate entries
    expect(result.length).toBe(2);
  });

  // ============================================================
  // Scenario H: empty input
  // ============================================================
  it('returns an empty array for empty input', () => {
    expect(merge([])).toEqual([]);
  });

  // ============================================================
  // Scenario I: single skill
  // ============================================================
  it('returns the canonical form for a single input', () => {
    expect(merge(['EXPLAIN ANALYZE'])).toEqual(['SQL Indexing and Query Optimization']);
    expect(merge(['React'])).toEqual(['React']);
  });

  // ============================================================
  // Scenario J: case-insensitive matching
  // ============================================================
  it('matches aliases case-insensitively', () => {
    const input = ['docker', 'DOCKERFILE', 'Docker Compose'];
    const result = merge(input);
    expect(result).toEqual(['Docker']);
  });

  // ============================================================
  // Scenario K: trims whitespace
  // ============================================================
  it('trims whitespace before matching', () => {
    const input = ['  EXPLAIN ANALYZE  ', ' PostgreSQL performance tuning '];
    const result = merge(input);
    expect(result).toEqual(['SQL Indexing and Query Optimization']);
  });

  // ============================================================
  // Scenario L: no duplicates in output
  // ============================================================
  it('never returns duplicate canonical skills', () => {
    const input = ['EXPLAIN', 'EXPLAIN ANALYZE', 'EXPLAIN execution plans'];
    const result = merge(input);
    const unique = new Set(result);
    expect(result.length).toBe(unique.size);
  });
});