import type { ProfileName } from "../profile/types.js";

// These are MVP local defaults.
// They mirror the current Configuration Registry concept.
// They will later be loaded from a versioned Configuration Registry.

export const SCORE_NORMALIZATION_DIVISOR = 100;
export const APY_PERCENTAGE_THRESHOLD = 1;
export const GAS_PENALTY = 0.001;
export const MINIMUM_PENALTY_DENOMINATOR = 0.01;
export const OPPORTUNITY_SCORE_MIN = 0;
export const SCORE_ROUNDING_DECIMALS = 6;

export const RETURN_PREFERENCE_MULTIPLIERS: Record<ProfileName, number> = {
  Conservative: 0.8,
  Balanced: 1,
  "Yield Focused": 1.2,
};
