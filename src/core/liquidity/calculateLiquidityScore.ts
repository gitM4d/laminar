import { calculateLiquidityComponentScores } from "./componentScores.js";
import { evaluateStructuralEligibility } from "./eligibility.js";
import {
  LIQUIDITY_CAP_RULES,
  LIQUIDITY_COMPONENT_WEIGHTS,
  LIQUIDITY_SCORE_MAX,
  LIQUIDITY_SCORE_MIN,
  SCORE_ROUNDING_DECIMALS,
} from "./liquidityConfig.js";
import type {
  AppliedLiquidityCap,
  LiquidityBreakdown,
  LiquidityCapRuleDefinition,
  LiquidityProfileFieldMatch,
  LiquidityScoreResult,
  OpportunityLiquidityProfile,
} from "./types.js";

function clampLiquidityScore(score: number): number {
  return Math.min(LIQUIDITY_SCORE_MAX, Math.max(LIQUIDITY_SCORE_MIN, score));
}

function roundScore(score: number): number {
  const factor = 10 ** SCORE_ROUNDING_DECIMALS;
  return Math.round(score * factor) / factor;
}

function matchesProfileField(
  profile: OpportunityLiquidityProfile,
  match: LiquidityProfileFieldMatch,
): boolean {
  return profile[match.field] === match.value;
}

function getApplicableCaps(
  profile: OpportunityLiquidityProfile,
): AppliedLiquidityCap[] {
  return LIQUIDITY_CAP_RULES.filter((rule) =>
    matchesProfileField(profile, rule.match),
  ).map((rule: LiquidityCapRuleDefinition) => ({
    ruleId: rule.id,
    maxScore: rule.maxScore,
    description: rule.description,
  }));
}

function applyLiquidityCaps(
  weightedScoreBeforeCaps: number,
  appliedCaps: AppliedLiquidityCap[],
): number {
  if (appliedCaps.length === 0) {
    return weightedScoreBeforeCaps;
  }

  const lowestCap = Math.min(...appliedCaps.map((cap) => cap.maxScore));
  return Math.min(weightedScoreBeforeCaps, lowestCap);
}

function buildWeightedContributions(
  componentScores: ReturnType<typeof calculateLiquidityComponentScores>,
): LiquidityBreakdown["weightedContributions"] {
  return {
    withdrawalSpeed:
      componentScores.withdrawalSpeed *
      LIQUIDITY_COMPONENT_WEIGHTS.withdrawalSpeed,
    withdrawalConstraints:
      componentScores.withdrawalConstraints *
      LIQUIDITY_COMPONENT_WEIGHTS.withdrawalConstraints,
    redemptionReliability:
      componentScores.redemptionReliability *
      LIQUIDITY_COMPONENT_WEIGHTS.redemptionReliability,
    exitSlippage:
      componentScores.exitSlippage * LIQUIDITY_COMPONENT_WEIGHTS.exitSlippage,
  };
}

function buildExplanations(
  profile: OpportunityLiquidityProfile,
  breakdown: LiquidityBreakdown,
  weightedScoreBeforeCaps: number,
  liquidityScore: number,
  eligible: boolean,
  ineligibilityReasons: string[],
): string[] {
  const explanations = [
    `Liquidity Score ${liquidityScore} for opportunity ${profile.opportunityId}.`,
    `Weighted score before caps: ${weightedScoreBeforeCaps}.`,
    `Withdrawal speed (${profile.withdrawalSpeedBucket}): ${roundScore(breakdown.componentScores.withdrawalSpeed)} / 100 (weight ${LIQUIDITY_COMPONENT_WEIGHTS.withdrawalSpeed * 100}%).`,
    `Withdrawal constraints (${profile.withdrawalConstraintType}): ${roundScore(breakdown.componentScores.withdrawalConstraints)} / 100 (weight ${LIQUIDITY_COMPONENT_WEIGHTS.withdrawalConstraints * 100}%).`,
    `Redemption reliability (${profile.redemptionReliabilityLevel}): ${roundScore(breakdown.componentScores.redemptionReliability)} / 100 (weight ${LIQUIDITY_COMPONENT_WEIGHTS.redemptionReliability * 100}%).`,
    `Exit slippage via asset liquidity (${profile.assetLiquidityLevel}): ${roundScore(breakdown.componentScores.exitSlippage)} / 100 (weight ${LIQUIDITY_COMPONENT_WEIGHTS.exitSlippage * 100}%).`,
    `Maximum withdrawal delay: ${profile.maxWithdrawalDelay}.`,
    profile.hasLockup
      ? "Position includes a lockup period."
      : "No lockup period applies.",
  ];

  if (breakdown.appliedCaps.length > 0) {
    explanations.push(
      `Applied caps: ${breakdown.appliedCaps.map((cap) => `${cap.ruleId} (max ${cap.maxScore})`).join(", ")}.`,
    );
  } else {
    explanations.push("No liquidity caps applied.");
  }

  if (eligible) {
    explanations.push("Structurally eligible.");
  } else {
    explanations.push(
      `Structurally ineligible: ${ineligibilityReasons.join(" ")}`,
    );
  }

  return explanations;
}

export function calculateLiquidityScore(
  profile: OpportunityLiquidityProfile,
): LiquidityScoreResult {
  const componentScores = calculateLiquidityComponentScores(profile);
  const weightedContributions = buildWeightedContributions(componentScores);
  const weightedScoreBeforeCaps = clampLiquidityScore(
    roundScore(
      weightedContributions.withdrawalSpeed +
        weightedContributions.withdrawalConstraints +
        weightedContributions.redemptionReliability +
        weightedContributions.exitSlippage,
    ),
  );

  const appliedCaps = getApplicableCaps(profile);
  const liquidityScore = clampLiquidityScore(
    roundScore(applyLiquidityCaps(weightedScoreBeforeCaps, appliedCaps)),
  );

  const { eligible, ineligibilityReasons } =
    evaluateStructuralEligibility(profile);

  const breakdown: LiquidityBreakdown = {
    componentScores,
    weightedContributions: {
      withdrawalSpeed: roundScore(weightedContributions.withdrawalSpeed),
      withdrawalConstraints: roundScore(
        weightedContributions.withdrawalConstraints,
      ),
      redemptionReliability: roundScore(
        weightedContributions.redemptionReliability,
      ),
      exitSlippage: roundScore(weightedContributions.exitSlippage),
    },
    weightedScoreBeforeCaps,
    appliedCaps,
  };

  return {
    opportunityId: profile.opportunityId,
    weightedScoreBeforeCaps,
    liquidityScore,
    eligible,
    ineligibilityReasons,
    breakdown,
    explanations: buildExplanations(
      profile,
      breakdown,
      weightedScoreBeforeCaps,
      liquidityScore,
      eligible,
      ineligibilityReasons,
    ),
  };
}
