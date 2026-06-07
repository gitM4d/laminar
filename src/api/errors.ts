import type { ApiErrorCode, ApiErrorResponse } from "./contracts/types.js";

export type { ApiErrorCode, ApiErrorResponse } from "./contracts/types.js";

export function createApiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  if (details === undefined) {
    return {
      error: {
        code,
        message,
      },
    };
  }

  return {
    error: {
      code,
      message,
      details,
    },
  };
}
