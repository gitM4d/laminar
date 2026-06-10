import {
  MORPHO_BASE_CONFIG,
  buildMorphoMarketId,
  resolveMorphoBaseApiUrl,
} from "./morphoBaseConfig.js";
import { MORPHO_BASE_STATIC_MARKETS } from "./morphoStaticMarkets.js";
import {
  MorphoDiscoveryError,
  type MorphoApiClient,
  type MorphoApiVaultItem,
  type MorphoApiVaultsResponse,
  type MorphoAdapterMode,
  type MorphoDiscoveredMarket,
} from "./morphoTypes.js";
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

/** Read-only GraphQL query for Morpho vaults on a given chain. */
const MORPHO_VAULTS_QUERY = `
query LaminarMorphoBaseVaults($chainId: Int!) {
  vaults(first: 100, where: { chainId_in: [$chainId] }) {
    items {
      address
      name
      symbol
      asset {
        symbol
        decimals
        address
      }
      state {
        apy
        netApy
        totalAssetsUsd
      }
    }
  }
}
`;

export type MorphoBaseReadOnlyAdapterOptions = {
  /** Explicit API URL. When omitted, resolved from env (MORPHO_BASE_API_URL). */
  apiUrl?: string;
  /** Inject a custom env source for testing. */
  env?: NodeJS.ProcessEnv;
  /** Inject a read-only API client for testing (avoids real network calls). */
  client?: MorphoApiClient;
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
 * Read-only Morpho (Base) adapter.
 *
 * SAFETY: This adapter performs read-only API queries only. It never builds
 * transactions, requests signatures, or requires a wallet/private key.
 *
 * Two modes:
 * - static-fallback: API disabled/unavailable; deterministic static markets.
 * - api-readonly: Morpho public GraphQL API is queried (read-only). On failure
 *   (non-strict) the adapter falls back to static markets; in strict mode it
 *   throws a MorphoDiscoveryError.
 *
 * NOTE: When the API succeeds, APY/TVL are real (from Morpho). In static
 * fallback both APY and TVL are static placeholders. Trust/liquidity profiles
 * are curated/static (handled by the provider, not this adapter).
 */
export class MorphoBaseReadOnlyAdapter implements ProtocolAdapter {
  readonly id = MORPHO_BASE_CONFIG.protocolId;
  readonly protocolName = MORPHO_BASE_CONFIG.protocolName;
  readonly chain = MORPHO_BASE_CONFIG.chain;

  private readonly apiUrl: string | undefined;
  private readonly mode: MorphoAdapterMode;
  private readonly injectedClient: MorphoApiClient | undefined;
  private readonly now: () => Date;
  private readonly strictApi: boolean;

  constructor(options: MorphoBaseReadOnlyAdapterOptions = {}) {
    this.apiUrl =
      options.apiUrl ?? resolveMorphoBaseApiUrl(options.env ?? process.env);
    const disableApi = options.disableApi ?? false;
    this.mode =
      disableApi || this.apiUrl === undefined
        ? "static-fallback"
        : "api-readonly";
    this.injectedClient = options.client;
    this.now = options.now ?? (() => new Date());
    this.strictApi = options.strictApi ?? false;
  }

  getMode(): MorphoAdapterMode {
    return this.mode;
  }

  isStrictApi(): boolean {
    return this.strictApi;
  }

  isApiConfigured(): boolean {
    return this.apiUrl !== undefined;
  }

  private getClient(): MorphoApiClient | undefined {
    if (this.injectedClient !== undefined) {
      return this.injectedClient;
    }

    if (this.apiUrl === undefined) {
      return undefined;
    }

    return createDefaultMorphoApiClient(this.apiUrl);
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
          "Static fallback mode: Morpho API disabled. Serving deterministic static Morpho Base markets.",
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
      await this.queryVaults(client);
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.mode,
        healthy: true,
        rpcChecked: false,
        apiChecked: true,
        detail:
          "Morpho API read-only health check succeeded (vaults query). APY/TVL sourced from Morpho when available.",
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
        detail: `Morpho API read-only health check failed: ${message}`,
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
        throw new MorphoDiscoveryError(
          "API mode selected but no API client could be created",
        );
      }
      return this.buildStaticMarkets("static-fallback", fetchedAt);
    }

    try {
      const discovered = await this.discoverFromApi(client);

      if (discovered.length === 0) {
        if (this.strictApi) {
          throw new MorphoDiscoveryError(
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
        throw error instanceof MorphoDiscoveryError
          ? error
          : new MorphoDiscoveryError("market discovery failed", error);
      }
      return this.buildStaticMarkets("static-fallback", fetchedAt);
    }
  }

  /**
   * Queries the Morpho API and returns the best vault per supported asset.
   * Defensive: any unexpected shape throws MorphoDiscoveryError.
   */
  private async discoverFromApi(
    client: MorphoApiClient,
  ): Promise<MorphoDiscoveredMarket[]> {
    const items = await this.queryVaults(client);

    const bestByAsset = new Map<SupportedAsset, MorphoDiscoveredMarket>();

    for (const item of items) {
      const symbol = item.asset?.symbol;
      if (symbol === undefined || !isV1SupportedAsset(symbol)) {
        continue;
      }

      const apyRaw = item.state?.netApy ?? item.state?.apy;
      const tvlRaw = item.state?.totalAssetsUsd;

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

      const candidate: MorphoDiscoveredMarket = {
        asset: symbol,
        apy: apyRaw,
        tvlUsd: tvlRaw,
        ...(item.address !== undefined ? { vaultAddress: item.address } : {}),
        ...(item.name !== undefined ? { vaultName: item.name } : {}),
      };

      const existing = bestByAsset.get(symbol);
      // Prefer the deepest vault (highest TVL) for each asset.
      if (existing === undefined || candidate.tvlUsd > existing.tvlUsd) {
        bestByAsset.set(symbol, candidate);
      }
    }

    // Deterministic ordering: USDC, EURC, DAI.
    return V1_SUPPORTED_ASSETS.map((asset) => bestByAsset.get(asset)).filter(
      (market): market is MorphoDiscoveredMarket => market !== undefined,
    );
  }

  private async queryVaults(
    client: MorphoApiClient,
  ): Promise<MorphoApiVaultItem[]> {
    let data: MorphoApiVaultsResponse;

    try {
      data = await client.query<MorphoApiVaultsResponse>({
        query: MORPHO_VAULTS_QUERY,
        variables: { chainId: MORPHO_BASE_CONFIG.chainId },
      });
    } catch (error) {
      throw new MorphoDiscoveryError("vaults query call failed", error);
    }

    const items = data?.vaults?.items;

    if (!Array.isArray(items)) {
      throw new MorphoDiscoveryError(
        "unexpected API response shape: vaults.items is not an array",
      );
    }

    return items;
  }

  private buildApiMarket(
    market: MorphoDiscoveredMarket,
    fetchedAt: string,
  ): ReadOnlyMarketOpportunity {
    const metadata: ReadOnlyMarketMetadata = {
      reserveDiscovery: "api",
      apySource: "morpho-api",
      apyIsApproximation: false,
      apyNote:
        "Net APY from Morpho public API (vault state.netApy/apy, decimal).",
      tvlSource: "morpho-api",
      note: "Vault discovered via Morpho read-only API; APY and TVL are API-sourced.",
      ...(market.vaultAddress !== undefined
        ? { reserveAddress: market.vaultAddress }
        : {}),
    };

    return {
      id: buildMorphoMarketId(market.asset),
      protocolId: MORPHO_BASE_CONFIG.protocolId,
      protocolName: MORPHO_BASE_CONFIG.protocolName,
      chain: MORPHO_BASE_CONFIG.chain,
      asset: market.asset,
      apy: market.apy,
      tvlUsd: market.tvlUsd,
      exposureCategory: "lending",
      source: "morpho-api",
      fetchedAt,
      metadata,
    };
  }

  private buildStaticMarkets(
    source: ReadOnlyMarketSource,
    fetchedAt: string,
  ): ReadOnlyMarketOpportunity[] {
    return MORPHO_BASE_STATIC_MARKETS.map((market) => ({
      id: market.id,
      protocolId: MORPHO_BASE_CONFIG.protocolId,
      protocolName: MORPHO_BASE_CONFIG.protocolName,
      chain: MORPHO_BASE_CONFIG.chain,
      asset: market.asset,
      apy: market.staticApy,
      tvlUsd: market.staticTvlUsd,
      exposureCategory: "lending" as const,
      source,
      fetchedAt,
      metadata: {
        reserveDiscovery: "static" as const,
        reserveAddress: market.vaultAddress,
        apySource: "static-placeholder" as const,
        apyIsApproximation: false,
        apyNote: "APY is a static placeholder.",
        tvlSource: "static-placeholder" as const,
        note: "Static fallback market; APY/TVL and vault are static placeholders.",
      },
    }));
  }
}

/**
 * Default read-only Morpho API client backed by `fetch`.
 *
 * SAFETY: issues a single read-only GraphQL POST query. No wallet, no signer,
 * no transaction is ever submitted.
 */
export function createDefaultMorphoApiClient(apiUrl: string): MorphoApiClient {
  return {
    async query<T>({
      query,
      variables,
    }: {
      query: string;
      variables: Record<string, unknown>;
    }): Promise<T> {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new MorphoDiscoveryError(
          `API returned HTTP ${response.status.toString()}`,
        );
      }

      const json = (await response.json()) as {
        data?: T;
        errors?: { message?: string }[];
      };

      if (json.errors !== undefined && json.errors.length > 0) {
        const detail = json.errors
          .map((entry) => entry.message ?? "unknown")
          .join("; ");
        throw new MorphoDiscoveryError(`GraphQL errors: ${detail}`);
      }

      if (json.data === undefined) {
        throw new MorphoDiscoveryError("API response missing data field");
      }

      return json.data;
    },
  };
}

export { MorphoDiscoveryError } from "./morphoTypes.js";
