import { constructPortfolio, InvalidPortfolioValueError } from "../construction/constructPortfolio.js";
import { assertValidIntent } from "../intent/validateIntent.js";
import { scoreOpportunitiesLiquidity, UnknownOpportunityLiquidityProfileError } from "../liquidity/scoreOpportunityLiquidity.js";
import { normalizeIntent } from "../normalization/normalizeIntent.js";
import { discoverOpportunities } from "../opportunity/discoverOpportunities.js";
import { generatePolicy } from "../policy/generatePolicy.js";
import { selectProfile } from "../profile/selectProfile.js";
import { assessOpportunitiesRisk } from "../risk/assessOpportunitiesRisk.js";
import { rankOpportunities } from "../scoring/rankOpportunities.js";
import { scoreOpportunitiesTrust, UnknownProtocolTrustProfileError } from "../trust/scoreOpportunityTrust.js";
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
  const definition = PIPELINE_STEP_DEFINITIONS.find((step) => step.id === stepId);

  if (definition === undefined) {
    return;
  }

  steps.push({
    id: definition.id,
    name: definition.name,
    status: "completed",
  });
}

function scoreTrustWithConsistencyCheck(
  opportunities: PortfolioRecommendationResult["opportunities"],
  asOf: Date,
): PortfolioRecommendationResult["trustScores"] {
  try {
    return scoreOpportunitiesTrust(opportunities, { asOf });
  } catch (error) {
    if (error instanceof UnknownProtocolTrustProfileError) {
      throw new RecommendationDataConsistencyError(
        `Cannot score trust for protocol ${error.protocolId}`,
      );
    }

    throw error;
  }
}

function scoreLiquidityWithConsistencyCheck(
  opportunities: PortfolioRecommendationResult["opportunities"],
): PortfolioRecommendationResult["liquidityScores"] {
  try {
    return scoreOpportunitiesLiquidity(opportunities);
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

  const discovery = discoverOpportunities();
  completeStep(pipelineSteps, "discoverOpportunities");

  const trustScores = scoreTrustWithConsistencyCheck(
    discovery.opportunities,
    input.asOf ?? new Date(generatedAt),
  );
  completeStep(pipelineSteps, "scoreTrust");

  const liquidityScores = scoreLiquidityWithConsistencyCheck(discovery.opportunities);
  completeStep(pipelineSteps, "scoreLiquidity");

  const riskAssessments = assessOpportunitiesRisk(
    discovery.opportunities,
    policy,
    trustScores,
    liquidityScores,
  );
  completeStep(pipelineSteps, "assessRisk");

  const opportunityRanking = rankOpportunities({
    opportunities: discovery.opportunities,
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
    opportunities: discovery.opportunities,
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
    opportunities: discovery.opportunities,
    trustScores,
    liquidityScores,
    riskAssessments,
    opportunityRanking,
    portfolioConstruction,
    diagnostics: {
      pipelineSteps,
      warnings,
      generatedAt,
      portfolioValueUsd: input.portfolioValueUsd,
    },
  };
}
