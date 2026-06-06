import { describe, expect, it } from "vitest";
import { PROFILE_NAMES } from "./profileConfig.js";
import { calculateWeightedDistance, selectProfile } from "./selectProfile.js";
import { PROFILE_DEFINITIONS } from "./profileConfig.js";

describe("selectProfile", () => {
  it("selects Conservative for a conservative-like intent", () => {
    const intent = {
      risk: 1,
      liquidity: 10,
      returnPreference: 2,
    };

    const result = selectProfile(intent);

    expect(result.selectedProfile).toBe("Conservative");
  });

  it("selects Balanced for a balanced-like intent", () => {
    const intent = {
      risk: 5,
      liquidity: 6,
      returnPreference: 5,
    };

    const result = selectProfile(intent);

    expect(result.selectedProfile).toBe("Balanced");
  });

  it("selects Yield Focused for a yield-focused-like intent", () => {
    const intent = {
      risk: 8,
      liquidity: 5,
      returnPreference: 10,
    };

    const result = selectProfile(intent);

    expect(result.selectedProfile).toBe("Yield Focused");
  });

  it("returns distances for all profiles", () => {
    const intent = {
      risk: 3,
      liquidity: 8,
      returnPreference: 4,
    };

    const result = selectProfile(intent);

    expect(result.distances).toHaveLength(PROFILE_NAMES.length);
    expect(result.distances.map((entry) => entry.profile)).toEqual([
      ...PROFILE_NAMES,
    ]);
    for (const entry of result.distances) {
      expect(entry.distance).toBeGreaterThanOrEqual(0);
    }
  });

  it("chooses the profile with the lowest weighted distance", () => {
    const intent = {
      risk: 3,
      liquidity: 8,
      returnPreference: 4,
    };

    const result = selectProfile(intent);
    const lowestDistance = Math.min(
      ...result.distances.map((entry) => entry.distance),
    );
    const winners = result.distances.filter(
      (entry) => entry.distance === lowestDistance,
    );

    expect(winners.map((entry) => entry.profile)).toContain(
      result.selectedProfile,
    );

    for (const profile of PROFILE_DEFINITIONS) {
      expect(calculateWeightedDistance(intent, profile)).toBe(
        result.distances.find((entry) => entry.profile === profile.name)
          ?.distance,
      );
    }
  });
});
