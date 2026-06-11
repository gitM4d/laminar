import type { PortfolioConstructionResult } from "../construction/types.js";
import type { UserIntent } from "../intent/types.js";
import type { ScoredOpportunityLiquidity } from "../liquidity/types.js";
import type { NormalizedIntent } from "../normalization/normalizeIntent.js";
import type { Opportunity } from "../opportunity/types.js";
import type { PortfolioPolicy } from "../policy/types.js";
import type { ProfileName } from "../profile/types.js";
import type { AssessedOpportunityRisk } from "../risk/types.js";
import type { OpportunityRanking } from "../scoring/types.js";
import type { LaminarDataProvider } from "../providers/types.js";
import type { ProtocolTrustExplanation } from "../trust/buildTrustExplanation.js";
import type { RejectedOpportunityExplanation } from "../explainability/buildRejectedOpportunityExplanations.js";
import type { ScoredOpportunityTrust } from "../trust/types.js";

export type GeneratePortfolioRecommendationInput = {
  intent: unknown;
  portfolioValueUsd: number;
  asOf?: Date;
  dataProvider?: LaminarDataProvider;
};

export type RecommendationPipelineStepStatus =
  | "completed"
  | "skipped"
  | "failed";

export type RecommendationPipelineStep = {
  id: string;
  name: string;
  status: RecommendationPipelineStepStatus;
};

export type RecommendationDiagnostics = {
  pipelineSteps: RecommendationPipelineStep[];
  warnings: string[];
  generatedAt: string;
  portfolioValueUsd: number;
  /** Short machine-readable provider type identifier. */
  providerType: string;
  /** Human-readable provider display name. */
  providerName: string;
  /** Number of opportunities discovered by the provider. */
  opportunityCount: number;
  /** True when protocol trust explanations were built from the same inputs as trust scoring. */
  trustExplained: boolean;
  /** True when rejected opportunity explanations were built from existing evaluation outputs. */
  rejectionsExplained: boolean;
};

export type PortfolioRecommendationResult = {
  intent: UserIntent;
  normalizedIntent: NormalizedIntent;
  selectedProfile: ProfileName;
  policy: PortfolioPolicy;
  opportunities: readonly Opportunity[];
  trustScores: ScoredOpportunityTrust[];
  trustExplanations: ProtocolTrustExplanation[];
  rejectedOpportunityExplanations: RejectedOpportunityExplanation[];
  liquidityScores: ScoredOpportunityLiquidity[];
  riskAssessments: AssessedOpportunityRisk[];
  opportunityRanking: OpportunityRanking;
  portfolioConstruction: PortfolioConstructionResult;
  diagnostics: RecommendationDiagnostics;
};
