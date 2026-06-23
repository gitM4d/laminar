import { useEffect, useRef, useState } from "react";
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  BASE_CHAIN_ID,
  type TransactionRequestPlan,
  type TransactionSafetyValidation,
  type TransactionSimulationResult,
} from "@laminar/frontend-safe";
import {
  buildBaseScanTransactionUrl,
} from "./approvalExecutionGuards.js";
import {
  formatSupplyAmount,
  getAavePoolAddress,
  getSupplyExecutionEligibility,
} from "./supplyExecutionGuards.js";

type SupplyExecutionViewProps = {
  plan: TransactionRequestPlan;
  safetyValidation: TransactionSafetyValidation;
  simulationResult: TransactionSimulationResult | null;
  simulationLoading: boolean;
  chainId: number | undefined;
  walletConnected: boolean;
  approvalConfirmed: boolean;
  allowanceSufficient: boolean;
  onSupplyConfirmed: () => void;
};

type SupplyExecutionPhase =
  | "idle"
  | "pending_wallet"
  | "submitted"
  | "confirmed"
  | "failed";

function resolveFailureMessage(error: unknown): string {
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();

    if (
      normalized.includes("user rejected") ||
      normalized.includes("user denied") ||
      normalized.includes("rejected the request")
    ) {
      return "User rejected the supply transaction.";
    }

    if (normalized.includes("revert")) {
      return "Supply transaction reverted.";
    }

    return error.message;
  }

  return "Unknown wallet error during supply.";
}

