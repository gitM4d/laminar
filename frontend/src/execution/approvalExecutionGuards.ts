import {
  AAVE_V3_BASE_EXECUTION_CONFIG,
  BASE_CHAIN_ID,
  ERC20_APPROVE_SELECTOR,
  getAaveExecutionAssetConfig,
  isAaveExecutionSupportedAsset,
  type EncodedTransactionRequest,
  type TransactionRequestPlan,
  type TransactionSafetyValidation,
  type TransactionSimulationResult,
} from "@laminar/frontend-safe";

export type ApprovalExecutionReasonCode =
  | "WALLET_NOT_CONNECTED"
  | "WRONG_CHAIN"
  | "NO_ENCODED_TRANSACTIONS"
  | "SAFETY_FAILED"
  | "NO_APPROVE_TRANSACTION"
  | "MULTIPLE_APPROVE_TRANSACTIONS"
  | "APPROVE_SIMULATION_FAILED"
  | "INVALID_APPROVE_TRANSACTION"
  | "READY";

export type ApprovalExecutionEligibility = {
  eligible: boolean;
  reasonCode?: ApprovalExecutionReasonCode;
  reasonMessage?: string;
  approveTransactionIndex?: number;
};

export type ApprovalExecutionEligibilityInput = {
  plan: TransactionRequestPlan;
  safetyValidation: TransactionSafetyValidation;
  simulationResult: TransactionSimulationResult | null;
  chainId: number | undefined;
  walletConnected: boolean;
};

const FORBIDDEN_EXECUTION_FIELDS = [
  "privateKey",
  "signature",
  "signer",
  "wallet",
  "gas",
  "gasLimit",
  "maxFeePerGas",
  "maxPriorityFeePerGas",
  "nonce",
] as const;

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function hasForbiddenExecutionFields(
  transaction: EncodedTransactionRequest,
): boolean {
  const runtimeTransaction = transaction as EncodedTransactionRequest &
    Record<string, unknown>;

  return FORBIDDEN_EXECUTION_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(runtimeTransaction, field),
  );
}

export function isValidApproveTransaction(
  transaction: EncodedTransactionRequest,
): boolean {
  if (transaction.type !== "erc20-approve") {
    return false;
  }

  if (transaction.value !== "0") {
    return false;
  }

  if (transaction.chainId !== BASE_CHAIN_ID) {
    return false;
  }

  if (
    !transaction.data
      .toLowerCase()
      .startsWith(ERC20_APPROVE_SELECTOR.toLowerCase())
  ) {
    return false;
  }

  if (!isAaveExecutionSupportedAsset(transaction.asset)) {
    return false;
  }

  const tokenAddress = getAaveExecutionAssetConfig(transaction.asset)
    .underlyingAddress;

  if (normalizeAddress(transaction.to) !== normalizeAddress(tokenAddress)) {
    return false;
  }

  return !hasForbiddenExecutionFields(transaction);
}

export function getApprovalExecutionEligibility(
  input: ApprovalExecutionEligibilityInput,
): ApprovalExecutionEligibility {
  const {
    plan,
    safetyValidation,
    simulationResult,
    chainId,
    walletConnected,
  } = input;

  if (!walletConnected) {
    return {
      eligible: false,
      reasonCode: "WALLET_NOT_CONNECTED",
      reasonMessage: "Connect wallet to approve.",
    };
  }

  if (chainId !== BASE_CHAIN_ID) {
    return {
      eligible: false,
      reasonCode: "WRONG_CHAIN",
      reasonMessage: "Switch to Base before approval.",
    };
  }

  const encodedTransactions = plan.encodedTransactions;

  if (encodedTransactions === undefined || encodedTransactions.length === 0) {
    return {
      eligible: false,
      reasonCode: "NO_ENCODED_TRANSACTIONS",
      reasonMessage: "No encoded transactions available to approve.",
    };
  }

  if (!safetyValidation.safe) {
    return {
      eligible: false,
      reasonCode: "SAFETY_FAILED",
      reasonMessage: "Approval disabled because safety validation failed.",
    };
  }

  const approveTransactionIndexes = encodedTransactions.reduce<number[]>(
    (indexes, transaction, transactionIndex) => {
      if (transaction.type === "erc20-approve") {
        indexes.push(transactionIndex);
      }

      return indexes;
    },
    [],
  );

  if (approveTransactionIndexes.length === 0) {
    return {
      eligible: false,
      reasonCode: "NO_APPROVE_TRANSACTION",
      reasonMessage: "No approve transaction available in this preview.",
    };
  }

  if (approveTransactionIndexes.length > 1) {
    return {
      eligible: false,
      reasonCode: "MULTIPLE_APPROVE_TRANSACTIONS",
      reasonMessage: "Approval disabled because multiple approve transactions were found.",
    };
  }

  const approveTransactionIndex = approveTransactionIndexes[0]!;
  const approveTransaction = encodedTransactions[approveTransactionIndex];

  if (
    approveTransaction === undefined ||
    !isValidApproveTransaction(approveTransaction)
  ) {
    return {
      eligible: false,
      reasonCode: "INVALID_APPROVE_TRANSACTION",
      reasonMessage: "Approval disabled because the approve transaction is invalid.",
    };
  }

  if (simulationResult === null || !simulationResult.simulated) {
    return {
      eligible: false,
      reasonCode: "APPROVE_SIMULATION_FAILED",
      reasonMessage: "Approval disabled because simulation failed.",
    };
  }

  const approveSimulationResult = simulationResult.results.find(
    (result) => result.transactionIndex === approveTransactionIndex,
  );

  if (
    approveSimulationResult === undefined ||
    approveSimulationResult.skipped === true ||
    !approveSimulationResult.success
  ) {
    return {
      eligible: false,
      reasonCode: "APPROVE_SIMULATION_FAILED",
      reasonMessage: "Approval disabled because simulation failed.",
    };
  }

  return {
    eligible: true,
    reasonCode: "READY",
    approveTransactionIndex,
  };
}

export function getAavePoolSpenderAddress(): string {
  return AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress;
}

export function formatApprovalAmount(amountUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);
}

export function buildBaseScanTransactionUrl(transactionHash: string): string {
  return `https://basescan.org/tx/${transactionHash}`;
}
