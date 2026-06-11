import { useState } from "react";
import { ApiRequestError, createRecommendation } from "./api/client.js";
import { ErrorView } from "./components/ErrorView.js";
import { ExecutionPlanView } from "./components/ExecutionPlanView.js";
import { IntentForm, type IntentFormValues } from "./components/IntentForm.js";
import { SnapshotView } from "./components/SnapshotView.js";
import type { RecommendationResponse } from "./types.js";

const DEFAULT_VALUES: IntentFormValues = {
  risk: 3,
  liquidity: 8,
  returnPreference: 4,
  portfolioValueUsd: 10_000,
};

export function App() {
  const [formValues, setFormValues] = useState<IntentFormValues>(DEFAULT_VALUES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [result, setResult] = useState<RecommendationResponse | null>(null);

  async function handleSubmit(submittedValues: IntentFormValues) {
    setLoading(true);
    setError(null);

    try {
      const response = await createRecommendation({
        intent: {
          risk: submittedValues.risk,
          liquidity: submittedValues.liquidity,
          returnPreference: submittedValues.returnPreference,
        },
        portfolioValueUsd: submittedValues.portfolioValueUsd,
        asOf: new Date().toISOString(),
      });
      setResult(response);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError({ code: caught.code, message: caught.message });
      } else if (caught instanceof Error) {
        setError({ code: "NETWORK_ERROR", message: caught.message });
      } else {
        setError({
          code: "UNKNOWN_ERROR",
          message: "An unexpected error occurred",
        });
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Laminar Prototype</h1>
        <p className="muted">
          Local UX prototype consuming the Laminar HTTP API at{" "}
          <code>http://127.0.0.1:3000</code>
        </p>
      </header>

      <IntentForm
        values={formValues}
        loading={loading}
        onChange={setFormValues}
        onSubmit={handleSubmit}
      />

      {loading && <p className="status">Loading recommendation...</p>}

      {error !== null && <ErrorView code={error.code} message={error.message} />}

      {result !== null && (
        <div className="results">
          <SnapshotView
            snapshot={result.snapshot}
            trustExplanations={result.recommendation.trustExplanations}
          />
          <ExecutionPlanView executionPlan={result.executionPlan} />
        </div>
      )}
    </main>
  );
}