export function SupplyExecutionView({
  plan,
  safetyValidation,
  simulationResult,
  simulationLoading,
  chainId,
  walletConnected,
  approvalConfirmed,
  allowanceSufficient,
  onSupplyConfirmed,
}: SupplyExecutionViewProps) {
  const eligibility = getSupplyExecutionEligibility({
    plan,
    safetyValidation,
    simulationResult,
    chainId,
    walletConnected,
    approvalConfirmed,
    allowanceSufficient,
  });
  const {
    sendTransactionAsync,
    data: transactionHash,
    error: sendError,
    isPending: isSending,
    reset: resetSendState,
  } = useSendTransaction();
  const {
    isLoading: isConfirming,
    isSuccess: isReceiptSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });
  const [phase, setPhase] = useState<SupplyExecutionPhase>("idle");
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmedHash, setConfirmedHash] = useState<string | null>(null);
  const hasReportedConfirmation = useRef(false);

  const supplyTransaction =
    eligibility.supplyTransactionIndex !== undefined
      ? plan.encodedTransactions?.[eligibility.supplyTransactionIndex]
      : undefined;

  useEffect(() => {
    if (
      isReceiptSuccess &&
      transactionHash !== undefined &&
      phase === "submitted" &&
      !hasReportedConfirmation.current
    ) {
      hasReportedConfirmation.current = true;
      setPhase("confirmed");
      setConfirmedHash(transactionHash);
      onSupplyConfirmed();
    }
  }, [isReceiptSuccess, onSupplyConfirmed, phase, transactionHash]);

  useEffect(() => {
    if (isReceiptError) {
      setPhase("failed");
      setLocalError(resolveFailureMessage(receiptError));
    }
  }, [isReceiptError, receiptError]);

  useEffect(() => {
    if (sendError !== null && phase === "pending_wallet") {
      setPhase("failed");
      setLocalError(resolveFailureMessage(sendError));
    }
  }, [phase, sendError]);

  async function handleSupplyClick() {
    if (!eligibility.eligible || supplyTransaction === undefined) {
      return;
    }

    setLocalError(null);
    resetSendState();
    setPhase("pending_wallet");

    try {
      await sendTransactionAsync({
        to: supplyTransaction.to as `0x${string}`,
        data: supplyTransaction.data,
        value: 0n,
        chainId: BASE_CHAIN_ID,
      });
      setPhase("submitted");
    } catch (error) {
      setPhase("failed");
      setLocalError(resolveFailureMessage(error));
    }
  }

  const activeHash = confirmedHash ?? transactionHash;
  const showReadyButton =
    eligibility.eligible &&
    supplyTransaction !== undefined &&
    phase !== "confirmed" &&
    !isSending &&
    !isConfirming;

  return (
    <div className="wallet-preview-supply">
      <h4>Supply Execution</h4>

      {!walletConnected && (
        <p className="muted wallet-preview-message">Connect wallet to supply.</p>
      )}

      {walletConnected && eligibility.reasonCode === "WRONG_CHAIN" && (
        <p className="wallet-preview-warning wallet-preview-message">
          {eligibility.reasonMessage}
        </p>
      )}

      {walletConnected && eligibility.reasonCode === "SAFETY_FAILED" && (
        <p className="wallet-preview-message">{eligibility.reasonMessage}</p>
      )}

      {walletConnected &&
        eligibility.reasonCode === "ALLOWANCE_NOT_SUFFICIENT" && (
          <p className="wallet-preview-message">{eligibility.reasonMessage}</p>
        )}

      {walletConnected &&
        eligibility.reasonCode === "SUPPLY_SIMULATION_FAILED" &&
        !simulationLoading && (
          <>
            <p className="wallet-preview-message">{eligibility.reasonMessage}</p>
            {eligibility.supplySimulationErrorMessage !== undefined && (
              <p className="wallet-preview-error wallet-preview-message">
                {eligibility.supplySimulationErrorMessage}
              </p>
            )}
          </>
        )}

      {walletConnected &&
        eligibility.reasonCode !== "WRONG_CHAIN" &&
        eligibility.reasonCode !== "WALLET_NOT_CONNECTED" &&
        eligibility.reasonCode !== "SAFETY_FAILED" &&
        eligibility.reasonCode !== "ALLOWANCE_NOT_SUFFICIENT" &&
        eligibility.reasonCode !== "SUPPLY_SIMULATION_FAILED" &&
        !eligibility.eligible &&
        eligibility.reasonMessage !== undefined && (
          <p className="wallet-preview-message">{eligibility.reasonMessage}</p>
        )}

      {showReadyButton && supplyTransaction !== undefined && (
        <>
          <ul className="wallet-preview-supply-details">
            <li>
              Amount: {formatSupplyAmount(supplyTransaction.amountUsd)}
            </li>
            <li>Asset: {supplyTransaction.asset}</li>
            <li>
              Protocol: Aave ({getAavePoolAddress().slice(0, 6)}...
              {getAavePoolAddress().slice(-4)})
            </li>
          </ul>

          <div className="wallet-preview-supply-warnings">
            <p>This transaction deposits funds into Aave.</p>
            <p>This is a real transaction, not a simulation.</p>
            <p>
              {approvalConfirmed
                ? "Approval was confirmed before this step."
                : "Existing on-chain allowance is sufficient for this amount."}
            </p>
            <p>Supply simulation succeeded before enabling this button.</p>
            <p>Review your wallet transaction before confirming.</p>
          </div>

          <button
            type="button"
            className="button wallet-preview-supply-button"
            onClick={() => {
              void handleSupplyClick();
            }}
          >
            Supply {supplyTransaction.asset} to Aave
          </button>
        </>
      )}

      {phase === "pending_wallet" && isSending && (
        <p className="status wallet-preview-message">
          Waiting for wallet confirmation...
        </p>
      )}

      {activeHash !== undefined && activeHash !== null && phase !== "failed" && (
        <div className="wallet-preview-supply-status">
          <p>
            Transaction hash: <code>{activeHash}</code>
          </p>
          <p>
            <a
              href={buildBaseScanTransactionUrl(activeHash)}
              target="_blank"
              rel="noreferrer"
            >
              View on BaseScan
            </a>
          </p>
          {phase === "submitted" && isConfirming && (
            <p className="status wallet-preview-message">
              Waiting for confirmation...
            </p>
          )}
        </div>
      )}

      {phase === "confirmed" && supplyTransaction !== undefined && (
        <div className="wallet-preview-supply-completed">
          <p className="status wallet-preview-message">
            Supply confirmed. Deposit completed.
          </p>
          <ul className="wallet-preview-supply-details">
            <li>Asset: {supplyTransaction.asset}</li>
            <li>Amount: {formatSupplyAmount(supplyTransaction.amountUsd)}</li>
            <li>Protocol: Aave</li>
            <li>
              Transaction hash: <code>{confirmedHash ?? activeHash}</code>
            </li>
            <li>Receipt status: confirmed</li>
          </ul>
        </div>
      )}

      {phase === "failed" && localError !== null && (
        <p className="wallet-preview-error wallet-preview-message">
          {localError}
        </p>
      )}
    </div>
  );
}
