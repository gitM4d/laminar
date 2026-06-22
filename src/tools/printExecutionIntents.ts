import type { ExecutionIntentPlan } from "../core/execution/types.js";

function formatIntentLine(intent: {
  action: string;
  amountUsd: number;
  asset: string | null;
  protocolName: string | null;
}): string {
  if (intent.action === "prepareFunds") {
    return "Prepare funds";
  }

  if (intent.action === "holdLiquidityBuffer") {
    return "Hold liquidity buffer";
  }

  if (intent.action === "holdGasReserve") {
    return "Hold gas reserve";
  }

  const asset = intent.asset ?? "USDC";
  const amount = intent.amountUsd.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
  const protocol = intent.protocolName ?? "protocol";

  if (intent.action === "supply") {
    return `Supply ${amount} ${asset} to ${protocol}`;
  }

  if (intent.action === "withdraw") {
    return `Withdraw ${amount} ${asset} from ${protocol}`;
  }

  return `${intent.action} ${amount} ${asset}`;
}

export function printExecutionIntents(plan: ExecutionIntentPlan | undefined): void {
  console.log("Execution Intents:");
  console.log("");

  if (plan === undefined || plan.intents.length === 0) {
    console.log("  (no intents)");
    console.log("");
    return;
  }

  const executable = plan.intents.filter(
    (intent) => intent.executionAdapterRequired,
  );
  const nonExecutable = plan.intents.filter(
    (intent) => !intent.executionAdapterRequired,
  );

  console.log("Executable:");
  if (executable.length === 0) {
    console.log("  (none)");
  } else {
    for (const intent of executable) {
      console.log(`- ${formatIntentLine(intent)}`);
    }
  }

  console.log("");
  console.log("Non-executable:");
  if (nonExecutable.length === 0) {
    console.log("  (none)");
  } else {
    for (const intent of nonExecutable) {
      console.log(`- ${formatIntentLine(intent)}`);
    }
  }

  console.log("");
  console.log("Note:");
  console.log(
    "  Planning only. No calldata, signatures, or transactions generated.",
  );
  console.log("");
}
