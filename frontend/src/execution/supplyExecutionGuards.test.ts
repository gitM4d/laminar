import { describe, expect, it } from "vitest";
import {
  AAVE_V3_BASE_EXECUTION_CONFIG,
  AAVE_POOL_SUPPLY_SELECTOR,
  BASE_CHAIN_ID,
  ERC20_APPROVE_SELECTOR,
  getAaveExecutionAssetConfig,
  type EncodedTransactionRequest,
  type TransactionRequestPlan,
  type TransactionSafetyValidation,
  type TransactionSimulationResult,
} from "@laminar/frontend-safe";
import { getApprovalExecutionEligibility } from "./approvalExecutionGuards.js";
import {
  getSupplyExecutionEligibility,
  isValidSupplyTransaction,
} from "./supplyExecutionGuards.js";

function createApproveTransaction(
  asset: "USDC" | "EURC" = "USDC",
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
  };
}

function createSupplyTransaction(
  asset: "USDC" | "EURC" = "USDC",
  overrides: Partial<EncodedTransactionRequest> = {},
): EncodedTransactionRequest {
  return {
    to: AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress,
    data: `${AAVE_POOL_SUPPLY_SELECTOR}0000000000000000000000000000000000000000000000000000000000000000` as `0x${string}`,
    value: "0",
    chainId: BASE_CHAIN_ID,
    description: `Supply ${asset} into Aave V3 Base.`,
    type: "aave-supply",
    asset,
    amountUsd: 1_000,
    ...overrides,
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
  supplySuccess: boolean,
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
        errorMessage: supplySuccess ? undefined : "simulation reverted",
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

function evaluate(
  overrides: Partial<Parameters<typeof getSupplyExecutionEligibility>[0]> = {},
) {
  const plan = createPlan([
    createApproveTransaction("USDC"),
    createSupplyTransaction("USDC"),
  ]);

  return getSupplyExecutionEligibility({
    plan,
    safetyValidation: createSafetyValidation(true),
    simulationResult: createSimulationResult(true, true),
    chainId: BASE_CHAIN_ID,
    walletConnected: true,
    approvalConfirmed: true,
    ...overrides,
  });
}

describe("supplyExecutionGuards", () => {
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

  it("returns ineligible when no supply transaction exists", () => {
    const result = evaluate({
      plan: createPlan([createApproveTransaction("USDC")]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("NO_SUPPLY_TRANSACTION");
  });

  it("returns ineligible when multiple supply transactions exist", () => {
    const result = evaluate({
      plan: createPlan([
        createApproveTransaction("USDC"),
        createSupplyTransaction("USDC"),
        createSupplyTransaction("EURC", { asset: "EURC" }),
      ]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("MULTIPLE_SUPPLY_TRANSACTIONS");
  });

  it("returns ineligible when approval is not confirmed", () => {
    const result = evaluate({ approvalConfirmed: false });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("APPROVAL_NOT_CONFIRMED");
  });

  it("returns ineligible when supply simulation failed", () => {
    const result = evaluate({
      simulationResult: createSimulationResult(true, false),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("SUPPLY_SIMULATION_FAILED");
    expect(result.supplySimulationErrorMessage).toBe("simulation reverted");
  });

  it("returns ineligible for invalid supply selector", () => {
    const result = evaluate({
      plan: createPlan([
        createApproveTransaction("USDC"),
        createSupplyTransaction("USDC", {
          data: "0xdeadbeef" as `0x${string}`,
        }),
      ]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("INVALID_SUPPLY_TRANSACTION");
  });

  it("returns ineligible for invalid supply target", () => {
    const result = evaluate({
      plan: createPlan([
        createApproveTransaction("USDC"),
        createSupplyTransaction("USDC", {
          to: "0x0000000000000000000000000000000000000001",
        }),
      ]),
    });
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("INVALID_SUPPLY_TRANSACTION");
  });

  it("returns ineligible for non-zero value", () => {
    expect(
      isValidSupplyTransaction(
        createSupplyTransaction("USDC", { value: "1" as "0" }),
      ),
    ).toBe(false);
  });

  it("returns ineligible when forbidden execution field exists", () => {
    const transaction = createSupplyTransaction("USDC") as EncodedTransactionRequest &
      Record<string, unknown>;
    transaction.gas = "21000";

    expect(isValidSupplyTransaction(transaction)).toBe(false);
  });

  it("returns eligible when approval is confirmed and supply simulation succeeds", () => {
    const result = evaluate();
    expect(result.eligible).toBe(true);
    expect(result.reasonCode).toBe("READY");
    expect(result.supplyTransactionIndex).toBe(1);
  });

  it("returns different transaction indexes for approve and supply guards", () => {
    const plan = createPlan([
      createApproveTransaction("USDC"),
      createSupplyTransaction("USDC"),
    ]);
    const safetyValidation = createSafetyValidation(true);
    const simulationResult = createSimulationResult(true, true);

    const approveResult = getApprovalExecutionEligibility({
      plan,
      safetyValidation,
      simulationResult,
      chainId: BASE_CHAIN_ID,
      walletConnected: true,
    });
    const supplyResult = getSupplyExecutionEligibility({
      plan,
      safetyValidation,
      simulationResult,
      chainId: BASE_CHAIN_ID,
      walletConnected: true,
      approvalConfirmed: true,
    });

    expect(approveResult.approveTransactionIndex).toBe(0);
    expect(supplyResult.supplyTransactionIndex).toBe(1);
  });
});
