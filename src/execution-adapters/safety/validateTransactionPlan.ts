import { toFunctionSelector } from "viem";
import {
  AAVE_EXECUTION_SUPPORTED_ASSETS,
  AAVE_V3_BASE_EXECUTION_CONFIG,
  getAaveExecutionAssetConfig,
  isAaveExecutionSupportedAsset,
} from "../aave/aaveExecutionConfig.js";
import { ERC20_APPROVE_SELECTOR } from "../aave/aaveExecutionAbi.js";
import type {
  EncodedTransactionRequest,
  PlannedTransactionType,
  TransactionRequestPlan,
} from "../types.js";
import type {
  TransactionSafetyIssue,
  TransactionSafetyValidation,
} from "./types.js";

const BASE_CHAIN_ID = AAVE_V3_BASE_EXECUTION_CONFIG.chainId;
const AAVE_POOL_SUPPLY_SELECTOR = toFunctionSelector(
  "supply(address,uint256,address,uint16)",
);

const ALLOWED_TRANSACTION_TYPES = new Set<PlannedTransactionType>([
  "erc20-approve",
  "aave-supply",
]);

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

function buildAllowlistedTargets(): Set<string> {
  const targets = new Set<string>([
    normalizeAddress(AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress),
  ]);

  for (const asset of AAVE_EXECUTION_SUPPORTED_ASSETS) {
    targets.add(
      normalizeAddress(getAaveExecutionAssetConfig(asset).underlyingAddress),
    );
  }

  return targets;
}

function addIssue(
  issues: TransactionSafetyIssue[],
  issue: TransactionSafetyIssue,
): void {
  issues.push(issue);
}

function isZeroNativeValue(value: unknown): boolean {
  if (value === "0") {
    return true;
  }

  if (typeof value === "bigint" && value === 0n) {
    return true;
  }

  return false;
}

function expectedSelectorForType(type: PlannedTransactionType): string {
  if (type === "erc20-approve") {
    return ERC20_APPROVE_SELECTOR;
  }

  return AAVE_POOL_SUPPLY_SELECTOR;
}

function validateForbiddenRuntimeFields(
  transaction: EncodedTransactionRequest,
  index: number,
  errors: TransactionSafetyIssue[],
): void {
  const runtimeTransaction = transaction as EncodedTransactionRequest &
    Record<string, unknown>;

  for (const field of FORBIDDEN_EXECUTION_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(runtimeTransaction, field)) {
      addIssue(errors, {
        code: "FORBIDDEN_EXECUTION_FIELD",
        severity: "error",
        transactionIndex: index,
        message: `Encoded transaction includes forbidden field "${field}".`,
      });
    }
  }
}

function validateEncodedTransaction(
  transaction: EncodedTransactionRequest,
  index: number,
  allowlistedTargets: Set<string>,
  errors: TransactionSafetyIssue[],
  warnings: TransactionSafetyIssue[],
): void {
  validateForbiddenRuntimeFields(transaction, index, errors);

  if (transaction.chainId !== BASE_CHAIN_ID) {
    addIssue(errors, {
      code: "INVALID_CHAIN_ID",
      severity: "error",
      transactionIndex: index,
      message: `Expected chainId ${BASE_CHAIN_ID}, got ${String(transaction.chainId)}.`,
    });
  }

  const runtimeValue = (transaction as EncodedTransactionRequest & { value?: unknown })
    .value;

  if (!isZeroNativeValue(runtimeValue)) {
    addIssue(errors, {
      code: "NON_ZERO_NATIVE_VALUE",
      severity: "error",
      transactionIndex: index,
      message: "Native ETH value must be zero for Aave supply previews.",
    });
  }

  if (!allowlistedTargets.has(normalizeAddress(transaction.to))) {
    addIssue(errors, {
      code: "UNALLOWED_TARGET",
      severity: "error",
      transactionIndex: index,
      message: `Target address ${transaction.to} is not allowlisted for Aave supply previews.`,
    });
  }

  if (!ALLOWED_TRANSACTION_TYPES.has(transaction.type)) {
    addIssue(errors, {
      code: "UNALLOWED_TRANSACTION_TYPE",
      severity: "error",
      transactionIndex: index,
      message: `Transaction type "${transaction.type}" is not allowlisted.`,
    });
  }

  const expectedSelector = expectedSelectorForType(transaction.type);
  if (!transaction.data.toLowerCase().startsWith(expectedSelector.toLowerCase())) {
    addIssue(errors, {
      code: "FUNCTION_SELECTOR_MISMATCH",
      severity: "error",
      transactionIndex: index,
      message: `Calldata selector does not match transaction type "${transaction.type}".`,
    });
  }

  if (!(transaction.amountUsd > 0)) {
    addIssue(errors, {
      code: "INVALID_AMOUNT",
      severity: "error",
      transactionIndex: index,
      message: "Transaction amountUsd must be positive.",
    });
  }

  if (transaction.type === "erc20-approve") {
    if (!isAaveExecutionSupportedAsset(transaction.asset)) {
      addIssue(errors, {
        code: "APPROVE_TARGET_MISMATCH",
        severity: "error",
        transactionIndex: index,
        message: `Approval asset "${transaction.asset}" is not supported.`,
      });
    } else {
      const tokenAddress = getAaveExecutionAssetConfig(transaction.asset)
        .underlyingAddress;

      if (normalizeAddress(transaction.to) !== normalizeAddress(tokenAddress)) {
        addIssue(errors, {
          code: "APPROVE_TARGET_MISMATCH",
          severity: "error",
          transactionIndex: index,
          message: `Approval target must be the ${transaction.asset} token contract.`,
        });
      }
    }
  }

  if (transaction.type === "aave-supply") {
    if (
      normalizeAddress(transaction.to) !==
      normalizeAddress(AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress)
    ) {
      addIssue(errors, {
        code: "SUPPLY_TARGET_MISMATCH",
        severity: "error",
        transactionIndex: index,
        message: "Supply target must be the Aave Pool contract.",
      });
    }
  }

  if (transaction.description.trim() === "") {
    addIssue(warnings, {
      code: "MISSING_DESCRIPTION",
      severity: "warning",
      transactionIndex: index,
      message: "Encoded transaction description is missing.",
    });
  }
}

