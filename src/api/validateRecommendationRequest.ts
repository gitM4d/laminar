import type { RecommendationRequest } from "./contracts/types.js";
import { createApiError } from "./errors.js";

export type ValidRecommendationRequest = {
  intent: RecommendationRequest["intent"];
  portfolioValueUsd: number;
  asOf?: Date;
};

function parseAsOf(value: string):
  | { valid: true; asOf: Date }
  | { valid: false; message: string } {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, message: "asOf must be a valid ISO date string" };
  }

  return { valid: true, asOf: parsed };
}

export function validateRecommendationRequest(
  body: RecommendationRequest,
):
  | { valid: true; value: ValidRecommendationRequest }
  | { valid: false; statusCode: number; body: ReturnType<typeof createApiError> } {
  if (!Number.isFinite(body.portfolioValueUsd)) {
    return {
      valid: false,
      statusCode: 400,
      body: createApiError(
        "INVALID_REQUEST",
        "portfolioValueUsd must be a finite number",
      ),
    };
  }

  let asOf: Date | undefined;

  if (body.asOf !== undefined) {
    const parsedAsOf = parseAsOf(body.asOf);

    if (!parsedAsOf.valid) {
      return {
        valid: false,
        statusCode: 400,
        body: createApiError("INVALID_REQUEST", parsedAsOf.message),
      };
    }

    asOf = parsedAsOf.asOf;
  }

  const value: ValidRecommendationRequest = {
    intent: body.intent,
    portfolioValueUsd: body.portfolioValueUsd,
  };

  if (asOf !== undefined) {
    value.asOf = asOf;
  }

  return { valid: true, value };
}
