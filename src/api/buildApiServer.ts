import Fastify, { type FastifyInstance } from "fastify";
import {
  createLaminarRecommendation,
  IntentValidationError,
  InvalidPortfolioValueError,
  RecommendationDataConsistencyError,
  type LaminarRecommendationResult,
} from "../core/index.js";
import type {
  HealthResponse,
  RecommendationRequest,
  RecommendationResponse,
} from "./contracts/types.js";
import { createApiError } from "./errors.js";
import { PACKAGE_VERSION } from "./packageVersion.js";
import { recommendationRequestSchema } from "./schemas/index.js";
import { validateRecommendationRequest } from "./validateRecommendationRequest.js";

export type ApiServerDependencies = {
  createRecommendation?: typeof createLaminarRecommendation;
};

export function buildApiServer(
  dependencies: ApiServerDependencies = {},
): FastifyInstance {
  const createRecommendation =
    dependencies.createRecommendation ?? createLaminarRecommendation;

  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "validation" in error &&
      error.validation
    ) {
      return reply
        .status(400)
        .send(
          createApiError(
            "INVALID_REQUEST",
            "Request body validation failed",
            error.validation,
          ),
        );
    }

    return reply
      .status(500)
      .send(
        createApiError(
          "INTERNAL_ERROR",
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        ),
      );
  });

  app.get(
    "/health",
    async (): Promise<HealthResponse> => ({
      status: "ok",
      service: "laminar-api",
      version: PACKAGE_VERSION,
    }),
  );

  app.post(
    "/recommendation",
    {
      schema: {
        body: recommendationRequestSchema,
      },
    },
    async (request, reply) => {
      const validation = validateRecommendationRequest(
        request.body as RecommendationRequest,
      );

      if (!validation.valid) {
        return reply.status(validation.statusCode).send(validation.body);
      }

      try {
        const input: Parameters<typeof createRecommendation>[0] = {
          intent: validation.value.intent,
          portfolioValueUsd: validation.value.portfolioValueUsd,
        };

        if (validation.value.asOf !== undefined) {
          input.asOf = validation.value.asOf;
        }

        const result: LaminarRecommendationResult = createRecommendation(input);
        const response: RecommendationResponse = {
          recommendation: result.recommendation,
          snapshot: result.snapshot,
          executionPlan: result.executionPlan,
        };

        return reply.status(200).send(response);
      } catch (error) {
        if (error instanceof IntentValidationError) {
          return reply
            .status(400)
            .send(
              createApiError("INVALID_INTENT", error.message, error.errors),
            );
        }

        if (error instanceof InvalidPortfolioValueError) {
          return reply
            .status(400)
            .send(createApiError("INVALID_PORTFOLIO_VALUE", error.message));
        }

        if (error instanceof RecommendationDataConsistencyError) {
          return reply
            .status(500)
            .send(createApiError("DATA_CONSISTENCY_ERROR", error.message));
        }

        return reply
          .status(500)
          .send(
            createApiError(
              "INTERNAL_ERROR",
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
            ),
          );
      }
    },
  );

  return app;
}
