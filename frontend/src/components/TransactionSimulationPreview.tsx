import {
  NO_ENCODED_TRANSACTIONS_ERROR_CODE,
  SAFETY_VALIDATION_SKIP_REASON,
  type TransactionSafetyValidation,
  type TransactionSimulationResult,
} from "@laminar/frontend-safe";
import { useAaveTransactionSimulation } from "../preview/useAaveTransactionSimulation.js";
import type { AaveWalletIntentPreview } from "../preview/buildAaveWalletPreviews.js";

type TransactionSimulationPreviewProps = {
  preview: AaveWalletIntentPreview;
  walletAddress: string | undefined;
  enabled: boolean;
  onBaseChain: boolean;
};

function renderSimulationMessage(
  preview: AaveWalletIntentPreview,
  onBaseChain: boolean,
  publicClientAvailable: boolean,
  safety: TransactionSafetyValidation,
): string | null {
  if (!onBaseChain) {
    return "Switch to Base to simulate Aave transactions.";
  }

  if (!publicClientAvailable) {
    return "Public RPC client unavailable. Simulation cannot run.";
  }

  if (preview.encodedTransactions.length === 0) {
    return "No encoded transactions available to simulate.";
  }

  if (!safety.safe) {
    return "Simulation skipped because safety validation failed.";
  }

  return null;
}

export function TransactionSimulationPreview({
  preview,
  walletAddress,
  enabled,
  onBaseChain,
}: TransactionSimulationPreviewProps) {
  const canSimulate =
    enabled &&
    onBaseChain &&
    walletAddress !== undefined &&
    preview.safety.safe &&
    preview.encodedTransactions.length > 0;

  const { simulation, loading, error, publicClientAvailable } =
    useAaveTransactionSimulation({
      plan: preview.plan,
      walletAddress,
      enabled: canSimulate,
    });

  const blockedMessage = enabled
    ? renderSimulationMessage(
        preview,
        onBaseChain,
        publicClientAvailable,
        preview.safety,
      )
    : null;

  return (
    <div className="wallet-preview-simulation">
      <h4>Simulation Preview</h4>

      {!enabled && (
        <p className="muted wallet-preview-message">No simulation.</p>
      )}

      {enabled && blockedMessage !== null && (
        <p className="wallet-preview-message">{blockedMessage}</p>
      )}

      {enabled && canSimulate && loading && (
        <p className="status wallet-preview-message">
          Simulating transactions...
        </p>
      )}

      {enabled && canSimulate && error !== null && (
        <p className="wallet-preview-error wallet-preview-message">{error}</p>
      )}

      {enabled && canSimulate && simulation !== null && (
        <>
          <div className="wallet-preview-simulation-summary">
            <p>
              simulated: <code>{String(simulation.simulated)}</code>
            </p>
            <p>
              successful:{" "}
              <code>{String(simulation.summary.successfulSimulations)}</code>
            </p>
            <p>
              failed:{" "}
              <code>{String(simulation.summary.failedSimulations)}</code>
            </p>
          </div>

          <ol className="wallet-preview-simulation-results">
            {simulation.results.map((result) => (
              <SimulationResultItem key={result.transactionIndex} result={result} />
            ))}
          </ol>

          {simulation.results.some(
            (result) =>
              result.skipped === true &&
              (result.skipReason === SAFETY_VALIDATION_SKIP_REASON ||
                result.errorCode === NO_ENCODED_TRANSACTIONS_ERROR_CODE),
          ) && (
            <p className="wallet-preview-message">
              Simulation skipped because safety validation failed.
            </p>
          )}

          {simulation.results.some(
            (result) =>
              result.type === "aave-supply" &&
              !result.success &&
              result.skipped !== true,
          ) && (
            <p className="wallet-preview-warning wallet-preview-message">
              Approve simulation may succeed while supply simulation fails until
              approval is mined on-chain.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SimulationResultItem({
  result,
}: {
  result: TransactionSimulationResult["results"][number];
}) {
  return (
    <li>
      <p>
        {result.transactionIndex + 1}. {result.type}
        {" · "}
        success: <code>{String(result.success)}</code>
      </p>
      <p className="muted">{result.description}</p>
      {result.skipped === true && result.skipReason !== undefined && (
        <p className="wallet-preview-message">skipped: {result.skipReason}</p>
      )}
      {result.errorMessage !== undefined && (
        <p className="wallet-preview-error">{result.errorMessage}</p>
      )}
    </li>
  );
}
