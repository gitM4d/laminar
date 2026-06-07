import { describe, expect, it } from "vitest";
import {
  PROFILE_POLICY_DEFAULTS,
  SHARED_ALLOCATION_CONSTRAINTS,
} from "./policyConfig.js";
import { generatePolicy } from "./generatePolicy.js";
import type { ProfileName } from "../profile/types.js";

const profileNames: ProfileName[] = [
  "Conservative",
  "Balanced",
  "Yield Focused",
];

describe("generatePolicy", () => {
  it.each(profileNames)(
    "preserves selectedProfile for %s",
    (selectedProfile) => {
      const policy = generatePolicy(selectedProfile);

      expect(policy.selectedProfile).toBe(selectedProfile);
      expect(policy.policyVersion).toBe(1);
    },
  );

  it("generates Conservative policy defaults", () => {
    const policy = generatePolicy("Conservative");

    expect(policy.riskLimits).toEqual(
      PROFILE_POLICY_DEFAULTS.Conservative.riskLimits,
    );
    expect(policy.liquidityRequirements).toEqual(
      PROFILE_POLICY_DEFAULTS.Conservative.liquidityRequirements,
    );
    expect(policy.targetExposure).toEqual(
      PROFILE_POLICY_DEFAULTS.Conservative.targetExposure,
    );
  });

  it("generates Balanced policy defaults", () => {
    const policy = generatePolicy("Balanced");

    expect(policy.riskLimits).toEqual(
      PROFILE_POLICY_DEFAULTS.Balanced.riskLimits,
    );
    expect(policy.liquidityRequirements).toEqual(
      PROFILE_POLICY_DEFAULTS.Balanced.liquidityRequirements,
    );
    expect(policy.targetExposure).toEqual(
      PROFILE_POLICY_DEFAULTS.Balanced.targetExposure,
    );
  });

  it("generates Yield Focused policy defaults", () => {
    const policy = generatePolicy("Yield Focused");

    expect(policy.riskLimits).toEqual(
      PROFILE_POLICY_DEFAULTS["Yield Focused"].riskLimits,
    );
    expect(policy.liquidityRequirements).toEqual(
      PROFILE_POLICY_DEFAULTS["Yield Focused"].liquidityRequirements,
    );
    expect(policy.targetExposure).toEqual(
      PROFILE_POLICY_DEFAULTS["Yield Focused"].targetExposure,
    );
  });

  it("uses shared allocationConstraints for every profile", () => {
    for (const profile of profileNames) {
      const policy = generatePolicy(profile);

      expect(policy.allocationConstraints).toEqual(
        SHARED_ALLOCATION_CONSTRAINTS,
      );
      expect(policy.allocationConstraints).toEqual({
        maxActiveAllocations: 3,
        maxProtocolExposure: 0.5,
        maxStablecoinExposure: 0.8,
        minAllocationSize: 0.1,
        rebalanceThreshold: 0.1,
        gasReserve: {
          minUsd: 5,
          targetRate: 0.01,
          maxUsd: 100,
        },
      });
    }
  });
});
