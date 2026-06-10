import "dotenv/config";
import {
  formatDifferenceSummary,
  formatProviderComparisonTable,
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
  console.log(formatDifferenceSummary(matrix.differences));
  console.log("");
  console.log("Notes:");
  console.log("- MockLaminarDataProvider is the default product mode.");
  console.log("- AaveBaseLaminarDataProvider is experimental.");
  console.log("- Aave APY is real when RPC is configured.");
  console.log("- Aave TVL remains a static placeholder.");
  console.log("- Trust/liquidity profiles remain curated.");
}

main().catch((error: unknown) => {
  console.error("Provider comparison matrix failed:");
  console.error(error);
  process.exitCode = 1;
});
