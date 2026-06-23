import { describe, expect, it } from "vitest";
import {
  AAVE_V3_BASE_EXECUTION_CONFIG,
  BASE_CHAIN_ID,
  ERC20_APPROVE_SELECTOR,
  getAaveExecutionAssetConfig,
  type EncodedTransactionRequest,
  type TransactionRequestPlan,
  type TransactionSafetyValidation,
  type TransactionSimulationResult,
} from "@laminar/frontend-safe";
import {
  getApprovalExecutionEligibility,
  isValidApproveTransaction,
} from "./approvalExecutionGuards.js";

function createApproveTransaction(
  asset: "USDC" | "EURC" = "USDC",
  overrides: Partial<EncodedTransactionRequest> = {},
): EncodedTransactionRequest {
  const tokenAddress = getAaveExecutionAssetConfig(asset).underlyingAddress;

  return {
    to: tokenAddress,
    data: `${ERC20_APPROVE_SELECTOR}0000000000000000000000000000000000000000000000000000000000000000` as `0x${string}`,
    value: "0",
    chainId: BASE_CHAIN_ID,
    description: `Approve Aave Pool to spend ${asset}.`,
    type: "erc20-approve",
    asset,
    amountUsd: 1_000,
    ...overrides,
  };
}

function createSupplyTransaction(
  asset: "USDC" | "EURC" = "USDC",
): EncodedTransactionRequest {
  const tokenAddress = getAaveExecutionAssetConfig(asset).underlyingAddress;

  return {
    to: AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress,
    data: "0x617ba0370000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    value: "0",
    chainId: BASE_CHAIN_ID,
    description: `Supply ${asset} into Aave V3 Base.`,
    type: "aave-supply",
    asset,
    amountUsd: 1_000,
  };
}

function createPlan(
  encodedTransactions: EncodedTransactionRequest[] | undefined,
): TransactionRequestPlan {
  return {
    version: "tx-plan-v1",
    protocolId: "aave",
    intentId: "intent-usdc",
    informationalOnly: true,
    transactions: [],
    encodedTransactions,
    warnings: [],
  };
}

function createSafetyValidation(safe: boolean): TransactionSafetyValidation {
  return {
    safe,
    errors: safe ? [] : [{ code: "UNSAFE", severity: "error", message: "unsafe" }],
    warnings: [],
    summary: {
      totalTransactions: 2,
      validatedTransactions: safe ? 2 : 0,
      blockedTransactions: safe ? 0 : 2,
    },
  };
}

function createSimulationResult(
  approveSuccess: boolean,
  supplySuccess = false,
): TransactionSimulationResult {
  return {
    simulated: true,
    safeToSimulate: true,
    chainId: BASE_CHAIN_ID,
    results: [
      {
        transactionIndex: 0,
        type: "erc20-approve",
        description: "Approve Aave Pool to spend USDC.",
        success: approveSuccess,
      },
      {
        transactionIndex: 1,
        type: "aave-supply",
        description: "Supply USDC into Aave V3 Base.",
        success: supplySuccess,
      },
    ],
    summary: {
      totalTransactions: 2,
      simulatedTransactions: 2,
      successfulSimulations: Number(approveSuccess) + Number(supplySuccess),
      failedSimulations: Number(!approveSuccess) + Number(!supplySuccess),
    },
  };
}

function evaluate(overrides: Partial<Parameters<typeof getApprovalExecutionEligibility>[0]> = {}) {
  const plan = createPlan([
    createApproveTransaction("USDC"),
    createSupplyTransaction("USDC"),
  ]);

  return getApprovalExecutionEligibility({
    plan,
    safetyValidation: createSafetyValidation(true),
    simulationResult: createSimulationResult(true),
    chainId: BASE_CHAIN_ID,
    walletConnected: true,
    ...overrides,
  });
}

describe("approvalExecutionGuards", () => {
  it("returns ineligible when wallet is not connected", () => {
    const result = evaluate({ walletConnected: false });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("WALLET_NOT_CONNECTED");
  });

  it("returns ineligible on wrong chain", () => {
    const result = evaluate({ chainId: 1 });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("WRONG_CHAIN");
  });

  it("returns ineligible when encoded transactions are missing", () => {
    const result = evaluate({ plan: createPlan(undefined) });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("NO_ENCODED_TRANSACTIONS");
  });

  it("returns ineligible when safety validation failed", () => {
    const result = evaluate({
      safetyValidation: createSafetyValidation(false),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("SAFETY_FAILED");
  });

  it("returns ineligible when no approve transaction exists", () => {
    const result = evaluate({
      plan: createPlan([createSupplyTransaction("USDC")]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("NO_APPROVE_TRANSACTION");
  });

  it("returns ineligible when multiple approve transactions exist", () => {
    const result = evaluate({
      plan: createPlan([
        createApproveTransaction("USDC"),
        createApproveTransaction("EURC", { asset: "EURC" }),
        createSupplyTransaction("USDC"),
      ]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("MULTIPLE_APPROVE_TRANSACTIONS");
  });

  it("returns ineligible when approve simulation failed", () => {
    const result = evaluate({
      simulationResult: createSimulationResult(false),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("APPROVE_SIMULATION_FAILED");
  });

  it("returns ineligible for invalid approve transaction", () => {
    const result = evaluate({
      plan: createPlan([
        createApproveTransaction("USDC", {
          data: "0xdeadbeef" as `0x${string}`,
        }),
        createSupplyTransaction("USDC"),
      ]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("INVALID_APPROVE_TRANSACTION");
  });

  it("returns eligible when safety and approve simulation are OK", () => {
    const result = evaluate();
    expect(result.eligible).toBe(true);
    expect(result.reasonCode).toBe("READY");
    expect(result.approveTransactionIndex).toBe(0);
  });

  it("validates approve transaction type, selector, target, and value", () => {
    expect(isValidApproveTransaction(createApproveTransaction("USDC"))).toBe(true);
    expect(
      isValidApproveTransaction(
        createApproveTransaction("USDC", { type: "aave-supply" }),
      ),
    ).toBe(false);
    expect(
      isValidApproveTransaction(
        createApproveTransaction("USDC", { value: "1" as "0" }),
      ),
    ).toBe(false);
    expect(
      isValidApproveTransaction(
        createApproveTransaction("USDC", {
          to: "0x0000000000000000000000000000000000000001",
        }),
      ),
    ).toBe(false);
  });
});
