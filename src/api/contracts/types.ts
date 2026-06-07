import type {
  LaminarRecommendationResult,
  MockExecutionPlan,
  PortfolioRecommendationResult,
  RecommendationSnapshot,
} from "../../core/index.js";

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_INTENT"
  | "INVALID_PORTFOLIO_VALUE"
  | "DATA_CONSISTENCY_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export type HealthResponse = {
  status: "ok";
  service: "laminar-api";
  version: string;
};

export type RecommendationRequestIntent = {
  risk: number;
  liquidity: number;
  returnPreference: number;
};

export type RecommendationRequest = {
  intent: RecommendationRequestIntent;
  portfolioValueUsd: number;
  asOf?: string;
};

export type RecommendationResponse = {
  recommendation: PortfolioRecommendationResult;
  snapshot: RecommendationSnapshot;
  executionPlan: MockExecutionPlan;
};

export type { LaminarRecommendationResult };
