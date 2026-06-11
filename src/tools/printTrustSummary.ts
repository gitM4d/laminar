import type { ProtocolTrustExplanation } from "../core/trust/buildTrustExplanation.js";
import type { ProtocolTrustTvlSource } from "../core/trust/types.js";

function formatAuditTier(tier: string, count: number): string {
  return count === 0 ? "none (0)" : `${tier} (${count.toString()})`;
}

export function formatTrustTvlUsd(tvlUsd: number): string {
  if (tvlUsd >= 1_000_000_000) {
    const billions = tvlUsd / 1_000_000_000;
    return billions >= 10
      ? `$${Math.round(billions)}B`
      : `$${billions.toFixed(1)}B`;
  }

  if (tvlUsd >= 1_000_000) {
    return `$${Math.round(tvlUsd / 1_000_000)}M`;
  }

  if (tvlUsd >= 1_000) {
    return `$${Math.round(tvlUsd / 1_000)}K`;
  }

  return `$${Math.round(tvlUsd)}`;
}

export function formatTrustTvlSource(source: ProtocolTrustTvlSource): string {
  return source === "real-provider-markets"
    ? "real provider markets"
    : "curated fallback";
}

export function printTrustSummary(
  trustExplanations: readonly ProtocolTrustExplanation[],
): void {
  console.log("Trust Summary:");
  for (const explanation of trustExplanations) {
    const details = explanation.trustExplanation;
    console.log(`${explanation.protocolName}`);
    console.log(`  score: ${explanation.trustScore.toFixed(2)}`);
    console.log(`  age: ${details.protocolAgeYears.toFixed(1)} years`);
    console.log(
      `  audits: ${formatAuditTier(details.auditTier, details.auditCount)}`,
    );
    console.log(`  incidents: ${details.historicalIncidents.toString()}`);
    console.log(`  tvl: ${formatTrustTvlUsd(details.tvlUsd)}`);
    if (details.tvlSource !== undefined) {
      console.log(`  tvl source: ${formatTrustTvlSource(details.tvlSource)}`);
    }
  }
  console.log("");
}
