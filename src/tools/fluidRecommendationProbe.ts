import "dotenv/config";
import { createLaminarRecommendation } from "../core/index.js";
import { createFluidBaseLaminarDataProviderSnapshot } from "../core/providers/FluidBaseLaminarDataProvider.js";
import { printRejectedOpportunities } from "./printRejectedOpportunities.js";
import { printTrustSummary } from "./printTrustSummary.js";

const DEFAULT_INTENT = { risk: 8, liquidity: 3, returnPreference: 9 };
const DEFAULT_PORTFOLIO_USD = 10_000;

async function main(): Promise<void> {
  console.log("Laminar — Fluid Base Real Provider Recommendation");
  console.log("===============================================");
  console.log("Building Fluid Base provider snapshot (read-only)...");
  console.log("");

  const provider = await createFluidBaseLaminarDataProviderSnapshot({
    disableApi: process.env.FLUID_BASE_API_URL === "",
  });

  const opportunities = provider.discoverOpportunities();
  if (opportunities.length === 0) {
    console.log(
      "Fluid real data source is unavailable or returned no V1 markets; no recommendation generated.",
    );
    console.log("");
    console.log("Notes:");
    console.log(
      "- Configure FLUID_BASE_API_URL or rely on the public Fluid/Instadapp API default.",
    );
    console.log(
      "- Static dev fallback is adapter diagnostics/tests only (npm run adapter:fluid:base with ALLOW_STATIC_MARKET_DATA=true).",
    );
    console.log("- V1 assets only: USDC, EURC, DAI.");
    return;
  }

  const providerInfo = provider.getProviderInfo?.();
  console.log(`Provider type: ${providerInfo?.providerType ?? "unknown"}`);
  console.log(`Provider name: ${providerInfo?.providerName ?? "unknown"}`);
  console.log(`Discovered opportunities: ${opportunities.length.toString()}`);
  for (const opp of opportunities) {
    console.log(
      `  ${opp.id} — APY ${(opp.apy * 100).toFixed(3)}% (${opp.asset})`,
    );
  }
  console.log("");

  console.log(
    `Running recommendation (Yield-focused intent, $${DEFAULT_PORTFOLIO_USD.toString()})...`,
  );
  console.log("");

  const result = createLaminarRecommendation({
    intent: DEFAULT_INTENT,
    portfolioValueUsd: DEFAULT_PORTFOLIO_USD,
    asOf: new Date(),
    dataProvider: provider,
  });

  const { recommendation, snapshot, executionPlan } = result;

  console.log("Recommendation summary:");
  console.log(`  Selected profile:   ${recommendation.selectedProfile}`);
  console.log(
    `  Provider type:      ${recommendation.diagnostics.providerType}`,
  );
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
  printRejectedOpportunities(recommendation.rejectedOpportunityExplanations);

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

  console.log(
    `Execution plan steps: ${executionPlan.steps.length.toString()}`,
  );
}

main().catch((error: unknown) => {
  console.error("Fluid recommendation probe failed:");
  console.error(error);
  process.exitCode = 1;
});
