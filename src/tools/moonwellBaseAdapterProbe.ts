import "dotenv/config";
import { MoonwellBaseReadOnlyAdapter } from "../adapters/moonwell/MoonwellBaseReadOnlyAdapter.js";
import { mapMoonwellMarketToOpportunity } from "../adapters/moonwell/mapMoonwellMarketToOpportunity.js";
import { resolveMoonwellBaseApiUrl } from "../adapters/moonwell/moonwellBaseConfig.js";

async function main(): Promise<void> {
  const apiUrl = resolveMoonwellBaseApiUrl();
  const adapter = new MoonwellBaseReadOnlyAdapter();

  console.log("Moonwell Base Read-Only Adapter Probe");
  console.log("=====================================");
  console.log(`Mode: ${adapter.getMode()}`);
  console.log(`API configured: ${apiUrl !== undefined ? "yes" : "no"}`);
  console.log(`API URL: ${apiUrl ?? "(none — set MOONWELL_BASE_API_URL)"}`);
  console.log(`Strict API: ${adapter.isStrictApi() ? "yes" : "no"}`);
  console.log("");

  const health = await adapter.getHealth();
  console.log("Health:");
  console.log(JSON.stringify(health, null, 2));
  console.log("");

  const markets = await adapter.discoverMarkets();
  const discoverySource = markets[0]?.source ?? "static-fallback";
  console.log(`Discovery source: ${discoverySource}`);
  console.log(
    `Discovered market assets: ${markets.map((market) => market.asset).join(", ") || "(none)"}`,
  );
  console.log("");

  console.log(`Discovered markets (${markets.length.toString()}):`);
  for (const market of markets) {
    console.log(`  ${market.asset} (${market.id})`);
    console.log(
      `    marketAddress: ${market.metadata?.reserveAddress ?? "n/a"}`,
    );
    console.log(
      `    apy: ${market.apy.toString()} (${(market.apy * 100).toFixed(3)}%)`,
    );
    console.log(`    apySource: ${market.metadata?.apySource ?? "n/a"}`);
    console.log(
      `    tvlUsd: ${market.tvlUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
    );
    console.log(`    tvlSource: ${market.metadata?.tvlSource ?? "n/a"}`);
    console.log(`    note: ${market.metadata?.note ?? "n/a"}`);
  }
  console.log("");

  const opportunities = markets.map(mapMoonwellMarketToOpportunity);
  console.log(
    `Mapped Laminar opportunities (${opportunities.length.toString()}):`,
  );
  console.log(JSON.stringify(opportunities, null, 2));
  console.log("");

  const apyFromApi = markets.some(
    (market) => market.metadata?.apySource === "moonwell-api",
  );
  const tvlFromApi = markets.some(
    (market) => market.metadata?.tvlSource === "moonwell-api",
  );

  console.log("Notes:");
  if (adapter.getMode() === "static-fallback") {
    console.log(
      "⚠ Static fallback is for adapter diagnostics/tests only and is not used in real provider recommendations.",
    );
  }
  console.log(
    `- API used for health check: ${health.apiChecked ? "yes" : "no"}`,
  );
  console.log(
    `- APY from Moonwell API: ${apyFromApi ? "yes" : "no (static placeholder)"}`,
  );
  console.log(
    `- TVL from Moonwell API: ${tvlFromApi ? "yes" : "no (static placeholder)"}`,
  );
  console.log("- Trust/liquidity metadata is curated/static.");
  console.log("- V1 assets only (USDC/EURC/DAI).");
  console.log("- No transactions were created. Read-only adapter only.");
  console.log(
    "- API/frontend default provider remains MockLaminarDataProvider.",
  );
}

main().catch((error: unknown) => {
  console.error("Moonwell adapter probe failed:");
  console.error(error);
  process.exitCode = 1;
});
