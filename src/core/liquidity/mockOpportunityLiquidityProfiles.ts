import type { OpportunityLiquidityProfile } from "./types.js";

export const MOCK_OPPORTUNITY_LIQUIDITY_PROFILES: Record<
  string,
  OpportunityLiquidityProfile
> = {
  "morpho-usdc-base": {
    opportunityId: "morpho-usdc-base",
    withdrawalSpeedBucket: "instant",
    withdrawalConstraintType: "none",
    redemptionReliabilityLevel: "veryHigh",
    assetLiquidityLevel: "veryHigh",
    maxWithdrawalDelay: "instant",
    hasLockup: false,
  },
  "aave-usdc-base": {
    opportunityId: "aave-usdc-base",
    withdrawalSpeedBucket: "instant",
    withdrawalConstraintType: "none",
    redemptionReliabilityLevel: "veryHigh",
    assetLiquidityLevel: "veryHigh",
    maxWithdrawalDelay: "instant",
    hasLockup: false,
  },
  "moonwell-usdc-base": {
    opportunityId: "moonwell-usdc-base",
    withdrawalSpeedBucket: "lessThanOneDay",
    withdrawalConstraintType: "cooldown",
    redemptionReliabilityLevel: "high",
    assetLiquidityLevel: "veryHigh",
    maxWithdrawalDelay: "1 day",
    hasLockup: false,
  },
  "aave-eurc-base": {
    opportunityId: "aave-eurc-base",
    withdrawalSpeedBucket: "instant",
    withdrawalConstraintType: "none",
    redemptionReliabilityLevel: "veryHigh",
    assetLiquidityLevel: "veryHigh",
    maxWithdrawalDelay: "instant",
    hasLockup: false,
  },
  "moonwell-dai-base": {
    opportunityId: "moonwell-dai-base",
    withdrawalSpeedBucket: "oneToSevenDays",
    withdrawalConstraintType: "queue",
    redemptionReliabilityLevel: "medium",
    assetLiquidityLevel: "veryHigh",
    maxWithdrawalDelay: "7 days",
    hasLockup: false,
  },
  "experimental-usdc-base": {
    opportunityId: "experimental-usdc-base",
    withdrawalSpeedBucket: "thirtyToNinetyDays",
    withdrawalConstraintType: "hardLockup",
    redemptionReliabilityLevel: "low",
    assetLiquidityLevel: "veryHigh",
    maxWithdrawalDelay: "30 days",
    hasLockup: true,
  },
};
