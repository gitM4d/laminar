import {
  formatComponentScore,
  formatTrustScore,
  formatUsdCompact,
} from "../formatTrust.js";
import {
  resolveRejectedOpportunities,
  type ResolvedRejectedOpportunity,
} from "../resolveRejectedOpportunities.js";
import { resolveTrustHighlights } from "../resolveTrustHighlights.js";
import type {
  ProtocolTrustExplanation,
  RecommendationSnapshot,
  RejectedOpportunityExplanation,
  SnapshotTrustHighlight,
} from "../types.js";

type SnapshotViewProps = {
  snapshot: RecommendationSnapshot;
  trustExplanations?: ProtocolTrustExplanation[];
  rejectedOpportunityExplanations?: RejectedOpportunityExplanation[];
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

  if (
    (key === "strategyExpectedApy" ||
      key === "portfolioExpectedApy" ||
      key === "expectedApy") &&
    typeof metric.value === "number"
  ) {
    return `${(metric.value * 100).toFixed(2)}%`;
  }

  return String(metric.value);
}

function TrustHighlightCard({ highlight }: { highlight: SnapshotTrustHighlight }) {
  const explanation = highlight.trustExplanation;

  return (
    <article className="trust-highlight">
      <div className="trust-highlight-header">
        <p>
          <span className="muted">Protocol:</span> {highlight.protocolName}
        </p>
        <p>
          <span className="muted">Trust Score:</span>{" "}
          {formatTrustScore(highlight.trustScore)}
        </p>
        <p>
          <span className="muted">Summary:</span> {highlight.summary}
        </p>
      </div>

      {explanation !== undefined && (
        <>
          <h4>Details</h4>
          <ul className="trust-detail-list">
            <li>
              <span className="muted">Age:</span>{" "}
              {explanation.protocolAgeYears.toFixed(1)} years
            </li>
            <li>
              <span className="muted">Audits:</span> {explanation.auditTier} (
              {explanation.auditCount})
            </li>
            <li>
              <span className="muted">Incidents:</span>{" "}
              {explanation.historicalIncidents}
            </li>
            <li>
              <span className="muted">TVL:</span>{" "}
              {formatUsdCompact(explanation.tvlUsd)} ({explanation.tvlBucket})
            </li>
          </ul>

          <h4>Components</h4>
          <ul className="trust-component-list">
            <li>
              <span className="muted">Age:</span>{" "}
              {formatComponentScore(explanation.components.age)}
            </li>
            <li>
              <span className="muted">Audits:</span>{" "}
              {formatComponentScore(explanation.components.audits)}
            </li>
            <li>
              <span className="muted">Incidents:</span>{" "}
              {formatComponentScore(explanation.components.incidents)}
            </li>
            <li>
              <span className="muted">TVL:</span>{" "}
              {formatComponentScore(explanation.components.tvl)}
            </li>
            <li>
              <span className="muted">Chain Adjustment:</span>{" "}
              {formatComponentScore(explanation.components.chainAdjustment)}
            </li>
          </ul>
        </>
      )}
    </article>
  );
}

function formatDetailValue(value: number | string | boolean): string {
  return String(value);
}

function RejectedOpportunityCard({
  rejection,
}: {
  rejection: ResolvedRejectedOpportunity;
}) {
  return (
    <article className="rejection-highlight">
      <div className="rejection-highlight-header">
        <p>
          <span className="muted">Label:</span> {rejection.label}
        </p>
        <p>
          <span className="muted">Protocol:</span> {rejection.protocolName}
        </p>
        <p>
          <span className="muted">Asset:</span> {rejection.asset}
        </p>
        <p>
          <span className="muted">Category:</span>{" "}
          {rejection.primaryReasonCategory}
        </p>
        <p>
          <span className="muted">Summary:</span> {rejection.summary}
        </p>
      </div>

      {rejection.details !== undefined && rejection.details.length > 0 && (
        <>
          <h4>Details</h4>
          <ul className="rejection-detail-list">
            {rejection.details.map((detail) => (
              <li key={detail.code}>
                <span className="muted">{detail.category}:</span>{" "}
                {detail.message}
                {detail.observedValue !== undefined &&
                  detail.requiredValue !== undefined && (
                    <>
                      {" "}
                      (
                      {formatDetailValue(detail.observedValue)} vs required{" "}
                      {formatDetailValue(detail.requiredValue)})
                    </>
                  )}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

export function SnapshotView({
  snapshot,
  trustExplanations,
  rejectedOpportunityExplanations,
}: SnapshotViewProps) {
  const trustHighlights = resolveTrustHighlights(snapshot, trustExplanations);
  const rejectedOpportunities = resolveRejectedOpportunities(
    snapshot,
    rejectedOpportunityExplanations,
  );

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
          <span className="muted">Strategy APY</span>
          <p>{getMetric(snapshot, "strategyExpectedApy")}</p>
        </div>
        <div>
          <span className="muted">Portfolio APY</span>
          <p>{getMetric(snapshot, "portfolioExpectedApy")}</p>
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

      {trustHighlights.length > 0 && (
        <>
          <h3>Trust Highlights</h3>
          <div className="trust-highlights">
            {trustHighlights.map((highlight) => (
              <TrustHighlightCard
                key={highlight.protocolId}
                highlight={highlight}
              />
            ))}
          </div>
        </>
      )}

      {rejectedOpportunities.length > 0 && (
        <>
          <h3>Rejected Opportunities</h3>
          <div className="rejection-highlights">
            {rejectedOpportunities.map((rejection) => (
              <RejectedOpportunityCard
                key={rejection.opportunityId}
                rejection={rejection}
              />
            ))}
          </div>
        </>
      )}

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
