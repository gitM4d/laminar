import { describe, expect, it } from "vitest";
import { calculateLiquidityScore } from "./calculateLiquidityScore.js";
import { LIQUIDITY_COMPONENT_WEIGHTS } from "./liquidityConfig.js";
import type { OpportunityLiquidityProfile } from "./types.js";

const pristineProfile: OpportunityLiquidityProfile = {
  opportunityId: "pristine",
  withdrawalSpeedBucket: "instant",
  withdrawalConstraintType: "none",
  redemptionReliabilityLevel: "veryHigh",
  assetLiquidityLevel: "veryHigh",
  maxWithdrawalDelay: "instant",
  hasLockup: false,
};

const highlyLiquidBase: OpportunityLiquidityProfile = {
  opportunityId: "highly-liquid",
  withdrawalSpeedBucket: "instant",
  withdrawalConstraintType: "none",
  redemptionReliabilityLevel: "veryHigh",
  assetLiquidityLevel: "veryHigh",
  maxWithdrawalDelay: "instant",
  hasLockup: false,
};

describe("calculateLiquidityScore", () => {
  it("returns a perfect score for maximum liquidity characteristics", () => {
    const result = calculateLiquidityScore(pristineProfile);

    expect(result.weightedScoreBeforeCaps).toBe(100);
    expect(result.liquidityScore).toBe(100);
    expect(result.eligible).toBe(true);
    expect(result.ineligibilityReasons).toEqual([]);
    expect(result.breakdown.appliedCaps).toEqual([]);
    expect(result.breakdown.componentScores.withdrawalSpeed).toBe(100);
    expect(result.explanations.length).toBeGreaterThan(0);
  });

  it("computes weighted total using registry component weights", () => {
    const result = calculateLiquidityScore({
      opportunityId: "mixed",
      withdrawalSpeedBucket: "oneToSevenDays",
      withdrawalConstraintType: "queue",
      redemptionReliabilityLevel: "medium",
      assetLiquidityLevel: "veryHigh",
      maxWithdrawalDelay: "7 days",
      hasLockup: false,
    });

    const expected =
      75 * LIQUIDITY_COMPONENT_WEIGHTS.withdrawalSpeed +
      60 * LIQUIDITY_COMPONENT_WEIGHTS.withdrawalConstraints +
      65 * LIQUIDITY_COMPONENT_WEIGHTS.redemptionReliability +
      100 * LIQUIDITY_COMPONENT_WEIGHTS.exitSlippage;

    expect(result.weightedScoreBeforeCaps).toBe(expected);
    expect(result.liquidityScore).toBe(expected);
    expect(result.breakdown.weightedContributions.withdrawalSpeed).toBe(26.25);
    expect(result.breakdown.weightedContributions.withdrawalConstraints).toBe(18);
    expect(result.breakdown.weightedContributions.redemptionReliability).toBe(13);
    expect(result.breakdown.weightedContributions.exitSlippage).toBe(15);
  });

  it("returns a low score for constrained opportunities", () => {
    const result = calculateLiquidityScore({
      opportunityId: "illiquid",
      withdrawalSpeedBucket: "moreThanNinetyDays",
      withdrawalConstraintType: "hardLockup",
      redemptionReliabilityLevel: "veryLow",
      assetLiquidityLevel: "veryLow",
      maxWithdrawalDelay: "90 days",
      hasLockup: true,
    });

    expect(result.liquidityScore).toBeLessThan(20);
    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons.length).toBeGreaterThan(0);
  });

  it("clamps liquidity score between 0 and 100", () => {
    const result = calculateLiquidityScore(pristineProfile);

    expect(result.liquidityScore).toBeGreaterThanOrEqual(0);
    expect(result.liquidityScore).toBeLessThanOrEqual(100);
  });

  it("applies hardLockup cap after weighted score calculation", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "hard-lockup-cap",
      withdrawalConstraintType: "hardLockup",
      hasLockup: true,
    });

    expect(result.weightedScoreBeforeCaps).toBe(77.5);
    expect(result.liquidityScore).toBe(60);
    expect(result.breakdown.appliedCaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "hardLockupCap", maxScore: 60 }),
      ]),
    );
  });

  it("applies thirtyToNinetyDays cap after weighted score calculation", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "thirty-to-ninety-cap",
      withdrawalSpeedBucket: "thirtyToNinetyDays",
      maxWithdrawalDelay: "60 days",
    });

    expect(result.weightedScoreBeforeCaps).toBe(73.75);
    expect(result.liquidityScore).toBe(60);
    expect(result.breakdown.appliedCaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "thirtyToNinetyDaysCap", maxScore: 60 }),
      ]),
    );
  });

  it("applies moreThanNinetyDays cap after weighted score calculation", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "more-than-ninety-cap",
      withdrawalSpeedBucket: "moreThanNinetyDays",
      maxWithdrawalDelay: "120 days",
    });

    expect(result.weightedScoreBeforeCaps).toBe(65);
    expect(result.liquidityScore).toBe(25);
    expect(result.breakdown.appliedCaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "moreThanNinetyDaysCap",
          maxScore: 25,
        }),
      ]),
    );
  });

  it("applies low redemption reliability cap after weighted score calculation", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "low-reliability-cap",
      redemptionReliabilityLevel: "low",
    });

    expect(result.weightedScoreBeforeCaps).toBe(88);
    expect(result.liquidityScore).toBe(70);
    expect(result.breakdown.appliedCaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "lowRedemptionReliabilityCap",
          maxScore: 70,
        }),
      ]),
    );
  });

  it("applies veryLow redemption reliability cap after weighted score calculation", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "very-low-reliability-cap",
      redemptionReliabilityLevel: "veryLow",
    });

    expect(result.weightedScoreBeforeCaps).toBe(82);
    expect(result.liquidityScore).toBe(40);
    expect(result.breakdown.appliedCaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "veryLowRedemptionReliabilityCap",
          maxScore: 40,
        }),
      ]),
    );
  });

  it("chooses the lowest applicable cap when multiple caps match", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "multiple-caps",
      withdrawalConstraintType: "hardLockup",
      redemptionReliabilityLevel: "veryLow",
      hasLockup: true,
    });

    expect(result.weightedScoreBeforeCaps).toBe(59.5);
    expect(result.liquidityScore).toBe(40);
    expect(result.breakdown.appliedCaps).toHaveLength(2);
    expect(
      Math.min(...result.breakdown.appliedCaps.map((cap) => cap.maxScore)),
    ).toBe(40);
  });

  it("does not apply caps for a highly liquid position", () => {
    const result = calculateLiquidityScore(pristineProfile);

    expect(result.breakdown.appliedCaps).toEqual([]);
    expect(result.weightedScoreBeforeCaps).toBe(result.liquidityScore);
  });

  it("marks undefined withdrawal constraint as structurally ineligible", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "undefined-constraint",
      withdrawalConstraintType: "undefined",
    });

    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons).toContain(
      "Withdrawal constraint is undefined.",
    );
  });

  it("marks veryLow redemption reliability as structurally ineligible", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "very-low-ineligible",
      redemptionReliabilityLevel: "veryLow",
    });

    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons).toContain(
      "Redemption reliability is very low.",
    );
  });

  it("marks moreThanNinetyDays withdrawal speed as structurally ineligible", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "slow-withdrawal-ineligible",
      withdrawalSpeedBucket: "moreThanNinetyDays",
      maxWithdrawalDelay: "120 days",
    });

    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons).toContain(
      "Withdrawal speed exceeds 90 days.",
    );
  });

  it("marks hardLockup with lockup and moreThanNinetyDays as structurally ineligible", () => {
    const result = calculateLiquidityScore({
      ...highlyLiquidBase,
      opportunityId: "permanent-lock-ineligible",
      withdrawalSpeedBucket: "moreThanNinetyDays",
      withdrawalConstraintType: "hardLockup",
      hasLockup: true,
      maxWithdrawalDelay: "120 days",
    });

    expect(result.eligible).toBe(false);
    expect(result.ineligibilityReasons).toContain(
      "Permanent capital lock with hard lockup and withdrawals beyond 90 days.",
    );
  });
});
