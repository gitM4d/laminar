import type { SupportedAsset } from "../../core/opportunity/types.js";

/**
 * Operating mode of the read-only Morpho Base adapter.
 *
 * - `static-fallback`: API disabled/unavailable; deterministic static markets.
 * - `api-readonly`: Morpho public GraphQL API may be queried (read-only).
 */
export type MorphoAdapterMode = "static-fallback" | "api-readonly";

/**
 * Static representation of a Morpho Base vault/market.
 *
 * NOTE: APY and TVL are realistic but STATIC placeholders in this spike.
 * No real Morpho vault math is performed in static fallback mode.
 */
export type MorphoBaseStaticMarket = {
  id: string;
  asset: SupportedAsset;
  /** Morpho vault address or market key. Verify before production use. */
  vaultAddress: string;
  /** Static placeholder net APY (decimal, e.g. 0.051 = 5.1%). */
  staticApy: number;
  /** Static placeholder vault TVL in USD. */
  staticTvlUsd: number;
};

/**
 * A Morpho market discovered via the read-only API, normalized to the fields
 * Laminar needs. APY is a decimal fraction (e.g. 0.051 = 5.1%).
 */
export type MorphoDiscoveredMarket = {
  asset: SupportedAsset;
  apy: number;
  tvlUsd: number;
  /** Vault address as reported by the API, when available. */
  vaultAddress?: string;
  /** Vault display name as reported by the API, when available. */
  vaultName?: string;
};

/**
 * Minimal read-only Morpho API client surface.
 *
 * SAFETY: read-only GraphQL queries only. No wallet client, no account,
 * no signing, no transaction submission.
 */
export type MorphoApiClient = {
  query<T = unknown>(request: {
    query: string;
    variables: Record<string, unknown>;
  }): Promise<T>;
};

/** Raw GraphQL shapes returned by the Morpho public API (best-effort). */
export type MorphoApiVaultItem = {
  address?: string;
  name?: string;
  symbol?: string;
  asset?: {
    symbol?: string;
    decimals?: number;
    address?: string;
  };
  state?: {
    netApy?: number | null;
    apy?: number | null;
    totalAssetsUsd?: number | null;
  };
};

export type MorphoApiVaultsResponse = {
  vaults?: {
    items?: MorphoApiVaultItem[] | null;
  } | null;
};

/**
 * Error thrown when Morpho API discovery fails and strict mode is enabled.
 */
export class MorphoDiscoveryError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(`Morpho Base API discovery failed: ${message}`);
    this.name = "MorphoDiscoveryError";
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}
