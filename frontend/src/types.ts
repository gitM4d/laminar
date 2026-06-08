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

export type RecommendationSnapshot = {
  profile: string;
  portfolioValueUsd: number;
  generatedAt: string;
  positions: SnapshotPosition[];
  metrics: SnapshotMetric[];
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
  recommendation: unknown;
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
