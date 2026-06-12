import "dotenv/config";
import {
  formatLiquidityDataQualityTable,
  formatProviderComparisonTable,
  formatProviderDataQualityTable,
  formatRealProviderDifferenceSummaries,
  runRealProviderComparisonMatrix,
} from "./providerComparisonMatrix.js";

async function main(): Promise<void> {
  const jsonMode = process.argv.includes("--json");
  const matrix = await runRealProviderComparisonMatrix();

  if (jsonMode) {
    console.log(JSON.stringify(matrix, null, 2));
    return;
  }

  console.log("Laminar Real Provider Comparison Matrix");
  console.log(`asOf: ${matrix.asOf}`);
  console.log("");
  console.log(
    "Real providers only (Aave, Morpho, Fluid, Combined). Mock excluded.",
  );
  console.log("");

  for (const provider of matrix.providers) {
    const label =
      provider.dataSourceLabel !== undefined
        ? `${provider.providerName} (${provider.dataSourceLabel})`
        : provider.providerName;
    console.log(`Provider: ${provider.providerType} — ${label}`);
  }
  console.log("");

  console.log(
    formatProviderComparisonTable(
      matrix.results.map((entry) => entry.summary),
    ),
  );
  console.log("");
  console.log(formatProviderDataQualityTable(matrix.providerDataQuality));
  console.log("");
  console.log(formatLiquidityDataQualityTable(matrix.providerDataQuality));
  console.log("");

  if (!matrix.includeMock && "aaveVsCombined" in matrix.differences) {
    console.log(formatRealProviderDifferenceSummaries(matrix.differences));
    console.log("");
  }

  console.log("Notes:");
  console.log(
    "- Use compare:real-providers for product analysis against real data sources.",
  );
  console.log(
    "- MockLaminarDataProvider is a regression/dev fixture; see compare:providers for legacy all-provider output.",
  );
  console.log("- Aave, Morpho, Fluid, and Combined providers are experimental.");
  console.log(
    "- Aave APY/TVL are real on-chain when RPC is configured (TVL uses stablecoin peg).",
  );
  console.log(
    "- Morpho APY/TVL are real when the Morpho API is reachable; static fallback otherwise.",
  );
  console.log(
    "- Fluid APY/TVL are real when the Fluid/Instadapp API is reachable; zero opportunities otherwise.",
  );
  console.log(
    "- Combined merges real-data-eligible sub-providers only (Aave + Morpho + optional Moonwell/Fluid).",
  );
  console.log(
    "- Moonwell is included in Combined only when MOONWELL_BASE_API_URL returns real market data.",
  );
  console.log(
    "- Difference summaries show Combined minus each single-protocol provider.",
  );
}

main().catch((error: unknown) => {
  console.error("Real provider comparison matrix failed:");
  console.error(error);
  process.exitCode = 1;
});
