import {
  constructPortfolio,
  InvalidPortfolioValueError,
} from "../construction/constructPortfolio.js";
import { assertValidIntent } from "../intent/validateIntent.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import {
  scoreOpportunitiesLiquidity,
  UnknownOpportunityLiquidityProfileError,
} from "../liquidity/scoreOpportunityLiquidity.js";
import { normalizeIntent } from "../normalization/normalizeIntent.js";
import type { Opportunity } from "../opportunity/types.js";
import { MockLaminarDataProvider } from "../providers/MockLaminarDataProvider.js";
import type { LaminarDataProvider } from "../providers/types.js";
import { generatePolicy } from "../policy/generatePolicy.js";
import { selectProfile } from "../profile/selectProfile.js";
import { assessOpportunitiesRisk } from "../risk/assessOpportunitiesRisk.js";
import { rankOpportunities } from "../scoring/rankOpportunities.js";
import {
  scoreOpportunitiesTrust,
  UnknownProtocolTrustProfileError,
} from "../trust/scoreOpportunityTrust.js";
import { buildTrustExplanation } from "../trust/buildTrustExplanation.js";
import type { ProtocolTrustProfile } from "../trust/types.js";
import type {
  GeneratePortfolioRecommendationInput,
  PortfolioRecommendationResult,
  RecommendationPipelineStep,
} from "./types.js";

export { InvalidPortfolioValueError } from "../construction/constructPortfolio.js";
export { IntentValidationError } from "../intent/validateIntent.js";

export class RecommendationDataConsistencyError extends Error {
  constructor(message: string) {
    super(`Mock data inconsistency: ${message}`);
    this.name = "RecommendationDataConsistencyError";
  }
}

const PIPELINE_STEP_DEFINITIONS = [
  { id: "validateIntent", name: "Validate Intent" },
  { id: "normalizeIntent", name: "Normalize Intent" },
  { id: "selectProfile", name: "Select Profile" },
  { id: "generatePolicy", name: "Generate Policy" },
  { id: "discoverOpportunities", name: "Discover Opportunities" },
  { id: "scoreTrust", name: "Score Trust" },
  { id: "scoreLiquidity", name: "Score Liquidity" },
  { id: "assessRisk", name: "Assess Risk" },
  { id: "rankOpportunities", name: "Rank Opportunities" },
  { id: "constructPortfolio", name: "Construct Portfolio" },
] as const;

function completeStep(
  steps: RecommendationPipelineStep[],
  stepId: (typeof PIPELINE_STEP_DEFINITIONS)[number]["id"],
): void {
  const definition = PIPELINE_STEP_DEFINITIONS.find(
    (step) => step.id === stepId,
  );

  if (definition === undefined) {
    return;
  }

  steps.push({
    id: definition.id,
    name: definition.name,
    status: "completed",
  });
}

function buildTrustProfilesFromProvider(
  opportunities: readonly Opportunity[],
  dataProvider: LaminarDataProvider,
): Record<string, ProtocolTrustProfile> {
  const profiles: Record<string, ProtocolTrustProfile> = {};

  for (const opportunity of opportunities) {
    if (profiles[opportunity.protocolId] !== undefined) {
      continue;
    }

    try {
      profiles[opportunity.protocolId] = dataProvider.getTrustProfile(
        opportunity.protocolId,
      );
    } catch (error) {
      if (error instanceof UnknownProtocolTrustProfileError) {
        throw new RecommendationDataConsistencyError(
          `Cannot score trust for protocol ${error.protocolId}`,
        );
      }

      throw error;
    }
  }

  return profiles;
}

function buildLiquidityProfilesFromProvider(
  opportunities: readonly Opportunity[],
  dataProvider: LaminarDataProvider,
): Record<string, OpportunityLiquidityProfile> {
  const profiles: Record<string, OpportunityLiquidityProfile> = {};

  for (const opportunity of opportunities) {
    try {
      profiles[opportunity.id] = dataProvider.getLiquidityProfile(
        opportunity.id,
      );
    } catch (error) {
      if (error instanceof UnknownOpportunityLiquidityProfileError) {
        throw new RecommendationDataConsistencyError(
          `Cannot score liquidity for opportunity ${error.opportunityId}`,
        );
      }

      throw error;
    }
  }

  return profiles;
}

function scoreTrustWithConsistencyCheck(
  opportunities: PortfolioRecommendationResult["opportunities"],
  asOf: Date,
  trustProfiles: Record<string, ProtocolTrustProfile>,
): PortfolioRecommendationResult["trustScores"] {
  try {
    return scoreOpportunitiesTrust(opportunities, { asOf, profiles: trustProfiles });
  } catch (error) {
    if (error instanceof UnknownProtocolTrustProfileError) {
      throw new RecommendationDataConsistencyError(
        `Cannot score trust for protocol ${error.protocolId}`,
      );
    }

    throw error;
  }
}

