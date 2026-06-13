import type { ProfileName } from "../profile/types.js";
import type { SnapshotRejectionHighlight } from "../explainability/buildRejectedOpportunityExplanations.js";
import type { LiquidityDerivedSource, LiquidityConfidence, LiquidityTvlBucket } from "../liquidity/deriveLiquiditySignals.js";

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

export type SnapshotTrustHighlight = {
  protocolId: string;
  protocolName: string;
  trustScore: number;
  summary: string;
};

export type SnapshotLiquidityHighlight = {
  protocolId: string;
  protocolName: string;
  tvlUsd: number | null;
  tvlBucket: LiquidityTvlBucket;
  liquidityConfidence: LiquidityConfidence;
  source: LiquidityDerivedSource;
};

export type SnapshotDiversificationHighlight = {
  uniqueAssets: number;
  uniqueProtocols: number;
  largestAsset: string | null;
  largestAssetAllocationPercent: number;
  largestProtocol: string | null;
  largestProtocolAllocationPercent: number;
  diversificationLevel: "low" | "medium" | "high";
  warnings: readonly string[];
};

export type SnapshotDiversificationTradeoffSummary = {
  available: boolean;
  currentLevel?: "low" | "medium" | "high";
  alternativeLevel?: "low" | "medium" | "high";
  apyCostPercent?: number;
  summary?: string;
};

export type SnapshotExecutionSummary = {
  strategySteps: number;
  liquidityBufferPercent: number;
  gasReservePercent: number;
};

export type SnapshotDeltaExecutionSummary = {
  available: boolean;
  numberOfSteps: number;
  numberOfWithdrawals: number;
  numberOfSupplies: number;
  netDeltaUsd: number;
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
  trustHighlights: SnapshotTrustHighlight[];
  rejectionHighlights: SnapshotRejectionHighlight[];
  liquidityHighlights: SnapshotLiquidityHighlight[];
  diversificationHighlights: SnapshotDiversificationHighlight;
  diversificationTradeoffSummary?: SnapshotDiversificationTradeoffSummary;
  executionSummary?: SnapshotExecutionSummary;
  deltaExecutionSummary?: SnapshotDeltaExecutionSummary;
  warnings: SnapshotWarning[];
  explanations: SnapshotExplanation[];
  source: RecommendationSnapshotSource;
};
