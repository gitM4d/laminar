import type {
  AssetLiquidityLevel,
  LiquidityCapRuleDefinition,
  RedemptionReliabilityLevel,
  StructuralIneligibilityRuleDefinition,
  WithdrawalConstraintType,
  WithdrawalSpeedBucket,
} from "./types.js";

// These are MVP local defaults.
// They mirror the current Configuration Registry concept.
// They will later be loaded from a versioned Configuration Registry.

export const LIQUIDITY_SCORE_MIN = 0;
export const LIQUIDITY_SCORE_MAX = 100;
export const SCORE_ROUNDING_DECIMALS = 2;

export const WITHDRAWAL_DELAY_INSTANT_KEYWORD = "instant";
export const WITHDRAWAL_DELAY_DAY_PATTERN = /^(\d+)\s*day(?:s)?$/i;

export const LIQUIDITY_COMPONENT_WEIGHTS = {
  withdrawalSpeed: 0.35,
  withdrawalConstraints: 0.3,
  redemptionReliability: 0.2,
  exitSlippage: 0.15,
} as const;

export const LIQUIDITY_COMPONENT_WEIGHT_SUM =
  LIQUIDITY_COMPONENT_WEIGHTS.withdrawalSpeed +
  LIQUIDITY_COMPONENT_WEIGHTS.withdrawalConstraints +
  LIQUIDITY_COMPONENT_WEIGHTS.redemptionReliability +
  LIQUIDITY_COMPONENT_WEIGHTS.exitSlippage;

export const WITHDRAWAL_SPEED_BUCKET_SCORES: Record<
  WithdrawalSpeedBucket,
  number
> = {
  instant: 100,
  lessThanOneDay: 90,
  oneToSevenDays: 75,
  sevenToThirtyDays: 50,
  thirtyToNinetyDays: 25,
  moreThanNinetyDays: 0,
};

export const WITHDRAWAL_CONSTRAINT_SCORES: Record<
  WithdrawalConstraintType,
  number
> = {
  none: 100,
  cooldown: 75,
  queue: 60,
  epochBased: 50,
  hardLockup: 25,
  undefined: 0,
};

export const REDEMPTION_RELIABILITY_SCORES: Record<
  RedemptionReliabilityLevel,
  number
> = {
  veryHigh: 100,
  high: 85,
  medium: 65,
  low: 40,
  veryLow: 10,
};

export const ASSET_LIQUIDITY_SCORES: Record<AssetLiquidityLevel, number> = {
  veryHigh: 100,
  high: 85,
  medium: 65,
  low: 40,
  veryLow: 10,
};

export const LIQUIDITY_CAP_RULES: readonly LiquidityCapRuleDefinition[] = [
  {
    id: "hardLockupCap",
    maxScore: 60,
    description: "Hard lockup limits maximum liquidity score to 60.",
    match: { field: "withdrawalConstraintType", value: "hardLockup" },
  },
  {
    id: "thirtyToNinetyDaysCap",
    maxScore: 60,
    description:
      "Withdrawal speed between 30 and 90 days limits maximum liquidity score to 60.",
    match: { field: "withdrawalSpeedBucket", value: "thirtyToNinetyDays" },
  },
  {
    id: "moreThanNinetyDaysCap",
    maxScore: 25,
    description:
      "Withdrawal speed beyond 90 days limits maximum liquidity score to 25.",
    match: { field: "withdrawalSpeedBucket", value: "moreThanNinetyDays" },
  },
  {
    id: "lowRedemptionReliabilityCap",
    maxScore: 70,
    description: "Low redemption reliability limits maximum liquidity score to 70.",
    match: { field: "redemptionReliabilityLevel", value: "low" },
  },
  {
    id: "veryLowRedemptionReliabilityCap",
    maxScore: 40,
    description:
      "Very low redemption reliability limits maximum liquidity score to 40.",
    match: { field: "redemptionReliabilityLevel", value: "veryLow" },
  },
];

export const STRUCTURAL_INELIGIBILITY_RULES: readonly StructuralIneligibilityRuleDefinition[] =
  [
    {
      id: "undefinedWithdrawalConstraint",
      message: "Withdrawal constraint is undefined.",
      match: { field: "withdrawalConstraintType", value: "undefined" },
    },
    {
      id: "veryLowRedemptionReliability",
      message: "Redemption reliability is very low.",
      match: { field: "redemptionReliabilityLevel", value: "veryLow" },
    },
    {
      id: "moreThanNinetyDaysWithdrawalSpeed",
      message: "Withdrawal speed exceeds 90 days.",
      match: { field: "withdrawalSpeedBucket", value: "moreThanNinetyDays" },
    },
    {
      id: "permanentCapitalLock",
      message:
        "Permanent capital lock with hard lockup and withdrawals beyond 90 days.",
      match: {
        type: "all",
        conditions: [
          { field: "hasLockup", value: true },
          { field: "withdrawalConstraintType", value: "hardLockup" },
          { field: "withdrawalSpeedBucket", value: "moreThanNinetyDays" },
        ],
      },
    },
  ];
