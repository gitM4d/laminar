import {
  FLUID_BASE_CONFIG,
  buildFluidMarketId,
  resolveFluidBaseApiUrl,
} from "./fluidBaseConfig.js";
import { FLUID_BASE_STATIC_MARKETS } from "./fluidStaticMarkets.js";
import {
  FluidDiscoveryError,
  type FluidAdapterMode,
  type FluidApiClient,
  type FluidApiTokenItem,
  type FluidApiTokensResponse,
  type FluidDiscoveredMarket,
} from "./fluidTypes.js";
import { resolveAllowStaticMarketData } from "../realDataEligibility.js";
import type { SupportedAsset } from "../../core/opportunity/types.js";
import type {
  AdapterHealthStatus,
  ProtocolAdapter,
  ReadOnlyMarketMetadata,
  ReadOnlyMarketOpportunity,
  ReadOnlyMarketSource,
} from "../types.js";

const V1_SUPPORTED_ASSETS: readonly SupportedAsset[] = ["USDC", "EURC", "DAI"];

function isV1SupportedAsset(symbol: string): symbol is SupportedAsset {
  return (V1_SUPPORTED_ASSETS as readonly string[]).includes(symbol);
}

export type FluidBaseReadOnlyAdapterOptions = {
  apiUrl?: string;
  env?: NodeJS.ProcessEnv;
  client?: FluidApiClient;
  now?: () => Date;
  strictApi?: boolean;
  disableApi?: boolean;
};

function basisPointsToDecimal(basisPoints: string): number {
  return Number(basisPoints) / 10_000;
}

function computeTvlUsd(
  totalAssets: string,
  decimals: number,
  priceUsd: string,
): number | undefined {
  const assets = Number(totalAssets) / 10 ** decimals;
  const price = Number(priceUsd);
  if (!Number.isFinite(assets) || !Number.isFinite(price) || assets <= 0) {
    return undefined;
  }
  return assets * price;
}

/**
 * Read-only Fluid (Base) adapter.
 *
 * Modes:
 * - unavailable (default when API disabled): zero markets, no fake data.
 * - real-readonly: Fluid official REST API.
 * - static-dev-fallback: diagnostics/tests only with ALLOW_STATIC_MARKET_DATA=true.
 */
export class FluidBaseReadOnlyAdapter implements ProtocolAdapter {
  readonly id = FLUID_BASE_CONFIG.protocolId;
  readonly protocolName = FLUID_BASE_CONFIG.protocolName;
  readonly chain = FLUID_BASE_CONFIG.chain;

  private readonly apiUrl: string | undefined;
  private readonly mode: FluidAdapterMode;
  private readonly injectedClient: FluidApiClient | undefined;
  private readonly now: () => Date;
  private readonly strictApi: boolean;

  constructor(options: FluidBaseReadOnlyAdapterOptions = {}) {
    const env = options.env ?? process.env;
    const allowStaticDevFallback = resolveAllowStaticMarketData(env);
    this.apiUrl =
      options.apiUrl ?? resolveFluidBaseApiUrl(env);
    const disableApi = options.disableApi ?? false;

    if (allowStaticDevFallback && (disableApi || this.apiUrl === undefined)) {
      this.mode = "static-dev-fallback";
    } else if (disableApi || this.apiUrl === undefined) {
      this.mode = "unavailable";
    } else {
      this.mode = "real-readonly";
    }

    this.injectedClient = options.client;
    this.now = options.now ?? (() => new Date());
    this.strictApi = options.strictApi ?? false;
  }

  getMode(): FluidAdapterMode {
    return this.mode;
  }

  isStrictApi(): boolean {
    return this.strictApi;
  }

  isApiConfigured(): boolean {
    return this.apiUrl !== undefined;
  }

  private getClient(): FluidApiClient | undefined {
    if (this.injectedClient !== undefined) {
      return this.injectedClient;
    }
    if (this.apiUrl === undefined) {
      return undefined;
    }
    return createDefaultFluidApiClient(this.apiUrl);
  }

  private healthMode(): AdapterHealthStatus["mode"] {
    switch (this.mode) {
      case "real-readonly":
        return "api-readonly";
      case "static-dev-fallback":
        return "static-fallback";
      case "unavailable":
        return "unavailable";
    }
  }

  async getHealth(): Promise<AdapterHealthStatus> {
    const checkedAt = this.now().toISOString();

    if (this.mode === "unavailable") {
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.healthMode(),
        healthy: false,
        rpcChecked: false,
        apiChecked: false,
        detail:
          "Unavailable mode: Fluid API is not configured. No markets are exposed in real provider flows.",
        checkedAt,
      };
    }

