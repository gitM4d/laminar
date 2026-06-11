import "dotenv/config";
import {
  formatAllDifferenceSummaries,
  formatProviderComparisonTable,
  formatProviderDataQualityTable,
  runProviderComparisonMatrix,
} from "./providerComparisonMatrix.js";

async function main(): Promise<void> {
  const jsonMode = process.argv.includes("--json");
  const matrix = await runProviderComparisonMatrix();

  if (jsonMode) {
    console.log(JSON.stringify(matrix, null, 2));
    return;
  }

  console.log("Laminar Provider Comparison Matrix");
  console.log(`asOf: ${matrix.asOf}`);
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
  console.log(formatAllDifferenceSummaries(matrix.differences));
  console.log("");
  console.log("Notes:");
  console.log("- MockLaminarDataProvider is the default product mode.");
  console.log("- Aave, Morpho, Fluid, and Combined providers are experimental.");
  console.log(
    "- Aave APY/TVL are real on-chain when RPC is configured (TVL uses stablecoin peg).",
  );
  console.log(
    "- Morpho APY/TVL are real when the Morpho API is reachable; static fallback otherwise.",
  );
  console.log(
    "- Fluid APY/TVL are real when the Fluid/Instadapp API is reachable; zero opportunities otherwise (no static fallback in real flows).",
  );
  console.log(
    "- Combined V2 merges real-data-eligible providers only (Aave + Morpho + optional Moonwell/Fluid).",
  );
  console.log(
    "- Moonwell is included only when MOONWELL_BASE_API_URL returns real market data.",
  );
  console.log(
    "- Fluid is included only when the Fluid/Instadapp API returns real V1 markets.",
  );
  console.log(
    "- Static Moonwell/Fluid fallback is diagnostics/tests only and never counted as real provider data.",
  );
}

main().catch((error: unknown) => {
  console.error("Provider comparison matrix failed:");
  console.error(error);
  process.exitCode = 1;
});
