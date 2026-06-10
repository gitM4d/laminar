import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MorphoBaseReadOnlyAdapter } from "./MorphoBaseReadOnlyAdapter.js";
import { MORPHO_BASE_STATIC_MARKETS } from "./morphoStaticMarkets.js";
import {
  MorphoDiscoveryError,
  type MorphoApiClient,
  type MorphoApiVaultsResponse,
} from "./morphoTypes.js";

const fixedNow = () => new Date("2026-06-01T00:00:00.000Z");

/** Deterministic mock Morpho API client — no live network calls. */
function buildApiClient(
  response: MorphoApiVaultsResponse,
): MorphoApiClient {
  return {
    query: async <T>() => response as T,
  };
}

function buildFailingClient(message = "network down"): MorphoApiClient {
  return {
    query: async () => {
      throw new Error(message);
    },
  };
}

const sampleVaultsResponse: MorphoApiVaultsResponse = {
  vaults: {
    items: [
      {
        address: "0xUSDCVAULT",
        name: "Morpho USDC Vault",
        symbol: "mwUSDC",
        asset: { symbol: "USDC", decimals: 6, address: "0xusdc" },
        state: { netApy: 0.0612, apy: 0.06, totalAssetsUsd: 95_000_000 },
      },
      {
        // A second, smaller USDC vault — should be ignored (lower TVL).
        address: "0xUSDCVAULT2",
        name: "Morpho USDC Vault 2",
        symbol: "mwUSDC2",
        asset: { symbol: "USDC", decimals: 6, address: "0xusdc" },
        state: { netApy: 0.07, apy: 0.07, totalAssetsUsd: 1_000_000 },
      },
      {
        address: "0xEURCVAULT",
        name: "Morpho EURC Vault",
        symbol: "mwEURC",
        asset: { symbol: "EURC", decimals: 6, address: "0xeurc" },
        state: { netApy: 0.0421, apy: 0.041, totalAssetsUsd: 12_000_000 },
      },
      {
        // Non-V1 asset — must be filtered out.
        address: "0xWETHVAULT",
        name: "Morpho WETH Vault",
        symbol: "mwWETH",
        asset: { symbol: "WETH", decimals: 18, address: "0xweth" },
        state: { netApy: 0.02, apy: 0.02, totalAssetsUsd: 500_000_000 },
      },
    ],
  },
};

