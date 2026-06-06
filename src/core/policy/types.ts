import type { ProfileName } from "../profile/types.js";

export type ProtocolRiskLevel = "low" | "medium";

export type RiskLimits = {
  minTrustScore: number;
  maxProtocolRisk: ProtocolRiskLevel;
  allowUnauditedProtocols: boolean;
  allowExperimentalProtocols: boolean;
};

export type LiquidityRequirements = {
  minLiquidityScore: number;
  maxWithdrawalDelay: string;
  allowLockups: boolean;
};

export type TargetExposure = {
  lending: number;
  yieldEnhancement: number;
  liquidityBuffer: number;
};

export type GasReserveConstraints = {
  minUsd: number;
  targetRate: number;
  maxUsd: number;
};

export type AllocationConstraints = {
  maxActiveAllocations: number;
  maxProtocolExposure: number;
  maxStablecoinExposure: number;
  minAllocationSize: number;
  rebalanceThreshold: number;
  gasReserve: GasReserveConstraints;
};

export type PortfolioPolicy = {
  policyVersion: number;
  selectedProfile: ProfileName;
  riskLimits: RiskLimits;
  liquidityRequirements: LiquidityRequirements;
  targetExposure: TargetExposure;
  allocationConstraints: AllocationConstraints;
};
