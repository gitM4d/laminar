import { describe, expect, it } from "vitest";
import type { PortfolioConstructionResult } from "../construction/types.js";
import type { Opportunity } from "../opportunity/types.js";
import type { OpportunityRanking } from "../scoring/types.js";
import type { PortfolioConcentrationAnalysis } from "./analyzePortfolioConcentration.js";
import { buildDiversificationTradeoff } from "./buildDiversificationTradeoff.js";

const opportunities: Opportunity[] = [
  {
    id: "aave-usdc-base",
    protocolId: "aave",
    protocolName: "Aave",
    asset: "USDC",
    chain: "Base",
    apy: 0.05,
    isExperimental: false,
    protocolRiskLevel: "low",
    auditCount: 2,
    exposureCategory: "lending",
  },
  {
    id: "morpho-usdc-base",
    protocolId: "morpho",
    protocolName: "Morpho",
    asset: "USDC",
    chain: "Base",
    apy: 0.07,
    isExperimental: false,
    protocolRiskLevel: "medium",
    auditCount: 2,
    exposureCategory: "lending",
  },
  {
    id: "fluid-usdc-base",
    protocolId: "fluid",
    protocolName: "Fluid",
    asset: "USDC",
    chain: "Base",
    apy: 0.06,
    isExperimental: false,
    protocolRiskLevel: "medium",
    auditCount: 2,
    exposureCategory: "lending",
  },
  {
    id: "aave-eurc-base",
    protocolId: "aave",
    protocolName: "Aave",
    asset: "EURC",
    chain: "Base",
    apy: 0.04,
    isExperimental: false,
    protocolRiskLevel: "low",
    auditCount: 2,
    exposureCategory: "lending",
  },
  {
    id: "morpho-eurc-base",
    protocolId: "morpho",
    protocolName: "Morpho",
    asset: "EURC",
    chain: "Base",
    apy: 0.035,
    isExperimental: false,
    protocolRiskLevel: "medium",
    auditCount: 2,
    exposureCategory: "lending",
  },
];

const lowConcentrationAnalysis: PortfolioConcentrationAnalysis = {
  assetConcentrationPercent: 100,
  protocolConcentrationPercent: 39,
  uniqueAssets: 1,
  uniqueProtocols: 3,
  largestAsset: "USDC",
  largestAssetAllocationPercent: 100,
  largestProtocol: "Fluid",
  largestProtocolAllocationPercent: 39,
  diversificationLevel: "low",
  warnings: [],
};

const mediumConcentrationAnalysis: PortfolioConcentrationAnalysis = {
  ...lowConcentrationAnalysis,
  uniqueAssets: 2,
  largestAssetAllocationPercent: 70,
  diversificationLevel: "medium",
};

const portfolioConstruction: PortfolioConstructionResult = {
  positions: [
    {
      type: "strategy",
      opportunityId: "aave-usdc-base",
      protocolId: "aave",
      protocolName: "Aave",
      asset: "USDC",
      exposureCategory: "lending",
      weight: 0.2,
    },
    {
      type: "strategy",
      opportunityId: "morpho-usdc-base",
      protocolId: "morpho",
      protocolName: "Morpho",
      asset: "USDC",
      exposureCategory: "lending",
      weight: 0.29,
    },
    {
      type: "strategy",
      opportunityId: "fluid-usdc-base",
      protocolId: "fluid",
      protocolName: "Fluid",
      asset: "USDC",
      exposureCategory: "lending",
      weight: 0.31,
    },
    {
      type: "liquidityBuffer",
      asset: "USDC",
      weight: 0.19,
    },
    {
      type: "gasReserve",
      asset: "USDC",
      weight: 0.01,
    },
  ],
  rejectedOpportunities: [],
  constructionSteps: [],
  explanations: [],
  metadata: {
    portfolioValueUsd: 10_000,
    policyVersion: 1,
    selectedProfile: "Balanced",
    totalWeight: 1,
    strategyWeight: 0.8,
    liquidityBufferWeight: 0.19,
    gasReserveWeight: 0.01,
  },
};

