import "dotenv/config";
import { createLaminarRecommendation } from "../core/index.js";
import { createMorphoBaseLaminarDataProviderSnapshot } from "../core/providers/MorphoBaseLaminarDataProvider.js";
import { printRejectedOpportunities } from "./printRejectedOpportunities.js";
import { printTrustSummary } from "./printTrustSummary.js";
import { printLiquiditySummary } from "./printLiquiditySummary.js";
import { printDiversificationSummary } from "./printDiversificationSummary.js";
import { printDiversificationTradeoff } from "./printDiversificationTradeoff.js";
import { printExecutionPlanV2 } from "./printExecutionPlanV2.js";
import { printExecutionIntents } from "./printExecutionIntents.js";

const DEFAULT_INTENT = { risk: 5, liquidity: 6, returnPreference: 5 };
const DEFAULT_PORTFOLIO_USD = 10_000;

async function main(): Promise<void> {
  console.log("Laminar — Morpho Base Real Provider Recommendation");
  console.log("==================================================");
  console.log("Building Morpho Base provider snapshot (read-only)...");
  console.log("");

  const provider = await createMorphoBaseLaminarDataProviderSnapshot();

  const providerInfo = provider.getProviderInfo?.();
  console.log(`Provider type: ${providerInfo?.providerType ?? "unknown"}`);
  console.log(`Provider name: ${providerInfo?.providerName ?? "unknown"}`);

  const opportunities = provider.discoverOpportunities();
  console.log(`Discovered opportunities: ${opportunities.length.toString()}`);
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
    dataProvider: provider,
  });

  const { recommendation, snapshot, executionPlan } = result;

  console.log("Recommendation summary:");
  console.log(`  Selected profile:   ${recommendation.selectedProfile}`);
  console.log(`  Provider type:      ${recommendation.diagnostics.providerType}`);
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
  printExecutionPlanV2(executionPlan.stepsV2);
  printExecutionIntents(executionPlan.executionIntentPlan);

  console.log(
    `Ranked opportunities (${recommendation.opportunityRanking.ranked.length.toString()}):`,
  );
  for (const ranked of recommendation.opportunityRanking.ranked) {
    console.log(
      `  ${ranked.opportunityId} — score ${ranked.scoring.score.toFixed(4)}, APY ${(ranked.scoring.apyDecimal * 100).toFixed(3)}%`,
    );
  }
  console.log("");

  const strategyPositions = snapshot.positions.filter(
    (p) => p.type === "strategy",
  );
  console.log(
    `Portfolio positions (${snapshot.positions.length.toString()} total, ${strategyPositions.length.toString()} strategy):`,
  );
  for (const position of snapshot.positions) {
    const label =
      position.type === "strategy"
        ? `${position.label} (${position.asset})`
        : position.label;
    console.log(
      `  [${position.type}] ${label} — ${position.allocationPercent.toFixed(1)}% ($${position.allocationUsd.toFixed(2)})`,
    );
  }
  console.log("");

  if (recommendation.diagnostics.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of recommendation.diagnostics.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
    console.log("");
  }

  console.log("Limitations:");
  console.log("- APY/TVL are from the Morpho public API when reachable; static otherwise.");
  console.log("- Trust/liquidity profiles are curated/static.");
  console.log("- V1 assets only (USDC/EURC/DAI).");
  console.log("- No transactions created. Read-only adapter only.");
  console.log("- Default API/frontend provider remains MockLaminarDataProvider.");
}

main().catch((error: unknown) => {
  console.error("Morpho recommendation probe failed:");
  console.error(error);
  process.exitCode = 1;
});
