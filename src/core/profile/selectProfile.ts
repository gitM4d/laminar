import { PROFILE_DEFINITIONS, TIE_BREAK_PRIORITY } from "./profileConfig.js";
import type {
  ProfileClassification,
  ProfileDefinition,
  ProfileDistance,
  ProfileName,
  WeightedDistanceInput,
} from "./types.js";

export function calculateWeightedDistance(
  intent: WeightedDistanceInput,
  profile: ProfileDefinition,
): number {
  const { vector, weights } = profile;

  return (
    Math.abs(intent.risk - vector.risk) * weights.risk +
    Math.abs(intent.liquidity - vector.liquidity) * weights.liquidity +
    Math.abs(intent.returnPreference - vector.returnPreference) *
      weights.returnPreference
  );
}

export function resolveProfileTie(tiedProfiles: ProfileName[]): ProfileName {
  for (const profile of TIE_BREAK_PRIORITY) {
    if (tiedProfiles.includes(profile)) {
      return profile;
    }
  }

  return tiedProfiles[0] as ProfileName;
}

export function selectProfile(intent: WeightedDistanceInput): ProfileClassification {
  const distances: ProfileDistance[] = PROFILE_DEFINITIONS.map((profile) => ({
    profile: profile.name,
    distance: calculateWeightedDistance(intent, profile),
  }));

  const minDistance = Math.min(...distances.map((entry) => entry.distance));
  const tiedProfiles = distances
    .filter((entry) => entry.distance === minDistance)
    .map((entry) => entry.profile);

  const selectedProfile =
    tiedProfiles.length === 1
      ? tiedProfiles[0] as ProfileName
      : resolveProfileTie(tiedProfiles);

  return {
    selectedProfile,
    distances,
  };
}
