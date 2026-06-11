import "dotenv/config";
import { FluidBaseReadOnlyAdapter } from "../adapters/fluid/FluidBaseReadOnlyAdapter.js";
import { mapFluidMarketToOpportunity } from "../adapters/fluid/mapFluidMarketToOpportunity.js";
import { resolveFluidBaseApiUrl } from "../adapters/fluid/fluidBaseConfig.js";
import { isRealDataEligibleMarket } from "../adapters/realDataEligibility.js";

async function main(): Promise<void> {
  const apiUrl = resolveFluidBaseApiUrl();
  const adapter = new FluidBaseReadOnlyAdapter();

  console.log("Fluid Base Read-Only Adapter Probe");
  console.log("====================================");
  console.log(`Mode: ${adapter.getMode()}`);
  console.log(`API configured: ${apiUrl !== undefined ? "yes" : "no"}`);
  console.log(`API URL: ${apiUrl ?? "(none — set FLUID_BASE_API_URL or use default)"}`);
  console.log(`Strict API: ${adapter.isStrictApi() ? "yes" : "no"}`);
  console.log("");

  const health = await adapter.getHealth();
  console.log("Health:");
  console.log(JSON.stringify(health, null, 2));
  console.log("");

  const markets = await adapter.discoverMarkets();
  const realMarkets = markets.filter((market) => isRealDataEligibleMarket(market));
  const excludedCount = markets.length - realMarkets.length;

  console.log(`Discovered adapter markets: ${markets.length.toString()}`);
  console.log(`Real-data-eligible markets: ${realMarkets.length.toString()}`);
  if (excludedCount > 0) {
    console.log(
      `Excluded non-real markets: ${excludedCount.toString()} (static/dev placeholders or incomplete data)`,
    );
  }
  console.log("");

  if (adapter.getMode() === "unavailable") {
    console.log(
      "Fluid real data source is unavailable. Configure FLUID_BASE_API_URL or use the public default.",
    );
    console.log("");
  }

  if (adapter.getMode() === "static-dev-fallback") {
    console.log(
      "⚠ Static dev fallback is for adapter diagnostics/tests only and is not used in real provider recommendations.",
    );
    console.log("");
  }

  console.log(`Real markets (${realMarkets.length.toString()}):`);
  for (const market of realMarkets) {
    console.log(`  ${market.asset} (${market.id})`);
    console.log(
      `    fToken: ${market.metadata?.reserveAddress ?? "n/a"}`,
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

  const opportunities = realMarkets.map(mapFluidMarketToOpportunity);
  console.log(
    `Mapped Laminar opportunities (${opportunities.length.toString()}):`,
  );
  console.log(JSON.stringify(opportunities, null, 2));
  console.log("");

  console.log("Notes:");
  console.log("- Real source: Fluid/Instadapp official lending tokens API.");
  console.log("- V1 assets only (USDC / EURC / DAI). Non-V1 markets are skipped.");
  console.log("- No fake market data in real provider flows.");
  console.log("- Trust/liquidity metadata is curated/static.");
  console.log("- No transactions were created. Read-only adapter only.");
  console.log("- Default API/frontend provider remains MockLaminarDataProvider.");
}

main().catch((error: unknown) => {
  console.error("Fluid adapter probe failed:");
  console.error(error);
  process.exitCode = 1;
});
