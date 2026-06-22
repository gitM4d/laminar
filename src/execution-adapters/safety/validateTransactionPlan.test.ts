import { describe, expect, it } from "vitest";
import type { ExecutionIntent } from "../../core/execution/types.js";
import {
  AaveExecutionAdapter,
  AAVE_PREVIEW_USER_ADDRESS,
} from "../aave/AaveExecutionAdapter.js";
import { buildAaveSupplyCalldata } from "../aave/buildAaveCalldata.js";
import {
  AAVE_V3_BASE_EXECUTION_CONFIG,
  getAaveExecutionAssetConfig,
} from "../aave/aaveExecutionConfig.js";
import type { TransactionRequestPlan } from "../types.js";
import { validateTransactionPlan } from "./validateTransactionPlan.js";

const PREVIEW_USER_ADDRESS = AAVE_PREVIEW_USER_ADDRESS;

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

async function buildValidPlan(
  asset: "USDC" | "EURC",
  amountUsd = 1_000,
): Promise<TransactionRequestPlan> {
  const adapter = new AaveExecutionAdapter({
    encodeCalldata: true,
    userAddress: PREVIEW_USER_ADDRESS,
  });

  return adapter.buildTransactions(buildSupplyIntent(asset, amountUsd));
}

function clonePlan(plan: TransactionRequestPlan): TransactionRequestPlan {
  return structuredClone(plan);
}

describe("validateTransactionPlan", () => {
  it("marks a valid Aave USDC plan as safe", async () => {
    const plan = await buildValidPlan("USDC");
    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.summary.totalTransactions).toBe(2);
    expect(validation.summary.validatedTransactions).toBe(2);
    expect(validation.summary.blockedTransactions).toBe(0);
  });

  it("marks a valid Aave EURC plan as safe", async () => {
    const plan = await buildValidPlan("EURC", 500);
    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("fails when encodedTransactions are missing", async () => {
    const plan = await buildValidPlan("USDC");
    delete plan.encodedTransactions;

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(validation.errors.some((issue) => issue.code === "NO_ENCODED_TRANSACTIONS")).toBe(
      true,
    );
  });

  it("fails for invalid chain id", async () => {
    const plan = await buildValidPlan("USDC");
    plan.encodedTransactions![0]!.chainId = 1 as 8453;

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(validation.errors.some((issue) => issue.code === "INVALID_CHAIN_ID")).toBe(
      true,
    );
  });

  it("fails for non-zero native value", async () => {
    const plan = await buildValidPlan("USDC");
    (plan.encodedTransactions![0] as Record<string, unknown>).value = "1";

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(
      validation.errors.some((issue) => issue.code === "NON_ZERO_NATIVE_VALUE"),
    ).toBe(true);
  });

  it("fails for unallowed target", async () => {
    const plan = await buildValidPlan("USDC");
    plan.encodedTransactions![0]!.to = "0x1111111111111111111111111111111111111111";

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(validation.errors.some((issue) => issue.code === "UNALLOWED_TARGET")).toBe(
      true,
    );
  });

  it("fails for unallowed transaction type", async () => {
    const plan = await buildValidPlan("USDC");
    (plan.encodedTransactions![0] as { type: string }).type = "unknown-type";

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(
      validation.errors.some((issue) => issue.code === "UNALLOWED_TRANSACTION_TYPE"),
    ).toBe(true);
  });

  it("fails for selector mismatch", async () => {
    const plan = await buildValidPlan("USDC");
    plan.encodedTransactions![0]!.data = "0xdeadbeef";

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(
      validation.errors.some((issue) => issue.code === "FUNCTION_SELECTOR_MISMATCH"),
    ).toBe(true);
  });

  it("fails for zero amount", async () => {
    const plan = await buildValidPlan("USDC");
    plan.encodedTransactions![0]!.amountUsd = 0;

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(validation.errors.some((issue) => issue.code === "INVALID_AMOUNT")).toBe(
      true,
    );
  });

  it("fails for approve target mismatch", async () => {
    const plan = await buildValidPlan("USDC");
    plan.encodedTransactions![0]!.to =
      AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress;

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(
      validation.errors.some((issue) => issue.code === "APPROVE_TARGET_MISMATCH"),
    ).toBe(true);
  });

  it("fails for supply target mismatch", async () => {
    const plan = await buildValidPlan("USDC");
    plan.encodedTransactions![1]!.to =
      getAaveExecutionAssetConfig("USDC").underlyingAddress;

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(
      validation.errors.some((issue) => issue.code === "SUPPLY_TARGET_MISMATCH"),
    ).toBe(true);
  });

  it("fails when supply appears before approve", async () => {
    const encoded = buildAaveSupplyCalldata({
      intent: buildSupplyIntent("USDC", 1_000),
      userAddress: PREVIEW_USER_ADDRESS,
    });
    const plan = await buildValidPlan("USDC");
    plan.encodedTransactions = [encoded[1]!, encoded[0]!];

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(
      validation.errors.some((issue) => issue.code === "APPROVE_ORDER_INVALID"),
    ).toBe(true);
  });

  it("fails when forbidden runtime fields are injected", async () => {
    const plan = await buildValidPlan("USDC");
    (plan.encodedTransactions![0] as Record<string, unknown>).privateKey = "secret";

    const validation = validateTransactionPlan(plan);

    expect(validation.safe).toBe(false);
    expect(
      validation.errors.some((issue) => issue.code === "FORBIDDEN_EXECUTION_FIELD"),
    ).toBe(true);
  });

  it("warns when duplicate approvals exist for the same asset", async () => {
    const plan = await buildValidPlan("USDC");
    const duplicateApprove = structuredClone(plan.encodedTransactions![0]!);
    plan.encodedTransactions = [
      plan.encodedTransactions![0]!,
      duplicateApprove,
      plan.encodedTransactions![1]!,
    ];

    const validation = validateTransactionPlan(plan);

    expect(validation.warnings.some((issue) => issue.code === "DUPLICATE_APPROVAL")).toBe(
      true,
    );
  });

  it("warns when encoded transaction description is missing", async () => {
    const plan = await buildValidPlan("USDC");
    plan.encodedTransactions![0]!.description = "   ";

    const validation = validateTransactionPlan(plan);

    expect(validation.warnings.some((issue) => issue.code === "MISSING_DESCRIPTION")).toBe(
      true,
    );
  });

  it("does not mutate the input plan", async () => {
    const plan = await buildValidPlan("USDC");
    const before = structuredClone(plan);

    validateTransactionPlan(plan);

    expect(plan).toEqual(before);
  });

  it("reports summary counts for blocked transactions", async () => {
    const plan = await buildValidPlan("USDC");
    plan.encodedTransactions![0]!.data = "0xdeadbeef";

    const validation = validateTransactionPlan(plan);

    expect(validation.summary.totalTransactions).toBe(2);
    expect(validation.summary.blockedTransactions).toBe(1);
    expect(validation.summary.validatedTransactions).toBe(1);
    expect(validation.safe).toBe(false);
  });

  it("fails when plan informationalOnly is false", async () => {
    const plan = await buildValidPlan("USDC");
    const unsafePlan = clonePlan(plan);
    (unsafePlan as { informationalOnly: boolean }).informationalOnly = false;

    const validation = validateTransactionPlan(unsafePlan);

    expect(validation.safe).toBe(false);
    expect(
      validation.errors.some((issue) => issue.code === "PLAN_NOT_INFORMATIONAL_ONLY"),
    ).toBe(true);
  });
});
