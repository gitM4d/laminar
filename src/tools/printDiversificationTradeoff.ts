import type { DiversificationTradeoff } from "../core/diversification/buildDiversificationTradeoff.js";

function formatApyPercent(apyDecimal: number): string {
  return `${(apyDecimal * 100).toFixed(2)}%`;
}

export function printDiversificationTradeoff(
  tradeoff: DiversificationTradeoff | undefined,
): void {
  console.log("Diversification Tradeoff:");
  console.log("");

  if (tradeoff === undefined) {
    console.log("  (not available)");
    console.log("");
    return;
  }

  console.log("Current:");
  console.log(`  Level: ${tradeoff.current.diversificationLevel}`);
  console.log(
    `  Largest asset: ${tradeoff.current.largestAsset ?? "—"} (${tradeoff.current.largestAssetAllocationPercent.toFixed(0)}%)`,
  );
  console.log(
    `  Strategy APY: ${formatApyPercent(tradeoff.current.strategyApy)}`,
  );
  console.log("");

  if (!tradeoff.available || tradeoff.alternative === undefined) {
    console.log(`Note: ${tradeoff.reason ?? "No alternative available."}`);
    console.log("");
    return;
  }

  console.log("Alternative:");
  for (const allocation of tradeoff.alternative.assetAllocations) {
    console.log(`  ${allocation.asset} ${allocation.allocationPercent.toFixed(0)}%`);
  }
  console.log(
    `  Strategy APY: ${formatApyPercent(tradeoff.alternative.strategyApy)}`,
  );
  console.log(`  APY cost: -${tradeoff.alternative.apyCostPercent.toFixed(2)}%`);
  console.log("");
  console.log("Note:");
  console.log(
    "  Informational only. The main recommendation was not changed.",
  );
  console.log("");
}
