import {
  MOONWELL_BASE_CONFIG,
  buildMoonwellMarketId,
  resolveMoonwellBaseApiUrl,
} from "./moonwellBaseConfig.js";
import { MOONWELL_BASE_STATIC_MARKETS } from "./moonwellStaticMarkets.js";
import {
  MoonwellDiscoveryError,
  type MoonwellApiClient,
  type MoonwellApiMarketItem,
  type MoonwellApiMarketsResponse,
  type MoonwellAdapterMode,
  type MoonwellDiscoveredMarket,
} from "./moonwellTypes.js";
import type { SupportedAsset } from "../../core/opportunity/types.js";
import type {
  AdapterHealthStatus,
  ProtocolAdapter,
  ReadOnlyMarketMetadata,
  ReadOnlyMarketOpportunity,
  ReadOnlyMarketSource,
} from "../types.js";

/** Laminar V1 supported assets (USDC / EURC / DAI only). */
const V1_SUPPORTED_ASSETS: readonly SupportedAsset[] = ["USDC", "EURC", "DAI"];

function isV1SupportedAsset(symbol: string): symbol is SupportedAsset {
  return (V1_SUPPORTED_ASSETS as readonly string[]).includes(symbol);
}

export type MoonwellBaseReadOnlyAdapterOptions = {
  /** Explicit API URL. When omitted, resolved from env (MOONWELL_BASE_API_URL). */
  apiUrl?: string;
  /** Inject a custom env source for testing. */
  env?: NodeJS.ProcessEnv;
  /** Inject a read-only API client for testing (avoids real network calls). */
  client?: MoonwellApiClient;
  /** Clock injection for deterministic timestamps in tests. */
  now?: () => Date;
  /**
   * When true, API discovery failures are thrown instead of falling back to
   * static markets. Defaults to false (fallback enabled).
   */
  strictApi?: boolean;
  /** Force static-fallback mode (never query the API). */
  disableApi?: boolean;
};

/**
 * Read-only Moonwell (Base) adapter.
 *
 * SAFETY: This adapter performs read-only API queries only. It never builds
 * transactions, requests signatures, or requires a wallet/private key.
 *
 * Two modes:
 * - static-fallback: API disabled/unconfigured; deterministic static markets.
 * - api-readonly: Moonwell public data API is queried (read-only). On failure
 *   (non-strict) the adapter falls back to static markets; in strict mode it
 *   throws a MoonwellDiscoveryError.
 *
 * NOTE: When the API succeeds, APY/TVL are real (from Moonwell). In static
 * fallback both APY and TVL are static placeholders. Trust/liquidity profiles
 * are curated/static (handled by the provider, not this adapter).
 */
export class MoonwellBaseReadOnlyAdapter implements ProtocolAdapter {
  readonly id = MOONWELL_BASE_CONFIG.protocolId;
  readonly protocolName = MOONWELL_BASE_CONFIG.protocolName;
  readonly chain = MOONWELL_BASE_CONFIG.chain;

  private readonly apiUrl: string | undefined;
  private readonly mode: MoonwellAdapterMode;
  private readonly injectedClient: MoonwellApiClient | undefined;
  private readonly now: () => Date;
  private readonly strictApi: boolean;

  constructor(options: MoonwellBaseReadOnlyAdapterOptions = {}) {
    this.apiUrl =
      options.apiUrl ?? resolveMoonwellBaseApiUrl(options.env ?? process.env);
    const disableApi = options.disableApi ?? false;
    this.mode =
      disableApi || this.apiUrl === undefined
        ? "static-fallback"
        : "api-readonly";
    this.injectedClient = options.client;
    this.now = options.now ?? (() => new Date());
    this.strictApi = options.strictApi ?? false;
  }

  getMode(): MoonwellAdapterMode {
    return this.mode;
  }

  isStrictApi(): boolean {
    return this.strictApi;
  }

  isApiConfigured(): boolean {
    return this.apiUrl !== undefined;
  }

