import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { calculateOpportunityScore } from "./calculateOpportunityScore.js";
import {
  GAS_PENALTY,
  MINIMUM_PENALTY_DENOMINATOR,
  RETURN_PREFERENCE_MULTIPLIERS,
} from "./scoringConfig.js";
import type { CalculateOpportunityScoreInput } from "./types.js";

const testDir = dirname(fileURLToPath(import.meta.url));

const baseOpportunity = {
  id: "test-opportunity",
  protocolId: "morpho",
  protocolName: "Morpho",
  asset: "USDC" as const,
  chain: "Base" as const,
  apy: 0.1,
  isExperimental: false,
  protocolRiskLevel: "low" as const,
  auditCount: 2,
  exposureCategory: "lending" as const,
};

const baseInput: CalculateOpportunityScoreInput = {
  opportunity: baseOpportunity,
  selectedProfile: "Balanced",
  trustScoreResult: {
    protocolId: "morpho",
    protocolName: "Morpho",
    trustScore: 80,
    breakdown: {
      componentScores: {
        securityIncidents: 100,
        audits: 48,
        protocolAge: 90,
        tvl: 100,
      },
      weightedContributions: {
        securityIncidents: 35,
        audits: 16,
        protocolAge: 15,
        tvl: 11,
      },
      incidentPenalties: [],
      chainAdjustment: 0,
      protocolTrustScore: 80,
    },
    explanations: [],
  },
  liquidityScoreResult: {
    opportunityId: "test-opportunity",
    weightedScoreBeforeCaps: 90,
    liquidityScore: 90,
    eligible: true,
    ineligibilityReasons: [],
    breakdown: {
      componentScores: {
        withdrawalSpeed: 90,
        withdrawalConstraints: 90,
        redemptionReliability: 90,
        exitSlippage: 90,
      },
      weightedContributions: {
        withdrawalSpeed: 31.5,
        withdrawalConstraints: 27,
        redemptionReliability: 18,
        exitSlippage: 13.5,
      },
      weightedScoreBeforeCaps: 90,
      appliedCaps: [],
    },
    explanations: [],
  },
  riskAssessmentResult: {
    opportunityId: "test-opportunity",
    decision: "eligible",
    totalRiskPenalty: 0,
    penalties: [],
    rejectionReasons: [],
    explanations: [],
    consumedTrustScore: 80,
    consumedLiquidityScore: 90,
  },
};

function expectedScore(
  input: CalculateOpportunityScoreInput,
  riskPenalty: number,
): number {
  const apyDecimal = input.opportunity.apy >= 1 ? input.opportunity.apy / 100 : input.opportunity.apy;
  const baseScore =
    apyDecimal *
    (input.trustScoreResult.trustScore / 100) *
    (input.liquidityScoreResult.liquidityScore / 100) *
    RETURN_PREFERENCE_MULTIPLIERS[input.selectedProfile];
  const penaltyDenominator =
    riskPenalty + GAS_PENALTY + MINIMUM_PENALTY_DENOMINATOR;

  return baseScore / penaltyDenominator;
}

