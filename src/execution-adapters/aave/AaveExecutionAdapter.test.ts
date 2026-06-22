import { describe, expect, it } from "vitest";
import type { ExecutionIntent } from "../../core/execution/types.js";
import { UnsupportedExecutionIntentError } from "../types.js";
import { AaveExecutionAdapter } from "./AaveExecutionAdapter.js";
import { AAVE_V3_BASE_EXECUTION_CONFIG } from "./aaveExecutionConfig.js";

const FORBIDDEN_TRANSACTION_FIELDS = [
  "calldata",
  "data",
  "value",
  "nonce",
  "gasLimit",
  "gasPrice",
  "chainId",
  "signature",
  "txHash",
  "transactionHash",
  "from",
  "to",
  "signer",
  "wallet",
  "privateKey",
  "abi",
] as const;

function buildSupplyIntent(
  asset: "USDC" | "EURC",
  amountUsd: number,
): ExecutionIntent {
  return {
    id: `intent-${asset.toLowerCase()}`,
    sourceStepId: "step-1",
    action: "supply",
    protocolId: "aave",
    protocolName: "Aave",
    opportunityId: `aave-${asset.toLowerCase()}-base`,
    chain: "Base",
    asset,
    amountUsd,
    amountAssetEstimate: amountUsd,
    status: "planned",
    requiresWallet: true,
    requiresApproval: true,
    executionAdapterRequired: true,
    informationalOnly: true,
    preconditions: [],
    riskWarnings: [],
  };
}

describe("AaveExecutionAdapter", () => {
  const adapter = new AaveExecutionAdapter();

  it("produces two transactions for USDC supply", async () => {
    const plan = await adapter.buildTransactions(buildSupplyIntent("USDC", 1_902));

    expect(plan.transactions).toHaveLength(2);
    expect(plan.transactions[0]?.type).toBe("erc20-approve");
    expect(plan.transactions[1]?.type).toBe("aave-supply");
  });

  it("produces two transactions for EURC supply", async () => {
    const plan = await adapter.buildTransactions(buildSupplyIntent("EURC", 500));

    expect(plan.transactions).toHaveLength(2);
    expect(plan.transactions.every((tx) => tx.asset === "EURC")).toBe(true);
  });

  it("throws for unsupported asset", async () => {
    const intent = buildSupplyIntent("USDC", 100);
    intent.asset = "DAI";

    await expect(adapter.buildTransactions(intent)).rejects.toBeInstanceOf(
      UnsupportedExecutionIntentError,
    );
  });

  it("throws for unsupported action", async () => {
    const intent = buildSupplyIntent("USDC", 100);
    intent.action = "prepareFunds";

    await expect(adapter.buildTransactions(intent)).rejects.toBeInstanceOf(
      UnsupportedExecutionIntentError,
    );
  });

  it("throws for withdraw action stub", async () => {
    const intent = buildSupplyIntent("USDC", 100);
    intent.action = "withdraw";

    await expect(adapter.buildTransactions(intent)).rejects.toThrow(
      /Withdraw is not supported yet/,
    );
  });

  it("includes planning warnings", async () => {
    const plan = await adapter.buildTransactions(buildSupplyIntent("USDC", 1_000));

    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(plan.warnings.some((warning) => warning.includes("Planning only"))).toBe(
      true,
    );
    expect(plan.warnings.some((warning) => warning.includes("encodeCalldata disabled"))).toBe(
      true,
    );
  });

  it("marks the plan informationalOnly", async () => {
    const plan = await adapter.buildTransactions(buildSupplyIntent("USDC", 1_000));

    expect(plan.informationalOnly).toBe(true);
    expect(plan.version).toBe("tx-plan-v1");
  });

  it("uses the Aave protocolId", async () => {
    const plan = await adapter.buildTransactions(buildSupplyIntent("USDC", 1_000));

    expect(plan.protocolId).toBe(AAVE_V3_BASE_EXECUTION_CONFIG.protocolId);
    expect(adapter.protocolId).toBe("aave");
  });

  it("orders transactions approve then supply", async () => {
    const plan = await adapter.buildTransactions(buildSupplyIntent("USDC", 1_000));

    expect(plan.transactions.map((tx) => tx.type)).toEqual([
      "erc20-approve",
      "aave-supply",
    ]);
    expect(plan.transactions[0]?.functionName).toBe("approve");
    expect(plan.transactions[1]?.functionName).toBe("supply");
    expect(plan.transactions[0]?.target).toBe(
      AAVE_V3_BASE_EXECUTION_CONFIG.assets.USDC.underlyingAddress,
    );
    expect(plan.transactions[1]?.target).toBe(
      AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress,
    );
  });

  it("does not include calldata or transaction execution fields", async () => {
    const plan = await adapter.buildTransactions(buildSupplyIntent("USDC", 1_000));

    for (const tx of plan.transactions) {
      for (const field of FORBIDDEN_TRANSACTION_FIELDS) {
        expect(tx).not.toHaveProperty(field);
      }
    }

    for (const field of FORBIDDEN_TRANSACTION_FIELDS) {
      expect(plan).not.toHaveProperty(field);
    }
  });
});
