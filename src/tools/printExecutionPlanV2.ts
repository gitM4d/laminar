import type { ExecutionPlanStepV2 } from "../core/execution/types.js";

export function printExecutionPlanV2(
  steps: readonly ExecutionPlanStepV2[],
): void {
  console.log("Execution Plan:");
  console.log("");

  if (steps.length === 0) {
    console.log("  (no steps)");
    console.log("");
    return;
  }

  steps.forEach((step, index) => {
    console.log(`${(index + 1).toString()}. ${step.description}`);
  });

  console.log("");
  console.log("Note:");
  console.log(
    "  Informational only. No wallet interaction or transaction creation.",
  );
  console.log("");
}
