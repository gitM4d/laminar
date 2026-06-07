import type { ProtocolRiskLevel } from "../opportunity/types.js";

// These are MVP local defaults.
// They mirror the current Configuration Registry concept.
// They will later be loaded from a versioned Configuration Registry.

export const RISK_PENALTY_MIN = 0;
export const RISK_PENALTY_MAX = 1;

export const PROTOCOL_RISK_LEVEL_ORDER: Record<ProtocolRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export const PROTOCOL_RISK_EXCESS_PENALTY_PER_LEVEL = 0.1;

export const SOFT_LIQUIDITY_SCORE_THRESHOLD = 80;
export const SOFT_LIQUIDITY_PENALTY = 0.05;

export const INCIDENT_HISTORY_OPERATIONAL_PENALTY = 0.08;

export const EXPERIMENTAL_PROTOCOL_PENALTY = 0.15;

export const REJECTION_REASON_DEFINITIONS = {
  belowMinTrustScore: {
    id: "belowMinTrustScore",
    messageTemplate:
      "Trust score {trustScore} is below policy minimum {minTrustScore}.",
  },
  belowMinLiquidityScore: {
    id: "belowMinLiquidityScore",
    messageTemplate:
      "Liquidity score {liquidityScore} is below policy minimum {minLiquidityScore}.",
  },
  structurallyIneligibleLiquidity: {
    id: "structurallyIneligibleLiquidity",
    messageTemplate:
      "Liquidity scoring marked opportunity as structurally ineligible: {reasons}.",
  },
  experimentalProtocolNotAllowed: {
    id: "experimentalProtocolNotAllowed",
    messageTemplate: "Experimental protocols are not allowed by policy.",
  },
  unauditedProtocolNotAllowed: {
    id: "unauditedProtocolNotAllowed",
    messageTemplate: "Unaudited protocols are not allowed by policy.",
  },
  withdrawalDelayExceeded: {
    id: "withdrawalDelayExceeded",
    messageTemplate:
      "Maximum withdrawal delay {opportunityDelay} exceeds policy limit {policyDelay}.",
  },
  lockupsNotAllowed: {
    id: "lockupsNotAllowed",
    messageTemplate: "Position lockups are not allowed by policy.",
  },
} as const;

export const PENALTY_DEFINITIONS = {
  protocolRiskAbovePolicy: {
    id: "protocolRiskAbovePolicy",
    descriptionTemplate:
      "Protocol risk level {protocolRiskLevel} exceeds policy maximum {maxProtocolRisk}.",
  },
  softLiquidityConcern: {
    id: "softLiquidityConcern",
    descriptionTemplate:
      "Liquidity score {liquidityScore} is above policy minimum but below soft threshold {threshold}.",
  },
  incidentHistoryOperational: {
    id: "incidentHistoryOperational",
    descriptionTemplate:
      "Non-empty incident history adds operational risk despite reflected Trust Score penalties.",
  },
  experimentalProtocolAllowed: {
    id: "experimentalProtocolAllowed",
    descriptionTemplate:
      "Experimental protocol permitted by policy but carries additional operational risk.",
  },
} as const;
