import { describe, expect, it } from "vitest";
import { AaveBaseReadOnlyAdapter } from "./AaveBaseReadOnlyAdapter.js";
import { AAVE_BASE_STATIC_MARKETS } from "./aaveStaticMarkets.js";

const fixedNow = () => new Date("2026-06-01T00:00:00.000Z");

describe("AaveBaseReadOnlyAdapter", () => {
  it("uses static-fallback mode without RPC", () => {
    const adapter = new AaveBaseReadOnlyAdapter({ env: {}, now: fixedNow });

    expect(adapter.getMode()).toBe("static-fallback");
    expect(adapter.id).toBe("aave");
    expect(adapter.chain).toBe("Base");
  });

  it("getHealth() works without RPC and reports healthy static fallback", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({ env: {}, now: fixedNow });
    const health = await adapter.getHealth();

    expect(health.mode).toBe("static-fallback");
    expect(health.healthy).toBe(true);
    expect(health.rpcChecked).toBe(false);
    expect(health.blockNumber).toBeUndefined();
    expect(health.adapterId).toBe("aave");
  });

  it("discoverMarkets() returns deterministic Aave markets without RPC", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({ env: {}, now: fixedNow });
    const markets = await adapter.discoverMarkets();

    expect(markets).toHaveLength(AAVE_BASE_STATIC_MARKETS.length);
    expect(markets.map((market) => market.id)).toEqual([
      "aave-usdc-base",
      "aave-eurc-base",
    ]);
    for (const market of markets) {
      expect(market.protocolId).toBe("aave");
      expect(market.chain).toBe("Base");
      expect(market.exposureCategory).toBe("lending");
      expect(market.source).toBe("static-fallback");
      expect(market.apy).toBeGreaterThan(0);
      expect(market.tvlUsd).toBeGreaterThan(0);
    }
  });

  it("does not require a wallet, signer, or private key", () => {
    const adapter = new AaveBaseReadOnlyAdapter({ env: {}, now: fixedNow });
    const surface = adapter as unknown as Record<string, unknown>;

    expect(surface.signer).toBeUndefined();
    expect(surface.account).toBeUndefined();
    expect(surface.privateKey).toBeUndefined();
    expect(surface.walletClient).toBeUndefined();
    expect("sendTransaction" in surface).toBe(false);
  });

  it("selects rpc-readonly mode when an RPC URL is configured", () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      env: { BASE_RPC_URL: "https://example.invalid/rpc" },
      now: fixedNow,
    });

    expect(adapter.getMode()).toBe("rpc-readonly");
  });

  it("performs a read-only block number check in rpc mode with injected client", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: {
        getBlockNumber: async () => 12_345_678n,
      },
      now: fixedNow,
    });

    const health = await adapter.getHealth();

    expect(health.mode).toBe("rpc-readonly");
    expect(health.healthy).toBe(true);
    expect(health.rpcChecked).toBe(true);
    expect(health.blockNumber).toBe("12345678");

    const markets = await adapter.discoverMarkets();
    expect(markets[0]?.source).toBe("static-fallback-rpc-verified");
  });

  it("reports unhealthy when the read-only RPC check fails", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: {
        getBlockNumber: async () => {
          throw new Error("connection refused");
        },
      },
      now: fixedNow,
    });

    const health = await adapter.getHealth();

    expect(health.healthy).toBe(false);
    expect(health.rpcChecked).toBe(true);
    expect(health.detail).toContain("connection refused");

    const markets = await adapter.discoverMarkets();
    expect(markets[0]?.source).toBe("static-fallback");
  });

  it("prefers AAVE_BASE_RPC_URL over BASE_RPC_URL", () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      env: {
        AAVE_BASE_RPC_URL: "https://aave.invalid/rpc",
        BASE_RPC_URL: "https://base.invalid/rpc",
      },
      now: fixedNow,
    });

    expect(adapter.getMode()).toBe("rpc-readonly");
  });
});
