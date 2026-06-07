import type { MockExecutionPlan } from "./execution/types.js";
import type { PortfolioRecommendationResult } from "./recommendation/types.js";
import type { RecommendationSnapshot } from "./snapshot/types.js";

export type LaminarRecommendationInput = {
  intent: unknown;
  portfolioValueUsd: number;
  asOf?: Date;
};

export type LaminarRecommendationResult = {
  recommendation: PortfolioRecommendationResult;
  snapshot: RecommendationSnapshot;
  executionPlan: MockExecutionPlan;
};
