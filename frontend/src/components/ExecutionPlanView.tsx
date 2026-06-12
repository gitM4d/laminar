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
  const useV2 =
    executionPlan.executionPlanVersion === "v2" &&
    executionPlan.stepsV2.length > 0;

  return (
    <section className="card">
      <h2>Execution Plan</h2>
      <p className="notice">
        Informational only. No wallet interaction or blockchain transaction is
        created.
      </p>

      {useV2 ? (
        <ol className="execution-plan-list">
          {executionPlan.stepsV2.map((step) => (
            <li key={step.id} className="execution-plan-step">
              <p>{step.description}</p>
              <p className="muted">
                {step.protocolName !== null && (
                  <>
                    Protocol: {step.protocolName}
                    {" · "}
                  </>
                )}
                {step.asset !== null && <>Asset: {step.asset} · </>}
                Amount: {formatUsd(step.amountUsd)}
              </p>
            </li>
          ))}
        </ol>
      ) : (
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
      )}
    </section>
  );
}