const opportunityRanking: OpportunityRanking = {
  ranked: [
    {
      opportunityId: "fluid-usdc-base",
      protocolId: "fluid",
      protocolName: "Fluid",
      asset: "USDC",
      rank: 1,
      scoring: {
        opportunityId: "fluid-usdc-base",
        score: 3.7,
        baseScore: 3.7,
        penaltyDenominator: 1,
        minimumPenaltyDenominator: 1,
        normalizedTrustScore: 0.8,
        normalizedLiquidityScore: 0.9,
        apyDecimal: 0.06,
        returnPreferenceMultiplier: 1,
        riskPenalty: 0,
        gasPenalty: 0,
        breakdown: {
          baseScore: 3.7,
          penaltyDenominator: 1,
          minimumPenaltyDenominator: 1,
          riskPenalty: 0,
          gasPenalty: 0,
        },
        explanations: [],
      },
    },
    {
      opportunityId: "morpho-usdc-base",
      protocolId: "morpho",
      protocolName: "Morpho",
      asset: "USDC",
      rank: 2,
      scoring: {
        opportunityId: "morpho-usdc-base",
        score: 3.4,
        baseScore: 3.4,
        penaltyDenominator: 1,
        minimumPenaltyDenominator: 1,
        normalizedTrustScore: 0.79,
        normalizedLiquidityScore: 0.9,
        apyDecimal: 0.07,
        returnPreferenceMultiplier: 1,
        riskPenalty: 0,
        gasPenalty: 0,
        breakdown: {
          baseScore: 3.4,
          penaltyDenominator: 1,
          minimumPenaltyDenominator: 1,
          riskPenalty: 0,
          gasPenalty: 0,
        },
        explanations: [],
      },
    },
    {
      opportunityId: "aave-usdc-base",
      protocolId: "aave",
      protocolName: "Aave",
      asset: "USDC",
      rank: 3,
      scoring: {
        opportunityId: "aave-usdc-base",
        score: 2.3,
        baseScore: 2.3,
        penaltyDenominator: 1,
        minimumPenaltyDenominator: 1,
        normalizedTrustScore: 0.81,
        normalizedLiquidityScore: 0.9,
        apyDecimal: 0.05,
        returnPreferenceMultiplier: 1,
        riskPenalty: 0,
        gasPenalty: 0,
        breakdown: {
          baseScore: 2.3,
          penaltyDenominator: 1,
          minimumPenaltyDenominator: 1,
          riskPenalty: 0,
          gasPenalty: 0,
        },
        explanations: [],
      },
    },
    {
      opportunityId: "aave-eurc-base",
      protocolId: "aave",
      protocolName: "Aave",
      asset: "EURC",
      rank: 4,
      scoring: {
        opportunityId: "aave-eurc-base",
        score: 2.0,
        baseScore: 2.0,
        penaltyDenominator: 1,
        minimumPenaltyDenominator: 1,
        normalizedTrustScore: 0.81,
        normalizedLiquidityScore: 0.9,
        apyDecimal: 0.04,
        returnPreferenceMultiplier: 1,
        riskPenalty: 0,
        gasPenalty: 0,
        breakdown: {
          baseScore: 2.0,
          penaltyDenominator: 1,
          minimumPenaltyDenominator: 1,
          riskPenalty: 0,
          gasPenalty: 0,
        },
        explanations: [],
      },
    },
    {
      opportunityId: "morpho-eurc-base",
      protocolId: "morpho",
      protocolName: "Morpho",
      asset: "EURC",
      rank: 5,
      scoring: {
        opportunityId: "morpho-eurc-base",
        score: 1.5,
        baseScore: 1.5,
        penaltyDenominator: 1,
        minimumPenaltyDenominator: 1,
        normalizedTrustScore: 0.79,
        normalizedLiquidityScore: 0.9,
        apyDecimal: 0.035,
        returnPreferenceMultiplier: 1,
        riskPenalty: 0,
        gasPenalty: 0,
        breakdown: {
          baseScore: 1.5,
          penaltyDenominator: 1,
          minimumPenaltyDenominator: 1,
          riskPenalty: 0,
          gasPenalty: 0,
        },
        explanations: [],
      },
    },
  ],
  rejected: [],
};

