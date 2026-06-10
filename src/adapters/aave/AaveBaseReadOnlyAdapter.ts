import { createPublicClient, http, type Address, type PublicClient } from "viem";
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
  readAaveReserveSupplyApr,
  readAaveReserveTvl,
  type AaveReadOnlyClient,
  type DiscoveredReserve,
} from "./aaveReserveDiscovery.js";
import type {
  AdapterHealthStatus,
  AdapterMode,
  ProtocolAdapter,
  ReadOnlyMarketMetadata,
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
 *   discovery (Pool.getReservesList + ERC20 symbol/decimals) plus real supply
 *   APR (Pool.getReserveData currentLiquidityRate).
 *
 * NOTE: APY is the real Aave liquidityRate APR used as an APY approximation
 * (incentives excluded). TVL is derived from aToken.totalSupply() on-chain;
 * for stablecoins a 1-token ≈ 1 USD peg is assumed (no price feed).
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
          "RPC read-only health check succeeded (getBlockNumber). Reserves, supply APR, and TVL (aToken.totalSupply) discovered on-chain.",
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

      const markets: ReadOnlyMarketOpportunity[] = [];
      for (const reserve of reserves) {
        markets.push(
          await this.buildMarketFromReserve(client, reserve, fetchedAt),
        );
      }
      return markets;
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

  private async buildMarketFromReserve(
    client: AaveReadOnlyClient,
    reserve: DiscoveredReserve,
    fetchedAt: string,
  ): Promise<ReadOnlyMarketOpportunity> {
    const { staticApy, staticTvlUsd } = getStaticApyTvlForAsset(reserve.symbol);

    let apy = staticApy;
    let apySource: ReadOnlyMarketMetadata["apySource"] = "static-placeholder";
    let apyIsApproximation = false;
    let apyNote: string | undefined;
    let liquidityRateRay: string | undefined;
    let aTokenAddress: string | undefined;

    // ── APY (and aToken address) via getReserveData ────────────────────────
    try {
      const supply = await readAaveReserveSupplyApr(client, reserve.address);
      apy = supply.supplyApr;
      apySource = "aave-liquidity-rate";
      apyIsApproximation = true;
      apyNote =
        "Aave liquidityRate APR used as APY approximation; incentives not included.";
      liquidityRateRay = supply.liquidityRateRay.toString();
      aTokenAddress = supply.aTokenAddress;
    } catch (error) {
      if (this.strictRpc) {
        throw error instanceof AaveReserveDiscoveryError
          ? error
          : new AaveReserveDiscoveryError(
              `supply APR read failed for ${reserve.symbol}`,
              error,
            );
      }
      apyNote =
        "On-chain supply APR read failed; using static placeholder APY (non-strict fallback).";
    }

    // ── TVL via aToken.totalSupply() ──────────────────────────────────────
    let tvlUsd = staticTvlUsd;
    let tvlSource: ReadOnlyMarketMetadata["tvlSource"] = "static-placeholder";
    let tvlNote: string | undefined;

    if (aTokenAddress !== undefined) {
      try {
        const tvlData = await readAaveReserveTvl(
          client,
          aTokenAddress as Address,
          reserve.decimals,
        );
        tvlUsd = tvlData.tvlUsd;
        tvlSource = "aave-atoken-supply";
        tvlNote =
          `aToken.totalSupply() on-chain; 1 ${reserve.symbol} ≈ 1 USD (stablecoin peg assumed, no price feed).`;
      } catch (error) {
        if (this.strictRpc) {
          throw error instanceof AaveReserveDiscoveryError
            ? error
            : new AaveReserveDiscoveryError(
                `TVL read failed for ${reserve.symbol}`,
                error,
              );
        }
        tvlNote =
          "On-chain TVL read failed; using static placeholder (non-strict fallback).";
      }
    }

    const metadata: ReadOnlyMarketMetadata = {
      reserveDiscovery: "on-chain",
      reserveAddress: reserve.address,
      decimals: reserve.decimals,
      apySource,
      apyIsApproximation,
      tvlSource,
      note: "Reserve, APY, and TVL discovered on-chain.",
      ...(apyNote !== undefined ? { apyNote } : {}),
      ...(tvlNote !== undefined ? { tvlNote } : {}),
      ...(liquidityRateRay !== undefined ? { liquidityRateRay } : {}),
    };

    return {
      id: buildAaveMarketId(reserve.symbol),
      protocolId: AAVE_BASE_CONFIG.protocolId,
      protocolName: AAVE_BASE_CONFIG.protocolName,
      chain: AAVE_BASE_CONFIG.chain,
      asset: reserve.symbol,
      apy,
      tvlUsd,
      exposureCategory: "lending",
      source: "rpc-reserve-discovery",
      fetchedAt,
      metadata,
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
        reserveAddress: market.reserveAddress,
        apySource: "static-placeholder" as const,
        apyIsApproximation: false,
        apyNote: "APY is a static placeholder.",
        tvlSource: "static-placeholder" as const,
        note: "Static fallback market; APY/TVL and reserve are static placeholders.",
      },
    }));
  }
}

export { AaveReserveDiscoveryError } from "./aaveReserveDiscovery.js";
