import { describe, expect, it } from "vitest";
import {
  createLaminarRecommendation,
  RecommendationDataConsistencyError,
} from "../core/index.js";
import { CombinedLaminarDataProvider } from "../core/providers/CombinedLaminarDataProvider.js";
import { MockLaminarDataProvider } from "../core/providers/MockLaminarDataProvider.js";
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

function buildMockApiServer() {
  const dataProvider = new MockLaminarDataProvider();
  return buildApiServer({
    providerMode: "mock",
    createRecommendation: (input) =>
      createLaminarRecommendation({ ...input, dataProvider }),
  });
}

function buildRealApiServer(dataProvider = new CombinedLaminarDataProvider([
  new MockLaminarDataProvider(),
])) {
  return buildApiServer({
    providerMode: "real",
    createRecommendation: (input) =>
      createLaminarRecommendation({ ...input, dataProvider }),
  });
}

describe("buildApiServer", () => {
  it("GET /health returns ok with provider mode", async () => {
    const app = buildMockApiServer();
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "laminar-api",
      version: "0.1.0",
      providerMode: "mock",
    });
  });

  it("POST /recommendation valid request returns 200", async () => {
    const app = buildMockApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: validBody,
    });

    expect(response.statusCode).toBe(200);
  });

  it("response includes recommendation, snapshot and executionPlan", async () => {
    const app = buildMockApiServer();
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

  it("POST /recommendation uses real provider when providerMode is real", async () => {
    const app = buildRealApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: validBody,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().recommendation.diagnostics.providerType).toBe(
      "CombinedLaminarDataProvider",
    );
    expect(response.json().executionPlan.diagnostics.source).toBe("mock");
  });

  it("POST /recommendation uses mock provider when providerMode is mock", async () => {
    const app = buildMockApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: validBody,
    });

    expect(response.json().recommendation.diagnostics.providerType).toBe(
      "MockLaminarDataProvider",
    );
  });

  it("returns 400 when body is missing", async () => {
    const app = buildMockApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
    expect(response.json().error.message).toContain("validation");
  });

  it("returns 400 when intent is missing", async () => {
    const app = buildMockApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: { portfolioValueUsd: 10_000 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when portfolioValueUsd is missing", async () => {
    const app = buildMockApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: { intent: validBody.intent },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 when portfolioValueUsd is invalid", async () => {
    const app = buildMockApiServer();
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
    const app = buildMockApiServer();
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
    const app = buildMockApiServer();
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
      providerMode: "mock",
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
      providerMode: "mock",
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
