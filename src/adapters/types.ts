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
 *   reserves and the market APY/TVL values are still static.
 * - `rpc-reserve-discovery`: the reserve asset was discovered on-chain via
 *   read-only RPC calls. APY/TVL may still be static placeholders.
 */
export type ReadOnlyMarketSource =
  | "static-fallback"
  | "static-fallback-rpc-verified"
  | "rpc-reserve-discovery";

/**
 * Provenance metadata for a read-only market.
 *
 * Distinguishes which parts of the market are sourced on-chain vs static.
 */
export type ReadOnlyMarketMetadata = {
  /** How the reserve asset itself was discovered. */
  reserveDiscovery: "static" | "on-chain";
  /** How the APY/TVL values were produced. */
  apyTvlSource: "static-placeholder" | "on-chain";
  /** Underlying reserve asset address, when discovered on-chain. */
  reserveAddress?: string;
  /** ERC20 decimals, when read on-chain. */
  decimals?: number;
  /** Human-readable provenance note. */
  note?: string;
};

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
  metadata?: ReadOnlyMarketMetadata;
};

export interface ProtocolAdapter {
  id: ProtocolAdapterId;
  protocolName: string;
  chain: ProtocolAdapterChain;
  getHealth(): Promise<AdapterHealthStatus>;
  discoverMarkets(): Promise<ReadOnlyMarketOpportunity[]>;
}
