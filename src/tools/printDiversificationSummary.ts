import type { PortfolioConcentrationAnalysis } from "../core/diversification/analyzePortfolioConcentration.js";

export function printDiversificationSummary(
  analysis: PortfolioConcentrationAnalysis,
): void {
  console.log("Diversification Summary:");
  console.log("");
  console.log(`Unique assets: ${analysis.uniqueAssets.toString()}`);
  console.log(`Unique protocols: ${analysis.uniqueProtocols.toString()}`);
  console.log("");
  console.log("Largest asset:");

  if (analysis.largestAsset === null) {
    console.log("  —");
  } else {
    console.log(
      `  ${analysis.largestAsset} (${analysis.largestAssetAllocationPercent.toFixed(0)}%)`,
    );
  }

  console.log("");
  console.log("Largest protocol:");

  if (analysis.largestProtocol === null) {
    console.log("  —");
  } else {
    console.log(
      `  ${analysis.largestProtocol} (${analysis.largestProtocolAllocationPercent.toFixed(0)}%)`,
    );
  }

  console.log("");
  console.log("Diversification level:");
  console.log(`  ${analysis.diversificationLevel}`);
  console.log("");

  if (analysis.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of analysis.warnings) {
      console.log(`  - ${warning}`);
    }
    console.log("");
  }
}
