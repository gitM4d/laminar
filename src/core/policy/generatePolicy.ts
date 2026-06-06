import type { ProfileName } from "../profile/types.js";
import {
  DEFAULT_POLICY_VERSION,
  PROFILE_POLICY_DEFAULTS,
  SHARED_ALLOCATION_CONSTRAINTS,
} from "./policyConfig.js";
import type { PortfolioPolicy } from "./types.js";

export function generatePolicy(selectedProfile: ProfileName): PortfolioPolicy {
  const defaults = PROFILE_POLICY_DEFAULTS[selectedProfile];

  return {
    policyVersion: DEFAULT_POLICY_VERSION,
    selectedProfile,
    riskLimits: { ...defaults.riskLimits },
    liquidityRequirements: { ...defaults.liquidityRequirements },
    targetExposure: { ...defaults.targetExposure },
    allocationConstraints: {
      ...SHARED_ALLOCATION_CONSTRAINTS,
      gasReserve: { ...SHARED_ALLOCATION_CONSTRAINTS.gasReserve },
    },
  };
}
