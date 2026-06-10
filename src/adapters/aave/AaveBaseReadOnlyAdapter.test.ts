import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AaveBaseReadOnlyAdapter } from "./AaveBaseReadOnlyAdapter.js";
import { AAVE_BASE_STATIC_MARKETS } from "./aaveStaticMarkets.js";
import {
  AaveReserveDiscoveryError,
  type AaveReadOnlyClient,
} from "./aaveReserveDiscovery.js";

const fixedNow = () => new Date("2026-06-01T00:00:00.000Z");

const USDC = "0xUSDC000000000000000000000000000000000000" as `0x${string}`;
const EURC = "0xEURC000000000000000000000000000000000000" as `0x${string}`;
const WETH = "0xWETH000000000000000000000000000000000000" as `0x${string}`;

// Deterministic mock aToken addresses — must be distinct from the reserve addresses.
const A_USDC = "0xaUSDC00000000000000000000000000000000000" as `0x${string}`;
const A_EURC = "0xaEURC00000000000000000000000000000000000" as `0x${string}`;

// Deterministic mock TVL raw supplies: 100M USDC and 20M EURC (6 decimals each).
const MOCK_USDC_SUPPLY_RAW = 100_000_000n * 10n ** 6n;
const MOCK_EURC_SUPPLY_RAW = 20_000_000n * 10n ** 6n;

