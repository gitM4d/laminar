import { describe, expect, it } from "vitest";
import {
  ASSET_LIQUIDITY_SCORES,
  WITHDRAWAL_SPEED_BUCKET_SCORES,
} from "./liquidityConfig.js";
import {
  calculateExitSlippageScore,
  calculateLiquidityComponentScores,
  calculateRedemptionReliabilityScore,
  calculateWithdrawalConstraintScore,
  calculateWithdrawalSpeedScore,
} from "./componentScores.js";
import type { OpportunityLiquidityProfile } from "./types.js";

const baseProfile: OpportunityLiquidityProfile = {
  opportunityId: "test-opportunity",
  withdrawalSpeedBucket: "instant",
  withdrawalConstraintType: "none",
  redemptionReliabilityLevel: "veryHigh",
  assetLiquidityLevel: "veryHigh",
  maxWithdrawalDelay: "instant",
  hasLockup: false,
};

describe("liquidity componentScores", () => {
  it("scores every withdrawal speed bucket", () => {
    expect(calculateWithdrawalSpeedScore("instant")).toBe(
      WITHDRAWAL_SPEED_BUCKET_SCORES.instant,
    );
    expect(calculateWithdrawalSpeedScore("lessThanOneDay")).toBe(90);
    expect(calculateWithdrawalSpeedScore("oneToSevenDays")).toBe(75);
    expect(calculateWithdrawalSpeedScore("sevenToThirtyDays")).toBe(50);
    expect(calculateWithdrawalSpeedScore("thirtyToNinetyDays")).toBe(25);
    expect(calculateWithdrawalSpeedScore("moreThanNinetyDays")).toBe(0);
  });

  it("scores every withdrawal constraint type", () => {
    expect(calculateWithdrawalConstraintScore("none")).toBe(100);
    expect(calculateWithdrawalConstraintScore("cooldown")).toBe(75);
    expect(calculateWithdrawalConstraintScore("queue")).toBe(60);
    expect(calculateWithdrawalConstraintScore("epochBased")).toBe(50);
    expect(calculateWithdrawalConstraintScore("hardLockup")).toBe(25);
    expect(calculateWithdrawalConstraintScore("undefined")).toBe(0);
  });

  it("scores every redemption reliability level", () => {
    expect(calculateRedemptionReliabilityScore("veryHigh")).toBe(100);
    expect(calculateRedemptionReliabilityScore("high")).toBe(85);
    expect(calculateRedemptionReliabilityScore("medium")).toBe(65);
    expect(calculateRedemptionReliabilityScore("low")).toBe(40);
    expect(calculateRedemptionReliabilityScore("veryLow")).toBe(10);
  });

  it("scores every asset liquidity level", () => {
    expect(calculateExitSlippageScore("veryHigh")).toBe(
      ASSET_LIQUIDITY_SCORES.veryHigh,
    );
    expect(calculateExitSlippageScore("high")).toBe(85);
    expect(calculateExitSlippageScore("medium")).toBe(65);
    expect(calculateExitSlippageScore("low")).toBe(40);
    expect(calculateExitSlippageScore("veryLow")).toBe(10);
  });

  it("builds all component scores from a profile", () => {
    expect(calculateLiquidityComponentScores(baseProfile)).toEqual({
      withdrawalSpeed: 100,
      withdrawalConstraints: 100,
      redemptionReliability: 100,
      exitSlippage: 100,
    });
  });
});