    if (this.mode === "static-dev-fallback") {
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.healthMode(),
        healthy: true,
        rpcChecked: false,
        apiChecked: false,
        detail:
          "Static dev fallback mode (ALLOW_STATIC_MARKET_DATA=true): diagnostics/tests only.",
        checkedAt,
      };
    }

    const client = this.getClient();
    if (client === undefined) {
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.healthMode(),
        healthy: false,
        rpcChecked: false,
        apiChecked: false,
        detail: "Fluid API URL resolved but no client available.",
        checkedAt,
      };
    }

    try {
      await client.getLendingTokens();
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.healthMode(),
        healthy: true,
        rpcChecked: false,
        apiChecked: true,
        detail: "Fluid lending tokens API reachable (read-only).",
        checkedAt,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Fluid API error";
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.healthMode(),
        healthy: false,
        rpcChecked: false,
        apiChecked: false,
        detail: `Fluid API health check failed: ${message}`,
        checkedAt,
      };
    }
  }

  async discoverMarkets(): Promise<ReadOnlyMarketOpportunity[]> {
    const fetchedAt = this.now().toISOString();

    if (this.mode === "unavailable") {
      return [];
    }

    if (this.mode === "static-dev-fallback") {
      return this.buildStaticDevMarkets("static-fallback", fetchedAt);
    }

    const client = this.getClient();
    if (client === undefined) {
      if (this.strictApi) {
        throw new FluidDiscoveryError("Fluid API client unavailable.");
      }
      return [];
    }

    try {
      const response = await client.getLendingTokens();
      const discovered = this.mapApiTokens(response);
      return discovered.map((market) =>
        this.toReadOnlyMarket(market, "fluid-api", fetchedAt),
      );
    } catch (error) {
      if (this.strictApi) {
        throw error instanceof FluidDiscoveryError
          ? error
          : new FluidDiscoveryError(
              error instanceof Error ? error.message : "Fluid API discovery failed.",
            );
      }
      return [];
    }
  }

  private mapApiTokens(response: FluidApiTokensResponse): FluidDiscoveredMarket[] {
    const items = response.data ?? [];
    const markets: FluidDiscoveredMarket[] = [];

    for (const item of items) {
      const mapped = this.mapApiTokenItem(item);
      if (mapped !== undefined) {
        markets.push(mapped);
      }
    }

    return markets;
  }

  private mapApiTokenItem(item: FluidApiTokenItem): FluidDiscoveredMarket | undefined {
    const assetSymbol = item.asset.symbol;
    if (!isV1SupportedAsset(assetSymbol)) {
      return undefined;
    }

    const apy = basisPointsToDecimal(item.totalRate || item.supplyRate);
    const tvlUsd = computeTvlUsd(
      item.totalAssets,
      item.asset.decimals,
      item.asset.price,
    );

    if (!Number.isFinite(apy) || apy <= 0 || tvlUsd === undefined || tvlUsd <= 0) {
      return undefined;
    }

    return {
      id: buildFluidMarketId(assetSymbol),
      asset: assetSymbol,
      fTokenAddress: item.address,
      assetAddress: item.assetAddress,
      apy,
      tvlUsd,
    };
  }

  private toReadOnlyMarket(
    market: FluidDiscoveredMarket,
    source: ReadOnlyMarketSource,
    fetchedAt: string,
  ): ReadOnlyMarketOpportunity {
    const metadata: ReadOnlyMarketMetadata = {
      reserveDiscovery: "api",
      reserveAddress: market.fTokenAddress,
      apySource: "fluid-api",
      apyIsApproximation: false,
      apyNote: "Supply rate from Fluid lending tokens API (basis points APR).",
      tvlSource: "fluid-api",
      tvlNote: "TVL approximated as totalAssets × asset USD price from Fluid API.",
      note: "Real Fluid fToken market from official Fluid/Instadapp API.",
    };

    return {
      id: market.id,
      protocolId: FLUID_BASE_CONFIG.protocolId,
      protocolName: FLUID_BASE_CONFIG.protocolName,
      chain: FLUID_BASE_CONFIG.chain,
      asset: market.asset,
      apy: market.apy,
      tvlUsd: market.tvlUsd,
      exposureCategory: "lending",
      source,
      fetchedAt,
      metadata,
    };
  }

  private buildStaticDevMarkets(
    source: ReadOnlyMarketSource,
    fetchedAt: string,
  ): ReadOnlyMarketOpportunity[] {
    return FLUID_BASE_STATIC_MARKETS.map((market) => ({
      id: market.id,
      protocolId: FLUID_BASE_CONFIG.protocolId,
      protocolName: FLUID_BASE_CONFIG.protocolName,
      chain: FLUID_BASE_CONFIG.chain,
      asset: market.asset,
      apy: market.staticApy,
      tvlUsd: market.staticTvlUsd,
      exposureCategory: "lending" as const,
      source,
      fetchedAt,
      metadata: {
        reserveDiscovery: "static" as const,
        reserveAddress: market.fTokenAddress,
        apySource: "static-placeholder" as const,
        apyIsApproximation: false,
        apyNote: "Static dev fallback APY placeholder.",
        tvlSource: "static-placeholder" as const,
        note:
          "Static dev fallback market; diagnostics/tests only. Not used in real provider flows.",
      },
    }));
  }
}

export function createDefaultFluidApiClient(apiUrl: string): FluidApiClient {
  return {
    async getLendingTokens(): Promise<FluidApiTokensResponse> {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        throw new FluidDiscoveryError(
          `Fluid API returned HTTP ${response.status.toString()}`,
        );
      }

      return (await response.json()) as FluidApiTokensResponse;
    },
  };
}

export { FluidDiscoveryError } from "./fluidTypes.js";
