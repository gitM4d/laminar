import type { Opportunity } from "../opportunity/types.js";
import type { LiquidityRequirements, RiskLimits } from "../policy/types.js";
import type { LiquidityScoreResult, OpportunityLiquidityProfile } from "../liquidity/types.js";
import type { TrustScoreResult } from "../trust/types.js";

export type RiskDecision = "eligible" | "rejected";

export type RiskPenalty = {
  id: string;
  amount: number;
  description: string;
};

export type RiskRejectionReason = {
  id: string;
  message: string;
};

export type RiskAssessmentResult = {
  opportunityId: string;
  decision: RiskDecision;
  totalRiskPenalty: number;
  penalties: RiskPenalty[];
  rejectionReasons: RiskRejectionReason[];
  explanations: readonly string[];
  consumedTrustScore: number;
  consumedLiquidityScore: number;
};

export type EvaluateOpportunityRiskInput = {
  opportunity: Opportunity;
  riskLimits: RiskLimits;
  liquidityRequirements: LiquidityRequirements;
  trustScoreResult: TrustScoreResult;
  liquidityScoreResult: LiquidityScoreResult;
  liquidityProfile: OpportunityLiquidityProfile;
};

export type AssessedOpportunityRisk = {
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  asset: string;
  assessment: RiskAssessmentResult;
};
