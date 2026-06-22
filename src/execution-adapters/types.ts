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
  warnings: string[];
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
