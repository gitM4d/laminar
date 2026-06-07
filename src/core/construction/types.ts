import type { Opportunity, SupportedAsset } from "../opportunity/types.js";
import type { PortfolioPolicy } from "../policy/types.js";
import type { OpportunityRanking } from "../scoring/types.js";
import type { RejectedOpportunity } from "../scoring/types.js";

export type ExposureCategory = "lending" | "yieldEnhancement";

export type StrategyPosition = {
  type: "strategy";
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  asset: SupportedAsset;
  exposureCategory: ExposureCategory;
  weight: number;
};

export type LiquidityBufferPosition = {
  type: "liquidityBuffer";
  asset: SupportedAsset;
  weight: number;
};

export type GasReservePosition = {
  type: "gasReserve";
  asset: SupportedAsset;
  weight: number;
};

export type PortfolioPosition =
  | StrategyPosition
  | LiquidityBufferPosition
  | GasReservePosition;

export type ConstructionStep = {
  id: string;
  description: string;
  details?: Record<string, string | number | boolean>;
};

export type ConstructionExplanation = {
  summary: string;
  details: readonly string[];
};

export type PortfolioConstructionMetadata = {
  portfolioValueUsd: number;
  policyVersion: number;
  selectedProfile: PortfolioPolicy["selectedProfile"];
  totalWeight: number;
  strategyWeight: number;
  liquidityBufferWeight: number;
  gasReserveWeight: number;
};

export type PortfolioConstructionResult = {
  positions: PortfolioPosition[];
  rejectedOpportunities: RejectedOpportunity[];
  constructionSteps: ConstructionStep[];
  explanations: ConstructionExplanation[];
  metadata: PortfolioConstructionMetadata;
};

export type PortfolioConstructionInput = {
  policy: PortfolioPolicy;
  ranking: OpportunityRanking;
  opportunities: readonly Opportunity[];
  portfolioValueUsd: number;
};

export type InternalSelectedCandidate = {
  opportunityId: string;
  protocolId: string;
  protocolName: string;
  asset: SupportedAsset;
  exposureCategory: ExposureCategory;
  score: number;
  rank: number;
};
