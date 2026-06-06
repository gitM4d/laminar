export type UserIntent = {
  risk: number;
  liquidity: number;
  returnPreference: number;
};

export const INTENT_DIMENSION_MIN = 1;
export const INTENT_DIMENSION_MAX = 10;
