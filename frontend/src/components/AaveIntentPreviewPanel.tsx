import {
  formatShortTxData,
  shortenAddress,
} from "@laminar/frontend-safe";
import type { AaveWalletIntentPreview } from "../preview/buildAaveWalletPreviews.js";
import { useAaveTransactionSimulation } from "../preview/useAaveTransactionSimulation.js";
import { ApprovalExecutionView } from "../execution/ApprovalExecutionView.js";
import { TransactionSimulationPreview } from "./TransactionSimulationPreview.js";

type AaveIntentPreviewPanelProps = {
  preview: AaveWalletIntentPreview;
  walletAddress: string | undefined;
  isConnected: boolean;
  onBaseChain: boolean;
  chainId: number | undefined;
};

function formatSafetyCount(value: number): string {
  return String(value);
}

export function AaveIntentPreviewPanel({
  preview,
  walletAddress,
  isConnected,
  onBaseChain,
  chainId,
}: AaveIntentPreviewPanelProps) {
  const canSimulate =
    isConnected &&
    onBaseChain &&
    walletAddress !== undefined &&
    preview.safety.safe &&
    preview.encodedTransactions.length > 0;

  const {
    simulation,
    loading: simulationLoading,
    error: simulationError,
    publicClientAvailable,
    rerunSimulation,
  } = useAaveTransactionSimulation({
    plan: preview.plan,
    walletAddress,
    enabled: canSimulate,
  });

  return (
    <article className="wallet-preview-intent">
      <h3>Aave Transaction Preview</h3>
      <p>
        <strong>Intent:</strong> {preview.intentLabel}
      </p>

      <h4>Transactions</h4>
      <ol className="wallet-preview-transactions">
        {preview.encodedTransactions.map((transaction, index) => (
          <li key={`${preview.intent.id}-${index}`}>
            <p>
              {index + 1}. {transaction.description}
            </p>
            <ul className="wallet-preview-tx-details">
              <li>
                <span>to:</span>{" "}
                <code>{shortenAddress(transaction.to)}</code>
              </li>
              <li>
                <span>data:</span>{" "}
                <code title={transaction.data}>
                  {formatShortTxData(transaction.data)}
                </code>
              </li>
              <li>
                <span>value:</span> <code>{transaction.value}</code>
              </li>
              <li>
                <span>chainId:</span> <code>{transaction.chainId}</code>
              </li>
            </ul>
          </li>
        ))}
      </ol>

      <div className="wallet-preview-safety">
        <h4>Safety</h4>
        <p>
          safe: <code>{String(preview.safety.safe)}</code>
        </p>
        <p>
          errors:{" "}
          <code>{formatSafetyCount(preview.safety.errors.length)}</code>
        </p>
        <p>
          warnings:{" "}
          <code>{formatSafetyCount(preview.safety.warnings.length)}</code>
        </p>

        {preview.safety.errors.length > 0 && (
          <ul className="wallet-preview-issues">
            {preview.safety.errors.map((issue, index) => (
              <li key={`error-${preview.intent.id}-${index}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        )}

        {preview.safety.warnings.length > 0 && (
          <ul className="wallet-preview-issues wallet-preview-warnings">
            {preview.safety.warnings.map((issue, index) => (
              <li key={`warning-${preview.intent.id}-${index}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <TransactionSimulationPreview
        preview={preview}
        enabled={isConnected}
        onBaseChain={onBaseChain}
        simulation={simulation}
        simulationLoading={simulationLoading}
        simulationError={simulationError}
        publicClientAvailable={publicClientAvailable}
      />

      <ApprovalExecutionView
        plan={preview.plan}
        safetyValidation={preview.safety}
        simulationResult={simulation}
        simulationLoading={simulationLoading}
        chainId={chainId}
        walletConnected={isConnected}
        onApprovalConfirmed={rerunSimulation}
      />
    </article>
  );
}
