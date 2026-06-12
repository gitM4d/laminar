import "dotenv/config";
import { createLaminarRecommendation } from "../core/index.js";
import { createCombinedRealProvider } from "../core/providers/createCombinedRealProvider.js";
import type { Opportunity } from "../core/opportunity/types.js";
import { printRejectedOpportunities } from "./printRejectedOpportunities.js";
import { printTrustSummary } from "./printTrustSummary.js";
import { printLiquiditySummary } from "./printLiquiditySummary.js";
import { printDiversificationSummary } from "./printDiversificationSummary.js";
import { printDiversificationTradeoff } from "./printDiversificationTradeoff.js";

const DEFAULT_INTENT = { risk: 5, liquidity: 6, returnPreference: 5 };
const DEFAULT_PORTFOLIO_USD = 10_000;

/** Resolves the owning protocol name for an opportunity id (prefix-based). */
function protocolNameForOpportunity(
  opportunityId: string,
  opportunities: readonly Opportunity[],
): string {
  const match = opportunities.find((o) => o.id === opportunityId);
  return match?.protocolName ?? "Unknown";
}

function protocolLabelsFromOpportunities(
  opportunities: readonly Opportunity[],
): string[] {
  const labels: string[] = [];
  for (const opportunity of opportunities) {
    if (!labels.includes(opportunity.protocolName)) {
      labels.push(opportunity.protocolName);
    }
  }
  return labels;
}

