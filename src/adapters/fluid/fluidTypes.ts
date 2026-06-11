import type { SupportedAsset } from "../../core/opportunity/types.js";

export type FluidAdapterMode = "unavailable" | "real-readonly" | "static-dev-fallback";

export type FluidApiAsset = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  price: string;
  chainId: string;
};

export type FluidApiTokenItem = {
  address: string;
  symbol: string;
  decimals: number;
  assetAddress: string;
  asset: FluidApiAsset;
  totalAssets: string;
  totalSupply: string;
  supplyRate: string;
  totalRate: string;
  rewardsRate: string;
};

export type FluidApiTokensResponse = {
  totalAssetsInUsd?: string;
  yearlyYieldInUsd?: string;
  data?: FluidApiTokenItem[] | null;
};

export type FluidApiClient = {
  getLendingTokens(): Promise<FluidApiTokensResponse>;
};

export type FluidDiscoveredMarket = {
  id: string;
  asset: SupportedAsset;
  fTokenAddress: string;
  assetAddress: string;
  apy: number;
  tvlUsd: number;
};

export class FluidDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FluidDiscoveryError";
  }
}
