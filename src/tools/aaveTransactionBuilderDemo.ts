import type { ExecutionIntent } from "../core/execution/types.js";
import {
  AaveExecutionAdapter,
  AAVE_PREVIEW_USER_ADDRESS,
} from "../execution-adapters/aave/AaveExecutionAdapter.js";
import type { EncodedTransactionRequest } from "../execution-adapters/types.js";

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

const demoAdapter = new AaveExecutionAdapter({
  encodeCalldata: true,
  userAddress: AAVE_PREVIEW_USER_ADDRESS,
});

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
    ReturnType<typeof demoAdapter.buildTransactions>
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

function printEncodedTransactionPreview(
  encodedTransactions: EncodedTransactionRequest[] | undefined,
): void {
  console.log("Encoded Transaction Preview:");
  console.log("");

  if (encodedTransactions === undefined || encodedTransactions.length === 0) {
    console.log("  (no encoded transactions)");
    console.log("");
    return;
  }

  encodedTransactions.forEach((transaction, index) => {
    console.log(`${(index + 1).toString()}. ${transaction.type}`);
    console.log(`   to: ${transaction.to}`);
    console.log(`   data: ${transaction.data}`);
    console.log(`   value: ${transaction.value}`);
    console.log(`   chainId: ${transaction.chainId.toString()}`);
    console.log("");
  });
}

async function main(): Promise<void> {
  console.log("Laminar — Aave Transaction Builder Demo");
  console.log("======================================");
  console.log("");
  console.log(
    `Preview user address: ${AAVE_PREVIEW_USER_ADDRESS} (preview-only)`,
  );
  console.log("");

  printExecutionIntent(DEMO_SUPPLY_INTENT);

  const plan = await demoAdapter.buildTransactions(DEMO_SUPPLY_INTENT);

  printGeneratedTransactions(plan.transactions);
  printEncodedTransactionPreview(plan.encodedTransactions);

  console.log("Warnings:");
  for (const warning of plan.warnings) {
    console.log(`  - ${warning}`);
  }

  console.log("");
  console.log("Note:");
  console.log("  Planning only.");
  console.log("  Dummy user address used.");
  console.log("  Do not submit this transaction as-is.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
