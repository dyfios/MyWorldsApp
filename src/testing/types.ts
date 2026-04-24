/**
 * Types for the entity-type smoke test harness.
 * See docs/tech-spec-entity-type-smoke.md.
 */

import type { EntityType } from '../types/entity';
import type { VariantConfig } from '../types/config';

export type SmokeOutcome = 'pass' | 'fail' | 'timeout' | 'skipped';

export interface EntityFixture {
  name: string;
  type: EntityType;
  /**
   * Type-specific fields. Loose on purpose — the runner extracts what each
   * case in EntityManager.loadEntity needs.
   */
  config: Partial<VariantConfig> & { [key: string]: any };
  /**
   * Name of the existing global callback that fires when this entity type
   * finishes loading (e.g. 'onMeshEntityLoadedGeneric'). The runner wraps
   * this global so the real pipeline runs and the fixture observes the
   * same signal production does.
   */
  expectedCallback: string;
  /** If set and returns true, the fixture is reported as skipped. */
  skipIf?: () => boolean;
}

export interface FixtureResult {
  fixture: string;
  outcome: SmokeOutcome;
  reason?: string;
  durationMs?: number;
}

export interface SmokeResult {
  total: number;
  pass: number;
  fail: number;
  timeout: number;
  skipped: number;
  results: FixtureResult[];
}
