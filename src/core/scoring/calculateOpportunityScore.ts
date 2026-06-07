import { normalizeApyToDecimal } from "./normalizeApy.js";
import {
  GAS_PENALTY,
  MINIMUM_PENALTY_DENOMINATOR,
  OPPORTUNITY_SCORE_MIN,
  RETURN_PREFERENCE_MULTIPLIERS,
  SCORE_NORMALIZATION_DIVISOR,
  SCORE_ROUNDING_DECIMALS,
} from "./scoringConfig.js";
import type {
  CalculateOpportunityScoreInput,
  OpportunityScoreBreakdown,
  OpportunityScoreResult,
} from "./types.js";

function roundScore(score: number): number {
  const factor = 10 ** SCORE_ROUNDING_DECIMALS;
  return Math.round(score * factor) / factor;
}

function normalizeScore(score: number): number {
  return roundScore(score / SCORE_NORMALIZATION_DIVISOR);
}

function computeFinalScore(
  baseScore: number,
  penaltyDenominator: number,
): number {
  if (penaltyDenominator <= 0 || !Number.isFinite(penaltyDenominator)) {
    return OPPORTUNITY_SCORE_MIN;
  }

  const rawScore = baseScore / penaltyDenominator;

  if (!Number.isFinite(rawScore) || rawScore < 0) {
    return OPPORTUNITY_SCORE_MIN;
  }

  return roundScore(rawScore);
}

function buildExplanations(
  input: CalculateOpportunityScoreInput,
  breakdown: OpportunityScoreBreakdown,
  score: number,
): string[] {
  return [
    `Opportunity score ${score} for ${input.opportunity.id}.`,
    `APY decimal: ${roundScore(normalizeApyToDecimal(input.opportunity.apy))}.`,
    `Normalized trust score: ${normalizeScore(input.trustScoreResult.trustScore)}.`,
    `Normalized liquidity score: ${normalizeScore(input.liquidityScoreResult.liquidityScore)}.`,
    `Return preference multiplier (${input.selectedProfile}): ${RETURN_PREFERENCE_MULTIPLIERS[input.selectedProfile]}.`,
    `Base score: ${roundScore(breakdown.baseScore)}.`,
    `Penalty denominator: ${roundScore(breakdown.penaltyDenominator)}.`,
    `Minimum penalty denominator: ${breakdown.minimumPenaltyDenominator}.`,
    `Risk penalty: ${roundScore(breakdown.riskPenalty)}.`,
    `Gas penalty: ${roundScore(breakdown.gasPenalty)}.`,
  ];
}

export function calculateOpportunityScore(
  input: CalculateOpportunityScoreInput,
): OpportunityScoreResult {
  const apyDecimal = normalizeApyToDecimal(input.opportunity.apy);
  const normalizedTrustScore = normalizeScore(
    input.trustScoreResult.trustScore,
  );
  const normalizedLiquidityScore = normalizeScore(
    input.liquidityScoreResult.liquidityScore,
  );
  const returnPreferenceMultiplier =
    RETURN_PREFERENCE_MULTIPLIERS[input.selectedProfile];
  const riskPenalty = input.riskAssessmentResult.totalRiskPenalty;
  const gasPenalty = GAS_PENALTY;
  const minimumPenaltyDenominator = MINIMUM_PENALTY_DENOMINATOR;

  const baseScore = roundScore(
    apyDecimal *
      normalizedTrustScore *
      normalizedLiquidityScore *
      returnPreferenceMultiplier,
  );
  const penaltyDenominator = roundScore(
    riskPenalty + gasPenalty + minimumPenaltyDenominator,
  );
  const breakdown: OpportunityScoreBreakdown = {
    baseScore,
    penaltyDenominator,
    minimumPenaltyDenominator,
    riskPenalty,
    gasPenalty,
  };
  const score = computeFinalScore(baseScore, penaltyDenominator);

  return {
    opportunityId: input.opportunity.id,
    score,
    baseScore,
    penaltyDenominator,
    minimumPenaltyDenominator,
    normalizedTrustScore,
    normalizedLiquidityScore,
    apyDecimal: roundScore(apyDecimal),
    returnPreferenceMultiplier,
    riskPenalty,
    gasPenalty,
    breakdown,
    explanations: buildExplanations(input, breakdown, score),
  };
}
