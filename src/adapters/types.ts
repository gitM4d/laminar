import type {
  ExposureCategory,
  SupportedAsset,
  SupportedChain,
} from "../core/opportunity/types.js";

export type ProtocolAdapterId = string;

export type ProtocolAdapterChain = SupportedChain;

/**
 * Operating mode of a read-only protocol adapter.
 *
 * - `static-fallback`: no RPC configured; deterministic static data only.
 * - `rpc-readonly`: an RPC URL is configured and may be used for read-only
 *   connectivity checks. Market APY/TVL may still be static in early spikes.
 */
export type AdapterMode = "static-fallback" | "rpc-readonly";

/**
 * Source of a discovered market.
 *
 * - `static-fallback`: data is fully static; no RPC was available.
 * - `static-fallback-rpc-verified`: RPC connectivity was verified, but the
 *   market APY/TVL values are still static for this spike.
 */
export type ReadOnlyMarketSource =
  | "static-fallback"
  | "static-fallback-rpc-verified";

export type AdapterHealthStatus = {
  adapterId: ProtocolAdapterId;
  chain: ProtocolAdapterChain;
  mode: AdapterMode;
  healthy: boolean;
  /** True only when a real read-only RPC call succeeded. */
  rpcChecked: boolean;
  /** Block number returned by a read-only RPC call, when available. */
  blockNumber?: string;
  detail: string;
  checkedAt: string;
};

export type ReadOnlyMarketOpportunity = {
  id: string;
  protocolId: string;
  protocolName: string;
  chain: ProtocolAdapterChain;
  asset: SupportedAsset;
  apy: number;
  tvlUsd: number;
  exposureCategory: ExposureCategory;
  source: ReadOnlyMarketSource;
  fetchedAt: string;
};

export interface ProtocolAdapter {
  id: ProtocolAdapterId;
  protocolName: string;
  chain: ProtocolAdapterChain;
  getHealth(): Promise<AdapterHealthStatus>;
  discoverMarkets(): Promise<ReadOnlyMarketOpportunity[]>;
}