function buildTrustExplanationsFromProfiles(
  trustProfiles: Record<string, ProtocolTrustProfile>,
  asOf: Date,
): PortfolioRecommendationResult["trustExplanations"] {
  return Object.values(trustProfiles).map((profile) =>
    buildTrustExplanation(profile, asOf),
  );
}

function scoreLiquidityWithConsistencyCheck(
  opportunities: PortfolioRecommendationResult["opportunities"],
  liquidityProfiles: Record<string, OpportunityLiquidityProfile>,
): PortfolioRecommendationResult["liquidityScores"] {
  try {
    return scoreOpportunitiesLiquidity(opportunities, {
      profiles: liquidityProfiles,
    });
  } catch (error) {
    if (error instanceof UnknownOpportunityLiquidityProfileError) {
      throw new RecommendationDataConsistencyError(
        `Cannot score liquidity for opportunity ${error.opportunityId}`,
      );
    }

    throw error;
  }
}

export function generatePortfolioRecommendation(
  input: GeneratePortfolioRecommendationInput,
): PortfolioRecommendationResult {
  if (input.portfolioValueUsd <= 0) {
    throw new InvalidPortfolioValueError(input.portfolioValueUsd);
  }

  const generatedAt = (input.asOf ?? new Date()).toISOString();
  const pipelineSteps: RecommendationPipelineStep[] = [];
  const warnings: string[] = [];

  const intent = assertValidIntent(input.intent);
  completeStep(pipelineSteps, "validateIntent");

  const normalizedIntent = normalizeIntent(intent);
  completeStep(pipelineSteps, "normalizeIntent");

  const profileClassification = selectProfile(intent);
  completeStep(pipelineSteps, "selectProfile");

  const policy = generatePolicy(profileClassification.selectedProfile);
  completeStep(pipelineSteps, "generatePolicy");

  const dataProvider = input.dataProvider ?? new MockLaminarDataProvider();
  const providerInfo = dataProvider.getProviderInfo?.() ?? {
    providerType: "unknown",
    providerName: "unknown",
  };
  const opportunities = dataProvider.discoverOpportunities();
  completeStep(pipelineSteps, "discoverOpportunities");

  const trustProfiles = buildTrustProfilesFromProvider(
    opportunities,
    dataProvider,
  );
  const liquidityProfiles = buildLiquidityProfilesFromProvider(
    opportunities,
    dataProvider,
  );

  const trustAsOf = input.asOf ?? new Date(generatedAt);
  const trustScores = scoreTrustWithConsistencyCheck(
    opportunities,
    trustAsOf,
    trustProfiles,
  );
  const trustExplanations = buildTrustExplanationsFromProfiles(
    trustProfiles,
    trustAsOf,
  );
  completeStep(pipelineSteps, "scoreTrust");

  const liquidityScores = scoreLiquidityWithConsistencyCheck(
    opportunities,
    liquidityProfiles,
  );
  completeStep(pipelineSteps, "scoreLiquidity");

  const riskAssessments = assessOpportunitiesRisk(
    opportunities,
    policy,
    trustScores,
    liquidityScores,
    { liquidityProfiles },
  );
  completeStep(pipelineSteps, "assessRisk");

  const opportunityRanking = rankOpportunities({
    opportunities,
    policy,
    trustScores,
    liquidityScores,
    riskAssessments,
  });
  completeStep(pipelineSteps, "rankOpportunities");

  if (opportunityRanking.ranked.length === 0) {
    warnings.push(
      "No eligible opportunities remained after scoring and risk filtering; portfolio allocated entirely to liquidity buffer and gas reserve.",
    );
  }

  const portfolioConstruction = constructPortfolio({
    policy,
    ranking: opportunityRanking,
    opportunities,
    portfolioValueUsd: input.portfolioValueUsd,
  });
  completeStep(pipelineSteps, "constructPortfolio");

  if (
    portfolioConstruction.constructionSteps.some(
      (step) => step.id === "emptyCandidateUniverse",
    )
  ) {
    warnings.push(
      "Portfolio construction used empty candidate universe handling.",
    );
  }

  return {
    intent,
    normalizedIntent,
    selectedProfile: profileClassification.selectedProfile,
    policy,
    opportunities,
    trustScores,
    trustExplanations,
    liquidityScores,
    riskAssessments,
    opportunityRanking,
    portfolioConstruction,
    diagnostics: {
      pipelineSteps,
      warnings,
      generatedAt,
      portfolioValueUsd: input.portfolioValueUsd,
      providerType: providerInfo.providerType,
      providerName: providerInfo.providerName,
      opportunityCount: opportunities.length,
      trustExplained: true,
    },
  };
}
