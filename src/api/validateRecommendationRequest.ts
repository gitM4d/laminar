import { createApiError } from "./errors.js";

export type ValidRecommendationRequest = {
  intent: unknown;
  portfolioValueUsd: number;
  asOf?: Date;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAsOf(value: unknown):
  | { valid: true; asOf: Date }
  | { valid: false; message: string } {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { valid: false, message: "asOf must be a valid ISO date string" };
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, message: "asOf must be a valid ISO date string" };
  }

  return { valid: true, asOf: parsed };
}

export function validateRecommendationRequest(
  body: unknown,
):
  | { valid: true; value: ValidRecommendationRequest }
  | { valid: false; statusCode: number; body: ReturnType<typeof createApiError> } {
  if (!isPlainObject(body)) {
    return {
      valid: false,
      statusCode: 400,
      body: createApiError("INVALID_REQUEST", "Request body must be a JSON object"),
    };
  }

  if (body.intent === undefined || body.intent === null) {
    return {
      valid: false,
      statusCode: 400,
      body: createApiError("INVALID_REQUEST", "intent is required"),
    };
  }

  if (body.portfolioValueUsd === undefined || body.portfolioValueUsd === null) {
    return {
      valid: false,
      statusCode: 400,
      body: createApiError("INVALID_REQUEST", "portfolioValueUsd is required"),
    };
  }

  if (typeof body.portfolioValueUsd !== "number" || !Number.isFinite(body.portfolioValueUsd)) {
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

  if (body.asOf !== undefined && body.asOf !== null) {
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
