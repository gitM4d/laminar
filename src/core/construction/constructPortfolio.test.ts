import { describe, expect, it } from "vitest";
import { MOCK_OPPORTUNITIES } from "../opportunity/mockOpportunities.js";
import { generatePolicy } from "../policy/generatePolicy.js";
import { scoreOpportunitiesLiquidity } from "../liquidity/scoreOpportunityLiquidity.js";
import { assessOpportunitiesRisk } from "../risk/assessOpportunitiesRisk.js";
import { rankOpportunities } from "../scoring/rankOpportunities.js";
import { scoreOpportunitiesTrust } from "../trust/scoreOpportunityTrust.js";
import type { Opportunity } from "../opportunity/types.js";
import type { PortfolioPolicy } from "../policy/types.js";
import type {
  OpportunityRanking,
  ScoredOpportunity,
} from "../scoring/types.js";
import {
  constructPortfolio,
  InvalidPortfolioValueError,
} from "./constructPortfolio.js";
import { ROUNDING_DECIMALS } from "./constructionConfig.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

function makeScoredOpportunity(
  opportunity: Opportunity,
  rank: number,
  score: number,
): ScoredOpportunity {
  return {
    opportunityId: opportunity.id,
    protocolId: opportunity.protocolId,
    protocolName: opportunity.protocolName,
    asset: opportunity.asset,
    rank,
    scoring: {
      opportunityId: opportunity.id,
      score,
      baseScore: score,
      penaltyDenominator: 0.011,
      minimumPenaltyDenominator: 0.01,
      normalizedTrustScore: 0.8,
      normalizedLiquidityScore: 1,
      apyDecimal: opportunity.apy,
      returnPreferenceMultiplier: 1,
      riskPenalty: 0,
      gasPenalty: 0.001,
      breakdown: {
        baseScore: score,
        penaltyDenominator: 0.011,
        minimumPenaltyDenominator: 0.01,
        riskPenalty: 0,
        gasPenalty: 0.001,
      },
      explanations: [],
    },
  };
}

function buildRanking(
  opportunities: Opportunity[],
  scores: number[],
): OpportunityRanking {
  const ranked = opportunities.map((opportunity, index) =>
    makeScoredOpportunity(opportunity, index + 1, scores[index] ?? 0),
  );

  return {
    ranked,
    rejected: [],
  };
}

function buildBalancedPipelineRanking(): OpportunityRanking {
  const policy = generatePolicy("Balanced");
  const trustScores = scoreOpportunitiesTrust(MOCK_OPPORTUNITIES, { asOf });
  const liquidityScores = scoreOpportunitiesLiquidity(MOCK_OPPORTUNITIES);
  const riskAssessments = assessOpportunitiesRisk(
    MOCK_OPPORTUNITIES,
    policy,
    trustScores,
    liquidityScores,
  );

  return rankOpportunities({
    opportunities: MOCK_OPPORTUNITIES,
    policy,
    trustScores,
    liquidityScores,
    riskAssessments,
  });
}

function buildYieldFocusedPipelineRanking(): OpportunityRanking {
  const policy = generatePolicy("Yield Focused");
  const trustScores = scoreOpportunitiesTrust(MOCK_OPPORTUNITIES, { asOf });
  const liquidityScores = scoreOpportunitiesLiquidity(MOCK_OPPORTUNITIES);
  const riskAssessments = assessOpportunitiesRisk(
    MOCK_OPPORTUNITIES,
    policy,
    trustScores,
    liquidityScores,
  );

  return rankOpportunities({
    opportunities: MOCK_OPPORTUNITIES,
    policy,
    trustScores,
    liquidityScores,
    riskAssessments,
  });
}