function buildDiscoveryClient(
  options: { failReserveData?: boolean; failTvl?: boolean } = {},
): AaveReadOnlyClient {
  const reserves: Record<
    string,
    {
      symbol: string;
      decimals: number;
      liquidityRateRay: bigint;
      aTokenAddress: `0x${string}`;
    }
  > = {
    [USDC]: {
      symbol: "USDC",
      decimals: 6,
      liquidityRateRay: 5n * 10n ** 25n,
      aTokenAddress: A_USDC,
    },
    [EURC]: {
      symbol: "EURC",
      decimals: 6,
      liquidityRateRay: 3n * 10n ** 25n,
      aTokenAddress: A_EURC,
    },
    [WETH]: {
      symbol: "WETH",
      decimals: 18,
      liquidityRateRay: 1n * 10n ** 25n,
      aTokenAddress: "0xaWETH00000000000000000000000000000000000",
    },
  };

  // Mock raw totalSupply values keyed by aToken address.
  const aTokenSupplies: Record<string, bigint> = {
    [A_USDC]: MOCK_USDC_SUPPLY_RAW,
    [A_EURC]: MOCK_EURC_SUPPLY_RAW,
  };

  return {
    getBlockNumber: async () => 100n,
    readContract: async (args) => {
      if (args.functionName === "getReservesList") {
        return [USDC, WETH, EURC];
      }
      if (args.functionName === "getReserveData") {
        if (options.failReserveData) {
          throw new Error("getReserveData failed");
        }
        const target = (args.args?.[0] ?? "") as string;
        const reserve = reserves[target];
        if (reserve === undefined) {
          throw new Error("unknown reserve data");
        }
        return {
          currentLiquidityRate: reserve.liquidityRateRay,
          aTokenAddress: reserve.aTokenAddress,
        };
      }
      if (args.functionName === "totalSupply") {
        if (options.failTvl) {
          throw new Error("totalSupply failed");
        }
        const supply = aTokenSupplies[args.address];
        if (supply !== undefined) {
          return supply;
        }
        // Unknown aToken — return 0 rather than throwing to keep tests simple.
        return 0n;
      }
      const reserve = reserves[args.address];
      if (reserve === undefined) {
        throw new Error("unknown reserve");
      }
      return args.functionName === "symbol" ? reserve.symbol : reserve.decimals;
    },
  };
}

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
        readContract: async () => {
          throw new Error("reserve discovery unavailable");
        },
      },
      now: fixedNow,
    });

    const health = await adapter.getHealth();

    expect(health.mode).toBe("rpc-readonly");
    expect(health.healthy).toBe(true);
    expect(health.rpcChecked).toBe(true);
    expect(health.blockNumber).toBe("12345678");

    // Reserve discovery fails here, but RPC is reachable → static fallback
    // flagged as rpc-verified.
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
        readContract: async () => {
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

  it("discovers reserves on-chain in rpc mode and filters to supported assets", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: buildDiscoveryClient(),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets.map((market) => market.id)).toEqual([
      "aave-usdc-base",
      "aave-eurc-base",
    ]);
    for (const market of markets) {
      expect(market.source).toBe("rpc-reserve-discovery");
      expect(market.metadata?.reserveDiscovery).toBe("on-chain");
      expect(market.apy).toBeGreaterThan(0);
      expect(market.tvlUsd).toBeGreaterThan(0);
    }
    expect(markets[0]?.metadata?.reserveAddress).toBe(USDC);
    expect(markets[0]?.metadata?.decimals).toBe(6);
  });

  it("uses real Aave liquidityRate APY for RPC-discovered markets", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: buildDiscoveryClient(),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();
    const usdc = markets.find((market) => market.asset === "USDC");
    const eurc = markets.find((market) => market.asset === "EURC");

    // 5e25 ray → 0.05; 3e25 ray → 0.03
    expect(usdc?.apy).toBe(0.05);
    expect(eurc?.apy).toBe(0.03);

    expect(usdc?.metadata?.apySource).toBe("aave-liquidity-rate");
    expect(usdc?.metadata?.apyIsApproximation).toBe(true);
    expect(usdc?.metadata?.apyNote).toContain("incentives not included");
    expect(usdc?.metadata?.liquidityRateRay).toBe((5n * 10n ** 25n).toString());
  });

  it("reports aave-atoken-supply TVL source when RPC succeeds (Sprint 24)", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: buildDiscoveryClient(),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();
    for (const market of markets) {
      expect(market.metadata?.tvlSource).toBe("aave-atoken-supply");
      expect(market.tvlUsd).toBeGreaterThan(0);
    }
  });

  it("strictRpc throws when reserve data read fails", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      strictRpc: true,
      publicClient: buildDiscoveryClient({ failReserveData: true }),
      now: fixedNow,
    });

    await expect(adapter.discoverMarkets()).rejects.toBeInstanceOf(
      AaveReserveDiscoveryError,
    );
  });

  it("non-strict per-market fallback uses static APY and TVL when reserve data fails", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: buildDiscoveryClient({ failReserveData: true }),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();
    const usdc = markets.find((market) => market.asset === "USDC");

    // Reserve still discovered on-chain, but APY and TVL fall back to static.
    expect(usdc?.source).toBe("rpc-reserve-discovery");
    expect(usdc?.metadata?.reserveDiscovery).toBe("on-chain");
    expect(usdc?.metadata?.apySource).toBe("static-placeholder");
    expect(usdc?.metadata?.apyNote).toContain("non-strict fallback");
    expect(usdc?.apy).toBeGreaterThan(0);
    // No aTokenAddress available → TVL is also static.
    expect(usdc?.metadata?.tvlSource).toBe("static-placeholder");
    expect(usdc?.tvlUsd).toBeGreaterThan(0);
  });

  it("strictRpc throws when reserve discovery fails", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      strictRpc: true,
      publicClient: {
        getBlockNumber: async () => 1n,
        readContract: async () => {
          throw new Error("rpc reserve call failed");
        },
      },
      now: fixedNow,
    });

    expect(adapter.isStrictRpc()).toBe(true);
    await expect(adapter.discoverMarkets()).rejects.toBeInstanceOf(
      AaveReserveDiscoveryError,
    );
  });

  it("non-strict RPC failure falls back to static markets", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: {
        getBlockNumber: async () => 1n,
        readContract: async () => {
          throw new Error("rpc reserve call failed");
        },
      },
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets).toHaveLength(AAVE_BASE_STATIC_MARKETS.length);
    // RPC endpoint itself is reachable (getBlockNumber succeeds), so the
    // fallback is flagged as rpc-verified.
    expect(markets[0]?.source).toBe("static-fallback-rpc-verified");
    expect(markets[0]?.metadata?.reserveDiscovery).toBe("static");
  });

  it("reads real TVL from aToken.totalSupply() in rpc mode", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: buildDiscoveryClient(),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();
    const usdc = markets.find((market) => market.asset === "USDC");
    const eurc = markets.find((market) => market.asset === "EURC");

    expect(usdc?.metadata?.tvlSource).toBe("aave-atoken-supply");
    expect(usdc?.tvlUsd).toBe(100_000_000);
    expect(usdc?.metadata?.tvlNote).toContain("stablecoin peg assumed");

    expect(eurc?.metadata?.tvlSource).toBe("aave-atoken-supply");
    expect(eurc?.tvlUsd).toBe(20_000_000);
  });

  it("TVL falls back to static when totalSupply fails (non-strict)", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      publicClient: buildDiscoveryClient({ failTvl: true }),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();
    const usdc = markets.find((market) => market.asset === "USDC");

    // APY is still real (getReserveData succeeded); only TVL fell back.
    expect(usdc?.metadata?.apySource).toBe("aave-liquidity-rate");
    expect(usdc?.metadata?.tvlSource).toBe("static-placeholder");
    expect(usdc?.tvlUsd).toBeGreaterThan(0);
  });

  it("strictRpc throws when totalSupply fails", async () => {
    const adapter = new AaveBaseReadOnlyAdapter({
      rpcUrl: "https://example.invalid/rpc",
      strictRpc: true,
      publicClient: buildDiscoveryClient({ failTvl: true }),
      now: fixedNow,
    });

    await expect(adapter.discoverMarkets()).rejects.toBeInstanceOf(
      AaveReserveDiscoveryError,
    );
  });

  it("does not introduce wallet/private key/signing imports in adapter sources", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sources = [
      "AaveBaseReadOnlyAdapter.ts",
      "aaveReserveDiscovery.ts",
      "aaveAbi.ts",
      "aaveMath.ts",
      "mapAaveMarketToOpportunity.ts",
    ].map((file) => readFileSync(join(here, file), "utf8"));

    const forbidden = [
      "walletClient",
      "createWalletClient",
      "privateKeyToAccount",
      "PrivateKey",
      "signTransaction",
      "sendTransaction",
      "writeContract",
    ];

    for (const source of sources) {
      for (const term of forbidden) {
        expect(source).not.toContain(term);
      }
    }
  });
});
