import type { ExecutionIntent } from "../core/execution/types.js";
import { aaveExecutionAdapter } from "../execution-adapters/aave/AaveExecutionAdapter.js";

const DEMO_SUPPLY_INTENT: ExecutionIntent = {
  id: "intent-demo-aave-usdc",
  sourceStepId: "step-demo",
  action: "supply",
  protocolId: "aave",
  protocolName: "Aave",
  opportunityId: "aave-usdc-base",
  chain: "Base",
  asset: "USDC",
  amountUsd: 1_000,
  amountAssetEstimate: 1_000,
  status: "planned",
  requiresWallet: true,
  requiresApproval: true,
  executionAdapterRequired: true,
  informationalOnly: true,
  preconditions: [
    "User must hold at least $1,000 USDC on Base.",
    "Aave execution adapter must support supply.",
  ],
  riskWarnings: [
    "This is a planning intent only. No transaction was generated.",
  ],
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function printExecutionIntent(intent: ExecutionIntent): void {
  console.log("Execution Intent");
  console.log("");
  console.log(`  Action: ${intent.action}`);
  console.log(`  Protocol: ${intent.protocolName} (${intent.protocolId})`);
  console.log(`  Asset: ${intent.asset}`);
  console.log(`  Amount: ${formatUsd(intent.amountUsd)}`);
  console.log(`  Chain: ${intent.chain}`);
  console.log("");
}

function printGeneratedTransactions(
  transactions: Awaited<
    ReturnType<typeof aaveExecutionAdapter.buildTransactions>
  >["transactions"],
): void {
  console.log("Generated Transactions");
  console.log("");

  transactions.forEach((transaction, index) => {
    console.log(`${(index + 1).toString()}. ${transaction.description}`);
    console.log(`   type: ${transaction.type}`);
    console.log(`   target: ${transaction.target}`);
    console.log(`   function: ${transaction.functionName}`);
    console.log(`   asset: ${transaction.asset}`);
    console.log(`   amountUsd: ${formatUsd(transaction.amountUsd)}`);
    console.log("");
  });
}

async function main(): Promise<void> {
  console.log("Laminar — Aave Transaction Builder Demo");
  console.log("======================================");
  console.log("");

  printExecutionIntent(DEMO_SUPPLY_INTENT);

  const plan = await aaveExecutionAdapter.buildTransactions(DEMO_SUPPLY_INTENT);

  printGeneratedTransactions(plan.transactions);

  console.log("Warnings:");
  for (const warning of plan.warnings) {
    console.log(`  - ${warning}`);
  }

  console.log("");
  console.log("Note:");
  console.log("  Planning only.");
  console.log("  No wallet connected.");
  console.log("  No transaction generated.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
