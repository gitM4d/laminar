export type SupportedAsset = "USDC" | "EURC" | "DAI";

export type SupportedChain = "Base";

export type Opportunity = {
  id: string;
  protocolId: string;
  protocolName: string;
  asset: SupportedAsset;
  chain: SupportedChain;
  apy: number;
};

export type OpportunityDiscoveryResult = {
  opportunities: Opportunity[];
  source: "mock";
};
