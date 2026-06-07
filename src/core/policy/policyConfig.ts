import type { ProfileName } from "../profile/types.js";
import type {
  AllocationConstraints,
  LiquidityRequirements,
  RiskLimits,
  TargetExposure,
} from "./types.js";

export const SHARED_ALLOCATION_CONSTRAINTS: AllocationConstraints = {
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
};

type ProfilePolicyDefaults = {
  riskLimits: RiskLimits;
  liquidityRequirements: LiquidityRequirements;
  targetExposure: TargetExposure;
};

export const PROFILE_POLICY_DEFAULTS: Record<
  ProfileName,
  ProfilePolicyDefaults
> = {
  Conservative: {
    riskLimits: {
      minTrustScore: 85,
      maxProtocolRisk: "low",
      allowUnauditedProtocols: false,
      allowExperimentalProtocols: false,
    },
    liquidityRequirements: {
      minLiquidityScore: 85,
      maxWithdrawalDelay: "1 day",
      allowLockups: false,
    },
    targetExposure: {
      lending: 0.9,
      liquidityBuffer: 0.1,
      yieldEnhancement: 0,
    },
  },
  Balanced: {
    riskLimits: {
      minTrustScore: 75,
      maxProtocolRisk: "medium",
      allowUnauditedProtocols: false,
      allowExperimentalProtocols: false,
    },
    liquidityRequirements: {
      minLiquidityScore: 75,
      maxWithdrawalDelay: "7 days",
      allowLockups: false,
    },
    targetExposure: {
      lending: 0.75,
      yieldEnhancement: 0.25,
      liquidityBuffer: 0,
    },
  },
  "Yield Focused": {
    riskLimits: {
      minTrustScore: 65,
      maxProtocolRisk: "medium",
      allowUnauditedProtocols: false,
      allowExperimentalProtocols: true,
    },
    liquidityRequirements: {
      minLiquidityScore: 65,
      maxWithdrawalDelay: "30 days",
      allowLockups: true,
    },
    targetExposure: {
      lending: 0.6,
      yieldEnhancement: 0.4,
      liquidityBuffer: 0,
    },
  },
};

export const DEFAULT_POLICY_VERSION = 1;
