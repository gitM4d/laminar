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
 * - `static-fallback`: no remote source configured/used; deterministic static
 *   data only.
 * - `rpc-readonly`: an RPC URL is configured and may be used for read-only
 *   connectivity checks (Aave). Market APY/TVL may still be static in early
 *   spikes.
 * - `api-readonly`: a read-only data API is configured and may be queried
 *   (Morpho public GraphQL API). Falls back to static data on failure.
 * - `unavailable`: no read-only source configured; zero markets (Fluid default).
 */
export type AdapterMode =
  | "static-fallback"
  | "rpc-readonly"
  | "api-readonly"
  | "unavailable";

/**
 * Source of a discovered market.
 *
 * - `static-fallback`: data is fully static; no remote source was available.
 * - `static-fallback-rpc-verified`: RPC connectivity was verified, but the
 *   reserves and the market APY/TVL values are still static.
 * - `rpc-reserve-discovery`: the reserve asset was discovered on-chain via
 *   read-only RPC calls. APY/TVL may still be static placeholders.
 * - `morpho-api`: the market was discovered via Morpho's read-only public API.
 * - `moonwell-api`: the market was discovered via Moonwell's read-only data API.
 * - `fluid-api`: the market was discovered via Fluid's read-only public API.
 */
export type ReadOnlyMarketSource =
  | "static-fallback"
  | "static-fallback-rpc-verified"
  | "rpc-reserve-discovery"
  | "morpho-api"
  | "moonwell-api"
  | "fluid-api";

export type ApySource =
  | "aave-liquidity-rate"
  | "morpho-api"
  | "moonwell-api"
  | "fluid-api"
  | "static-placeholder";

/**
 * - `aave-atoken-supply`: TVL derived from aToken.totalSupply() on-chain.
 *   For stablecoins a 1-token ≈ 1 USD peg is assumed and documented.
 * - `morpho-api`: TVL sourced from the Morpho read-only API.
 * - `static-placeholder`: deterministic static value; no real data.
 */
export type TvlSource =
  | "aave-atoken-supply"
  | "morpho-api"
  | "moonwell-api"
  | "fluid-api"
  | "static-placeholder";

/**
 * Provenance metadata for a read-only market.
 *
 * Distinguishes which parts of the market are sourced on-chain vs static.
 */
export type ReadOnlyMarketMetadata = {
  /**
   * How the reserve/market asset itself was identified.
   * - `static`: from curated static config.
   * - `on-chain`: discovered via read-only RPC (Aave).
   * - `api`: discovered via a read-only data API (Morpho).
   */
  reserveDiscovery: "static" | "on-chain" | "api";
  /** Underlying reserve/vault address, when known. */
  reserveAddress?: string;
  /** ERC20 decimals, when read on-chain. */
  decimals?: number;
  /** How the APY value was produced. */
  apySource: ApySource;
  /** True when APY is an approximation (e.g. APR used as APY). */
  apyIsApproximation: boolean;
  /** Human-readable note about the APY value. */
  apyNote?: string;
  /** Raw Aave currentLiquidityRate in ray units, when read on-chain. */
  liquidityRateRay?: string;
  /** How the TVL value was produced. */
  tvlSource: TvlSource;
  /**
   * Human-readable note about the TVL value (e.g. stablecoin peg assumption).
   */
  tvlNote?: string;
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
  /** True only when a real read-only data API call succeeded. */
  apiChecked?: boolean;
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
