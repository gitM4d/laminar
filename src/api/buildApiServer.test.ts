import { describe, expect, it } from "vitest";
import { RecommendationDataConsistencyError } from "../core/index.js";
import { buildApiServer } from "./buildApiServer.js";

const validBody = {
  intent: {
    risk: 3,
    liquidity: 8,
    returnPreference: 4,
  },
  portfolioValueUsd: 10_000,
  asOf: "2026-06-01T00:00:00.000Z",
};

describe("buildApiServer", () => {
  it("GET /health returns ok", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "laminar-api",
      version: "0.1.0",
    });
  });

  it("POST /recommendation valid request returns 200", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: validBody,
    });

    expect(response.statusCode).toBe(200);
  });

  it("response includes recommendation, snapshot and executionPlan", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: validBody,
    });
    const body = response.json();

    expect(body.recommendation).toBeDefined();
    expect(body.snapshot).toBeDefined();
    expect(body.executionPlan).toBeDefined();
    expect(body.recommendation.selectedProfile).toBe("Balanced");
    expect(body.snapshot.profile).toBe("Balanced");
    expect(body.executionPlan.diagnostics.source).toBe("mock");
  });

  it("returns 400 when body is missing", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
    expect(response.json().error.message).toContain("validation");
  });

  it("returns 400 when intent is missing", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: { portfolioValueUsd: 10_000 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when portfolioValueUsd is missing", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: { intent: validBody.intent },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when portfolioValueUsd is invalid", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: {
        intent: validBody.intent,
        portfolioValueUsd: 0,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_PORTFOLIO_VALUE");
  });

  it("returns 400 when intent is invalid", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: {
        intent: { risk: 3.5, liquidity: 8, returnPreference: 4 },
        portfolioValueUsd: 10_000,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_INTENT");
    expect(response.json().error.details).toBeDefined();
  });

  it("returns 400 when asOf is invalid", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: {
        ...validBody,
        asOf: "not-a-date",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
  });

  it("returns 500 for data consistency errors", async () => {
    const app = buildApiServer({
      createRecommendation: () => {
        throw new RecommendationDataConsistencyError("Missing trust profile");
      },
    });
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: validBody,
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe("DATA_CONSISTENCY_ERROR");
  });

  it("returns 500 for unknown internal errors", async () => {
    const app = buildApiServer({
      createRecommendation: () => {
        throw new Error("Unexpected failure");
      },
    });
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: validBody,
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe("INTERNAL_ERROR");
    expect(response.json().error.message).toBe("Unexpected failure");
  });
});
