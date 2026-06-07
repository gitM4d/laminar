import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildApiServer } from "./buildApiServer.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

const exampleFiles = [
  "docs/api/openapi.json",
  "docs/api/examples/health.response.json",
  "docs/api/examples/recommendation.request.json",
  "docs/api/examples/recommendation.response.summary.json",
  "docs/api/examples/error.invalid-request.json",
];

const validBody = {
  intent: {
    risk: 3,
    liquidity: 8,
    returnPreference: 4,
  },
  portfolioValueUsd: 10_000,
  asOf: "2026-06-01T00:00:00.000Z",
};

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(rootDir, relativePath), "utf8"));
}

function expectApiErrorShape(body: unknown): void {
  expect(body).toEqual(
    expect.objectContaining({
      error: expect.objectContaining({
        code: expect.any(String),
        message: expect.any(String),
      }),
    }),
  );
}

describe("API contract artifacts", () => {
  it("OpenAPI file exists and is valid JSON", () => {
    const openapi = readJson("docs/api/openapi.json");

    expect(openapi).toBeDefined();
    expect((openapi as { openapi: string }).openapi).toMatch(/^3\./);
  });

  it("OpenAPI contains GET /health", () => {
    const openapi = readJson("docs/api/openapi.json") as {
      paths: Record<string, unknown>;
    };

    expect(openapi.paths["/health"]).toBeDefined();
    expect((openapi.paths["/health"] as { get: unknown }).get).toBeDefined();
  });

  it("OpenAPI contains POST /recommendation", () => {
    const openapi = readJson("docs/api/openapi.json") as {
      paths: Record<string, unknown>;
    };

    expect(openapi.paths["/recommendation"]).toBeDefined();
    expect(
      (openapi.paths["/recommendation"] as { post: unknown }).post,
    ).toBeDefined();
  });

  it.each(exampleFiles)("example file %s exists and is valid JSON", (filePath) => {
    expect(readJson(filePath)).toBeDefined();
  });
});

describe("API contract runtime behavior", () => {
  it("POST /recommendation rejects wrong shape before reaching core", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: {
        intent: "invalid",
        portfolioValueUsd: 10_000,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
    expectApiErrorShape(body);
  });

  it("error responses follow ApiErrorResponse shape", async () => {
    const app = buildApiServer();
    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: "/recommendation",
        payload: {
          intent: { risk: 3.5, liquidity: 8, returnPreference: 4 },
          portfolioValueUsd: 10_000,
        },
      }),
      app.inject({
        method: "POST",
        url: "/recommendation",
        payload: {
          intent: { risk: 3, liquidity: 8, returnPreference: 4 },
          portfolioValueUsd: 0,
        },
      }),
    ]);

    for (const response of responses) {
      expectApiErrorShape(response.json());
      expect(response.json().error.code).toBeDefined();
      expect(response.json().error.message).toBeDefined();
    }
  });

  it("valid request still works", async () => {
    const app = buildApiServer();
    const response = await app.inject({
      method: "POST",
      url: "/recommendation",
      payload: validBody,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.recommendation).toBeDefined();
    expect(body.snapshot).toBeDefined();
    expect(body.executionPlan).toBeDefined();
  });
});
