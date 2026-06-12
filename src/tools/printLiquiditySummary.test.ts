import { describe, expect, it } from "vitest";
import { printLiquiditySummary } from "./printLiquiditySummary.js";

describe("printLiquiditySummary", () => {
  it("formats derived liquidity signals for CLI output", () => {
    const lines: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    };

    try {
      printLiquiditySummary([
        {
          protocolId: "fluid",
          protocolName: "Fluid",
          tvlUsd: 11_000_000,
          tvlBucket: "medium",
          liquidityConfidence: "medium",
          source: "real-market-data",
        },
      ]);
    } finally {
      console.log = originalLog;
    }

    expect(lines.join("\n")).toContain("Liquidity Summary:");
    expect(lines.join("\n")).toContain("Fluid:");
    expect(lines.join("\n")).toContain("tvl: $11M");
    expect(lines.join("\n")).toContain("bucket: medium");
    expect(lines.join("\n")).toContain("confidence: medium");
  });
});
