import type { ProfileName } from "../profile/types.js";
import type { PortfolioRecommendationResult } from "../recommendation/types.js";
import type { RecommendationSnapshot } from "../snapshot/types.js";

export type ExecutionActionType = "deposit" | "hold" | "reserve";

export type MockExecutionStepStatus = "planned";

type MockExecutionStepBase = {
  stepId: number;
  weight: number;
  amountUsd: number;
  status: MockExecutionStepStatus;
};

export type DepositExecutionStep = MockExecutionStepBase & {
  type: "deposit";
  protocolId: string;
  protocolName: string;
  asset: string;
  opportunityId: string;
};

export type HoldExecutionStep = MockExecutionStepBase & {
  type: "hold";
  asset: string;
  reason: "liquidityBuffer";
};

export type ReserveExecutionStep = MockExecutionStepBase & {
  type: "reserve";
  asset: string;
  reason: "gasReserve";
};

export type MockExecutionStep =
  | DepositExecutionStep
  | HoldExecutionStep
  | ReserveExecutionStep;

export type ExecutionPlanSummary = {
  totalAmountUsd: number;
  strategyAmountUsd: number;
  liquidityBufferAmountUsd: number;
  gasReserveAmountUsd: number;
  numberOfSteps: number;
  numberOfDeposits: number;
  numberOfHolds: number;
  numberOfReserves: number;
};

export type ExecutionPlanWarningSeverity = "info" | "warning";

export type ExecutionPlanWarning = {
  code: string;
  severity: ExecutionPlanWarningSeverity;
  message: string;
};

export type ExecutionPlanExplanation = {
  topic: string;
  summary: string;
};

export type ExecutionPlanDiagnostics = {
  generatedAt: string;
  policyVersion: number;
  selectedProfile: ProfileName;
  portfolioValueUsd: number;
  source: "mock";
  executionPlanVersion?: "v2";
  executionPlanRealistic?: boolean;
};

export type ExecutionPlanActionV2 =
  | "prepareFunds"
  | "supply"
  | "holdLiquidityBuffer"
  | "holdGasReserve";

export type ExecutionPlanStepV2 = {
  id: string;
  protocolId: string | null;
  protocolName: string | null;
  action: ExecutionPlanActionV2;
  asset: string | null;
  allocationPercent: number;
  amountUsd: number;
  description: string;
  informationalOnly: true;
};

export type MockExecutionPlan = {
  steps: MockExecutionStep[];
  stepsV2: ExecutionPlanStepV2[];
  executionPlanVersion: "v1" | "v2";
  summary: ExecutionPlanSummary;
  warnings: ExecutionPlanWarning[];
  explanations: ExecutionPlanExplanation[];
  diagnostics: ExecutionPlanDiagnostics;
  deltaExecutionPlan?: DeltaExecutionPlan;
};

export type ExecutionPlanInput = {
  recommendation: PortfolioRecommendationResult;
  snapshot?: RecommendationSnapshot;
};

export type DeltaExecutionAction =
  | "withdraw"
  | "supply"
  | "hold"
  | "reserve"
  | "noAction";

export type DeltaExecutionStep = {
  id: string;
  action: DeltaExecutionAction;
  protocolId?: string;
  protocolName?: string;
  opportunityId?: string;
  asset: string;
  amountUsd: number;
  description: string;
  informationalOnly: true;
};

export type DeltaExecutionPlan = {
  available: boolean;
  informationalOnly: true;
  currentPortfolioValueUsd: number;
  targetPortfolioValueUsd: number;
  netDeltaUsd: number;
  steps: DeltaExecutionStep[];
  warnings: string[];
};
