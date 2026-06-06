import {
  ASSET_LIQUIDITY_SCORES,
  REDEMPTION_RELIABILITY_SCORES,
  WITHDRAWAL_CONSTRAINT_SCORES,
  WITHDRAWAL_SPEED_BUCKET_SCORES,
} from "./liquidityConfig.js";
import type {
  LiquidityComponentScores,
  OpportunityLiquidityProfile,
} from "./types.js";

export function calculateWithdrawalSpeedScore(
  bucket: OpportunityLiquidityProfile["withdrawalSpeedBucket"],
): number {
  return WITHDRAWAL_SPEED_BUCKET_SCORES[bucket];
}

export function calculateWithdrawalConstraintScore(
  constraintType: OpportunityLiquidityProfile["withdrawalConstraintType"],
): number {
  return WITHDRAWAL_CONSTRAINT_SCORES[constraintType];
}

export function calculateRedemptionReliabilityScore(
  reliabilityLevel: OpportunityLiquidityProfile["redemptionReliabilityLevel"],
): number {
  return REDEMPTION_RELIABILITY_SCORES[reliabilityLevel];
}

export function calculateExitSlippageScore(
  assetLiquidityLevel: OpportunityLiquidityProfile["assetLiquidityLevel"],
): number {
  return ASSET_LIQUIDITY_SCORES[assetLiquidityLevel];
}

export function calculateLiquidityComponentScores(
  profile: OpportunityLiquidityProfile,
): LiquidityComponentScores {
  return {
    withdrawalSpeed: calculateWithdrawalSpeedScore(profile.withdrawalSpeedBucket),
    withdrawalConstraints: calculateWithdrawalConstraintScore(
      profile.withdrawalConstraintType,
    ),
    redemptionReliability: calculateRedemptionReliabilityScore(
      profile.redemptionReliabilityLevel,
    ),
    exitSlippage: calculateExitSlippageScore(profile.assetLiquidityLevel),
  };
}
