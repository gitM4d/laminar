import { describe, expect, it } from "vitest";
import { analyzePortfolioConcentration } from "./analyzePortfolioConcentration.js";

describe("analyzePortfolioConcentration", () => {
  it("aggregates asset exposure across strategy positions", () => {
    const analysis = analyzePortfolioConcentration([
      { asset: "USDC", protocolId: "aave", protocolName: "Aave", weight: 0.25 },
      { asset: "USDC", protocolId: "morpho", protocolName: "Morpho", weight: 0.3 },
      { asset: "USDC", protocolId: "fluid", protocolName: "Fluid", weight: 0.2 },
      { asset: "EURC", protocolId: "morpho", protocolName: "Morpho", weight: 0.15 },
    ]);

    expect(analysis.largestAsset).toBe("USDC");
    expect(analysis.largestAssetAllocationPercent).toBeCloseTo(83.33, 2);
    expect(analysis.assetConcentrationPercent).toBeCloseTo(83.33, 2);
    expect(analysis.uniqueAssets).toBe(2);
  });

  it("aggregates protocol exposure across strategy positions", () => {
    const analysis = analyzePortfolioConcentration([
      { asset: "USDC", protocolId: "aave", protocolName: "Aave", weight: 0.25 },
      { asset: "USDC", protocolId: "morpho", protocolName: "Morpho", weight: 0.45 },
      { asset: "EURC", protocolId: "fluid", protocolName: "Fluid", weight: 0.2 },
    ]);

    expect(analysis.largestProtocol).toBe("Morpho");
    expect(analysis.largestProtocolAllocationPercent).toBe(50);
    expect(analysis.protocolConcentrationPercent).toBe(50);
    expect(analysis.uniqueProtocols).toBe(3);
  });

  it("classifies high diversification", () => {
    const analysis = analyzePortfolioConcentration([
      { asset: "USDC", protocolId: "aave", protocolName: "Aave", weight: 0.2 },
      { asset: "EURC", protocolId: "morpho", protocolName: "Morpho", weight: 0.2 },
      { asset: "DAI", protocolId: "fluid", protocolName: "Fluid", weight: 0.2 },
    ]);

    expect(analysis.diversificationLevel).toBe("high");
    expect(analysis.warnings).not.toContain("Portfolio diversification is low.");
  });

  it("classifies medium diversification", () => {
    const analysis = analyzePortfolioConcentration([
      { asset: "USDC", protocolId: "aave", protocolName: "Aave", weight: 0.4 },
      { asset: "EURC", protocolId: "morpho", protocolName: "Morpho", weight: 0.35 },
    ]);

    expect(analysis.diversificationLevel).toBe("medium");
  });

  it("classifies low diversification", () => {
    const analysis = analyzePortfolioConcentration([
      { asset: "USDC", protocolId: "aave", protocolName: "Aave", weight: 0.34 },
      { asset: "USDC", protocolId: "morpho", protocolName: "Morpho", weight: 0.33 },
      { asset: "USDC", protocolId: "fluid", protocolName: "Fluid", weight: 0.33 },
    ]);

    expect(analysis.diversificationLevel).toBe("low");
    expect(analysis.uniqueProtocols).toBe(3);
    expect(analysis.uniqueAssets).toBe(1);
    expect(analysis.warnings).toContain(
      "Strategy allocation spans 3 protocols but only 1 asset.",
    );
    expect(analysis.warnings).toContain("Portfolio diversification is low.");
  });

  it("generates asset and protocol concentration warnings", () => {
    const analysis = analyzePortfolioConcentration([
      { asset: "USDC", protocolId: "morpho", protocolName: "Morpho", weight: 0.96 },
      { asset: "EURC", protocolId: "aave", protocolName: "Aave", weight: 0.04 },
    ]);

    expect(analysis.warnings.some((warning) => warning.includes("USDC"))).toBe(
      true,
    );
  });

  it("warns when a single protocol exceeds 70% of strategy allocation", () => {
    const analysis = analyzePortfolioConcentration([
      { asset: "USDC", protocolId: "morpho", protocolName: "Morpho", weight: 0.75 },
      { asset: "EURC", protocolId: "aave", protocolName: "Aave", weight: 0.25 },
    ]);

    expect(analysis.warnings).toContain(
      "More than 70% of strategy allocation is concentrated in a single protocol.",
    );
  });
});
