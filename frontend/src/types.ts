export type IntentInput = {
  risk: number;
  liquidity: number;
  returnPreference: number;
};

export type RecommendationRequest = {
  intent: IntentInput;
  portfolioValueUsd: number;
  asOf: string;
};

export type SnapshotPosition = {
  type: "strategy" | "liquidityBuffer" | "gasReserve";
  label: string;
  protocolId?: string;
  protocolName?: string;
  asset: string;
  weight: number;
  allocationPercent: number;
  allocationUsd: number;
};

export type SnapshotWarning = {
  code: string;
  severity: "info" | "warning";
  message: string;
};

export type SnapshotMetric = {
  key: string;
  label: string;
  value: number | string;
};

export type SnapshotExplanation = {
  topic: string;
  summary: string;
};

export type TrustExplanationAuditTier =
  | "tier1"
  | "tier2"
  | "tier3"
  | "none";

export type TrustExplanationTvlBucket =
  | "veryLow"
  | "low"
  | "medium"
  | "high";

export type TrustExplanationComponents = {
  age: number;
  audits: number;
  incidents: number;
  tvl: number;
  chainAdjustment: number;
};

export type TrustExplanation = {
  protocolAgeYears: number;
  auditCount: number;
  auditTier: TrustExplanationAuditTier;
  historicalIncidents: number;
  tvlUsd: number;
  tvlBucket: TrustExplanationTvlBucket;
  components: TrustExplanationComponents;
};

export type SnapshotTrustHighlight = {
  protocolId: string;
  protocolName: string;
  trustScore: number;
  summary: string;
  trustExplanation?: TrustExplanation;
};

export type ProtocolTrustExplanation = {
  protocolId: string;
  protocolName: string;
  trustScore: number;
  summary: string;
  trustExplanation: TrustExplanation;
};

export type RecommendationPayload = {
  trustExplanations?: ProtocolTrustExplanation[];
};

export type RecommendationSnapshot = {
  profile: string;
  portfolioValueUsd: number;
  generatedAt: string;
  positions: SnapshotPosition[];
  metrics: SnapshotMetric[];
  trustHighlights?: SnapshotTrustHighlight[];
  warnings: SnapshotWarning[];
  explanations: SnapshotExplanation[];
};

export type MockExecutionStep = {
  stepId: number;
  type: "deposit" | "hold" | "reserve";
  weight: number;
  amountUsd: number;
  status: "planned";
  protocolId?: string;
  protocolName?: string;
  asset: string;
  opportunityId?: string;
  reason?: string;
};

export type MockExecutionPlan = {
  steps: MockExecutionStep[];
  warnings: SnapshotWarning[];
  explanations: { topic: string; summary: string }[];
};

export type RecommendationResponse = {
  recommendation: RecommendationPayload;
  snapshot: RecommendationSnapshot;
  executionPlan: MockExecutionPlan;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
