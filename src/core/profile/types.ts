import type { UserIntent } from "../intent/types.js";

export type ProfileName = "Conservative" | "Balanced" | "Yield Focused";

export type ProfileVector = {
  risk: number;
  liquidity: number;
  returnPreference: number;
};

export type ProfileWeights = {
  risk: number;
  liquidity: number;
  returnPreference: number;
};

export type ProfileDistance = {
  profile: ProfileName;
  distance: number;
};

export type ProfileClassification = {
  selectedProfile: ProfileName;
  distances: ProfileDistance[];
};

export type ProfileDefinition = {
  name: ProfileName;
  vector: ProfileVector;
  weights: ProfileWeights;
};

export type WeightedDistanceInput = UserIntent;
