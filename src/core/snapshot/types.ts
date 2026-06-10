import type { ProfileName } from "../profile/types.js";

export type SnapshotPositionType =
  | "strategy"
  | "liquidityBuffer"
  | "gasReserve";

export type SnapshotPosition = {
  type: SnapshotPositionType;
  label: string;
  protocolId?: string;
  protocolName?: string;
  asset: string;
  weight: number;
  allocationPercent: number;
  allocationUsd: number;
};

export type SnapshotWarningSeverity = "info" | "warning";

export type SnapshotWarning = {
  code: string;
  severity: SnapshotWarningSeverity;
  message: string;
};

export type SnapshotMetric = {
  /** e.g. strategyExpectedApy, portfolioExpectedApy, expectedApy (legacy alias). */
  key: string;
  label: string;
  /** APY metrics are decimal (0.0265 = 2.65%), consistent with opportunity.apy. */
  value: number | string;
};

export type SnapshotExplanation = {
  topic: "profile" | "policy" | "ranking" | "construction";
  summary: string;
};

export type RecommendationSnapshotSource = {
  recommendationId?: string;
  policyVersion: number;
  pipelineStepsCompleted: number;
};

export type RecommendationSnapshot = {
  profile: ProfileName;
  portfolioValueUsd: number;
  generatedAt: string;
  positions: SnapshotPosition[];
  metrics: SnapshotMetric[];
  warnings: SnapshotWarning[];
  explanations: SnapshotExplanation[];
  source: RecommendationSnapshotSource;
};
