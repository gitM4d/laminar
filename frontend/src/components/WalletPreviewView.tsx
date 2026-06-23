import { useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
} from "wagmi";
import {
  isBaseChainId,
  selectAaveSupplyIntents,
} from "@laminar/frontend-safe";
import {
  buildAaveWalletPreviews,
} from "../preview/buildAaveWalletPreviews.js";
import { AaveIntentPreviewPanel } from "./AaveIntentPreviewPanel.js";
import type { ExecutionIntentPlan } from "../types.js";
import { wagmiConfig } from "../wallet/wagmiConfig.js";

type WalletPreviewViewProps = {
  executionIntentPlan: ExecutionIntentPlan | undefined;
};

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
  const [previews, setPreviews] = useState<Awaited<ReturnType<typeof buildAaveWalletPreviews>>>([]);
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
        Preview and limited approval execution only. Supply execution remains
        disabled. Review wallet prompts carefully before confirming.
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
        <AaveIntentPreviewPanel
          key={preview.intent.id}
          preview={preview}
          walletAddress={address}
          isConnected={isConnected}
          onBaseChain={onBaseChain}
          chainId={chainId}
        />
      ))}

      {previews.length > 0 && (
        <p className="muted wallet-preview-footnote">
          Note: Only ERC20 approve can be executed in this sprint. Supply
          execution is disabled.
        </p>
      )}
    </section>
  );
}
