import { describe, expect, it } from "vitest";
import { calculateLiquidityScore } from "./calculateLiquidityScore.js";
import {
  meetsLockupRequirement,
  meetsMinLiquidityScore,
  meetsWithdrawalDelay,
  parseWithdrawalDelayDays,
} from "./eligibility.js";
import type { OpportunityLiquidityProfile } from "./types.js";

const profile: OpportunityLiquidityProfile = {
  opportunityId: "eligibility-test",
  withdrawalSpeedBucket: "oneToSevenDays",
  withdrawalConstraintType: "queue",
  redemptionReliabilityLevel: "medium",
  assetLiquidityLevel: "veryHigh",
  maxWithdrawalDelay: "7 days",
  hasLockup: false,
};

describe("liquidity eligibility helpers", () => {
  it("parses withdrawal delay strings into days", () => {
    expect(parseWithdrawalDelayDays("instant")).toBe(0);
    expect(parseWithdrawalDelayDays("1 day")).toBe(1);
    expect(parseWithdrawalDelayDays("7 days")).toBe(7);
    expect(parseWithdrawalDelayDays("30 days")).toBe(30);
  });

  it("checks minimum liquidity score eligibility", () => {
    const result = calculateLiquidityScore(profile);

    expect(meetsMinLiquidityScore(result, 70)).toBe(true);
    expect(meetsMinLiquidityScore(result, 80)).toBe(false);
  });

  it("checks withdrawal delay eligibility", () => {
    expect(meetsWithdrawalDelay(profile, "7 days")).toBe(true);
    expect(meetsWithdrawalDelay(profile, "1 day")).toBe(false);
    expect(meetsWithdrawalDelay(profile, "instant")).toBe(false);
  });

  it("checks lockup eligibility", () => {
    expect(meetsLockupRequirement(profile, true)).toBe(true);
    expect(meetsLockupRequirement(profile, false)).toBe(true);

    const lockedProfile = { ...profile, hasLockup: true };

    expect(meetsLockupRequirement(lockedProfile, true)).toBe(true);
    expect(meetsLockupRequirement(lockedProfile, false)).toBe(false);
  });
});
