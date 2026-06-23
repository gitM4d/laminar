import {
  AAVE_V3_BASE_EXECUTION_CONFIG,
  AAVE_POOL_SUPPLY_SELECTOR,
  BASE_CHAIN_ID,
  getAaveExecutionAssetConfig,
  isAaveExecutionSupportedAsset,
  type EncodedTransactionRequest,
  type TransactionRequestPlan,
  type TransactionSafetyValidation,
  type TransactionSimulationResult,
} from "@laminar/frontend-safe";

export type SupplyExecutionReasonCode =
  | "WALLET_NOT_CONNECTED"
  | "WRONG_CHAIN"
  | "NO_ENCODED_TRANSACTIONS"
  | "SAFETY_FAILED"
  | "NO_SUPPLY_TRANSACTION"
  | "MULTIPLE_SUPPLY_TRANSACTIONS"
  | "ALLOWANCE_NOT_SUFFICIENT"
  | "SUPPLY_SIMULATION_FAILED"
  | "INVALID_SUPPLY_TRANSACTION"
  | "READY";

export type SupplyExecutionEligibility = {
  eligible: boolean;
  reasonCode?: SupplyExecutionReasonCode;
  reasonMessage?: string;
  supplyTransactionIndex?: number;
  supplySimulationErrorMessage?: string;
};

export type SupplyExecutionEligibilityInput = {
  plan: TransactionRequestPlan;
  safetyValidation: TransactionSafetyValidation;
  simulationResult: TransactionSimulationResult | null;
  chainId: number | undefined;
  walletConnected: boolean;
  approvalConfirmed: boolean;
  allowanceSufficient: boolean;
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

export function isValidSupplyTransaction(
  transaction: EncodedTransactionRequest,
): boolean {
  if (transaction.type !== "aave-supply") {
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
      .startsWith(AAVE_POOL_SUPPLY_SELECTOR.toLowerCase())
  ) {
    return false;
  }

  if (
    normalizeAddress(transaction.to) !==
    normalizeAddress(AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress)
  ) {
    return false;
  }

  if (!isAaveExecutionSupportedAsset(transaction.asset)) {
    return false;
  }

  return !hasForbiddenExecutionFields(transaction);
}

export function getSupplyExecutionEligibility(
  input: SupplyExecutionEligibilityInput,
): SupplyExecutionEligibility {
  const {
    plan,
    safetyValidation,
    simulationResult,
    chainId,
    walletConnected,
    approvalConfirmed,
    allowanceSufficient,
  } = input;

  if (!walletConnected) {
    return {
      eligible: false,
      reasonCode: "WALLET_NOT_CONNECTED",
      reasonMessage: "Connect wallet to supply.",
    };
  }

  if (chainId !== BASE_CHAIN_ID) {
    return {
      eligible: false,
      reasonCode: "WRONG_CHAIN",
      reasonMessage: "Switch to Base before supplying.",
    };
  }

  const encodedTransactions = plan.encodedTransactions;

  if (encodedTransactions === undefined || encodedTransactions.length === 0) {
    return {
      eligible: false,
      reasonCode: "NO_ENCODED_TRANSACTIONS",
      reasonMessage: "No encoded transactions available to supply.",
    };
  }

  if (!safetyValidation.safe) {
    return {
      eligible: false,
      reasonCode: "SAFETY_FAILED",
      reasonMessage: "Supply disabled because safety validation failed.",
    };
  }

  if (!approvalConfirmed && !allowanceSufficient) {
    return {
      eligible: false,
      reasonCode: "ALLOWANCE_NOT_SUFFICIENT",
      reasonMessage:
        "Supply requires a confirmed approval or sufficient existing allowance.",
    };
  }

  const supplyTransactionIndexes = encodedTransactions.reduce<number[]>(
    (indexes, transaction, transactionIndex) => {
      if (transaction.type === "aave-supply") {
        indexes.push(transactionIndex);
      }

      return indexes;
    },
    [],
  );

  if (supplyTransactionIndexes.length === 0) {
    return {
      eligible: false,
      reasonCode: "NO_SUPPLY_TRANSACTION",
      reasonMessage: "No supply transaction available in this preview.",
    };
  }

  if (supplyTransactionIndexes.length > 1) {
    return {
      eligible: false,
      reasonCode: "MULTIPLE_SUPPLY_TRANSACTIONS",
      reasonMessage:
        "Supply disabled because multiple supply transactions were found.",
    };
  }

  const supplyTransactionIndex = supplyTransactionIndexes[0]!;
  const supplyTransaction = encodedTransactions[supplyTransactionIndex];

  if (
    supplyTransaction === undefined ||
    !isValidSupplyTransaction(supplyTransaction)
  ) {
    return {
      eligible: false,
      reasonCode: "INVALID_SUPPLY_TRANSACTION",
      reasonMessage:
        "Supply disabled because the supply transaction is invalid.",
    };
  }

  if (simulationResult === null || !simulationResult.simulated) {
    return {
      eligible: false,
      reasonCode: "SUPPLY_SIMULATION_FAILED",
      reasonMessage: "Supply disabled because simulation failed.",
    };
  }

  const supplySimulationResult = simulationResult.results.find(
    (result) => result.transactionIndex === supplyTransactionIndex,
  );

  if (
    supplySimulationResult === undefined ||
    supplySimulationResult.skipped === true ||
    !supplySimulationResult.success
  ) {
    return {
      eligible: false,
      reasonCode: "SUPPLY_SIMULATION_FAILED",
      reasonMessage: "Supply disabled because simulation failed.",
      supplySimulationErrorMessage: supplySimulationResult?.errorMessage,
    };
  }

  return {
    eligible: true,
    reasonCode: "READY",
    supplyTransactionIndex,
  };
}

export function formatSupplyAmount(amountUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);
}

export function getAavePoolAddress(): string {
  return AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress;
}
