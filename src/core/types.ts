import type { MockExecutionPlan } from "./execution/types.js";
import type { LaminarDataProvider } from "./providers/types.js";
import type { PortfolioRecommendationResult } from "./recommendation/types.js";
import type { RecommendationSnapshot } from "./snapshot/types.js";

export type LaminarRecommendationInput = {
  intent: unknown;
  portfolioValueUsd: number;
  asOf?: Date;
  dataProvider?: LaminarDataProvider;
};

export type LaminarRecommendationResult = {
  recommendation: PortfolioRecommendationResult;
  snapshot: RecommendationSnapshot;
  executionPlan: MockExecutionPlan;
};
