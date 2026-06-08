import type { MockExecutionPlan } from "../types.js";

type ExecutionPlanViewProps = {
  executionPlan: MockExecutionPlan;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function protocolLabel(step: MockExecutionPlan["steps"][number]): string {
  if (step.type === "deposit") {
    return step.protocolName ?? step.protocolId ?? "—";
  }

  return "—";
}

export function ExecutionPlanView({ executionPlan }: ExecutionPlanViewProps) {
  return (
    <section className="card">
      <h2>Mock Execution Plan</h2>
      <p className="notice">
        This is a mock execution plan. No blockchain transaction is created.
      </p>

      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Action</th>
            <th>Protocol</th>
            <th>Asset</th>
            <th>Amount USD</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {executionPlan.steps.map((step) => (
            <tr key={step.stepId}>
              <td>{step.stepId}</td>
              <td>{step.type}</td>
              <td>{protocolLabel(step)}</td>
              <td>{step.asset}</td>
              <td>{formatUsd(step.amountUsd)}</td>
              <td>{step.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
