export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_INTENT"
  | "INVALID_PORTFOLIO_VALUE"
  | "DATA_CONSISTENCY_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

export function createApiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorBody {
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