describe("MorphoBaseReadOnlyAdapter", () => {
  it("uses static-fallback mode when the API is disabled", () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      disableApi: true,
      now: fixedNow,
    });

    expect(adapter.getMode()).toBe("static-fallback");
    expect(adapter.id).toBe("morpho");
    expect(adapter.chain).toBe("Base");
  });

  it("uses static-fallback mode when MORPHO_BASE_API_URL is empty", () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      env: { MORPHO_BASE_API_URL: "" },
      now: fixedNow,
    });

    expect(adapter.getMode()).toBe("static-fallback");
    expect(adapter.isApiConfigured()).toBe(false);
  });

  it("selects api-readonly mode by default (public API)", () => {
    const adapter = new MorphoBaseReadOnlyAdapter({ env: {}, now: fixedNow });

    expect(adapter.getMode()).toBe("api-readonly");
    expect(adapter.isApiConfigured()).toBe(true);
  });

  it("getHealth() reports healthy static fallback without API", async () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      disableApi: true,
      now: fixedNow,
    });
    const health = await adapter.getHealth();

    expect(health.mode).toBe("static-fallback");
    expect(health.healthy).toBe(true);
    expect(health.apiChecked).toBe(false);
    expect(health.adapterId).toBe("morpho");
  });

  it("static fallback returns deterministic Morpho markets", async () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      disableApi: true,
      now: fixedNow,
    });
    const markets = await adapter.discoverMarkets();

    expect(markets).toHaveLength(MORPHO_BASE_STATIC_MARKETS.length);
    expect(markets.map((market) => market.id)).toEqual([
      "morpho-usdc-base",
      "morpho-eurc-base",
      "morpho-dai-base",
    ]);
    for (const market of markets) {
      expect(market.protocolId).toBe("morpho");
      expect(market.chain).toBe("Base");
      expect(market.exposureCategory).toBe("lending");
      expect(market.source).toBe("static-fallback");
      expect(market.apy).toBeGreaterThan(0);
      expect(market.tvlUsd).toBeGreaterThan(0);
      expect(market.metadata?.apySource).toBe("static-placeholder");
      expect(market.metadata?.tvlSource).toBe("static-placeholder");
    }
  });

  it("discovers markets from the API and picks the deepest vault per asset", async () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/graphql",
      client: buildApiClient(sampleVaultsResponse),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets.map((market) => market.id)).toEqual([
      "morpho-usdc-base",
      "morpho-eurc-base",
    ]);

    const usdc = markets.find((market) => market.asset === "USDC");
    expect(usdc?.source).toBe("morpho-api");
    expect(usdc?.apy).toBe(0.0612);
    expect(usdc?.tvlUsd).toBe(95_000_000);
    expect(usdc?.metadata?.apySource).toBe("morpho-api");
    expect(usdc?.metadata?.tvlSource).toBe("morpho-api");
    expect(usdc?.metadata?.reserveDiscovery).toBe("api");
    expect(usdc?.metadata?.reserveAddress).toBe("0xUSDCVAULT");

    // WETH is filtered out (not a V1 asset).
    expect(markets.some((market) => market.asset === ("WETH" as never))).toBe(
      false,
    );
  });

  it("api health check succeeds with an injected client", async () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/graphql",
      client: buildApiClient(sampleVaultsResponse),
      now: fixedNow,
    });

    const health = await adapter.getHealth();

    expect(health.mode).toBe("api-readonly");
    expect(health.healthy).toBe(true);
    expect(health.apiChecked).toBe(true);
  });

  it("falls back to static markets when the API fails (non-strict)", async () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/graphql",
      client: buildFailingClient(),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets).toHaveLength(MORPHO_BASE_STATIC_MARKETS.length);
    expect(markets[0]?.source).toBe("static-fallback");
    expect(markets[0]?.metadata?.reserveDiscovery).toBe("static");
  });

  it("falls back when the API returns an unexpected shape (non-strict)", async () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/graphql",
      client: buildApiClient({ vaults: { items: null } }),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets[0]?.source).toBe("static-fallback");
  });

  it("falls back when the API returns no supported markets (non-strict)", async () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/graphql",
      client: buildApiClient({
        vaults: {
          items: [
            {
              address: "0xWETHVAULT",
              asset: { symbol: "WETH", decimals: 18 },
              state: { netApy: 0.02, totalAssetsUsd: 1_000_000 },
            },
          ],
        },
      }),
      now: fixedNow,
    });

    const markets = await adapter.discoverMarkets();

    expect(markets[0]?.source).toBe("static-fallback");
  });

  it("strictApi throws when the API fails", async () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/graphql",
      strictApi: true,
      client: buildFailingClient(),
      now: fixedNow,
    });

    expect(adapter.isStrictApi()).toBe(true);
    await expect(adapter.discoverMarkets()).rejects.toBeInstanceOf(
      MorphoDiscoveryError,
    );
  });

  it("strictApi throws when the API returns no supported markets", async () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
      apiUrl: "https://api.invalid/graphql",
      strictApi: true,
      client: buildApiClient({ vaults: { items: [] } }),
      now: fixedNow,
    });

    await expect(adapter.discoverMarkets()).rejects.toBeInstanceOf(
      MorphoDiscoveryError,
    );
  });

  it("does not require a wallet, signer, or private key", () => {
    const adapter = new MorphoBaseReadOnlyAdapter({
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
      "MorphoBaseReadOnlyAdapter.ts",
      "morphoBaseConfig.ts",
      "morphoTypes.ts",
      "morphoStaticMarkets.ts",
      "mapMorphoMarketToOpportunity.ts",
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
