import { createPublicClient, http, type PublicClient } from "viem";
import { base } from "viem/chains";
import { AAVE_BASE_CONFIG, resolveAaveBaseRpcUrl } from "./aaveBaseConfig.js";
import {
  AAVE_BASE_STATIC_MARKETS,
  getStaticApyTvlForAsset,
} from "./aaveStaticMarkets.js";
import {
  AaveReserveDiscoveryError,
  buildAaveMarketId,
  discoverAaveBaseReserves,
  type AaveReadOnlyClient,
  type DiscoveredReserve,
} from "./aaveReserveDiscovery.js";
import type {
  AdapterHealthStatus,
  AdapterMode,
  ProtocolAdapter,
  ReadOnlyMarketOpportunity,
  ReadOnlyMarketSource,
} from "../types.js";

export type AaveBaseReadOnlyAdapterOptions = {
  /** Explicit RPC URL. When omitted, resolved from env (AAVE_BASE_RPC_URL → BASE_RPC_URL). */
  rpcUrl?: string;
  /** Inject a custom env source for testing. */
  env?: NodeJS.ProcessEnv;
  /** Inject a read-only client for testing (avoids real network calls). */
  publicClient?: AaveReadOnlyClient;
  /** Clock injection for deterministic timestamps in tests. */
  now?: () => Date;
  /**
   * When true, on-chain reserve discovery failures are thrown instead of
   * falling back to static markets. Defaults to false (fallback enabled).
   */
  strictRpc?: boolean;
};

/**
 * Read-only Aave V3 (Base) adapter.
 *
 * SAFETY: This adapter performs read-only calls only. It never builds
 * transactions, requests signatures, or requires a wallet/private key.
 *
 * Two modes:
 * - static-fallback: no RPC configured; deterministic static markets only.
 * - rpc-readonly: RPC configured; getHealth() performs a read-only connectivity
 *   check (getBlockNumber) and discoverMarkets() performs on-chain reserve
 *   discovery (Pool.getReservesList + ERC20 symbol/decimals).
 *
 * NOTE (Sprint 18): reserve assets are discovered on-chain, but APY/TVL remain
 * STATIC placeholders. Real Aave reserve math is not implemented yet.
 */
export class AaveBaseReadOnlyAdapter implements ProtocolAdapter {
  readonly id = AAVE_BASE_CONFIG.protocolId;
  readonly protocolName = AAVE_BASE_CONFIG.protocolName;
  readonly chain = AAVE_BASE_CONFIG.chain;

  private readonly rpcUrl: string | undefined;
  private readonly mode: AdapterMode;
  private readonly injectedClient: AaveReadOnlyClient | undefined;
  private readonly now: () => Date;
  private readonly strictRpc: boolean;

  constructor(options: AaveBaseReadOnlyAdapterOptions = {}) {
    this.rpcUrl =
      options.rpcUrl ?? resolveAaveBaseRpcUrl(options.env ?? process.env);
    this.mode = this.rpcUrl === undefined ? "static-fallback" : "rpc-readonly";
    this.injectedClient = options.publicClient;
    this.now = options.now ?? (() => new Date());
    this.strictRpc = options.strictRpc ?? false;
  }

  getMode(): AdapterMode {
    return this.mode;
  }

  isStrictRpc(): boolean {
    return this.strictRpc;
  }

