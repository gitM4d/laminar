import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as frontendSafe from "./index.js";

const FORBIDDEN_EXPORT_NAMES = [
  "createCombinedRealProvider",
  "buildDefaultLaminarDataProvider",
  "MockLaminarDataProvider",
  "buildApiServer",
  "startServer",
  "resolveAaveBaseRpcUrl",
  "dotenv",
] as const;

const FORBIDDEN_SOURCE_PATH_SEGMENTS = [
  "/api/",
  "/providers/",
  "/tools/",
  "/demo/",
  "dotenv",
  "node:fs",
  "node:path",
] as const;

const REQUIRED_EXPORT_NAMES = [
  "AaveExecutionAdapter",
  "validateTransactionPlan",
  "selectAaveSupplyIntents",
  "formatShortTxData",
  "shortenAddress",
  "isBaseChainId",
  "BASE_CHAIN_ID",
] as const;

describe("frontend-safe exports", () => {
  it("exports required wallet preview symbols", () => {
    for (const exportName of REQUIRED_EXPORT_NAMES) {
      expect(Object.prototype.hasOwnProperty.call(frontendSafe, exportName)).toBe(
        true,
      );
    }
  });

  it("does not export forbidden server/provider symbols", () => {
    const exportedNames = Object.keys(frontendSafe);

    for (const forbiddenName of FORBIDDEN_EXPORT_NAMES) {
      expect(exportedNames).not.toContain(forbiddenName);
      expect(
        (frontendSafe as Record<string, unknown>)[forbiddenName],
      ).toBeUndefined();
    }
  });

  it("re-exports only from browser-safe source modules", () => {
    const indexPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "index.ts",
    );
    const source = readFileSync(indexPath, "utf8");

    for (const segment of FORBIDDEN_SOURCE_PATH_SEGMENTS) {
      expect(source.includes(segment)).toBe(false);
    }

    expect(source).toContain("../execution-adapters/");
    expect(source).toContain("../core/execution/types.js");
  });
});
