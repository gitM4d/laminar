import type { ProfileDefinition, ProfileName } from "./types.js";

export const PROFILE_DEFINITIONS: readonly ProfileDefinition[] = [
  {
    name: "Conservative",
    vector: {
      risk: 1,
      liquidity: 10,
      returnPreference: 2,
    },
    weights: {
      risk: 0.5,
      liquidity: 0.4,
      returnPreference: 0.1,
    },
  },
  {
    name: "Balanced",
    vector: {
      risk: 5,
      liquidity: 6,
      returnPreference: 5,
    },
    weights: {
      risk: 0.33,
      liquidity: 0.33,
      returnPreference: 0.34,
    },
  },
  {
    name: "Yield Focused",
    vector: {
      risk: 8,
      liquidity: 5,
      returnPreference: 10,
    },
    weights: {
      risk: 0.15,
      liquidity: 0.25,
      returnPreference: 0.6,
    },
  },
] as const;

export const PROFILE_NAMES: readonly ProfileName[] = PROFILE_DEFINITIONS.map(
  (profile) => profile.name,
);

export const TIE_BREAK_PRIORITY: readonly ProfileName[] = [
  "Balanced",
  "Conservative",
  "Yield Focused",
];