  private getPublicClient(): AaveReadOnlyClient | undefined {
    if (this.injectedClient !== undefined) {
      return this.injectedClient;
    }

    if (this.rpcUrl === undefined) {
      return undefined;
    }

    const client = createPublicClient({
      chain: base,
      transport: http(this.rpcUrl),
    }) satisfies Pick<PublicClient, "getBlockNumber" | "readContract">;

    return client as unknown as AaveReadOnlyClient;
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
        detail:
          "Static fallback mode: no RPC configured. Serving deterministic static Aave Base markets.",
        checkedAt,
      };
    }

    const client = this.getPublicClient();

    if (client === undefined) {
      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.mode,
        healthy: false,
        rpcChecked: false,
        detail: "RPC mode selected but no public client could be created.",
        checkedAt,
      };
    }

    try {
      const blockNumber = await client.getBlockNumber();

      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.mode,
        healthy: true,
        rpcChecked: true,
        blockNumber: blockNumber.toString(),
        detail:
          "RPC read-only health check succeeded (getBlockNumber). Reserves discovered on-chain; APY/TVL remain static placeholders.",
        checkedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        adapterId: this.id,
        chain: this.chain,
        mode: this.mode,
        healthy: false,
        rpcChecked: true,
        detail: `RPC read-only health check failed: ${message}`,
        checkedAt,
      };
    }
  }

  async discoverMarkets(): Promise<ReadOnlyMarketOpportunity[]> {
    const fetchedAt = this.now().toISOString();

    if (this.mode === "static-fallback") {
      return this.buildStaticMarkets("static-fallback", fetchedAt);
    }

    const client = this.getPublicClient();

    if (client === undefined) {
      if (this.strictRpc) {
        throw new AaveReserveDiscoveryError(
          "RPC mode selected but no public client could be created",
        );
      }
      return this.buildStaticMarkets("static-fallback", fetchedAt);
    }

    try {
      const reserves = await discoverAaveBaseReserves(client);

      if (reserves.length === 0) {
        // RPC succeeded but no supported reserves were found; keep dev working
        // by serving static markets while signalling RPC was verified.
        return this.buildStaticMarkets(
          "static-fallback-rpc-verified",
          fetchedAt,
        );
      }

      return reserves.map((reserve) =>
        this.buildMarketFromReserve(reserve, fetchedAt),
      );
    } catch (error) {
      if (this.strictRpc) {
        throw error instanceof AaveReserveDiscoveryError
          ? error
          : new AaveReserveDiscoveryError("reserve discovery failed", error);
      }

      // Non-strict: fall back to static markets. Use a health probe to signal
      // whether the RPC endpoint itself is reachable.
      const health = await this.getHealth();
      const source: ReadOnlyMarketSource =
        health.rpcChecked && health.healthy
          ? "static-fallback-rpc-verified"
          : "static-fallback";

      return this.buildStaticMarkets(source, fetchedAt);
    }
  }

  private buildMarketFromReserve(
    reserve: DiscoveredReserve,
    fetchedAt: string,
  ): ReadOnlyMarketOpportunity {
    const { staticApy, staticTvlUsd } = getStaticApyTvlForAsset(reserve.symbol);

    return {
      id: buildAaveMarketId(reserve.symbol),
      protocolId: AAVE_BASE_CONFIG.protocolId,
      protocolName: AAVE_BASE_CONFIG.protocolName,
      chain: AAVE_BASE_CONFIG.chain,
      asset: reserve.symbol,
      apy: staticApy,
      tvlUsd: staticTvlUsd,
      exposureCategory: "lending",
      source: "rpc-reserve-discovery",
      fetchedAt,
      metadata: {
        reserveDiscovery: "on-chain",
        apyTvlSource: "static-placeholder",
        reserveAddress: reserve.address,
        decimals: reserve.decimals,
        note: "Reserve discovered on-chain (Sprint 18); APY/TVL are static placeholders.",
      },
    };
  }

  private buildStaticMarkets(
    source: ReadOnlyMarketSource,
    fetchedAt: string,
  ): ReadOnlyMarketOpportunity[] {
    return AAVE_BASE_STATIC_MARKETS.map((market) => ({
      id: market.id,
      protocolId: AAVE_BASE_CONFIG.protocolId,
      protocolName: AAVE_BASE_CONFIG.protocolName,
      chain: AAVE_BASE_CONFIG.chain,
      asset: market.asset,
      apy: market.staticApy,
      tvlUsd: market.staticTvlUsd,
      exposureCategory: "lending" as const,
      source,
      fetchedAt,
      metadata: {
        reserveDiscovery: "static" as const,
        apyTvlSource: "static-placeholder" as const,
        reserveAddress: market.reserveAddress,
        note: "Static fallback market; APY/TVL and reserve are static placeholders.",
      },
    }));
  }
}

export { AaveReserveDiscoveryError } from "./aaveReserveDiscovery.js";
