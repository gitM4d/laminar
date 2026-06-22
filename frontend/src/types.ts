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
  rejectedOpportunityExplanations?: RejectedOpportunityExplanation[];
};

export type RejectionReasonCategory =
  | "trust"
  | "liquidity"
  | "risk"
  | "policy"
  | "construction"
  | "unknown";

export type RejectedOpportunityDetail = {
  code: string;
  category: RejectionReasonCategory;
  message: string;
  observedValue?: number | string | boolean;
  requiredValue?: number | string | boolean;
};

export type RejectedOpportunityExplanation = {
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  asset: string;
  status: "rejected";
  primaryReasonCode: string;
  primaryReasonCategory: RejectionReasonCategory;
  summary: string;
  details: RejectedOpportunityDetail[];
};

export type SnapshotRejectionHighlight = {
  opportunityId: string;
  label: string;
  protocolName: string;
  asset: string;
  primaryReasonCategory: RejectionReasonCategory;
  summary: string;
};

export type SnapshotLiquidityHighlight = {
  protocolId: string;
  protocolName: string;
  tvlUsd: number | null;
  tvlBucket: string;
  liquidityConfidence: string;
  source: string;
};

export type SnapshotDiversificationHighlight = {
  uniqueAssets: number;
  uniqueProtocols: number;
  largestAsset: string | null;
  largestAssetAllocationPercent: number;
  largestProtocol: string | null;
  largestProtocolAllocationPercent: number;
  diversificationLevel: "low" | "medium" | "high";
  warnings: string[];
};

export type SnapshotDiversificationTradeoffSummary = {
  available: boolean;
  currentLevel?: "low" | "medium" | "high";
  alternativeLevel?: "low" | "medium" | "high";
  apyCostPercent?: number;
  summary?: string;
};

export type RecommendationSnapshot = {
  profile: string;
  portfolioValueUsd: number;
  generatedAt: string;
  positions: SnapshotPosition[];
  metrics: SnapshotMetric[];
  trustHighlights?: SnapshotTrustHighlight[];
  rejectionHighlights?: SnapshotRejectionHighlight[];
  liquidityHighlights?: SnapshotLiquidityHighlight[];
  diversificationHighlights?: SnapshotDiversificationHighlight;
  diversificationTradeoffSummary?: SnapshotDiversificationTradeoffSummary;
  executionSummary?: SnapshotExecutionSummary;
  deltaExecutionSummary?: SnapshotDeltaExecutionSummary;
  executionIntentSummary?: SnapshotExecutionIntentSummary;
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

export type ExecutionPlanStepV2 = {
  id: string;
  protocolId: string | null;
  protocolName: string | null;
  action:
    | "prepareFunds"
    | "supply"
    | "holdLiquidityBuffer"
    | "holdGasReserve";
  asset: string | null;
  allocationPercent: number;
  amountUsd: number;
  description: string;
  informationalOnly: true;
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

export type SnapshotExecutionIntentSummary = {
  totalIntents: number;
  executableIntents: number;
  protocols: string[];
  assets: string[];
};

export type MockExecutionPlan = {
  steps: MockExecutionStep[];
  stepsV2?: ExecutionPlanStepV2[];
  executionPlanVersion?: "v1" | "v2";
  executionIntentPlan?: {
    version: "intent-v1";
    informationalOnly: true;
    summary: SnapshotExecutionIntentSummary & {
      nonExecutableIntents: number;
    };
  };
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
