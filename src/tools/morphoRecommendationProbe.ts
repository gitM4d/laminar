import "dotenv/config";
import { createLaminarRecommendation } from "../core/index.js";
import { createMorphoBaseLaminarDataProviderSnapshot } from "../core/providers/MorphoBaseLaminarDataProvider.js";
import type { ProtocolTrustExplanation } from "../core/trust/buildTrustExplanation.js";
import { printRejectedOpportunities } from "./printRejectedOpportunities.js";

const DEFAULT_INTENT = { risk: 5, liquidity: 6, returnPreference: 5 };
const DEFAULT_PORTFOLIO_USD = 10_000;

function formatAuditTier(tier: string, count: number): string {
  return count === 0 ? "none (0)" : `${tier} (${count.toString()})`;
}

function printTrustSummary(
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
    console.log(`  tvl: ${details.tvlBucket}`);
  }
  console.log("");
}

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

  if (recommendation.diagnostics.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of recommendation.diagnostics.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
    console.log("");
  }

  console.log(`Execution plan steps: ${executionPlan.steps.length.toString()}`);
  console.log("");

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