  private getClient(): MoonwellApiClient | undefined {
    if (this.injectedClient !== undefined) {
      return this.injectedClient;
    }

    if (this.apiUrl === undefined) {
      return undefined;
    }

    return createDefaultMoonwellApiClient(this.apiUrl);
  }

  async getHealth(): Promise<AdapterHealthStatus> {
    const checkedAt = this.now().toISOString();

    if (this.mode === "static-fallback") {
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.mode,
        healthy: true,
        rpcChecked: false,
        apiChecked: false,
        detail:
          "Static fallback mode: Moonwell API unconfigured. Serving deterministic static Moonwell Base markets.",
        checkedAt,
      };
    }

    const client = this.getClient();

    if (client === undefined) {
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.mode,
        healthy: false,
        rpcChecked: false,
        apiChecked: false,
        detail: "API mode selected but no API client could be created.",
        checkedAt,
      };
    }

    try {
      await this.queryMarkets(client);
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.mode,
        healthy: true,
        rpcChecked: false,
        apiChecked: true,
        detail:
          "Moonwell API read-only health check succeeded (markets query). APY/TVL sourced from Moonwell when available.",
        checkedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.mode,
        healthy: false,
        rpcChecked: false,
        apiChecked: true,
        detail: `Moonwell API read-only health check failed: ${message}`,
        checkedAt,
      };
    }
  }

  async discoverMarkets(): Promise<ReadOnlyMarketOpportunity[]> {
    const fetchedAt = this.now().toISOString();

    if (this.mode === "static-fallback") {
      return this.buildStaticMarkets("static-fallback", fetchedAt);
    }

    const client = this.getClient();

    if (client === undefined) {
      if (this.strictApi) {
        throw new MoonwellDiscoveryError(
          "API mode selected but no API client could be created",
        );
      }
      return this.buildStaticMarkets("static-fallback", fetchedAt);
    }

    try {
      const discovered = await this.discoverFromApi(client);

      if (discovered.length === 0) {
        if (this.strictApi) {
          throw new MoonwellDiscoveryError(
            "API returned no supported Base markets (USDC/EURC/DAI)",
          );
        }
        return this.buildStaticMarkets("static-fallback", fetchedAt);
      }

      return discovered.map((market) =>
        this.buildApiMarket(market, fetchedAt),
      );
    } catch (error) {
      if (this.strictApi) {
        throw error instanceof MoonwellDiscoveryError
          ? error
          : new MoonwellDiscoveryError("market discovery failed", error);
      }
      return this.buildStaticMarkets("static-fallback", fetchedAt);
    }
  }

  /**
   * Queries the Moonwell API and returns the deepest market per supported asset.
   * Defensive: any unexpected shape throws MoonwellDiscoveryError.
   */
  private async discoverFromApi(
    client: MoonwellApiClient,
  ): Promise<MoonwellDiscoveredMarket[]> {
    const items = await this.queryMarkets(client);

    const bestByAsset = new Map<SupportedAsset, MoonwellDiscoveredMarket>();

    for (const item of items) {
      const symbol = item.underlyingSymbol;
      if (symbol === undefined || !isV1SupportedAsset(symbol)) {
        continue;
      }

      const apyRaw = item.supplyApy;
      const tvlRaw = item.totalSupplyUsd;

      if (
        apyRaw === null ||
        apyRaw === undefined ||
        !Number.isFinite(apyRaw) ||
        tvlRaw === null ||
        tvlRaw === undefined ||
        !Number.isFinite(tvlRaw)
      ) {
        continue;
      }

      const candidate: MoonwellDiscoveredMarket = {
        asset: symbol,
        apy: apyRaw,
        tvlUsd: tvlRaw,
        ...(item.marketAddress !== undefined
          ? { marketAddress: item.marketAddress }
          : {}),
      };

      const existing = bestByAsset.get(symbol);
      // Prefer the deepest market (highest TVL) for each asset.
      if (existing === undefined || candidate.tvlUsd > existing.tvlUsd) {
        bestByAsset.set(symbol, candidate);
      }
    }

    // Deterministic ordering: USDC, EURC, DAI.
    return V1_SUPPORTED_ASSETS.map((asset) => bestByAsset.get(asset)).filter(
      (market): market is MoonwellDiscoveredMarket => market !== undefined,
    );
  }

  private async queryMarkets(
    client: MoonwellApiClient,
  ): Promise<MoonwellApiMarketItem[]> {
    let data: MoonwellApiMarketsResponse;

    try {
      data = await client.getMarkets({ chainId: MOONWELL_BASE_CONFIG.chainId });
    } catch (error) {
      throw new MoonwellDiscoveryError("markets query call failed", error);
    }

    const items = data.markets;

    if (!Array.isArray(items)) {
      throw new MoonwellDiscoveryError(
        "unexpected API response shape: markets is not an array",
      );
    }

    return items;
  }

  private buildApiMarket(
    market: MoonwellDiscoveredMarket,
    fetchedAt: string,
  ): ReadOnlyMarketOpportunity {
    const metadata: ReadOnlyMarketMetadata = {
      reserveDiscovery: "api",
      apySource: "moonwell-api",
      apyIsApproximation: false,
      apyNote:
        "Supply APY from Moonwell public data API (market supplyApy, decimal).",
      tvlSource: "moonwell-api",
      note: "Market discovered via Moonwell read-only API; APY and TVL are API-sourced.",
      ...(market.marketAddress !== undefined
        ? { reserveAddress: market.marketAddress }
        : {}),
    };

    return {
      id: buildMoonwellMarketId(market.asset),
      protocolId: MOONWELL_BASE_CONFIG.protocolId,
      protocolName: MOONWELL_BASE_CONFIG.protocolName,
      chain: MOONWELL_BASE_CONFIG.chain,
      asset: market.asset,
      apy: market.apy,
      tvlUsd: market.tvlUsd,
      exposureCategory: "lending",
      source: "moonwell-api",
      fetchedAt,
      metadata,
    };
  }

  private buildStaticMarkets(
    source: ReadOnlyMarketSource,
    fetchedAt: string,
  ): ReadOnlyMarketOpportunity[] {
    return MOONWELL_BASE_STATIC_MARKETS.map((market) => ({
      id: market.id,
      protocolId: MOONWELL_BASE_CONFIG.protocolId,
      protocolName: MOONWELL_BASE_CONFIG.protocolName,
      chain: MOONWELL_BASE_CONFIG.chain,
      asset: market.asset,
      apy: market.staticApy,
      tvlUsd: market.staticTvlUsd,
      exposureCategory: "lending" as const,
      source,
      fetchedAt,
      metadata: {
        reserveDiscovery: "static" as const,
        reserveAddress: market.marketAddress,
        apySource: "static-placeholder" as const,
        apyIsApproximation: false,
        apyNote: "APY is a static placeholder.",
        tvlSource: "static-placeholder" as const,
        note: "Static fallback market; APY/TVL and market are static placeholders.",
      },
    }));
  }
}

/**
 * Default read-only Moonwell API client backed by `fetch`.
 *
 * SAFETY: issues a single read-only GET request. No wallet, no signer,
 * no transaction is ever submitted.
 *
 * The endpoint is expected to return JSON of shape
 * `{ markets: MoonwellApiMarketItem[] }`. The `chainId` is passed as a query
 * parameter. This is intentionally generic so a Moonwell REST/data endpoint can
 * be wired in via `MOONWELL_BASE_API_URL` without code changes.
 */
export function createDefaultMoonwellApiClient(
  apiUrl: string,
): MoonwellApiClient {
  return {
    async getMarkets({
      chainId,
    }: {
      chainId: number;
    }): Promise<MoonwellApiMarketsResponse> {
      const url = new URL(apiUrl);
      url.searchParams.set("chainId", chainId.toString());

      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new MoonwellDiscoveryError(
          `API returned HTTP ${response.status.toString()}`,
        );
      }

      return (await response.json()) as MoonwellApiMarketsResponse;
    },
  };
}

export { MoonwellDiscoveryError } from "./moonwellTypes.js";