describe("constructPortfolio", () => {
  it("requires portfolioValueUsd > 0", () => {
    const policy = generatePolicy("Balanced");
    const ranking = buildBalancedPipelineRanking();

    expect(() =>
      constructPortfolio({
        policy,
        ranking,
        opportunities: MOCK_OPPORTUNITIES,
        portfolioValueUsd: 0,
      }),
    ).toThrow(InvalidPortfolioValueError);
  });

  it("computes gas reserve correctly using clamp", () => {
    const policy = generatePolicy("Balanced");
    const ranking = buildRanking(
      [MOCK_OPPORTUNITIES[0] as NonNullable<(typeof MOCK_OPPORTUNITIES)[0]>],
      [1],
    );

    const atMinimum = constructPortfolio({
      policy,
      ranking,
      opportunities: [
        MOCK_OPPORTUNITIES[0] as NonNullable<(typeof MOCK_OPPORTUNITIES)[0]>,
      ],
      portfolioValueUsd: 10_000,
    });
    expect(atMinimum.metadata.gasReserveWeight).toBe(0.01);

    const atMaxClamp = constructPortfolio({
      policy,
      ranking,
      opportunities: [
        MOCK_OPPORTUNITIES[0] as NonNullable<(typeof MOCK_OPPORTUNITIES)[0]>,
      ],
      portfolioValueUsd: 20_000,
    });
    expect(atMaxClamp.metadata.gasReserveWeight).toBe(0.005);

    const atMinClamp = constructPortfolio({
      policy,
      ranking,
      opportunities: [
        MOCK_OPPORTUNITIES[0] as NonNullable<(typeof MOCK_OPPORTUNITIES)[0]>,
      ],
      portfolioValueUsd: 400,
    });
    expect(atMinClamp.metadata.gasReserveWeight).toBe(0.0125);
  });

  it("creates liquidity buffer for Conservative profile", () => {
    const policy = generatePolicy("Conservative");
    const ranking = buildRanking(
      [MOCK_OPPORTUNITIES[0] as NonNullable<(typeof MOCK_OPPORTUNITIES)[0]>],
      [1],
    );

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: [
        MOCK_OPPORTUNITIES[0] as NonNullable<(typeof MOCK_OPPORTUNITIES)[0]>,
      ],
      portfolioValueUsd: 10_000,
    });

    const buffer = result.positions.find(
      (position) => position.type === "liquidityBuffer",
    );

    expect(buffer).toBeDefined();
    expect(buffer?.weight).toBeGreaterThanOrEqual(0.1);
  });

  it("reassigns missing yieldEnhancement target to lending", () => {
    const policy: PortfolioPolicy = {
      ...generatePolicy("Balanced"),
      targetExposure: {
        lending: 0.6,
        yieldEnhancement: 0.4,
        liquidityBuffer: 0,
      },
    };
    const ranking = buildRanking(
      [MOCK_OPPORTUNITIES[0] as NonNullable<(typeof MOCK_OPPORTUNITIES)[0]>],
      [1],
    );

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: [
        MOCK_OPPORTUNITIES[0] as NonNullable<(typeof MOCK_OPPORTUNITIES)[0]>,
      ],
      portfolioValueUsd: 10_000,
    });

    expect(
      result.constructionSteps.some(
        (step) => step.id === "yieldEnhancementReassigned",
      ),
    ).toBe(true);
  });

  it("selects maxActiveAllocations with one opportunity per protocol", () => {
    const policy = generatePolicy("Balanced");
    const ranking = buildBalancedPipelineRanking();

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: MOCK_OPPORTUNITIES,
      portfolioValueUsd: 10_000,
    });

    const strategyPositions = result.positions.filter(
      (position) => position.type === "strategy",
    );

    expect(strategyPositions).toHaveLength(2);
    expect(
      new Set(strategyPositions.map((position) => position.protocolId)).size,
    ).toBe(2);
    expect(strategyPositions.map((position) => position.opportunityId)).toEqual(
      ["morpho-usdc-base", "aave-prime-usdc-base"],
    );
  });

  it("applies score-proportional allocation", () => {
    const policy = generatePolicy("Balanced");
    const opportunities = [
      MOCK_OPPORTUNITIES[0],
      MOCK_OPPORTUNITIES[1],
      MOCK_OPPORTUNITIES[2],
    ] as Opportunity[];
    const ranking = buildRanking(opportunities, [90, 45, 45]);

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities,
      portfolioValueUsd: 10_000,
    });

    const morpho = result.positions.find(
      (position) =>
        position.type === "strategy" &&
        position.opportunityId === "morpho-usdc-base",
    );
    const aave = result.positions.find(
      (position) =>
        position.type === "strategy" &&
        position.opportunityId === "aave-usdc-base",
    );

    expect(morpho?.weight).toBeGreaterThan(aave?.weight ?? 0);
  });

  it("handles zero-score opportunities with equal weights", () => {
    const policy = generatePolicy("Balanced");
    const opportunities = [
      MOCK_OPPORTUNITIES[0],
      MOCK_OPPORTUNITIES[1],
    ] as Opportunity[];
    const ranking = buildRanking(opportunities, [0, 0]);

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities,
      portfolioValueUsd: 10_000,
    });

    const strategyPositions = result.positions.filter(
      (position) => position.type === "strategy",
    );

    expect(strategyPositions).toHaveLength(2);
    expect(strategyPositions[0]?.weight).toBeCloseTo(
      strategyPositions[1]?.weight ?? 0,
      1,
    );
  });

  it("applies maxProtocolExposure and redistributes overflow", () => {
    const policy = generatePolicy("Balanced");
    const opportunities = [
      MOCK_OPPORTUNITIES[0],
      MOCK_OPPORTUNITIES[1],
      MOCK_OPPORTUNITIES[2],
    ] as Opportunity[];
    const ranking = buildRanking(opportunities, [100, 1, 1]);

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities,
      portfolioValueUsd: 10_000,
    });

    expect(
      result.constructionSteps.some(
        (step) => step.id === "maxProtocolExposureApplied",
      ),
    ).toBe(true);

    const morpho = result.positions.find(
      (position) =>
        position.type === "strategy" &&
        position.opportunityId === "morpho-usdc-base",
    );

    expect(morpho?.weight).toBeLessThanOrEqual(0.5);
  });

  it("applies maxStablecoinExposure and moves overflow to liquidityBuffer", () => {
    const policy = generatePolicy("Balanced");
    const opportunities = [
      MOCK_OPPORTUNITIES[0],
      MOCK_OPPORTUNITIES[1],
      MOCK_OPPORTUNITIES[2],
    ] as Opportunity[];
    const ranking = buildRanking(opportunities, [5, 4, 3]);

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities,
      portfolioValueUsd: 10_000,
    });

    expect(
      result.constructionSteps.some(
        (step) => step.id === "maxStablecoinExposureApplied",
      ),
    ).toBe(true);

    const buffer = result.positions.find(
      (position) => position.type === "liquidityBuffer",
    );
    expect(buffer?.weight).toBeGreaterThan(0);
  });

  it("drops allocations below minAllocationSize and promotes next ranked opportunity", () => {
    const policy: PortfolioPolicy = {
      ...generatePolicy("Balanced"),
      allocationConstraints: {
        ...generatePolicy("Balanced").allocationConstraints,
        minAllocationSize: 0.2,
      },
    };
    const opportunities = [
      MOCK_OPPORTUNITIES[0],
      MOCK_OPPORTUNITIES[1],
      MOCK_OPPORTUNITIES[2],
      MOCK_OPPORTUNITIES[3],
    ] as Opportunity[];
    const ranking = buildRanking(opportunities, [100, 1, 1, 50]);

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities,
      portfolioValueUsd: 10_000,
    });

    expect(
      result.constructionSteps.some(
        (step) => step.id === "minAllocationSizeDrop",
      ),
    ).toBe(true);
    expect(
      result.constructionSteps.some(
        (step) => step.id === "minAllocationSizePromote",
      ),
    ).toBe(true);
  });

  it("continues with fewer positions if no replacement exists", () => {
    const policy: PortfolioPolicy = {
      ...generatePolicy("Balanced"),
      allocationConstraints: {
        ...generatePolicy("Balanced").allocationConstraints,
        maxActiveAllocations: 2,
        minAllocationSize: 0.45,
      },
    };
    const opportunities = [
      MOCK_OPPORTUNITIES[0],
      MOCK_OPPORTUNITIES[1],
    ] as Opportunity[];
    const ranking = buildRanking(opportunities, [100, 1]);

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities,
      portfolioValueUsd: 10_000,
    });

    const strategyPositions = result.positions.filter(
      (position) => position.type === "strategy",
    );

    expect(strategyPositions.length).toBeLessThan(2);
    expect(
      result.constructionSteps.some(
        (step) => step.id === "minAllocationSizeDrop",
      ),
    ).toBe(true);
  });

  it("includes rejected opportunities from ranking", () => {
    const policy = generatePolicy("Balanced");
    const ranking = buildBalancedPipelineRanking();

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: MOCK_OPPORTUNITIES,
      portfolioValueUsd: 10_000,
    });

    expect(
      result.rejectedOpportunities.map((entry) => entry.opportunityId),
    ).toEqual(
      expect.arrayContaining(["moonwell-dai-base", "experimental-usdc-base"]),
    );
  });

  it("handles empty ranking without throwing", () => {
    const policy = generatePolicy("Balanced");

    const result = constructPortfolio({
      policy,
      ranking: { ranked: [], rejected: [] },
      opportunities: [],
      portfolioValueUsd: 10_000,
    });

    expect(result.positions).toHaveLength(2);
    expect(
      result.positions.find((position) => position.type === "strategy"),
    ).toBeUndefined();
    expect(
      result.positions.find((position) => position.type === "liquidityBuffer"),
    ).toBeDefined();
    expect(
      result.positions.find((position) => position.type === "gasReserve"),
    ).toBeDefined();
    expect(
      result.constructionSteps.some(
        (step) => step.id === "emptyCandidateUniverse",
      ),
    ).toBe(true);
    expect(result.explanations[0]?.summary).toBe(
      "No opportunities were allocated to strategy positions.",
    );
    expect(result.metadata.strategyWeight).toBe(0);
  });

  it("handles all candidates rejected with empty ranked universe", () => {
    const policy = generatePolicy("Balanced");
    const fullRanking = buildBalancedPipelineRanking();

    const result = constructPortfolio({
      policy,
      ranking: { ranked: [], rejected: fullRanking.rejected },
      opportunities: MOCK_OPPORTUNITIES,
      portfolioValueUsd: 10_000,
    });

    expect(result.rejectedOpportunities).toHaveLength(
      fullRanking.rejected.length,
    );
    expect(
      result.positions.every((position) => position.type !== "strategy"),
    ).toBe(true);
    expect(
      result.constructionSteps.some(
        (step) => step.id === "emptyCandidateUniverse",
      ),
    ).toBe(true);
  });

  it("empty universe weights sum exactly to 1.0", () => {
    const policy = generatePolicy("Balanced");

    const result = constructPortfolio({
      policy,
      ranking: { ranked: [], rejected: [] },
      opportunities: [],
      portfolioValueUsd: 10_000,
    });

    const total = result.positions.reduce(
      (sum, position) => sum + position.weight,
      0,
    );
    const factor = 10 ** ROUNDING_DECIMALS;

    expect(Math.round(total * factor) / factor).toBe(1);
    expect(result.metadata.totalWeight).toBe(1);
  });

  it("preserves gas reserve clamp in empty universe", () => {
    const policy = generatePolicy("Balanced");

    const atTarget = constructPortfolio({
      policy,
      ranking: { ranked: [], rejected: [] },
      opportunities: [],
      portfolioValueUsd: 10_000,
    });
    expect(atTarget.metadata.gasReserveWeight).toBe(0.01);
    expect(atTarget.metadata.liquidityBufferWeight).toBe(0.99);

    const atMaxClamp = constructPortfolio({
      policy,
      ranking: { ranked: [], rejected: [] },
      opportunities: [],
      portfolioValueUsd: 20_000,
    });
    expect(atMaxClamp.metadata.gasReserveWeight).toBe(0.005);
    expect(atMaxClamp.metadata.liquidityBufferWeight).toBe(0.995);
  });

  it("final rounded weights sum exactly to 1.0", () => {
    const policy = generatePolicy("Balanced");
    const ranking = buildBalancedPipelineRanking();

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: MOCK_OPPORTUNITIES,
      portfolioValueUsd: 10_000,
    });

    const total = result.positions.reduce(
      (sum, position) => sum + position.weight,
      0,
    );
    const factor = 10 ** ROUNDING_DECIMALS;

    expect(Math.round(total * factor) / factor).toBe(1);
  });

  it("selects lending and yieldEnhancement for Yield Focused when both buckets exist", () => {
    const policy = generatePolicy("Yield Focused");
    const ranking = buildYieldFocusedPipelineRanking();

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: MOCK_OPPORTUNITIES,
      portfolioValueUsd: 10_000,
    });

    const strategyPositions = result.positions.filter(
      (position) => position.type === "strategy",
    );
    const categories = strategyPositions.map(
      (position) => position.exposureCategory,
    );

    expect(strategyPositions).toHaveLength(3);
    expect(categories).toContain("lending");
    expect(categories).toContain("yieldEnhancement");
    expect(
      strategyPositions.some(
        (position) => position.opportunityId === "aerodrome-usdc-eurc-base",
      ),
    ).toBe(true);
    expect(
      result.constructionSteps.some((step) => step.id === "bucketSlotAllocation"),
    ).toBe(true);
    expect(
      result.constructionSteps.filter(
        (step) => step.id === "bucketCandidatesSelected",
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("selects lending and yieldEnhancement for Balanced when yield candidate exists", () => {
    const lending = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "morpho-usdc-base",
    );
    const yieldOpportunity = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "aerodrome-usdc-eurc-base",
    );

    expect(lending).toBeDefined();
    expect(yieldOpportunity).toBeDefined();

    const opportunities = [
      lending as NonNullable<typeof lending>,
      yieldOpportunity as NonNullable<typeof yieldOpportunity>,
    ];
    const ranking = buildRanking(opportunities, [90, 80]);
    const policy = generatePolicy("Balanced");

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities,
      portfolioValueUsd: 10_000,
    });

    const strategyPositions = result.positions.filter(
      (position) => position.type === "strategy",
    );

    expect(strategyPositions).toHaveLength(2);
    expect(
      strategyPositions.map((position) => position.exposureCategory).sort(),
    ).toEqual(["lending", "yieldEnhancement"]);
    expect(
      result.constructionSteps.some((step) => step.id === "bucketSlotAllocation"),
    ).toBe(true);
    expect(
      result.constructionSteps.some(
        (step) =>
          step.id === "bucketCandidatesSelected" &&
          step.description.includes("yieldEnhancement"),
      ),
    ).toBe(true);
  });

  it("selects lending only for Conservative and preserves liquidity buffer", () => {
    const policy = generatePolicy("Conservative");
    const ranking = buildRanking(
      [
        MOCK_OPPORTUNITIES.find(
          (opportunity) => opportunity.id === "aave-prime-usdc-base",
        ) as NonNullable<(typeof MOCK_OPPORTUNITIES)[number]>,
      ],
      [1],
    );

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: [
        MOCK_OPPORTUNITIES.find(
          (opportunity) => opportunity.id === "aave-prime-usdc-base",
        ) as NonNullable<(typeof MOCK_OPPORTUNITIES)[number]>,
      ],
      portfolioValueUsd: 10_000,
    });

    const strategyPositions = result.positions.filter(
      (position) => position.type === "strategy",
    );
    const buffer = result.positions.find(
      (position) => position.type === "liquidityBuffer",
    );

    expect(
      strategyPositions.every(
        (position) => position.exposureCategory === "lending",
      ),
    ).toBe(true);
    expect(buffer).toBeDefined();
    expect(buffer?.weight).toBeGreaterThanOrEqual(0.1);
    expect(
      result.constructionSteps.some(
        (step) =>
          step.id === "bucketSlotAllocation" &&
          step.description.includes("lending=3"),
      ),
    ).toBe(true);
  });

  it("reassigns missing lending bucket to yieldEnhancement when yield candidates exist", () => {
    const yieldOpportunity = MOCK_OPPORTUNITIES.find(
      (opportunity) => opportunity.id === "aerodrome-usdc-eurc-base",
    );

    expect(yieldOpportunity).toBeDefined();

    const policy: PortfolioPolicy = {
      ...generatePolicy("Yield Focused"),
      targetExposure: {
        lending: 0.6,
        yieldEnhancement: 0.4,
        liquidityBuffer: 0,
      },
    };
    const ranking = buildRanking(
      [yieldOpportunity as NonNullable<typeof yieldOpportunity>],
      [1],
    );

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: [yieldOpportunity as NonNullable<typeof yieldOpportunity>],
      portfolioValueUsd: 10_000,
    });

    expect(
      result.constructionSteps.some(
        (step) => step.id === "lendingReassignedToYieldEnhancement",
      ),
    ).toBe(true);
    expect(
      result.positions.some(
        (position) =>
          position.type === "strategy" &&
          position.opportunityId === "aerodrome-usdc-eurc-base",
      ),
    ).toBe(true);
  });

  it("enforces maxActiveAllocations globally across buckets", () => {
    const policy = generatePolicy("Yield Focused");
    const ranking = buildYieldFocusedPipelineRanking();

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: MOCK_OPPORTUNITIES,
      portfolioValueUsd: 10_000,
    });

    const strategyPositions = result.positions.filter(
      (position) => position.type === "strategy",
    );

    expect(strategyPositions.length).toBeLessThanOrEqual(
      policy.allocationConstraints.maxActiveAllocations,
    );
  });

  it("enforces one opportunity per protocol globally across buckets", () => {
    const policy = generatePolicy("Yield Focused");
    const ranking = buildYieldFocusedPipelineRanking();

    const result = constructPortfolio({
      policy,
      ranking,
      opportunities: MOCK_OPPORTUNITIES,
      portfolioValueUsd: 10_000,
    });

    const strategyPositions = result.positions.filter(
      (position) => position.type === "strategy",
    );

    expect(
      new Set(strategyPositions.map((position) => position.protocolId)).size,
    ).toBe(strategyPositions.length);
  });
});
