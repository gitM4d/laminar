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
  formatApprovalAmount,
  getApprovalExecutionEligibility,
  getAavePoolSpenderAddress,
} from "./approvalExecutionGuards.js";

type ApprovalExecutionViewProps = {
  plan: TransactionRequestPlan;
  safetyValidation: TransactionSafetyValidation;
  simulationResult: TransactionSimulationResult | null;
  simulationLoading: boolean;
  chainId: number | undefined;
  walletConnected: boolean;
  allowanceSufficient: boolean;
  onApprovalConfirmed: () => void;
};

type ApprovalExecutionPhase =
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
      return "User rejected the approval transaction.";
    }

    return error.message;
  }

  return "Unknown wallet error during approval.";
}

export function ApprovalExecutionView({
  plan,
  safetyValidation,
  simulationResult,
  simulationLoading,
  chainId,
  walletConnected,
  allowanceSufficient,
  onApprovalConfirmed,
}: ApprovalExecutionViewProps) {
  const eligibility = getApprovalExecutionEligibility({
    plan,
    safetyValidation,
    simulationResult,
    chainId,
    walletConnected,
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
  const [phase, setPhase] = useState<ApprovalExecutionPhase>("idle");
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmedHash, setConfirmedHash] = useState<string | null>(null);
  const hasReportedConfirmation = useRef(false);

  const approveTransaction =
    eligibility.approveTransactionIndex !== undefined
      ? plan.encodedTransactions?.[eligibility.approveTransactionIndex]
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
      onApprovalConfirmed();
    }
  }, [isReceiptSuccess, onApprovalConfirmed, phase, transactionHash]);

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

  async function handleApproveClick() {
    if (!eligibility.eligible || approveTransaction === undefined) {
      return;
    }

    setLocalError(null);
    resetSendState();
    setPhase("pending_wallet");

    try {
      await sendTransactionAsync({
        to: approveTransaction.to as `0x${string}`,
        data: approveTransaction.data,
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
    approveTransaction !== undefined &&
    !allowanceSufficient &&
    phase !== "confirmed" &&
    !isSending &&
    !isConfirming;

  return (
    <div className="wallet-preview-approval">
      <h4>Approval Execution</h4>

      {!walletConnected && (
        <p className="muted wallet-preview-message">Connect wallet to approve.</p>
      )}

      {walletConnected && eligibility.reasonCode === "WRONG_CHAIN" && (
        <p className="wallet-preview-warning wallet-preview-message">
          {eligibility.reasonMessage}
        </p>
      )}

      {walletConnected &&
        eligibility.reasonCode === "SAFETY_FAILED" && (
          <p className="wallet-preview-message">{eligibility.reasonMessage}</p>
        )}

      {walletConnected &&
        eligibility.reasonCode === "APPROVE_SIMULATION_FAILED" &&
        !simulationLoading && (
          <p className="wallet-preview-message">{eligibility.reasonMessage}</p>
        )}

      {walletConnected &&
        eligibility.reasonCode !== "WRONG_CHAIN" &&
        eligibility.reasonCode !== "WALLET_NOT_CONNECTED" &&
        eligibility.reasonCode !== "SAFETY_FAILED" &&
        eligibility.reasonCode !== "APPROVE_SIMULATION_FAILED" &&
        !eligibility.eligible &&
        eligibility.reasonMessage !== undefined && (
          <p className="wallet-preview-message">{eligibility.reasonMessage}</p>
        )}

      {walletConnected &&
        allowanceSufficient &&
        phase !== "confirmed" && (
          <p className="status wallet-preview-message">
            Approval already sufficient.
          </p>
        )}

      {showReadyButton && approveTransaction !== undefined && (
        <>
          <ul className="wallet-preview-approval-details">
            <li>
              Amount: {formatApprovalAmount(approveTransaction.amountUsd)}
            </li>
            <li>Token: {approveTransaction.asset}</li>
            <li>
              Spender: Aave Pool ({getAavePoolSpenderAddress().slice(0, 6)}...
              {getAavePoolSpenderAddress().slice(-4)})
            </li>
          </ul>

          <div className="wallet-preview-approval-warnings">
            <p>This only approves token spending. It does not deposit funds.</p>
            <p>Approval amount is limited to the previewed amount.</p>
            <p>Review the transaction in your wallet before confirming.</p>
            <p>
              This approves Aave Pool to spend this exact amount. No funds are
              deposited yet.
            </p>
          </div>

          <button
            type="button"
            className="button wallet-preview-approve-button"
            onClick={() => {
              void handleApproveClick();
            }}
          >
            Approve {approveTransaction.asset}
          </button>
        </>
      )}

      {phase === "pending_wallet" && isSending && (
        <p className="status wallet-preview-message">
          Waiting for wallet confirmation...
        </p>
      )}

      {activeHash !== undefined && activeHash !== null && phase !== "failed" && (
        <div className="wallet-preview-approval-status">
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

      {phase === "confirmed" && (
        <p className="status wallet-preview-message">Approval confirmed.</p>
      )}

      {phase === "failed" && localError !== null && (
        <p className="wallet-preview-error wallet-preview-message">
          {localError}
        </p>
      )}
    </div>
  );
}