async function main(): Promise<void> {
  console.log("Laminar — Combined V2 Real Provider Recommendation");
  console.log("==================================================");
  console.log(
    "Building provider snapshots (read-only: Aave + Morpho + Moonwell + Fluid)...",
  );
  console.log("");

  const combined = await createCombinedRealProvider({ env: process.env });
  const opportunities = combined.discoverOpportunities();
  const protocolLabels = protocolLabelsFromOpportunities(opportunities);

  if (
    process.env.MOONWELL_BASE_API_URL === undefined ||
    process.env.MOONWELL_BASE_API_URL.trim() === ""
  ) {
    console.log(
      "Moonwell: excluded (no real market data configured; set MOONWELL_BASE_API_URL)",
    );
    console.log("");
  }

  if (process.env.FLUID_BASE_API_URL === "") {
    console.log(
      "Fluid: excluded (no real market data configured; set FLUID_BASE_API_URL or use default API)",
    );
    console.log("");
  }

  const providerInfo = combined.getProviderInfo?.() ?? {
    providerType: "CombinedLaminarDataProvider",
    providerName: "Combined real provider",
  };
  console.log(`Provider: ${providerInfo.providerType}`);
  console.log(`Provider name: ${providerInfo.providerName}`);
  console.log(`Provider count: ${protocolLabels.length.toString()}`);
  console.log("");

  console.log("Opportunities per protocol:");
  let total = 0;
  for (const label of protocolLabels) {
    const count = opportunities.filter(
      (opportunity) => opportunity.protocolName === label,
    ).length;
    total += count;
    console.log(`  ${label}: ${count.toString()}`);
  }
  console.log(`  Total: ${total.toString()}`);
  console.log("");

  console.log(
    `Discovered opportunities (${opportunities.length.toString()}):`,
  );
  for (const opp of opportunities) {
    console.log(
      `  ${opp.id} — APY ${(opp.apy * 100).toFixed(3)}% (${opp.asset})`,
    );
  }
  console.log("");

  console.log(
    `Running recommendation (Balanced intent, $${DEFAULT_PORTFOLIO_USD.toString()})...`,
  );
  console.log("");

  const result = createLaminarRecommendation({
    intent: DEFAULT_INTENT,
    portfolioValueUsd: DEFAULT_PORTFOLIO_USD,
    dataProvider: combined,
  });

  const { recommendation, snapshot, executionPlan } = result;

  console.log("Recommendation summary:");
  console.log(`  Provider:           ${recommendation.diagnostics.providerType}`);
  console.log(`  Selected profile:   ${recommendation.selectedProfile}`);
  console.log(
    `  Opportunity count:  ${recommendation.diagnostics.opportunityCount.toString()}`,
  );
  console.log("");

  const strategyApyMetric = snapshot.metrics.find(
    (m) => m.key === "strategyExpectedApy",
  );
  const portfolioApyMetric = snapshot.metrics.find(
    (m) => m.key === "portfolioExpectedApy",
  );
  if (strategyApyMetric !== undefined) {
    console.log(
      `  Strategy APY:       ${(Number(strategyApyMetric.value) * 100).toFixed(3)}%`,
    );
  }
  if (portfolioApyMetric !== undefined) {
    console.log(
      `  Portfolio APY:      ${(Number(portfolioApyMetric.value) * 100).toFixed(3)}%`,
    );
  }
  console.log("");

  printTrustSummary(recommendation.trustExplanations);
  printLiquiditySummary(recommendation.liquidityDerivedSignals);
  printDiversificationSummary(recommendation.diagnostics.concentrationAnalysis);
  printDiversificationTradeoff(recommendation.diversificationTradeoff);
  printRejectedOpportunities(recommendation.rejectedOpportunityExplanations);

  // ── Ranked opportunities by protocol ───────────────────────────────────────
  console.log("Ranked opportunities by protocol:");
  for (const label of protocolLabels) {
    const rankedForProtocol = recommendation.opportunityRanking.ranked.filter(
      (ranked) =>
        protocolNameForOpportunity(ranked.opportunityId, opportunities) ===
        label,
    );
    console.log(`  ${label} (${rankedForProtocol.length.toString()}):`);
    for (const ranked of rankedForProtocol) {
      console.log(
        `    ${ranked.opportunityId} — score ${ranked.scoring.score.toFixed(4)}, APY ${(ranked.scoring.apyDecimal * 100).toFixed(3)}%`,
      );
    }
  }
  console.log("");

  // ── Portfolio positions by protocol ────────────────────────────────────────
  const strategyPositions = snapshot.positions.filter(
    (p) => p.type === "strategy",
  );
  console.log(
    `Portfolio positions by protocol (${strategyPositions.length.toString()} strategy of ${snapshot.positions.length.toString()} total):`,
  );
  for (const label of protocolLabels) {
    const positionsForProtocol = strategyPositions.filter(
      (p) => p.protocolName === label,
    );
    console.log(`  ${label} (${positionsForProtocol.length.toString()}):`);
    for (const position of positionsForProtocol) {
      console.log(
        `    ${position.label} (${position.asset}) — ${position.allocationPercent.toFixed(1)}% ($${position.allocationUsd.toFixed(2)})`,
      );
    }
  }
  console.log("");

  // ── Allocation by protocol ─────────────────────────────────────────────────
  console.log("Allocation by protocol:");
  for (const label of protocolLabels) {
    const allocation = strategyPositions
      .filter((p) => p.protocolName === label)
      .reduce((sum, p) => sum + p.allocationPercent, 0);
    console.log(`  ${label}: ${allocation.toFixed(1)}%`);
  }
  const liquidityBufferPercent = snapshot.positions
    .filter((p) => p.type === "liquidityBuffer")
    .reduce((sum, p) => sum + p.allocationPercent, 0);
  const gasReservePercent = snapshot.positions
    .filter((p) => p.type === "gasReserve")
    .reduce((sum, p) => sum + p.allocationPercent, 0);
  console.log(`  Liquidity Buffer: ${liquidityBufferPercent.toFixed(1)}%`);
  console.log(`  Gas Reserve: ${gasReservePercent.toFixed(1)}%`);
  console.log("");

  if (recommendation.diagnostics.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of recommendation.diagnostics.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
    console.log("");
  }

  console.log(
    `Execution plan steps: ${executionPlan.steps.length.toString()}`,
  );
  console.log("");

  console.log("Limitations:");
  console.log(
    "- Aave APY from liquidityRate APR approximation; incentives excluded.",
  );
  console.log(
    "- Morpho APY/TVL from Morpho public API when reachable; static otherwise.",
  );
  console.log(
    "- Moonwell is included only when MOONWELL_BASE_API_URL returns real market data.",
  );
  console.log(
    "- Fluid is included only when the Fluid/Instadapp API returns real V1 markets.",
  );
  console.log(
    "- Static Moonwell/Fluid fallback is diagnostics/tests only and never used here.",
  );
  console.log("- Trust/liquidity profiles are curated/static for all protocols.");
  console.log("- V1 assets only (USDC/EURC/DAI).");
  console.log("- No transactions created. Read-only adapters only.");
  console.log("- Default API/frontend provider is Combined real provider.");
}

main().catch((error: unknown) => {
  console.error("Combined recommendation probe failed:");
  console.error(error);
  process.exitCode = 1;
});
