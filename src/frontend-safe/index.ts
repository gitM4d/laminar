/**
 * Frontend-safe public API for wallet preview and execution calldata preview.
 *
 * The frontend must import only from this module — never from arbitrary src/
 * paths (providers, API server, CLI tools, env config, etc.).
 */

export { AaveExecutionAdapter } from "../execution-adapters/aave/AaveExecutionAdapter.js";
export type { AaveExecutionAdapterOptions } from "../execution-adapters/aave/AaveExecutionAdapter.js";

export { buildAaveSupplyCalldata } from "../execution-adapters/aave/buildAaveCalldata.js";
export type { BuildAaveSupplyCalldataInput } from "../execution-adapters/aave/buildAaveCalldata.js";

export { validateTransactionPlan } from "../execution-adapters/safety/validateTransactionPlan.js";

export {
  BASE_CHAIN_ID,
  formatAaveSupplyIntentLabel,
  formatShortTxData,
  isBaseChainId,
  selectAaveSupplyIntents,
  shortenAddress,
} from "../execution-adapters/preview/walletPreviewHelpers.js";

export type { ExecutionIntent } from "../core/execution/types.js";

export type {
  EncodedTransactionRequest,
  PlannedTransaction,
  PlannedTransactionType,
  TransactionRequestPlan,
} from "../execution-adapters/types.js";

export type {
  TransactionSafetyIssue,
  TransactionSafetyValidation,
} from "../execution-adapters/safety/types.js";
