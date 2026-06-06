export type SupportedAsset = "USDC" | "EURC" | "DAI";

export type SupportedChain = "Base";

export type ProtocolRiskLevel = "low" | "medium" | "high";

export type Opportunity = {
  id: string;
  protocolId: string;
  protocolName: string;
  asset: SupportedAsset;
  chain: SupportedChain;
  apy: number;
  isExperimental: boolean;
  protocolRiskLevel: ProtocolRiskLevel;
  auditCount: number;
};

export type OpportunityDiscoveryResult = {
  opportunities: Opportunity[];
  source: "mock";
};
