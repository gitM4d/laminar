import type { SupportedAsset } from "../../core/opportunity/types.js";

/**
 * Operating mode of the read-only Moonwell Base adapter.
 *
 * - `static-fallback`: API disabled/unavailable; deterministic static markets.
 * - `api-readonly`: Moonwell public data API may be queried (read-only).
 */
export type MoonwellAdapterMode = "static-fallback" | "api-readonly";

/**
 * Static representation of a Moonwell Base lending market (mToken).
 *
 * NOTE: APY and TVL are realistic but STATIC placeholders in this spike.
 * No real Moonwell mToken math is performed in static fallback mode.
 */
export type MoonwellBaseStaticMarket = {
  id: string;
  asset: SupportedAsset;
  /** Moonwell mToken (market) address. Verify before production use. */
  marketAddress: string;
  /** Static placeholder supply APY (decimal, e.g. 0.048 = 4.8%). */
  staticApy: number;
  /** Static placeholder market TVL in USD. */
  staticTvlUsd: number;
};

/**
 * A Moonwell market discovered via the read-only API, normalized to the fields
 * Laminar needs. APY is a decimal fraction (e.g. 0.048 = 4.8%).
 */
export type MoonwellDiscoveredMarket = {
  asset: SupportedAsset;
  apy: number;
  tvlUsd: number;
  /** mToken/market address as reported by the API, when available. */
  marketAddress?: string;
};

/**
 * Minimal read-only Moonwell API client surface.
 *
 * SAFETY: read-only data queries only. No wallet client, no account,
 * no signing, no transaction submission.
 */
export type MoonwellApiClient = {
  getMarkets(request: { chainId: number }): Promise<MoonwellApiMarketsResponse>;
};

/** Raw shapes returned by the Moonwell data API (best-effort/defensive). */
export type MoonwellApiMarketItem = {
  /** mToken (market) contract address. */
  marketAddress?: string;
  /** Underlying asset symbol (e.g. "USDC"). */
  underlyingSymbol?: string;
  /** Underlying asset address. */
  underlyingAddress?: string;
  /** Underlying asset decimals. */
  underlyingDecimals?: number;
  /** Supply APY as a decimal fraction (0.048 = 4.8%). */
  supplyApy?: number | null;
  /** Total supplied value in USD (TVL). */
  totalSupplyUsd?: number | null;
};

export type MoonwellApiMarketsResponse = {
  markets?: MoonwellApiMarketItem[] | null;
};

/**
 * Error thrown when Moonwell API discovery fails and strict mode is enabled.
 */
export class MoonwellDiscoveryError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(`Moonwell Base API discovery failed: ${message}`);
    this.name = "MoonwellDiscoveryError";
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}
