import type { ExecutionIntent } from "../core/execution/types.js";

export type PlannedTransactionType = "erc20-approve" | "aave-supply";

export type PlannedTransaction = {
  type: PlannedTransactionType;
  target: string;
  functionName: string;
  description: string;
  asset: string;
  amountUsd: number;
  executionRequired: true;
};

export type TransactionRequestPlan = {
  version: "tx-plan-v1";
  protocolId: string;
  intentId: string;
  informationalOnly: true;
  transactions: PlannedTransaction[];
  encodedTransactions?: EncodedTransactionRequest[];
  warnings: string[];
};

export type EncodedTransactionRequest = {
  to: string;
  data: `0x${string}`;
  value: "0";
  chainId: 8453;
  description: string;
  type: PlannedTransactionType;
  asset: string;
  amountUsd: number;
};

export type AaveSupplyTransactionPlan = TransactionRequestPlan;

export interface ExecutionAdapter {
  protocolId: string;
  buildTransactions(intent: ExecutionIntent): Promise<TransactionRequestPlan>;
}

export class UnsupportedExecutionIntentError extends Error {
  readonly protocolId: string;
  readonly intentId: string;
  readonly reason: string;

  constructor(protocolId: string, intentId: string, reason: string) {
    super(
      `Unsupported execution intent for ${protocolId} (${intentId}): ${reason}`,
    );
    this.name = "UnsupportedExecutionIntentError";
    this.protocolId = protocolId;
    this.intentId = intentId;
    this.reason = reason;
  }
}

export class MissingExecutionAddressError extends Error {
  constructor(message = "userAddress is required for calldata generation.") {
    super(message);
    this.name = "MissingExecutionAddressError";
  }
}

export class UnsupportedExecutionAssetError extends Error {
  readonly asset: string;

  constructor(asset: string) {
    super(`Unsupported execution asset "${asset}".`);
    this.name = "UnsupportedExecutionAssetError";
    this.asset = asset;
  }
}

export class InvalidExecutionAmountError extends Error {
  readonly amountUsd: number;

  constructor(amountUsd: number, reason: string) {
    super(`Invalid execution amount (${amountUsd}): ${reason}`);
    this.name = "InvalidExecutionAmountError";
    this.amountUsd = amountUsd;
  }
}
