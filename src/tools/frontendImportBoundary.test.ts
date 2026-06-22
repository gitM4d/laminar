import { describe, expect, it } from "vitest";
import {
  scanFrontendImportBoundary,
  validateFrontendImportPath,
} from "./frontendImportBoundary.js";

describe("frontend import boundary", () => {
  it("allows relative imports and @laminar/frontend-safe", () => {
    expect(validateFrontendImportPath("./App.js")).toBeNull();
    expect(validateFrontendImportPath("../preview/buildAaveWalletPreviews.js")).toBeNull();
    expect(validateFrontendImportPath("react")).toBeNull();
    expect(validateFrontendImportPath("wagmi")).toBeNull();
    expect(validateFrontendImportPath("@laminar/frontend-safe")).toBeNull();
  });

  it("rejects forbidden @laminar prefixes", () => {
    const forbiddenImports = [
      "@laminar/core/execution/types.js",
      "@laminar/api/server.ts",
      "@laminar/execution-adapters/aave/AaveExecutionAdapter.js",
      "@laminar/tools/realRecommendationQa.ts",
      "@laminar",
    ];

    for (const importPath of forbiddenImports) {
      const violation = validateFrontendImportPath(importPath);
      expect(violation, importPath).not.toBeNull();
    }
  });

  it("rejects server-only Node modules", () => {
    for (const importPath of ["fs", "path", "dotenv", "child_process", "node:crypto"]) {
      const violation = validateFrontendImportPath(importPath);
      expect(violation?.reason).toContain("Forbidden Node/server module");
    }
  });

  it("passes for current frontend/src imports", () => {
    const violations = scanFrontendImportBoundary();
    expect(violations).toEqual([]);
  });
});
