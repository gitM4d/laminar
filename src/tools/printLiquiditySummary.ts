import type { ProtocolLiquidityDerivedSignals } from "../core/liquidity/deriveLiquiditySignals.js";
import { formatTrustTvlUsd } from "./printTrustSummary.js";

export function printLiquiditySummary(
  signals: readonly ProtocolLiquidityDerivedSignals[],
): void {
  console.log("Liquidity Summary:");

  if (signals.length === 0) {
    console.log("  (no derived liquidity signals available)");
    console.log("");
    return;
  }

  for (const signal of signals) {
    console.log(`${signal.protocolName}:`);
    if (signal.tvlUsd !== null) {
      console.log(`  tvl: ${formatTrustTvlUsd(signal.tvlUsd)}`);
    } else {
      console.log("  tvl: unknown");
    }
    console.log(`  bucket: ${signal.tvlBucket}`);
    console.log(`  confidence: ${signal.liquidityConfidence}`);
  }

  console.log("");
}
