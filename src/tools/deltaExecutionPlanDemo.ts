import "dotenv/config";
import { createLaminarRecommendation } from "../core/index.js";
import { createCombinedRealProvider } from "../core/providers/createCombinedRealProvider.js";
import type { CurrentPortfolioPosition } from "../core/types.js";

const TARGET_PORTFOLIO_USD = 10_000;
const DEFAULT_INTENT = { risk: 3, liquidity: 8, returnPreference: 4 };

const CURRENT_PORTFOLIO_FIXTURE: CurrentPortfolioPosition[] = [
  {
    type: "strategy",
    protocolId: "aave",
    protocolName: "Aave",
    opportunityId: "aave-usdc-base",
    asset: "USDC",
    amountUsd: 5_000,
  },
  {
    type: "wallet",
    asset: "USDC",
    amountUsd: 3_000,
  },
  {
    type: "liquidityBuffer",
    asset: "USDC",
    amountUsd: 2_000,
  },
];

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function printCurrentPortfolio(positions: CurrentPortfolioPosition[]): void {
  console.log("Current portfolio:");
  for (const position of positions) {
    if (position.type === "wallet") {
      console.log(`  Wallet ${position.asset}: ${formatUsd(position.amountUsd)}`);
      continue;
    }

    if (position.type === "liquidityBuffer") {
      console.log(
        `  Liquidity buffer ${position.asset}: ${formatUsd(position.amountUsd)}`,
      );
      continue;
    }

    if (position.type === "gasReserve") {
      console.log(
        `  Gas reserve ${position.asset}: ${formatUsd(position.amountUsd)}`,
      );
      continue;
    }

    console.log(
      `  ${position.protocolName ?? position.protocolId} ${position.asset}: ${formatUsd(position.amountUsd)}`,
    );
  }
  console.log(
    `  Total: ${formatUsd(positions.reduce((total, position) => total + position.amountUsd, 0))}`,
  );
}

function printTargetPortfolio(
  result: ReturnType<typeof createLaminarRecommendation>,
): void {
  console.log("");
  console.log(`Target portfolio (${formatUsd(TARGET_PORTFOLIO_USD)}):`);
  for (const position of result.snapshot.positions) {
    console.log(
      `  ${position.label}: ${formatUsd(position.allocationUsd)} (${position.allocationPercent.toFixed(2)}%)`,
    );
  }
}

function printDeltaPlan(
  result: ReturnType<typeof createLaminarRecommendation>,
): void {
  const delta = result.deltaExecutionPlan;

  console.log("");
  console.log("Delta plan:");

  if (delta === undefined) {
    console.log("  (not available)");
    return;
  }

  console.log(
    `  Current value: ${formatUsd(delta.currentPortfolioValueUsd)} | Target value: ${formatUsd(delta.targetPortfolioValueUsd)} | Net delta: ${formatUsd(delta.netDeltaUsd)}`,
  );

  if (delta.warnings.length > 0) {
    console.log("  Warnings:");
    for (const warning of delta.warnings) {
      console.log(`    - ${warning}`);
    }
  }

  delta.steps.forEach((step, index) => {
    console.log(`  ${index + 1}. [${step.action}] ${step.description}`);
  });

  console.log("");
  console.log("Note:");
  console.log("  Informational only. No wallet interaction or transaction creation.");
}

async function main(): Promise<void> {
  console.log("Laminar — Delta Execution Plan Demo");
  console.log("=================================");
  console.log("");

  const provider = await createCombinedRealProvider({ env: process.env });

  const result = createLaminarRecommendation({
    intent: DEFAULT_INTENT,
    portfolioValueUsd: TARGET_PORTFOLIO_USD,
    dataProvider: provider,
    currentPortfolio: CURRENT_PORTFOLIO_FIXTURE,
  });

  console.log(`Profile: ${result.recommendation.selectedProfile}`);
  console.log(`Provider: ${result.recommendation.diagnostics.providerType}`);
  console.log("");

  printCurrentPortfolio(CURRENT_PORTFOLIO_FIXTURE);
  printTargetPortfolio(result);
  printDeltaPlan(result);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
