export type WithdrawalSpeedBucket =
  | "instant"
  | "lessThanOneDay"
  | "oneToSevenDays"
  | "sevenToThirtyDays"
  | "thirtyToNinetyDays"
  | "moreThanNinetyDays";

export type WithdrawalConstraintType =
  | "none"
  | "cooldown"
  | "queue"
  | "epochBased"
  | "hardLockup"
  | "undefined";

export type RedemptionReliabilityLevel =
  | "veryHigh"
  | "high"
  | "medium"
  | "low"
  | "veryLow";

export type AssetLiquidityLevel =
  | "veryHigh"
  | "high"
  | "medium"
  | "low"
  | "veryLow";

export type OpportunityLiquidityProfile = {
  opportunityId: string;
  withdrawalSpeedBucket: WithdrawalSpeedBucket;
  withdrawalConstraintType: WithdrawalConstraintType;
  redemptionReliabilityLevel: RedemptionReliabilityLevel;
  assetLiquidityLevel: AssetLiquidityLevel;
  maxWithdrawalDelay: string;
  hasLockup: boolean;
};

export type LiquidityComponentScores = {
  withdrawalSpeed: number;
  withdrawalConstraints: number;
  redemptionReliability: number;
  exitSlippage: number;
};

export type AppliedLiquidityCap = {
  ruleId: string;
  maxScore: number;
  description: string;
};

export type LiquidityBreakdown = {
  componentScores: LiquidityComponentScores;
  weightedContributions: {
    withdrawalSpeed: number;
    withdrawalConstraints: number;
    redemptionReliability: number;
    exitSlippage: number;
  };
  weightedScoreBeforeCaps: number;
  appliedCaps: AppliedLiquidityCap[];
};

export type LiquidityScoreResult = {
  opportunityId: string;
  weightedScoreBeforeCaps: number;
  liquidityScore: number;
  eligible: boolean;
  ineligibilityReasons: string[];
  breakdown: LiquidityBreakdown;
  explanations: readonly string[];
};

export type ScoredOpportunityLiquidity = {
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  asset: string;
  liquidity: LiquidityScoreResult;
};

export type LiquidityProfileFieldMatch =
  | {
      field: "withdrawalSpeedBucket";
      value: WithdrawalSpeedBucket;
    }
  | {
      field: "withdrawalConstraintType";
      value: WithdrawalConstraintType;
    }
  | {
      field: "redemptionReliabilityLevel";
      value: RedemptionReliabilityLevel;
    }
  | {
      field: "hasLockup";
      value: boolean;
    };

export type LiquidityCapRuleDefinition = {
  id: string;
  maxScore: number;
  description: string;
  match: LiquidityProfileFieldMatch;
};

export type StructuralIneligibilityRuleDefinition = {
  id: string;
  message: string;
  match:
    | LiquidityProfileFieldMatch
    | {
        type: "all";
        conditions: LiquidityProfileFieldMatch[];
      };
};
