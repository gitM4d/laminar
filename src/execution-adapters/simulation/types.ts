import type { TransactionRequestPlan } from "../types.js";

export type SimulatedTransactionResult = {
  transactionIndex: number;
  type: string;
  description: string;
  success: boolean;
  skipped?: boolean;
  skipReason?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type TransactionSimulationSummary = {
  totalTransactions: number;
  simulatedTransactions: number;
  successfulSimulations: number;
  failedSimulations: number;
};

export type TransactionSimulationResult = {
  simulated: boolean;
  safeToSimulate: boolean;
  chainId: number;
  results: SimulatedTransactionResult[];
  summary: TransactionSimulationSummary;
};

export type SimulationPublicClient = {
  call(args: {
    account: `0x${string}`;
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }): Promise<{ data?: `0x${string}` }>;
};

export type SimulateTransactionPlanInput = {
  plan: TransactionRequestPlan;
  walletAddress: string | undefined;
  publicClient: SimulationPublicClient;
};

export const SUPPLY_ALLOWANCE_SIMULATION_HINT =
  "Supply simulation may fail until approval transaction is mined.";

export const SAFETY_VALIDATION_SKIP_REASON = "SAFETY_VALIDATION_FAILED";

export const NO_ENCODED_TRANSACTIONS_ERROR_CODE = "NO_ENCODED_TRANSACTIONS";

export const MISSING_WALLET_ADDRESS_ERROR_CODE = "MISSING_WALLET_ADDRESS";

export const INVALID_CHAIN_ID_ERROR_CODE = "INVALID_CHAIN_ID";

export const SIMULATION_REVERTED_ERROR_CODE = "SIMULATION_REVERTED";
