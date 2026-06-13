import type {
  DeltaExecutionPlan,
  MockExecutionPlan,
} from "./execution/types.js";
import type { LaminarDataProvider } from "./providers/types.js";
import type { PortfolioRecommendationResult } from "./recommendation/types.js";
import type { RecommendationSnapshot } from "./snapshot/types.js";

export type CurrentPortfolioPosition = {
  type: "strategy" | "wallet" | "liquidityBuffer" | "gasReserve";
  protocolId?: string;
  protocolName?: string;
  opportunityId?: string;
  asset: string;
  amountUsd: number;
};

export type LaminarRecommendationInput = {
  intent: unknown;
  portfolioValueUsd: number;
  asOf?: Date;
  dataProvider?: LaminarDataProvider;
  currentPortfolio?: CurrentPortfolioPosition[];
};

export type LaminarRecommendationResult = {
  recommendation: PortfolioRecommendationResult;
  snapshot: RecommendationSnapshot;
  executionPlan: MockExecutionPlan;
  deltaExecutionPlan?: DeltaExecutionPlan;
};
