import {
  STRUCTURAL_INELIGIBILITY_RULES,
  WITHDRAWAL_DELAY_DAY_PATTERN,
  WITHDRAWAL_DELAY_INSTANT_KEYWORD,
} from "./liquidityConfig.js";
import type {
  LiquidityProfileFieldMatch,
  LiquidityScoreResult,
  OpportunityLiquidityProfile,
  StructuralIneligibilityRuleDefinition,
} from "./types.js";

function matchesProfileField(
  profile: OpportunityLiquidityProfile,
  match: LiquidityProfileFieldMatch,
): boolean {
  return profile[match.field] === match.value;
}

function matchesIneligibilityRule(
  profile: OpportunityLiquidityProfile,
  rule: StructuralIneligibilityRuleDefinition,
): boolean {
  if ("type" in rule.match && rule.match.type === "all") {
    return rule.match.conditions.every((condition) =>
      matchesProfileField(profile, condition),
    );
  }

  return matchesProfileField(profile, rule.match);
}

export function evaluateStructuralEligibility(
  profile: OpportunityLiquidityProfile,
): { eligible: boolean; ineligibilityReasons: string[] } {
  const ineligibilityReasons = STRUCTURAL_INELIGIBILITY_RULES.filter((rule) =>
    matchesIneligibilityRule(profile, rule),
  ).map((rule) => rule.message);

  return {
    eligible: ineligibilityReasons.length === 0,
    ineligibilityReasons,
  };
}

export function parseWithdrawalDelayDays(delay: string): number {
  const normalized = delay.trim().toLowerCase();

  if (normalized === WITHDRAWAL_DELAY_INSTANT_KEYWORD) {
    return 0;
  }

  const match = normalized.match(WITHDRAWAL_DELAY_DAY_PATTERN);

  if (match?.[1] !== undefined) {
    return Number.parseInt(match[1], 10);
  }

  throw new Error(`Unsupported withdrawal delay format: ${delay}`);
}

export function meetsMinLiquidityScore(
  result: LiquidityScoreResult,
  minLiquidityScore: number,
): boolean {
  return result.liquidityScore >= minLiquidityScore;
}

export function meetsWithdrawalDelay(
  profile: OpportunityLiquidityProfile,
  maxWithdrawalDelay: string,
): boolean {
  const opportunityDelayDays = parseWithdrawalDelayDays(profile.maxWithdrawalDelay);
  const policyDelayDays = parseWithdrawalDelayDays(maxWithdrawalDelay);

  return opportunityDelayDays <= policyDelayDays;
}

export function meetsLockupRequirement(
  profile: OpportunityLiquidityProfile,
  allowLockups: boolean,
): boolean {
  if (allowLockups) {
    return true;
  }

  return profile.hasLockup === false;
}