describe("buildDiversificationTradeoff", () => {
  it("returns no alternative when current diversification is medium or high", () => {
    const tradeoff = buildDiversificationTradeoff({
      concentrationAnalysis: mediumConcentrationAnalysis,
      portfolioConstruction,
      opportunityRanking,
      opportunities,
    });

    expect(tradeoff.available).toBe(false);
    expect(tradeoff.reason).toBe(
      "Current recommendation is already sufficiently diversified.",
    );
  });

  it("returns no alternative when no eligible different-asset candidate exists", () => {
    const tradeoff = buildDiversificationTradeoff({
      concentrationAnalysis: lowConcentrationAnalysis,
      portfolioConstruction,
      opportunityRanking: {
        ranked: opportunityRanking.ranked.filter(
          (ranked) => ranked.asset === "USDC",
        ),
        rejected: [],
      },
      opportunities,
    });

    expect(tradeoff.available).toBe(false);
    expect(tradeoff.reason).toBe(
      "No eligible non-dominant-asset opportunity is available.",
    );
  });

  it("uses the best-ranked different-asset candidate", () => {
    const tradeoff = buildDiversificationTradeoff({
      concentrationAnalysis: lowConcentrationAnalysis,
      portfolioConstruction,
      opportunityRanking,
      opportunities,
    });

    expect(tradeoff.available).toBe(true);
    expect(tradeoff.alternative?.assetAllocations.some(
      (allocation) => allocation.asset === "EURC",
    )).toBe(true);
    expect(tradeoff.alternative?.summary).toContain("EURC");
  });

  it("moves share from the lowest-scoring selected strategy position", () => {
    const tradeoff = buildDiversificationTradeoff({
      concentrationAnalysis: lowConcentrationAnalysis,
      portfolioConstruction,
      opportunityRanking,
      opportunities,
      targetDiversificationShare: 0.2,
    });

    expect(tradeoff.available).toBe(true);
    const usdcAllocation = tradeoff.alternative?.assetAllocations.find(
      (allocation) => allocation.asset === "USDC",
    );
    const eurcAllocation = tradeoff.alternative?.assetAllocations.find(
      (allocation) => allocation.asset === "EURC",
    );
    expect(usdcAllocation?.allocationPercent).toBeLessThan(100);
    expect(eurcAllocation?.allocationPercent).toBeGreaterThan(0);
  });

  it("computes APY cost correctly", () => {
    const tradeoff = buildDiversificationTradeoff({
      concentrationAnalysis: lowConcentrationAnalysis,
      portfolioConstruction,
      opportunityRanking,
      opportunities,
      targetDiversificationShare: 0.2,
    });

    expect(tradeoff.available).toBe(true);
    expect(tradeoff.current.strategyApy).toBeGreaterThan(0);
    expect(tradeoff.alternative?.strategyApy).toBeLessThan(
      tradeoff.current.strategyApy,
    );
    expect(tradeoff.alternative?.apyCostPercent).toBeGreaterThan(0);
    expect(tradeoff.alternative?.apyCostPercent).toBeCloseTo(
      (tradeoff.current.strategyApy - tradeoff.alternative!.strategyApy) * 100,
      2,
    );
  });

  it("does not mutate the main portfolio construction input", () => {
    const constructionCopy = structuredClone(portfolioConstruction);

    buildDiversificationTradeoff({
      concentrationAnalysis: lowConcentrationAnalysis,
      portfolioConstruction,
      opportunityRanking,
      opportunities,
    });

    expect(portfolioConstruction).toEqual(constructionCopy);
  });
});
