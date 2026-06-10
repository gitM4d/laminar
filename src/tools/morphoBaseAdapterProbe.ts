import "dotenv/config";
import { MorphoBaseReadOnlyAdapter } from "../adapters/morpho/MorphoBaseReadOnlyAdapter.js";
import { mapMorphoMarketToOpportunity } from "../adapters/morpho/mapMorphoMarketToOpportunity.js";
import { resolveMorphoBaseApiUrl } from "../adapters/morpho/morphoBaseConfig.js";

async function main(): Promise<void> {
  const apiUrl = resolveMorphoBaseApiUrl();
  const adapter = new MorphoBaseReadOnlyAdapter();

  console.log("Morpho Base Read-Only Adapter Probe");
  console.log("===================================");
  console.log(`Mode: ${adapter.getMode()}`);
  console.log(`API configured: ${apiUrl !== undefined ? "yes" : "no"}`);
  console.log(`API URL: ${apiUrl ?? "(none)"}`);
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
    console.log(`    vaultAddress: ${market.metadata?.reserveAddress ?? "n/a"}`);
    console.log(
      `    apy: ${market.apy.toString()} (${(market.apy * 100).toFixed(3)}%)`,
    );
    console.log(`    apySource: ${market.metadata?.apySource ?? "n/a"}`);
    console.log(
      `    tvlUsd: ${market.tvlUsd.toString()} (tvlSource: ${market.metadata?.tvlSource ?? "n/a"})`,
    );
  }
  console.log("");

  const opportunities = markets.map(mapMorphoMarketToOpportunity);
  console.log(
    `Mapped Laminar opportunities (${opportunities.length.toString()}):`,
  );
  console.log(JSON.stringify(opportunities, null, 2));
  console.log("");

  const apyFromApi = markets.some(
    (market) => market.metadata?.apySource === "morpho-api",
  );
  const tvlFromApi = markets.some(
    (market) => market.metadata?.tvlSource === "morpho-api",
  );

  console.log("Notes:");
  console.log(`- API used for health check: ${health.apiChecked ? "yes" : "no"}`);
  console.log(
    `- APY from Morpho API: ${apyFromApi ? "yes" : "no (static placeholder)"}`,
  );
  console.log(
    `- TVL from Morpho API: ${tvlFromApi ? "yes" : "no (static placeholder)"}`,
  );
  console.log("- Trust/liquidity metadata is curated/static.");
  console.log("- V1 assets only (USDC/EURC/DAI).");
  console.log("- No transactions were created. Read-only adapter only.");
  console.log("- API/frontend default provider remains MockLaminarDataProvider.");
}

main().catch((error: unknown) => {
  console.error("Morpho adapter probe failed:");
  console.error(error);
  process.exitCode = 1;
});
