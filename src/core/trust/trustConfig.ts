import type { AuditorTier, IncidentSeverity } from "./types.js";

// These are MVP local defaults.
// They mirror the current Configuration Registry concept.
// They will later be loaded from a versioned Configuration Registry.

export const TRUST_SCORE_MIN = 0;
export const TRUST_SCORE_MAX = 100;

export const TRUST_COMPONENT_WEIGHTS = {
  securityIncidents: 0.35,
  audits: 0.3,
  protocolAge: 0.15,
  tvl: 0.1,
} as const;

export const TRUST_COMPONENT_WEIGHT_SUM =
  TRUST_COMPONENT_WEIGHTS.securityIncidents +
  TRUST_COMPONENT_WEIGHTS.audits +
  TRUST_COMPONENT_WEIGHTS.protocolAge +
  TRUST_COMPONENT_WEIGHTS.tvl;

export const DEFAULT_CHAIN_ADJUSTMENT = 0;

export const INCIDENT_BASE_PENALTIES: Record<IncidentSeverity, number> = {
  minor: 5,
  moderate: 15,
  major: 35,
  critical: 60,
  catastrophic: 100,
};

export const INCIDENT_RECOVERY_YEARS: Record<IncidentSeverity, number> = {
  minor: 3,
  moderate: 4,
  major: 5,
  critical: 6,
  catastrophic: 9,
};

export const TRUST_DECAY_MODEL = "linear" as const;

export const AUDIT_TIER_POINTS: Record<AuditorTier, readonly number[]> = {
  1: [30, 18, 12, 8],
  2: [15, 10, 6],
  3: [6, 4, 2],
};

export const SECURITY_COMPONENT_BASE_SCORE = 100;

export const AUDIT_SCORE_CAP = 100;

export const PROTOCOL_AGE_THRESHOLDS_YEARS = [0.5, 1, 2, 4] as const;

export const PROTOCOL_AGE_SCORES = [30, 55, 75, 90, 100] as const;

export const TVL_THRESHOLDS_USD = [
  10_000_000,
  100_000_000,
  1_000_000_000,
] as const;

export const TVL_SCORES = [50, 70, 85, 100] as const;

export const ASSET_UNIVERSE_MIN_TRUST_SCORE = 65;

export const PROFILE_MIN_TRUST_SCORE = {
  Conservative: 85,
  Balanced: 75,
  "Yield Focused": 65,
} as const;
