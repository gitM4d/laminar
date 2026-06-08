import type {
  ApiErrorResponse,
  RecommendationRequest,
  RecommendationResponse,
} from "../types.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiRequestError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.details = details;
  }
}

export async function createRecommendation(
  request: RecommendationRequest,
): Promise<RecommendationResponse> {
  const response = await fetch(`${API_BASE_URL}/recommendation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const body = (await response.json()) as
    | RecommendationResponse
    | ApiErrorResponse;

  if (!response.ok) {
    if ("error" in body) {
      throw new ApiRequestError(
        body.error.code,
        body.error.message,
        body.error.details,
      );
    }

    throw new ApiRequestError(
      "INTERNAL_ERROR",
      "Unexpected API error response",
    );
  }

  return body as RecommendationResponse;
}
