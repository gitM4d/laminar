import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { calculateLiquidityScore } from "../liquidity/calculateLiquidityScore.js";
import { calculateTrustScore } from "../trust/calculateTrustScore.js";
import { MOCK_PROTOCOL_TRUST_PROFILES } from "../trust/mockProtocolTrustProfiles.js";
import type { Opportunity } from "../opportunity/types.js";
import type { PortfolioPolicy } from "../policy/types.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import { evaluateOpportunityRisk } from "./evaluateOpportunityRisk.js";
import {
  EXPERIMENTAL_PROTOCOL_PENALTY,
  INCIDENT_HISTORY_OPERATIONAL_PENALTY,
  PROTOCOL_RISK_EXCESS_PENALTY_PER_LEVEL,
  SOFT_LIQUIDITY_PENALTY,
} from "./riskConfig.js";
import type { EvaluateOpportunityRiskInput } from "./types.js";

const testDir = dirname(fileURLToPath(import.meta.url));

const balancedPolicy: PortfolioPolicy = {
  policyVersion: 1,
  selectedProfile: "Balanced",
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
  allocationConstraints: {
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
  },
};

const yieldFocusedPolicy: PortfolioPolicy = {
  ...balancedPolicy,
  selectedProfile: "Yield Focused",
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
};

const pristineLiquidityProfile: OpportunityLiquidityProfile = {
  opportunityId: "test",
  withdrawalSpeedBucket: "instant",
  withdrawalConstraintType: "none",
  redemptionReliabilityLevel: "veryHigh",
  assetLiquidityLevel: "veryHigh",
  maxWithdrawalDelay: "instant",
  hasLockup: false,
};

const morphoOpportunity: Opportunity = {
  id: "morpho-usdc-base",
  protocolId: "morpho",
  protocolName: "Morpho",
  asset: "USDC",
  chain: "Base",
  apy: 0.071,
  isExperimental: false,
  protocolRiskLevel: "low",
  auditCount: 2,
  exposureCategory: "lending" as const,
};

function buildInput(
  overrides: Partial<EvaluateOpportunityRiskInput> & {
    opportunity?: Opportunity;
    liquidityProfile?: OpportunityLiquidityProfile;
  } = {},
): EvaluateOpportunityRiskInput {
  const opportunity = overrides.opportunity ?? morphoOpportunity;
  const liquidityProfile =
    overrides.liquidityProfile ?? pristineLiquidityProfile;
  const trustScoreResult =
    overrides.trustScoreResult ??
    calculateTrustScore(MOCK_PROTOCOL_TRUST_PROFILES.morpho!);
  const liquidityScoreResult =
    overrides.liquidityScoreResult ?? calculateLiquidityScore(liquidityProfile);

  return {
    opportunity,
    riskLimits: overrides.riskLimits ?? balancedPolicy.riskLimits,
    liquidityRequirements:
      overrides.liquidityRequirements ?? balancedPolicy.liquidityRequirements,
    trustScoreResult,
    liquidityScoreResult,
    liquidityProfile,
    ...overrides,
  };
}

