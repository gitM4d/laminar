import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MoonwellBaseReadOnlyAdapter } from "./MoonwellBaseReadOnlyAdapter.js";
import { MOONWELL_BASE_STATIC_MARKETS } from "./moonwellStaticMarkets.js";
import {
  MoonwellDiscoveryError,
  type MoonwellApiClient,
  type MoonwellApiMarketsResponse,
} from "./moonwellTypes.js";

const fixedNow = () => new Date("2026-06-01T00:00:00.000Z");

/** Deterministic mock Moonwell API client — no live network calls. */
function buildApiClient(
  response: MoonwellApiMarketsResponse,
): MoonwellApiClient {
  return {
    getMarkets: async () => response,
  };
}

function buildFailingClient(message = "network down"): MoonwellApiClient {
  return {
    getMarkets: async () => {
      throw new Error(message);
    },
  };
}

const sampleMarketsResponse: MoonwellApiMarketsResponse = {
  markets: [
    {
      marketAddress: "0xUSDCMARKET",
      underlyingSymbol: "USDC",
      underlyingDecimals: 6,
      underlyingAddress: "0xusdc",
      supplyApy: 0.0512,
      totalSupplyUsd: 40_000_000,
    },
    {
      // A second, smaller USDC market — should be ignored (lower TVL).
      marketAddress: "0xUSDCMARKET2",
      underlyingSymbol: "USDC",
      underlyingDecimals: 6,
      underlyingAddress: "0xusdc",
      supplyApy: 0.07,
      totalSupplyUsd: 1_000_000,
    },
    {
      marketAddress: "0xDAIMARKET",
      underlyingSymbol: "DAI",
      underlyingDecimals: 18,
      underlyingAddress: "0xdai",
      supplyApy: 0.0431,
      totalSupplyUsd: 8_000_000,
    },
    {
      // Non-V1 asset — must be filtered out.
      marketAddress: "0xWETHMARKET",
      underlyingSymbol: "WETH",
      underlyingDecimals: 18,
      underlyingAddress: "0xweth",
      supplyApy: 0.02,
      totalSupplyUsd: 100_000_000,
    },
  ],
};

