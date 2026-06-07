import type { Opportunity } from "../opportunity/types.js";
import type { ScoredOpportunityLiquidity } from "../liquidity/types.js";
import type { PortfolioPolicy } from "../policy/types.js";
import type {
  AssessedOpportunityRisk,
  RiskAssessmentResult,
  RiskRejectionReason,
} from "../risk/types.js";
import type { ScoredOpportunityTrust } from "../trust/types.js";
import type { LiquidityScoreResult } from "../liquidity/types.js";
import type { TrustScoreResult } from "../trust/types.js";

export type OpportunityScoreBreakdown = {
  baseScore: number;
  penaltyDenominator: number;
  minimumPenaltyDenominator: number;
  riskPenalty: number;
  gasPenalty: number;
};

export type OpportunityScoreResult = {
  opportunityId: string;
  score: number;
  baseScore: number;
  penaltyDenominator: number;
  minimumPenaltyDenominator: number;
  normalizedTrustScore: number;
  normalizedLiquidityScore: number;
  apyDecimal: number;
  returnPreferenceMultiplier: number;
  riskPenalty: number;
  gasPenalty: number;
  breakdown: OpportunityScoreBreakdown;
  explanations: readonly string[];
};

export type ScoredOpportunity = {
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  asset: string;
  rank: number;
  scoring: OpportunityScoreResult;
};

export type RejectedOpportunity = {
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  asset: string;
  rejectionReasons: RiskRejectionReason[];
  explanations: readonly string[];
};

export type OpportunityRanking = {
  ranked: ScoredOpportunity[];
  rejected: RejectedOpportunity[];
};

export type CalculateOpportunityScoreInput = {
  opportunity: Opportunity;
  selectedProfile: PortfolioPolicy["selectedProfile"];
  trustScoreResult: TrustScoreResult;
  liquidityScoreResult: LiquidityScoreResult;
  riskAssessmentResult: RiskAssessmentResult;
};

export type RankOpportunitiesInput = {
  opportunities: readonly Opportunity[];
  policy: PortfolioPolicy;
  trustScores: readonly ScoredOpportunityTrust[];
  liquidityScores: readonly ScoredOpportunityLiquidity[];
  riskAssessments: readonly AssessedOpportunityRisk[];
};
