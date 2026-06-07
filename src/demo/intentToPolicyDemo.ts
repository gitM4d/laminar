import { createMockExecutionPlan } from "../core/execution/createMockExecutionPlan.js";
import { generatePortfolioRecommendation } from "../core/recommendation/generatePortfolioRecommendation.js";
import { createRecommendationSnapshot } from "../core/snapshot/createRecommendationSnapshot.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

const recommendation = generatePortfolioRecommendation({
  intent: {
    risk: 3,
    liquidity: 8,
    returnPreference: 4,
  },
  portfolioValueUsd: 10_000,
  asOf,
});
const snapshot = createRecommendationSnapshot(recommendation);
const mockExecutionPlan = createMockExecutionPlan({ recommendation, snapshot });

const output = {
  intent: recommendation.intent,
  normalizedIntent: recommendation.normalizedIntent,
  profileClassification: {
    selectedProfile: recommendation.selectedProfile,
  },
  policy: recommendation.policy,
  opportunities: recommendation.opportunities,
  trustScores: recommendation.trustScores.map((entry) => ({
    opportunityId: entry.opportunityId,
    protocolId: entry.protocolId,
    protocolName: entry.protocolName,
    trustScore: entry.trust.trustScore,
    breakdown: entry.trust.breakdown,
    explanations: entry.trust.explanations,
  })),
  liquidityScores: recommendation.liquidityScores.map((entry) => ({
    opportunityId: entry.opportunityId,
    protocolId: entry.protocolId,
    protocolName: entry.protocolName,
    asset: entry.asset,
    weightedScoreBeforeCaps: entry.liquidity.weightedScoreBeforeCaps,
    liquidityScore: entry.liquidity.liquidityScore,
    eligible: entry.liquidity.eligible,
    ineligibilityReasons: entry.liquidity.ineligibilityReasons,
    breakdown: entry.liquidity.breakdown,
    explanations: entry.liquidity.explanations,
  })),
  riskAssessments: recommendation.riskAssessments.map((entry) => ({
    opportunityId: entry.opportunityId,
    protocolId: entry.protocolId,
    protocolName: entry.protocolName,
    asset: entry.asset,
    decision: entry.assessment.decision,
    totalRiskPenalty: entry.assessment.totalRiskPenalty,
    consumedTrustScore: entry.assessment.consumedTrustScore,
    consumedLiquidityScore: entry.assessment.consumedLiquidityScore,
    penalties: entry.assessment.penalties,
    rejectionReasons: entry.assessment.rejectionReasons,
    explanations: entry.assessment.explanations,
  })),
  opportunityRankings: recommendation.opportunityRanking.ranked.map((entry) => ({
    rank: entry.rank,
    opportunityId: entry.opportunityId,
    protocolId: entry.protocolId,
    protocolName: entry.protocolName,
    asset: entry.asset,
    score: entry.scoring.score,
    baseScore: entry.scoring.baseScore,
    penaltyDenominator: entry.scoring.penaltyDenominator,
    minimumPenaltyDenominator: entry.scoring.minimumPenaltyDenominator,
    normalizedTrustScore: entry.scoring.normalizedTrustScore,
    normalizedLiquidityScore: entry.scoring.normalizedLiquidityScore,
    apyDecimal: entry.scoring.apyDecimal,
    returnPreferenceMultiplier: entry.scoring.returnPreferenceMultiplier,
    riskPenalty: entry.scoring.riskPenalty,
    gasPenalty: entry.scoring.gasPenalty,
    breakdown: entry.scoring.breakdown,
    explanations: entry.scoring.explanations,
  })),
  rejectedOpportunities: recommendation.opportunityRanking.rejected.map((entry) => ({
    opportunityId: entry.opportunityId,
    protocolId: entry.protocolId,
    protocolName: entry.protocolName,
    asset: entry.asset,
    rejectionReasons: entry.rejectionReasons,
    explanations: entry.explanations,
  })),
  portfolioConstruction: {
    positions: recommendation.portfolioConstruction.positions,
    rejectedOpportunities: recommendation.portfolioConstruction.rejectedOpportunities,
    constructionSteps: recommendation.portfolioConstruction.constructionSteps,
    explanations: recommendation.portfolioConstruction.explanations,
    metadata: recommendation.portfolioConstruction.metadata,
  },
  diagnostics: recommendation.diagnostics,
  snapshot,
  mockExecutionPlan,
};

console.log(JSON.stringify(output, null, 2));