describe("evaluateOpportunityRisk", () => {
  it("accepts an opportunity meeting policy thresholds", () => {
    const result = evaluateOpportunityRisk(buildInput());

    expect(result.decision).toBe("eligible");
    expect(result.rejectionReasons).toEqual([]);
    expect(result.consumedTrustScore).toBeGreaterThanOrEqual(75);
    expect(result.consumedLiquidityScore).toBe(100);
  });

  it("rejects opportunities below minTrustScore", () => {
    const result = evaluateOpportunityRisk(
      buildInput({
        opportunity: {
          ...morphoOpportunity,
          id: "experimental-usdc-base",
          protocolId: "experimental-lend",
          protocolName: "Experimental Lend",
          isExperimental: true,
          protocolRiskLevel: "high",
          auditCount: 1,
        },
        trustScoreResult: calculateTrustScore(
          MOCK_PROTOCOL_TRUST_PROFILES["experimental-lend"]!,
        ),
        riskLimits: balancedPolicy.riskLimits,
      }),
    );

    expect(result.decision).toBe("rejected");
    expect(result.rejectionReasons.map((reason) => reason.id)).toContain(
      "belowMinTrustScore",
    );
    expect(result.totalRiskPenalty).toBe(0);
  });

  it("rejects opportunities below minLiquidityScore", () => {
    const liquidityProfile: OpportunityLiquidityProfile = {
      opportunityId: "moonwell-dai-base",
      withdrawalSpeedBucket: "oneToSevenDays",
      withdrawalConstraintType: "queue",
      redemptionReliabilityLevel: "medium",
      assetLiquidityLevel: "veryHigh",
      maxWithdrawalDelay: "7 days",
      hasLockup: false,
    };

    const result = evaluateOpportunityRisk(
      buildInput({
        liquidityProfile,
        liquidityScoreResult: calculateLiquidityScore(liquidityProfile),
      }),
    );

    expect(result.decision).toBe("rejected");
    expect(result.rejectionReasons.map((reason) => reason.id)).toContain(
      "belowMinLiquidityScore",
    );
  });

  it("rejects when liquidityScoreResult.eligible is false", () => {
    const liquidityProfile: OpportunityLiquidityProfile = {
      ...pristineLiquidityProfile,
      opportunityId: "ineligible",
      withdrawalConstraintType: "undefined",
    };

    const result = evaluateOpportunityRisk(
      buildInput({
        liquidityProfile,
        liquidityScoreResult: calculateLiquidityScore(liquidityProfile),
      }),
    );

    expect(result.decision).toBe("rejected");
    expect(result.rejectionReasons.map((reason) => reason.id)).toContain(
      "structurallyIneligibleLiquidity",
    );
  });

  it("rejects experimental protocols when not allowed", () => {
    const result = evaluateOpportunityRisk(
      buildInput({
        opportunity: {
          ...morphoOpportunity,
          id: "experimental-usdc-base",
          protocolId: "experimental-lend",
          isExperimental: true,
          protocolRiskLevel: "high",
        },
        trustScoreResult: calculateTrustScore(
          MOCK_PROTOCOL_TRUST_PROFILES["experimental-lend"]!,
        ),
      }),
    );

    expect(result.decision).toBe("rejected");
    expect(result.rejectionReasons.map((reason) => reason.id)).toContain(
      "experimentalProtocolNotAllowed",
    );
  });

  it("accepts experimental protocols when allowed and applies penalty", () => {
    const experimentalLiquidityProfile: OpportunityLiquidityProfile = {
      opportunityId: "experimental-usdc-base",
      withdrawalSpeedBucket: "instant",
      withdrawalConstraintType: "none",
      redemptionReliabilityLevel: "veryHigh",
      assetLiquidityLevel: "veryHigh",
      maxWithdrawalDelay: "instant",
      hasLockup: false,
    };

    const result = evaluateOpportunityRisk(
      buildInput({
        opportunity: {
          ...morphoOpportunity,
          id: "experimental-usdc-base",
          protocolId: "experimental-lend",
          isExperimental: true,
          protocolRiskLevel: "high",
        },
        trustScoreResult: {
          ...calculateTrustScore(MOCK_PROTOCOL_TRUST_PROFILES.morpho!),
          protocolId: "experimental-lend",
          protocolName: "Experimental Lend",
          trustScore: 70,
        },
        liquidityProfile: experimentalLiquidityProfile,
        riskLimits: yieldFocusedPolicy.riskLimits,
        liquidityRequirements: yieldFocusedPolicy.liquidityRequirements,
        liquidityScoreResult: calculateLiquidityScore(
          experimentalLiquidityProfile,
        ),
      }),
    );

    expect(result.decision).toBe("eligible");
    expect(result.penalties.map((penalty) => penalty.id)).toContain(
      "experimentalProtocolAllowed",
    );
    expect(
      result.penalties.find(
        (penalty) => penalty.id === "experimentalProtocolAllowed",
      )?.amount,
    ).toBe(EXPERIMENTAL_PROTOCOL_PENALTY);
    expect(result.totalRiskPenalty).toBeGreaterThan(0);
  });

  it("rejects unaudited protocols when not allowed", () => {
    const result = evaluateOpportunityRisk(
      buildInput({
        opportunity: {
          ...morphoOpportunity,
          auditCount: 0,
        },
      }),
    );

    expect(result.decision).toBe("rejected");
    expect(result.rejectionReasons.map((reason) => reason.id)).toContain(
      "unauditedProtocolNotAllowed",
    );
  });

  it("rejects lockups when allowLockups is false", () => {
    const liquidityProfile: OpportunityLiquidityProfile = {
      ...pristineLiquidityProfile,
      hasLockup: true,
      withdrawalConstraintType: "hardLockup",
    };

    const result = evaluateOpportunityRisk(
      buildInput({
        liquidityProfile,
        liquidityScoreResult: calculateLiquidityScore(liquidityProfile),
      }),
    );

    expect(result.decision).toBe("rejected");
    expect(result.rejectionReasons.map((reason) => reason.id)).toContain(
      "lockupsNotAllowed",
    );
  });

  it("rejects withdrawal delays above maxWithdrawalDelay", () => {
    const liquidityProfile: OpportunityLiquidityProfile = {
      ...pristineLiquidityProfile,
      withdrawalSpeedBucket: "oneToSevenDays",
      maxWithdrawalDelay: "30 days",
    };

    const result = evaluateOpportunityRisk(
      buildInput({
        liquidityProfile,
        liquidityScoreResult: calculateLiquidityScore(liquidityProfile),
      }),
    );

    expect(result.decision).toBe("rejected");
    expect(result.rejectionReasons.map((reason) => reason.id)).toContain(
      "withdrawalDelayExceeded",
    );
  });

  it("applies penalty when protocolRiskLevel exceeds maxProtocolRisk", () => {
    const liquidityProfile: OpportunityLiquidityProfile = {
      opportunityId: "moonwell-usdc-base",
      withdrawalSpeedBucket: "lessThanOneDay",
      withdrawalConstraintType: "cooldown",
      redemptionReliabilityLevel: "high",
      assetLiquidityLevel: "veryHigh",
      maxWithdrawalDelay: "1 day",
      hasLockup: false,
    };

    const result = evaluateOpportunityRisk(
      buildInput({
        opportunity: {
          ...morphoOpportunity,
          id: "moonwell-usdc-base",
          protocolId: "moonwell",
          protocolName: "Moonwell",
          protocolRiskLevel: "medium",
        },
        trustScoreResult: calculateTrustScore(
          MOCK_PROTOCOL_TRUST_PROFILES.moonwell!,
        ),
        liquidityProfile,
        liquidityScoreResult: calculateLiquidityScore(liquidityProfile),
        riskLimits: {
          ...balancedPolicy.riskLimits,
          maxProtocolRisk: "low",
        },
      }),
    );

    expect(result.decision).toBe("eligible");
    expect(result.penalties.map((penalty) => penalty.id)).toContain(
      "protocolRiskAbovePolicy",
    );
    expect(
      result.penalties.find(
        (penalty) => penalty.id === "protocolRiskAbovePolicy",
      )?.amount,
    ).toBe(PROTOCOL_RISK_EXCESS_PENALTY_PER_LEVEL);
  });

  it("applies incident history operational penalty without rejection", () => {
    const result = evaluateOpportunityRisk(
      buildInput({
        trustScoreResult: calculateTrustScore(
          MOCK_PROTOCOL_TRUST_PROFILES.aave!,
        ),
      }),
    );

    expect(result.decision).toBe("eligible");
    expect(result.penalties.map((penalty) => penalty.id)).toContain(
      "incidentHistoryOperational",
    );
    expect(
      result.penalties.find(
        (penalty) => penalty.id === "incidentHistoryOperational",
      )?.amount,
    ).toBe(INCIDENT_HISTORY_OPERATIONAL_PENALTY);
  });

  it("applies soft liquidity penalty when score is above minimum but below threshold", () => {
    const liquidityProfile: OpportunityLiquidityProfile = {
      opportunityId: "soft-liquidity",
      withdrawalSpeedBucket: "oneToSevenDays",
      withdrawalConstraintType: "queue",
      redemptionReliabilityLevel: "medium",
      assetLiquidityLevel: "veryHigh",
      maxWithdrawalDelay: "7 days",
      hasLockup: false,
    };

    const result = evaluateOpportunityRisk(
      buildInput({
        liquidityProfile,
        liquidityScoreResult: calculateLiquidityScore(liquidityProfile),
        riskLimits: {
          ...balancedPolicy.riskLimits,
          minTrustScore: 70,
        },
        liquidityRequirements: {
          ...balancedPolicy.liquidityRequirements,
          minLiquidityScore: 70,
        },
      }),
    );

    expect(result.decision).toBe("eligible");
    expect(result.penalties.map((penalty) => penalty.id)).toContain(
      "softLiquidityConcern",
    );
    expect(
      result.penalties.find((penalty) => penalty.id === "softLiquidityConcern")
        ?.amount,
    ).toBe(SOFT_LIQUIDITY_PENALTY);
  });

  it("does not calculate Trust Score or Liquidity Score internally", () => {
    const source = readFileSync(
      resolve(testDir, "evaluateOpportunityRisk.ts"),
      "utf8",
    );

    expect(source).not.toContain("calculateTrustScore");
    expect(source).not.toContain("calculateLiquidityScore");
  });
});
