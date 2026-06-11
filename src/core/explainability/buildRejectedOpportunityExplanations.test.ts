import { describe, expect, it } from "vitest";
import { calculateLiquidityScore } from "../liquidity/calculateLiquidityScore.js";
import { calculateTrustScore } from "../trust/calculateTrustScore.js";
import { MOCK_PROTOCOL_TRUST_PROFILES } from "../trust/mockProtocolTrustProfiles.js";
import type { Opportunity } from "../opportunity/types.js";
import type { PortfolioPolicy } from "../policy/types.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import { evaluateOpportunityRisk } from "../risk/evaluateOpportunityRisk.js";
import { generatePortfolioRecommendation } from "../recommendation/generatePortfolioRecommendation.js";
import {
  buildRejectedOpportunityExplanations,
  buildRejectionHighlights,
} from "./buildRejectedOpportunityExplanations.js";
import type { BuildRejectedOpportunityExplanationsInput } from "./buildRejectedOpportunityExplanations.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

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

const pristineLiquidityProfile: OpportunityLiquidityProfile = {
  opportunityId: "test",
  withdrawalSpeedBucket: "instant",
  withdrawalConstraintType: "none",
  redemptionReliabilityLevel: "veryHigh",
  assetLiquidityLevel: "veryHigh",
  maxWithdrawalDelay: "instant",
  hasLockup: false,
};

const experimentalOpportunity: Opportunity = {
  id: "experimental-usdc-base",
  protocolId: "experimental-lend",
  protocolName: "Experimental Lend",
  asset: "USDC",
  chain: "Base",
  apy: 0.112,
  isExperimental: true,
  protocolRiskLevel: "high",
  auditCount: 1,
  exposureCategory: "lending",
};

function buildInputFromRecommendation(): BuildRejectedOpportunityExplanationsInput {
  const recommendation = generatePortfolioRecommendation({
    intent: { risk: 3, liquidity: 8, returnPreference: 4 },
    portfolioValueUsd: 10_000,
    asOf,
  });

  return {
    selectedProfile: recommendation.selectedProfile,
    policy: recommendation.policy,
    opportunities: recommendation.opportunities,
    opportunityRanking: recommendation.opportunityRanking,
    portfolioConstruction: recommendation.portfolioConstruction,
    riskAssessments: recommendation.riskAssessments,
    trustScores: recommendation.trustScores,
    liquidityScores: recommendation.liquidityScores,
  };
}

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
  exposureCategory: "lending",
};

function buildSingleRejectedInput(
  overrides: {
    opportunity?: Opportunity;
    riskLimits?: PortfolioPolicy["riskLimits"];
    liquidityRequirements?: PortfolioPolicy["liquidityRequirements"];
    trustScoreOverride?: number;
    liquidityScoreOverride?: number;
    liquidityEligible?: boolean;
  } = {},
): BuildRejectedOpportunityExplanationsInput {
  const opportunity = overrides.opportunity ?? experimentalOpportunity;
  const riskAssessment = evaluateOpportunityRisk({
    opportunity,
    riskLimits: overrides.riskLimits ?? balancedPolicy.riskLimits,
    liquidityRequirements:
      overrides.liquidityRequirements ?? balancedPolicy.liquidityRequirements,
    trustScoreResult:
      overrides.trustScoreOverride !== undefined
        ? {
            ...calculateTrustScore(MOCK_PROTOCOL_TRUST_PROFILES.morpho!),
            trustScore: overrides.trustScoreOverride,
          }
        : calculateTrustScore(MOCK_PROTOCOL_TRUST_PROFILES.morpho!),
    liquidityScoreResult:
      overrides.liquidityScoreOverride !== undefined ||
      overrides.liquidityEligible !== undefined
        ? {
            ...calculateLiquidityScore(pristineLiquidityProfile),
            liquidityScore: overrides.liquidityScoreOverride ?? 80,
            eligible: overrides.liquidityEligible ?? true,
            ineligibilityReasons:
              overrides.liquidityEligible === false ? ["has lockup"] : [],
          }
        : calculateLiquidityScore(pristineLiquidityProfile),
    liquidityProfile: pristineLiquidityProfile,
  });

  const rejected = {
    opportunityId: opportunity.id,
    protocolId: opportunity.protocolId,
    protocolName: opportunity.protocolName,
    asset: opportunity.asset,
    rejectionReasons: riskAssessment.rejectionReasons,
    explanations: riskAssessment.explanations,
  };

  return {
    selectedProfile: "Balanced",
    policy: balancedPolicy,
    opportunities: [opportunity],
    opportunityRanking: { ranked: [], rejected: [rejected] },
    portfolioConstruction: {
      positions: [],
      rejectedOpportunities: [rejected],
      metadata: {
        portfolioValueUsd: 10_000,
        policyVersion: 1,
        selectedProfile: "Balanced",
        totalWeight: 0,
        strategyWeight: 0,
        liquidityBufferWeight: 0,
        gasReserveWeight: 0,
      },
      constructionSteps: [],
      explanations: [],
    },
    riskAssessments: [
      {
        opportunityId: opportunity.id,
        protocolId: opportunity.protocolId,
        protocolName: opportunity.protocolName,
        asset: opportunity.asset,
        assessment: riskAssessment,
      },
    ],
    trustScores: [
      {
        opportunityId: opportunity.id,
        protocolId: opportunity.protocolId,
        protocolName: opportunity.protocolName,
        trust: calculateTrustScore(MOCK_PROTOCOL_TRUST_PROFILES.morpho!),
      },
    ],
    liquidityScores: [
      {
        opportunityId: opportunity.id,
        protocolId: opportunity.protocolId,
        protocolName: opportunity.protocolName,
        asset: opportunity.asset,
        liquidity: calculateLiquidityScore(pristineLiquidityProfile),
      },
    ],
  };
}