function validateApproveOrder(
  transactions: EncodedTransactionRequest[],
  errors: TransactionSafetyIssue[],
): void {
  for (const asset of AAVE_EXECUTION_SUPPORTED_ASSETS) {
    const approveIndex = transactions.findIndex(
      (transaction) =>
        transaction.type === "erc20-approve" && transaction.asset === asset,
    );
    const supplyIndex = transactions.findIndex(
      (transaction) =>
        transaction.type === "aave-supply" && transaction.asset === asset,
    );

    if (approveIndex === -1 || supplyIndex === -1) {
      continue;
    }

    if (supplyIndex < approveIndex) {
      addIssue(errors, {
        code: "APPROVE_ORDER_INVALID",
        severity: "error",
        transactionIndex: supplyIndex,
        message: `Supply for ${asset} appears before approval.`,
      });
    }
  }
}

function validateDuplicateApprovals(
  transactions: EncodedTransactionRequest[],
  warnings: TransactionSafetyIssue[],
): void {
  const approvalCounts = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "erc20-approve") {
      continue;
    }

    approvalCounts.set(
      transaction.asset,
      (approvalCounts.get(transaction.asset) ?? 0) + 1,
    );
  }

  for (const [asset, count] of approvalCounts.entries()) {
    if (count > 1) {
      addIssue(warnings, {
        code: "DUPLICATE_APPROVAL",
        severity: "warning",
        message: `More than one approval transaction exists for ${asset}.`,
      });
    }
  }
}

function buildSummary(
  transactions: EncodedTransactionRequest[] | undefined,
  errors: TransactionSafetyIssue[],
): TransactionSafetyValidation["summary"] {
  const totalTransactions = transactions?.length ?? 0;
  const blockedIndexes = new Set<number>();

  for (const error of errors) {
    if (error.transactionIndex !== undefined) {
      blockedIndexes.add(error.transactionIndex);
    }
  }

  return {
    totalTransactions,
    validatedTransactions: totalTransactions - blockedIndexes.size,
    blockedTransactions: blockedIndexes.size,
  };
}

export function validateTransactionPlan(
  plan: TransactionRequestPlan,
): TransactionSafetyValidation {
  const errors: TransactionSafetyIssue[] = [];
  const warnings: TransactionSafetyIssue[] = [];

  if (plan.informationalOnly !== true) {
    addIssue(errors, {
      code: "PLAN_NOT_INFORMATIONAL_ONLY",
      severity: "error",
      message: "Transaction plan must remain informationalOnly.",
    });
  }

  if (
    plan.encodedTransactions === undefined ||
    plan.encodedTransactions.length === 0
  ) {
    addIssue(errors, {
      code: "NO_ENCODED_TRANSACTIONS",
      severity: "error",
      message: "No encoded transactions are present to validate.",
    });

    return {
      safe: false,
      errors,
      warnings,
      summary: buildSummary(plan.encodedTransactions, errors),
    };
  }

  const allowlistedTargets = buildAllowlistedTargets();

  plan.encodedTransactions.forEach((transaction, index) => {
    validateEncodedTransaction(
      transaction,
      index,
      allowlistedTargets,
      errors,
      warnings,
    );
  });

  validateApproveOrder(plan.encodedTransactions, errors);
  validateDuplicateApprovals(plan.encodedTransactions, warnings);

  return {
    safe: errors.length === 0,
    errors,
    warnings,
    summary: buildSummary(plan.encodedTransactions, errors),
  };
}
