import { createMockExecutionPlan } from "./execution/createMockExecutionPlan.js";
import type { LaminarDataProvider } from "./providers/types.js";
import { generatePortfolioRecommendation } from "./recommendation/generatePortfolioRecommendation.js";
import { createRecommendationSnapshot } from "./snapshot/createRecommendationSnapshot.js";
import type { PortfolioRecommendationResult } from "./recommendation/types.js";
import type {
  LaminarRecommendationInput,
  LaminarRecommendationResult,
} from "./types.js";

export type { UserIntent } from "./intent/types.js";
export type { PortfolioRecommendationResult } from "./recommendation/types.js";
export type { RecommendationSnapshot } from "./snapshot/types.js";
export type { MockExecutionPlan } from "./execution/types.js";
export type {
  LaminarRecommendationInput,
  LaminarRecommendationResult,
} from "./types.js";
export type {
  LaminarDataProvider,
  LiquidityProfileProvider,
  OpportunityProvider,
  TrustProfileProvider,
} from "./providers/types.js";
export { MockLaminarDataProvider } from "./providers/MockLaminarDataProvider.js";

export {
  IntentValidationError,
  InvalidPortfolioValueError,
  RecommendationDataConsistencyError,
} from "./recommendation/generatePortfolioRecommendation.js";

export function createLaminarRecommendation(
  input: LaminarRecommendationInput,
): LaminarRecommendationResult {
  const recommendationInput: {
    intent: unknown;
    portfolioValueUsd: number;
    asOf?: Date;
    dataProvider?: LaminarDataProvider;
  } = {
    intent: input.intent,
    portfolioValueUsd: input.portfolioValueUsd,
  };

  if (input.asOf !== undefined) {
    recommendationInput.asOf = input.asOf;
  }

  if (input.dataProvider !== undefined) {
    recommendationInput.dataProvider = input.dataProvider;
  }

  const recommendation = generatePortfolioRecommendation(recommendationInput);
  const executionPlan = createMockExecutionPlan({ recommendation });
  const recommendationWithExecutionDiagnostics: PortfolioRecommendationResult = {
    ...recommendation,
    diagnostics: {
      ...recommendation.diagnostics,
      executionPlanVersion: "v2",
      executionPlanRealistic: true,
    },
  };
  const snapshot = createRecommendationSnapshot(
    recommendationWithExecutionDiagnostics,
  );

  return {
    recommendation: recommendationWithExecutionDiagnostics,
    snapshot,
    executionPlan,
  };
}