describe("MoonwellBaseReadOnlyAdapter", () => {
  it("uses static-fallback mode when the API is disabled", () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      disableApi: true,
      now: fixedNow,
    });

    expect(adapter.getMode()).toBe("static-fallback");
    expect(adapter.id).toBe("moonwell");
    expect(adapter.chain).toBe("Base");
  });

  it("uses static-fallback mode by default (no API URL configured)", () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({ env: {}, now: fixedNow });

    expect(adapter.getMode()).toBe("static-fallback");
    expect(adapter.isApiConfigured()).toBe(false);
  });

  it("uses static-fallback mode when MOONWELL_BASE_API_URL is empty", () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      env: { MOONWELL_BASE_API_URL: "" },
      now: fixedNow,
    });

    expect(adapter.getMode()).toBe("static-fallback");
    expect(adapter.isApiConfigured()).toBe(false);
  });

  it("selects api-readonly mode when MOONWELL_BASE_API_URL is set", () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      env: { MOONWELL_BASE_API_URL: "https://api.invalid/moonwell" },
      now: fixedNow,
    });

    expect(adapter.getMode()).toBe("api-readonly");
    expect(adapter.isApiConfigured()).toBe(true);
  });

  it("getHealth() reports healthy static fallback without API", async () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      disableApi: true,
      now: fixedNow,
    });
    const health = await adapter.getHealth();

    expect(health.mode).toBe("static-fallback");
    expect(health.healthy).toBe(true);
    expect(health.apiChecked).toBe(false);
    expect(health.adapterId).toBe("moonwell");
  });

  it("static fallback returns deterministic Moonwell markets", async () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      disableApi: true,
      now: fixedNow,
    });
    const markets = await adapter.discoverMarkets();

    expect(markets).toHaveLength(MOONWELL_BASE_STATIC_MARKETS.length);
    expect(markets.map((market) => market.id)).toEqual([
      "moonwell-usdc-base",
      "moonwell-eurc-base",
      "moonwell-dai-base",
    ]);
    for (const market of markets) {
      expect(market.protocolId).toBe("moonwell");
      expect(market.chain).toBe("Base");
      expect(market.exposureCategory).toBe("lending");
      expect(market.source).toBe("static-fallback");
      expect(market.apy).toBeGreaterThan(0);
      expect(market.tvlUsd).toBeGreaterThan(0);
      expect(market.metadata?.apySource).toBe("static-placeholder");
      expect(market.metadata?.tvlSource).toBe("static-placeholder");
    }
  });

  it("discovers markets from the API and picks the deepest market per asset", async () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/moonwell",
      client: buildApiClient(sampleMarketsResponse),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets.map((market) => market.id)).toEqual([
      "moonwell-usdc-base",
      "moonwell-dai-base",
    ]);

    const usdc = markets.find((market) => market.asset === "USDC");
    expect(usdc?.source).toBe("moonwell-api");
    expect(usdc?.apy).toBe(0.0512);
    expect(usdc?.tvlUsd).toBe(40_000_000);
    expect(usdc?.metadata?.apySource).toBe("moonwell-api");
    expect(usdc?.metadata?.tvlSource).toBe("moonwell-api");
    expect(usdc?.metadata?.reserveDiscovery).toBe("api");
    expect(usdc?.metadata?.reserveAddress).toBe("0xUSDCMARKET");

    // WETH is filtered out (not a V1 asset).
    expect(markets.some((market) => market.asset === ("WETH" as never))).toBe(
      false,
    );
  });

  it("api health check succeeds with an injected client", async () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/moonwell",
      client: buildApiClient(sampleMarketsResponse),
      now: fixedNow,
    });

    const health = await adapter.getHealth();

    expect(health.mode).toBe("api-readonly");
    expect(health.healthy).toBe(true);
    expect(health.apiChecked).toBe(true);
  });

  it("falls back to static markets when the API fails (non-strict)", async () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/moonwell",
      client: buildFailingClient(),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets).toHaveLength(MOONWELL_BASE_STATIC_MARKETS.length);
    expect(markets[0]?.source).toBe("static-fallback");
    expect(markets[0]?.metadata?.reserveDiscovery).toBe("static");
  });

  it("falls back when the API returns an unexpected shape (non-strict)", async () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/moonwell",
      client: buildApiClient({ markets: null }),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets[0]?.source).toBe("static-fallback");
  });

  it("falls back when the API returns no supported markets (non-strict)", async () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/moonwell",
      client: buildApiClient({
        markets: [
          {
            marketAddress: "0xWETHMARKET",
            underlyingSymbol: "WETH",
            underlyingDecimals: 18,
            supplyApy: 0.02,
            totalSupplyUsd: 1_000_000,
          },
        ],
      }),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets[0]?.source).toBe("static-fallback");
  });

  it("strictApi throws when the API fails", async () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/moonwell",
      strictApi: true,
      client: buildFailingClient(),
      now: fixedNow,
    });

    expect(adapter.isStrictApi()).toBe(true);
    await expect(adapter.discoverMarkets()).rejects.toBeInstanceOf(
      MoonwellDiscoveryError,
    );
  });

  it("strictApi throws when the API returns no supported markets", async () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/moonwell",
      strictApi: true,
      client: buildApiClient({ markets: [] }),
      now: fixedNow,
    });

    await expect(adapter.discoverMarkets()).rejects.toBeInstanceOf(
      MoonwellDiscoveryError,
    );
  });

  it("does not require a wallet, signer, or private key", () => {
    const adapter = new MoonwellBaseReadOnlyAdapter({
      disableApi: true,
      now: fixedNow,
    });
    const surface = adapter as unknown as Record<string, unknown>;

    expect(surface.signer).toBeUndefined();
    expect(surface.account).toBeUndefined();
    expect(surface.privateKey).toBeUndefined();
    expect(surface.walletClient).toBeUndefined();
    expect("sendTransaction" in surface).toBe(false);
  });

  it("does not introduce wallet/private key/signing imports in adapter sources", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const sources = [
      "MoonwellBaseReadOnlyAdapter.ts",
      "moonwellBaseConfig.ts",
      "moonwellTypes.ts",
      "moonwellStaticMarkets.ts",
      "mapMoonwellMarketToOpportunity.ts",
    ].map((file) => readFileSync(join(here, file), "utf8"));

    const forbidden = [
      "walletClient",
      "createWalletClient",
      "privateKeyToAccount",
      "PrivateKey",
      "signTransaction",
      "sendTransaction",
      "writeContract",
      "TransactionRequest",
    ];

    for (const source of sources) {
      for (const term of forbidden) {
        expect(source).not.toContain(term);
      }
    }
  });
});
