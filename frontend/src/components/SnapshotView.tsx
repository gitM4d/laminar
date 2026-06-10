import type { RecommendationSnapshot } from "../types.js";

type SnapshotViewProps = {
  snapshot: RecommendationSnapshot;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMetric(snapshot: RecommendationSnapshot, key: string): string {
  const metric = snapshot.metrics.find((entry) => entry.key === key);
  if (metric === undefined) {
    return "—";
  }

  if (key === "expectedApy" && typeof metric.value === "number") {
    return `${(metric.value * 100).toFixed(2)}%`;
  }

  return String(metric.value);
}

export function SnapshotView({ snapshot }: SnapshotViewProps) {
  return (
    <section className="card">
      <h2>Recommendation Snapshot</h2>

      <div className="summary-grid">
        <div>
          <span className="muted">Profile</span>
          <p>{snapshot.profile}</p>
        </div>
        <div>
          <span className="muted">Portfolio Value</span>
          <p>{formatUsd(snapshot.portfolioValueUsd)}</p>
        </div>
        <div>
          <span className="muted">Expected APY</span>
          <p>{getMetric(snapshot, "expectedApy")}</p>
        </div>
      </div>

      <h3>Positions</h3>
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Type</th>
            <th>Asset</th>
            <th>Allocation %</th>
            <th>Allocation USD</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.positions.map((position) => (
            <tr key={`${position.type}-${position.label}`}>
              <td>{position.label}</td>
              <td>{position.type}</td>
              <td>{position.asset}</td>
              <td>{position.allocationPercent.toFixed(2)}%</td>
              <td>{formatUsd(position.allocationUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {snapshot.warnings.length > 0 && (
        <>
          <h3>Warnings</h3>
          <ul className="warning-list">
            {snapshot.warnings.map((warning) => (
              <li key={warning.code} data-severity={warning.severity}>
                <strong>{warning.code}</strong>: {warning.message}
              </li>
            ))}
          </ul>
        </>
      )}

      {snapshot.explanations.length > 0 && (
        <>
          <h3>Explanations</h3>
          <ul className="explanation-list">
            {snapshot.explanations.map((explanation) => (
              <li key={explanation.topic}>
                <strong>{explanation.topic}</strong>: {explanation.summary}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
