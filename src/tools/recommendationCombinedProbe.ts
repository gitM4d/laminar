import "dotenv/config";
import { createLaminarRecommendation } from "../core/index.js";
import { createAaveBaseLaminarDataProviderSnapshot } from "../core/providers/AaveBaseLaminarDataProvider.js";
import { createMorphoBaseLaminarDataProviderSnapshot } from "../core/providers/MorphoBaseLaminarDataProvider.js";
import { CombinedLaminarDataProvider } from "../core/providers/CombinedLaminarDataProvider.js";

const DEFAULT_INTENT = { risk: 5, liquidity: 6, returnPreference: 5 };
const DEFAULT_PORTFOLIO_USD = 10_000;

async function main(): Promise<void> {
  console.log("Laminar — Combined Real Provider Recommendation");
  console.log("================================================");
  console.log(
    "Building provider snapshots (read-only: Aave Base + Morpho Base)...",
  );
  console.log("");

  const [aaveProvider, morphoProvider] = await Promise.all([
    createAaveBaseLaminarDataProviderSnapshot(),
    createMorphoBaseLaminarDataProviderSnapshot(),
  ]);

  const combined = new CombinedLaminarDataProvider([
    aaveProvider,
    morphoProvider,
  ]);

  const providerInfo = combined.getProviderInfo();
  console.log(`Provider: ${providerInfo.providerType}`);

  console.log("Underlying providers:");
  for (const sub of [aaveProvider, morphoProvider]) {
    const info = sub.getProviderInfo?.();
    if (info !== undefined) {
      console.log(`  - ${info.providerName}`);
    }
  }
  console.log("");

  const opportunities = combined.discoverOpportunities();
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
  console.log("- Trust/liquidity profiles are curated/static for both protocols.");
  console.log("- V1 assets only (USDC/EURC/DAI).");
  console.log("- No transactions created. Read-only adapters only.");
  console.log("- Default API/frontend provider remains MockLaminarDataProvider.");
}

main().catch((error: unknown) => {
  console.error("Combined recommendation probe failed:");
  console.error(error);
  process.exitCode = 1;
});