describe("buildRejectedOpportunityExplanations", () => {
  it("maps belowMinTrustScore to trust category", () => {
    const input = buildSingleRejectedInput({
      opportunity: morphoOpportunity,
      trustScoreOverride: 70,
    });
    const [explanation] = buildRejectedOpportunityExplanations(input);

    expect(explanation?.primaryReasonCategory).toBe("trust");
    expect(explanation?.primaryReasonCode).toBe("belowMinTrustScore");
    expect(explanation?.details[0]?.category).toBe("trust");
    expect(explanation?.details[0]?.observedValue).toBe(70);
    expect(explanation?.details[0]?.requiredValue).toBe(75);
  });

  it("maps belowMinLiquidityScore to liquidity category", () => {
    const input = buildSingleRejectedInput({
      opportunity: {
        ...experimentalOpportunity,
        isExperimental: false,
      },
      trustScoreOverride: 90,
      liquidityScoreOverride: 70,
    });
    const [explanation] = buildRejectedOpportunityExplanations(input);

    expect(explanation?.primaryReasonCategory).toBe("liquidity");
    expect(explanation?.primaryReasonCode).toBe("belowMinLiquidityScore");
    expect(explanation?.details.some((detail) => detail.code === "belowMinLiquidityScore")).toBe(
      true,
    );
  });

  it("maps experimentalProtocolNotAllowed to policy category", () => {
    const input = buildSingleRejectedInput({
      trustScoreOverride: 90,
      liquidityScoreOverride: 90,
    });
    const [explanation] = buildRejectedOpportunityExplanations(input);

    expect(explanation?.primaryReasonCategory).toBe("policy");
    expect(explanation?.primaryReasonCode).toBe("experimentalProtocolNotAllowed");
    expect(explanation?.details[0]?.observedValue).toBe(true);
    expect(explanation?.details[0]?.requiredValue).toBe(false);
  });

  it("maps unknown reason codes to unknown category", () => {
    const customRejected = {
      opportunityId: "custom-opportunity",
      protocolId: "custom",
      protocolName: "Custom",
      asset: "USDC",
      rejectionReasons: [{ id: "customReason", message: "Custom rejection." }],
      explanations: ["Custom rejection."],
    };

    const input = buildInputFromRecommendation();
    const explanations = buildRejectedOpportunityExplanations({
      ...input,
      opportunities: [
        {
          id: "custom-opportunity",
          protocolId: "custom",
          protocolName: "Custom",
          asset: "USDC",
          chain: "Base",
          apy: 0.05,
          isExperimental: false,
          protocolRiskLevel: "low",
          auditCount: 2,
          exposureCategory: "lending",
        },
      ],
      opportunityRanking: {
        ranked: [],
        rejected: [customRejected],
      },
      portfolioConstruction: {
        ...input.portfolioConstruction,
        rejectedOpportunities: [customRejected],
      },
    });

    const [explanation] = explanations;
    expect(explanation?.primaryReasonCategory).toBe("unknown");
    expect(explanation?.primaryReasonCode).toBe("customReason");
    expect(explanation?.details[0]?.category).toBe("unknown");
  });

  it("selects the primary reason deterministically by priority", () => {
    const input = buildSingleRejectedInput({
      trustScoreOverride: 70,
      liquidityScoreOverride: 70,
    });
    const [explanation] = buildRejectedOpportunityExplanations(input);

    expect(explanation?.primaryReasonCode).toBe("experimentalProtocolNotAllowed");
    expect(explanation?.details.length).toBeGreaterThan(1);
  });

  it("includes observed and required values when available", () => {
    const input = buildSingleRejectedInput({
      opportunity: morphoOpportunity,
      trustScoreOverride: 73.7,
    });
    const [explanation] = buildRejectedOpportunityExplanations(input);
    const trustDetail = explanation?.details.find(
      (detail) => detail.code === "belowMinTrustScore",
    );

    expect(trustDetail?.observedValue).toBe(73.7);
    expect(trustDetail?.requiredValue).toBe(75);
  });

  it("deduplicates rejected opportunities from ranking and construction", () => {
    const input = buildInputFromRecommendation();
    const explanations = buildRejectedOpportunityExplanations(input);
    const ids = explanations.map((entry) => entry.opportunityId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(explanations.length).toBe(
      input.opportunityRanking.rejected.length,
    );
  });
});

describe("buildRejectionHighlights", () => {
  it("builds compact highlights without duplicates", () => {
    const input = buildInputFromRecommendation();
    const explanations = buildRejectedOpportunityExplanations(input);
    const highlights = buildRejectionHighlights(explanations);

    expect(highlights.length).toBe(explanations.length);
    expect(new Set(highlights.map((entry) => entry.opportunityId)).size).toBe(
      highlights.length,
    );
    expect(highlights[0]).toEqual(
      expect.objectContaining({
        label: expect.any(String),
        protocolName: expect.any(String),
        asset: expect.any(String),
        primaryReasonCategory: expect.any(String),
        summary: expect.any(String),
      }),
    );
    expect(highlights[0]).not.toHaveProperty("details");
  });
});

describe("recommendation integration", () => {
  it("includes rejectedOpportunityExplanations and rejectionsExplained", () => {
    const recommendation = generatePortfolioRecommendation({
      intent: { risk: 3, liquidity: 8, returnPreference: 4 },
      portfolioValueUsd: 10_000,
      asOf,
    });

    expect(recommendation.rejectedOpportunityExplanations.length).toBeGreaterThan(
      0,
    );
    expect(recommendation.diagnostics.rejectionsExplained).toBe(true);

    const ids = recommendation.rejectedOpportunityExplanations.map(
      (entry) => entry.opportunityId,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
