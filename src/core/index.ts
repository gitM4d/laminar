import { createMockExecutionPlan } from "./execution/createMockExecutionPlan.js";
import { generatePortfolioRecommendation } from "./recommendation/generatePortfolioRecommendation.js";
import { createRecommendationSnapshot } from "./snapshot/createRecommendationSnapshot.js";
import type { LaminarRecommendationInput, LaminarRecommendationResult } from "./types.js";

export type { UserIntent } from "./intent/types.js";
export type { PortfolioRecommendationResult } from "./recommendation/types.js";
export type { RecommendationSnapshot } from "./snapshot/types.js";
export type { MockExecutionPlan } from "./execution/types.js";
export type { LaminarRecommendationInput, LaminarRecommendationResult } from "./types.js";

export {
  IntentValidationError,
  InvalidPortfolioValueError,
  RecommendationDataConsistencyError,
} from "./recommendation/generatePortfolioRecommendation.js";

export function createLaminarRecommendation(
  input: LaminarRecommendationInput,
): LaminarRecommendationResult {
  const recommendation = generatePortfolioRecommendation({
    intent: input.intent,
    portfolioValueUsd: input.portfolioValueUsd,
    asOf: input.asOf,
  });
  const snapshot = createRecommendationSnapshot(recommendation);
  const executionPlan = createMockExecutionPlan({ recommendation, snapshot });

  return {
    recommendation,
    snapshot,
    executionPlan,
  };
}
