import { createPublicClient, http, type PublicClient } from "viem";
import { base } from "viem/chains";
import { AAVE_BASE_CONFIG, resolveAaveBaseRpcUrl } from "./aaveBaseConfig.js";
import { AAVE_BASE_STATIC_MARKETS } from "./aaveStaticMarkets.js";
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
  /** Inject a public client for testing (avoids real network calls). */
  publicClient?: Pick<PublicClient, "getBlockNumber">;
  /** Clock injection for deterministic timestamps in tests. */
  now?: () => Date;
};

/**
 * Read-only Aave V3 (Base) adapter spike.
 *
 * SAFETY: This adapter performs read-only calls only. It never builds
 * transactions, requests signatures, or requires a wallet/private key.
 *
 * Two modes:
 * - static-fallback: no RPC configured; deterministic static markets only.
 * - rpc-readonly: RPC configured; getHealth() performs a minimal read-only
 *   connectivity check (getBlockNumber). Market APY/TVL remain STATIC in
 *   Sprint 17 even when RPC health succeeds.
 */
export class AaveBaseReadOnlyAdapter implements ProtocolAdapter {
  readonly id = AAVE_BASE_CONFIG.protocolId;
  readonly protocolName = AAVE_BASE_CONFIG.protocolName;
  readonly chain = AAVE_BASE_CONFIG.chain;

  private readonly rpcUrl: string | undefined;
  private readonly mode: AdapterMode;
  private readonly injectedClient:
    | Pick<PublicClient, "getBlockNumber">
    | undefined;
  private readonly now: () => Date;

  constructor(options: AaveBaseReadOnlyAdapterOptions = {}) {
    this.rpcUrl =
      options.rpcUrl ?? resolveAaveBaseRpcUrl(options.env ?? process.env);
    this.mode = this.rpcUrl === undefined ? "static-fallback" : "rpc-readonly";
    this.injectedClient = options.publicClient;
    this.now = options.now ?? (() => new Date());
  }

  getMode(): AdapterMode {
    return this.mode;
  }

  private getPublicClient(): Pick<PublicClient, "getBlockNumber"> | undefined {
    if (this.injectedClient !== undefined) {
      return this.injectedClient;
    }

    if (this.rpcUrl === undefined) {
      return undefined;
    }

    return createPublicClient({
      chain: base,
      transport: http(this.rpcUrl),
    });
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
          "RPC read-only health check succeeded (getBlockNumber). Market APY/TVL remain static in Sprint 17.",
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

    let source: ReadOnlyMarketSource = "static-fallback";

    if (this.mode === "rpc-readonly") {
      const health = await this.getHealth();
      source =
        health.rpcChecked && health.healthy
          ? "static-fallback-rpc-verified"
          : "static-fallback";
    }

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
    }));
  }
}
