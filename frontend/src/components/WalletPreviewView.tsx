import { useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
} from "wagmi";
import {
  formatShortTxData,
  isBaseChainId,
  selectAaveSupplyIntents,
  shortenAddress,
} from "@laminar/frontend-safe";
import {
  buildAaveWalletPreviews,
  type AaveWalletIntentPreview,
} from "../preview/buildAaveWalletPreviews.js";
import type { ExecutionIntentPlan } from "../types.js";
import { wagmiConfig } from "../wallet/wagmiConfig.js";

type WalletPreviewViewProps = {
  executionIntentPlan: ExecutionIntentPlan | undefined;
};

function formatSafetyCount(value: number): string {
  return String(value);
}

function injectedConnector() {
  const connector = wagmiConfig.connectors[0];
  if (connector === undefined) {
    throw new Error("Injected wallet connector is not configured.");
  }
  return connector;
}

export function WalletPreviewView({
  executionIntentPlan,
}: WalletPreviewViewProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, isPending: isConnecting, error: connectError } =
    useConnect();
  const { disconnect } = useDisconnect();
  const [previews, setPreviews] = useState<AaveWalletIntentPreview[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const aaveSupplyIntents = selectAaveSupplyIntents(
    executionIntentPlan?.intents,
  );
  const onBaseChain = isBaseChainId(chainId);

  useEffect(() => {
    if (!isConnected || !onBaseChain || !address || aaveSupplyIntents.length === 0) {
      setPreviews([]);
      setPreviewError(null);
      setLoadingPreview(false);
      return;
    }

    let cancelled = false;

    async function loadPreviews() {
      setLoadingPreview(true);
      setPreviewError(null);

      try {
        const nextPreviews = await buildAaveWalletPreviews(
          executionIntentPlan?.intents,
          address,
        );

        if (!cancelled) {
          setPreviews(nextPreviews);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviews([]);
          setPreviewError(
            error instanceof Error
              ? error.message
              : "Failed to build Aave transaction preview.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPreview(false);
        }
      }
    }

    void loadPreviews();

    return () => {
      cancelled = true;
    };
  }, [
    address,
    aaveSupplyIntents.length,
    executionIntentPlan?.intents,
    isConnected,
    onBaseChain,
  ]);

  return (
    <section className="card wallet-preview">
      <h2>Wallet Preview</h2>
      <p className="notice">
        Preview only. No signing, sending, or transaction submission.
      </p>

      <div className="wallet-preview-controls">
        {!isConnected ? (
          <button
            type="button"
            className="button"
            disabled={isConnecting}
            onClick={() => connect({ connector: injectedConnector() })}
          >
            {isConnecting ? "Connecting..." : "Connect wallet"}
          </button>
        ) : (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        )}
      </div>

      {connectError !== null && (
        <p className="wallet-preview-error">{connectError.message}</p>
      )}

      {isConnected && address !== undefined && (
        <dl className="wallet-preview-meta">
          <div>
            <dt>Address</dt>
            <dd>
              <code>{address}</code>
            </dd>
          </div>
          <div>
            <dt>Chain</dt>
            <dd>
              {onBaseChain ? (
                <>Base ({chainId})</>
              ) : (
                <span className="wallet-preview-warning">
                  {chainId} — switch to Base to preview Aave transactions.
                </span>
              )}
            </dd>
          </div>
        </dl>
      )}

      {!isConnected && (
        <p className="muted wallet-preview-message">
          Connect wallet to preview Aave transactions.
        </p>
      )}

      {isConnected && !onBaseChain && (
        <p className="wallet-preview-warning wallet-preview-message">
          Switch to Base to preview Aave transactions.
        </p>
      )}

      {isConnected &&
        onBaseChain &&
        aaveSupplyIntents.length === 0 && (
          <p className="muted wallet-preview-message">
            No Aave supply intent available in this recommendation.
          </p>
        )}

      {loadingPreview && (
        <p className="status wallet-preview-message">
          Building Aave transaction preview...
        </p>
      )}

      {previewError !== null && (
        <p className="wallet-preview-error wallet-preview-message">
          {previewError}
        </p>
      )}

      {previews.map((preview) => (
        <article key={preview.intent.id} className="wallet-preview-intent">
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
        </article>
      ))}

      {previews.length > 0 && (
        <p className="muted wallet-preview-footnote">
          Note: Preview only. No transaction was sent.
        </p>
      )}
    </section>
  );
}