describe("calculateOpportunityScore", () => {
  it("normalizes trust score to 0-1", () => {
    const result = calculateOpportunityScore(baseInput);

    expect(result.normalizedTrustScore).toBe(0.8);
  });

  it("normalizes liquidity score to 0-1", () => {
    const result = calculateOpportunityScore(baseInput);

    expect(result.normalizedLiquidityScore).toBe(0.9);
  });

  it("converts percentage APY to decimal", () => {
    const result = calculateOpportunityScore({
      ...baseInput,
      opportunity: {
        ...baseOpportunity,
        apy: 10,
      },
    });

    expect(result.apyDecimal).toBe(0.1);
  });

  it("applies Conservative return preference multiplier", () => {
    const result = calculateOpportunityScore({
      ...baseInput,
      selectedProfile: "Conservative",
    });

    expect(result.returnPreferenceMultiplier).toBe(
      RETURN_PREFERENCE_MULTIPLIERS.Conservative,
    );
    expect(result.score).toBeCloseTo(
      expectedScore({ ...baseInput, selectedProfile: "Conservative" }, 0),
      6,
    );
  });

  it("applies Balanced return preference multiplier", () => {
    const result = calculateOpportunityScore(baseInput);

    expect(result.returnPreferenceMultiplier).toBe(
      RETURN_PREFERENCE_MULTIPLIERS.Balanced,
    );
    expect(result.score).toBeCloseTo(expectedScore(baseInput, 0), 6);
  });

  it("applies Yield Focused return preference multiplier", () => {
    const result = calculateOpportunityScore({
      ...baseInput,
      selectedProfile: "Yield Focused",
    });

    expect(result.returnPreferenceMultiplier).toBe(
      RETURN_PREFERENCE_MULTIPLIERS["Yield Focused"],
    );
    expect(result.score).toBeCloseTo(
      expectedScore({ ...baseInput, selectedProfile: "Yield Focused" }, 0),
      6,
    );
  });

  it("uses division instead of subtraction for the opportunity score", () => {
    const result = calculateOpportunityScore({
      ...baseInput,
      riskAssessmentResult: {
        ...baseInput.riskAssessmentResult,
        totalRiskPenalty: 0.05,
      },
    });

    expect(result.score).toBeCloseTo(expectedScore(baseInput, 0.05), 6);
    expect(result.score).not.toBeCloseTo(result.baseScore - 0.05 - GAS_PENALTY, 6);
  });

  it("reduces score with risk penalty without necessarily zeroing it", () => {
    const withoutPenalty = calculateOpportunityScore(baseInput);
    const withPenalty = calculateOpportunityScore({
      ...baseInput,
      riskAssessmentResult: {
        ...baseInput.riskAssessmentResult,
        totalRiskPenalty: 0.05,
      },
    });

    expect(withPenalty.score).toBeLessThan(withoutPenalty.score);
    expect(withPenalty.score).toBeGreaterThan(0);
    expect(withPenalty.riskPenalty).toBe(0.05);
  });

  it("includes gas penalty in the penalty denominator", () => {
    const result = calculateOpportunityScore(baseInput);

    expect(result.gasPenalty).toBe(GAS_PENALTY);
    expect(result.penaltyDenominator).toBeCloseTo(
      result.riskPenalty + GAS_PENALTY + MINIMUM_PENALTY_DENOMINATOR,
      6,
    );
    expect(result.score).toBeCloseTo(
      result.baseScore / result.penaltyDenominator,
      6,
    );
  });

  it("uses minimumPenaltyDenominator to prevent division by zero", () => {
    const result = calculateOpportunityScore(baseInput);

    expect(result.minimumPenaltyDenominator).toBe(MINIMUM_PENALTY_DENOMINATOR);
    expect(result.penaltyDenominator).toBeGreaterThanOrEqual(
      MINIMUM_PENALTY_DENOMINATOR,
    );
    expect(result.score).toBeGreaterThan(0);
  });

  it("does not import trust calculation modules", () => {
    const source = readFileSync(
      resolve(testDir, "calculateOpportunityScore.ts"),
      "utf8",
    );

    expect(source).not.toContain("calculateTrustScore");
    expect(source).not.toContain("scoreOpportunityTrust");
  });

  it("does not import liquidity calculation modules", () => {
    const source = readFileSync(
      resolve(testDir, "calculateOpportunityScore.ts"),
      "utf8",
    );

    expect(source).not.toContain("calculateLiquidityScore");
    expect(source).not.toContain("scoreOpportunityLiquidity");
  });

  it("does not import risk evaluation modules", () => {
    const source = readFileSync(
      resolve(testDir, "calculateOpportunityScore.ts"),
      "utf8",
    );

    expect(source).not.toContain("evaluateOpportunityRisk");
    expect(source).not.toContain("assessOpportunitiesRisk");
  });
});
