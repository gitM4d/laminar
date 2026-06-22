import { isAddress } from "viem";
import { AAVE_V3_BASE_EXECUTION_CONFIG } from "../aave/aaveExecutionConfig.js";
import { validateTransactionPlan } from "../safety/validateTransactionPlan.js";
import type { EncodedTransactionRequest } from "../types.js";
import type {
  SimulateTransactionPlanInput,
  SimulatedTransactionResult,
  SimulationPublicClient,
  TransactionSimulationResult,
  TransactionSimulationSummary,
} from "./types.js";
import {
  INVALID_CHAIN_ID_ERROR_CODE,
  MISSING_WALLET_ADDRESS_ERROR_CODE,
  NO_ENCODED_TRANSACTIONS_ERROR_CODE,
  SAFETY_VALIDATION_SKIP_REASON,
  SIMULATION_REVERTED_ERROR_CODE,
  SUPPLY_ALLOWANCE_SIMULATION_HINT,
} from "./types.js";

export class MissingWalletAddressError extends Error {
  readonly code = MISSING_WALLET_ADDRESS_ERROR_CODE;

  constructor(message = "walletAddress is required for transaction simulation.") {
    super(message);
    this.name = "MissingWalletAddressError";
  }
}

function buildSummary(
  results: SimulatedTransactionResult[],
): TransactionSimulationSummary {
  const simulatedTransactions = results.filter((result) => result.skipped !== true)
    .length;
  const successfulSimulations = results.filter(
    (result) => result.skipped !== true && result.success,
  ).length;
  const failedSimulations = results.filter(
    (result) => result.skipped !== true && !result.success,
  ).length;

  return {
    totalTransactions: results.length,
    simulatedTransactions,
    successfulSimulations,
    failedSimulations,
  };
}

function buildSkippedResults(
  transactions: EncodedTransactionRequest[],
  skipReason: string,
  errorCode: string,
  errorMessage: string,
): SimulatedTransactionResult[] {
  return transactions.map((transaction, transactionIndex) => ({
    transactionIndex,
    type: transaction.type,
    description: transaction.description,
    success: false,
    skipped: true,
    skipReason,
    errorCode,
    errorMessage,
  }));
}

function resolveWalletAddress(walletAddress: string | undefined): `0x${string}` {
  if (walletAddress === undefined || walletAddress.trim() === "") {
    throw new MissingWalletAddressError();
  }

  if (!isAddress(walletAddress)) {
    throw new MissingWalletAddressError(
      `walletAddress must be a valid EVM address, got "${walletAddress}".`,
    );
  }

  return walletAddress as `0x${string}`;
}

function formatSimulationErrorMessage(
  transaction: EncodedTransactionRequest,
  transactions: EncodedTransactionRequest[],
  transactionIndex: number,
  error: unknown,
): string {
  const baseMessage =
    error instanceof Error ? error.message : "Transaction simulation reverted.";

  if (transaction.type !== "aave-supply") {
    return baseMessage;
  }

  const hasPriorApprove = transactions.some(
    (candidate, index) =>
      index < transactionIndex && candidate.type === "erc20-approve",
  );

  if (!hasPriorApprove) {
    return baseMessage;
  }

  return `${baseMessage} ${SUPPLY_ALLOWANCE_SIMULATION_HINT}`;
}

async function simulateEncodedTransaction(
  transaction: EncodedTransactionRequest,
  transactionIndex: number,
  transactions: EncodedTransactionRequest[],
  account: `0x${string}`,
  publicClient: SimulationPublicClient,
): Promise<SimulatedTransactionResult> {
  try {
    await publicClient.call({
      account,
      to: transaction.to as `0x${string}`,
      data: transaction.data,
      value: 0n,
    });

    return {
      transactionIndex,
      type: transaction.type,
      description: transaction.description,
      success: true,
    };
  } catch (error) {
    return {
      transactionIndex,
      type: transaction.type,
      description: transaction.description,
      success: false,
      errorCode: SIMULATION_REVERTED_ERROR_CODE,
      errorMessage: formatSimulationErrorMessage(
        transaction,
        transactions,
        transactionIndex,
        error,
      ),
    };
  }
}

export async function simulateTransactionPlan(
  input: SimulateTransactionPlanInput,
): Promise<TransactionSimulationResult> {
  const { plan, walletAddress, publicClient } = input;
  const chainId = AAVE_V3_BASE_EXECUTION_CONFIG.chainId;
  const encodedTransactions = plan.encodedTransactions;
  const safety = validateTransactionPlan(plan);

  if (!safety.safe) {
    if (encodedTransactions === undefined || encodedTransactions.length === 0) {
      return {
        simulated: false,
        safeToSimulate: false,
        chainId,
        results: [
          {
            transactionIndex: 0,
            type: "unknown",
            description: "No encoded transactions",
            success: false,
            skipped: true,
            skipReason: NO_ENCODED_TRANSACTIONS_ERROR_CODE,
            errorCode: NO_ENCODED_TRANSACTIONS_ERROR_CODE,
            errorMessage: "No encoded transactions available to simulate.",
          },
        ],
        summary: {
          totalTransactions: 0,
          simulatedTransactions: 0,
          successfulSimulations: 0,
          failedSimulations: 0,
        },
      };
    }

    const results = buildSkippedResults(
      encodedTransactions,
      SAFETY_VALIDATION_SKIP_REASON,
      SAFETY_VALIDATION_SKIP_REASON,
      "Simulation skipped because safety validation failed.",
    );

    return {
      simulated: false,
      safeToSimulate: false,
      chainId,
      results,
      summary: buildSummary(results),
    };
  }

  if (encodedTransactions === undefined || encodedTransactions.length === 0) {
    return {
      simulated: false,
      safeToSimulate: false,
      chainId,
      results: [
        {
          transactionIndex: 0,
          type: "unknown",
          description: "No encoded transactions",
          success: false,
          skipped: true,
          skipReason: NO_ENCODED_TRANSACTIONS_ERROR_CODE,
          errorCode: NO_ENCODED_TRANSACTIONS_ERROR_CODE,
          errorMessage: "No encoded transactions available to simulate.",
        },
      ],
      summary: {
        totalTransactions: 0,
        simulatedTransactions: 0,
        successfulSimulations: 0,
        failedSimulations: 0,
      },
    };
  }

  const invalidChainTransaction = encodedTransactions.find(
    (transaction) => transaction.chainId !== chainId,
  );

  if (invalidChainTransaction !== undefined) {
    const results = buildSkippedResults(
      encodedTransactions,
      INVALID_CHAIN_ID_ERROR_CODE,
      INVALID_CHAIN_ID_ERROR_CODE,
      `Expected chainId ${chainId}, got ${invalidChainTransaction.chainId}.`,
    );

    return {
      simulated: false,
      safeToSimulate: false,
      chainId,
      results,
      summary: buildSummary(results),
    };
  }

  const account = resolveWalletAddress(walletAddress);
  const results: SimulatedTransactionResult[] = [];

  for (let transactionIndex = 0; transactionIndex < encodedTransactions.length; transactionIndex++) {
    const transaction = encodedTransactions[transactionIndex];
    if (transaction === undefined) {
      continue;
    }

    results.push(
      await simulateEncodedTransaction(
        transaction,
        transactionIndex,
        encodedTransactions,
        account,
        publicClient,
      ),
    );
  }

  return {
    simulated: true,
    safeToSimulate: true,
    chainId,
    results,
    summary: buildSummary(results),
  };
}
