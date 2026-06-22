import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { ExecutionIntent } from "../../core/execution/types.js";
import {
  AaveExecutionAdapter,
  AAVE_PREVIEW_USER_ADDRESS,
} from "../aave/AaveExecutionAdapter.js";
import type { SimulationPublicClient } from "./types.js";
import {
  MISSING_WALLET_ADDRESS_ERROR_CODE,
  NO_ENCODED_TRANSACTIONS_ERROR_CODE,
  SAFETY_VALIDATION_SKIP_REASON,
  SIMULATION_REVERTED_ERROR_CODE,
  SUPPLY_ALLOWANCE_SIMULATION_HINT,
} from "./types.js";
import {
  MissingWalletAddressError,
  simulateTransactionPlan,
} from "./simulateTransactionPlan.js";

const PREVIEW_WALLET = AAVE_PREVIEW_USER_ADDRESS;

function buildSupplyIntent(asset: "USDC" | "EURC" = "USDC"): ExecutionIntent {
  return {
    id: `intent-${asset.toLowerCase()}`,
    sourceStepId: "step-1",
    action: "supply",
    protocolId: "aave",
    protocolName: "Aave",
    opportunityId: `aave-${asset.toLowerCase()}-base`,
    chain: "Base",
    asset,
    amountUsd: 1_000,
    amountAssetEstimate: 1_000,
    status: "planned",
    requiresWallet: true,
    requiresApproval: true,
    executionAdapterRequired: true,
    informationalOnly: true,
    preconditions: [],
    riskWarnings: [],
  };
}

async function buildValidPlan() {
  const adapter = new AaveExecutionAdapter({
    encodeCalldata: true,
    userAddress: PREVIEW_WALLET,
  });

  return adapter.buildTransactions(buildSupplyIntent("USDC"));
}

function createMockPublicClient(
  handler: SimulationPublicClient["call"],
): SimulationPublicClient {
  return {
    call: vi.fn(handler),
  };
}

describe("simulateTransactionPlan", () => {
  it("skips simulation when safety validation fails", async () => {
    const plan = await buildValidPlan();
    plan.encodedTransactions![0]!.to = "0x0000000000000000000000000000000000000001";

    const publicClient = createMockPublicClient(async () => ({ data: "0x" }));
    const result = await simulateTransactionPlan({
      plan,
      walletAddress: PREVIEW_WALLET,
      publicClient,
    });

    expect(result.simulated).toBe(false);
    expect(result.safeToSimulate).toBe(false);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((entry) => entry.skipped)).toBe(true);
    expect(result.results[0]?.skipReason).toBe(SAFETY_VALIDATION_SKIP_REASON);
    expect(publicClient.call).not.toHaveBeenCalled();
  });

  it("returns a skipped result when encodedTransactions are missing", async () => {
    const plan = await buildValidPlan();
    delete plan.encodedTransactions;

    const publicClient = createMockPublicClient(async () => ({ data: "0x" }));
    const result = await simulateTransactionPlan({
      plan,
      walletAddress: PREVIEW_WALLET,
      publicClient,
    });

    expect(result.simulated).toBe(false);
    expect(result.safeToSimulate).toBe(false);
    expect(result.results[0]?.errorCode).toBe(NO_ENCODED_TRANSACTIONS_ERROR_CODE);
    expect(publicClient.call).not.toHaveBeenCalled();
  });

  it("throws when walletAddress is missing", async () => {
    const plan = await buildValidPlan();
    const publicClient = createMockPublicClient(async () => ({ data: "0x" }));

    await expect(
      simulateTransactionPlan({
        plan,
        walletAddress: undefined,
        publicClient,
      }),
    ).rejects.toBeInstanceOf(MissingWalletAddressError);

    await expect(
      simulateTransactionPlan({
        plan,
        walletAddress: "not-an-address",
        publicClient,
      }),
    ).rejects.toMatchObject({ code: MISSING_WALLET_ADDRESS_ERROR_CODE });
  });

  it("returns success when publicClient.call succeeds", async () => {
    const plan = await buildValidPlan();
    const publicClient = createMockPublicClient(async () => ({ data: "0x" }));

    const result = await simulateTransactionPlan({
      plan,
      walletAddress: PREVIEW_WALLET,
      publicClient,
    });

    expect(result.simulated).toBe(true);
    expect(result.safeToSimulate).toBe(true);
    expect(result.results.every((entry) => entry.success)).toBe(true);
    expect(publicClient.call).toHaveBeenCalledTimes(2);
  });

  it("returns failure when publicClient.call rejects", async () => {
    const plan = await buildValidPlan();
    const publicClient = createMockPublicClient(async () => {
      throw new Error("execution reverted");
    });

    const result = await simulateTransactionPlan({
      plan,
      walletAddress: PREVIEW_WALLET,
      publicClient,
    });

    expect(result.simulated).toBe(true);
    expect(result.results.every((entry) => !entry.success)).toBe(true);
    expect(result.results[0]?.errorCode).toBe(SIMULATION_REVERTED_ERROR_CODE);
    expect(result.results[0]?.errorMessage).toContain("execution reverted");
  });

  it("summarizes successful and failed simulations", async () => {
    const plan = await buildValidPlan();
    const publicClient = createMockPublicClient(async ({ data }) => {
      if (data.startsWith("0x617ba037")) {
        throw new Error("allowance too low");
      }

      return { data: "0x" };
    });

    const result = await simulateTransactionPlan({
      plan,
      walletAddress: PREVIEW_WALLET,
      publicClient,
    });

    expect(result.summary.totalTransactions).toBe(2);
    expect(result.summary.simulatedTransactions).toBe(2);
    expect(result.summary.successfulSimulations).toBe(1);
    expect(result.summary.failedSimulations).toBe(1);
  });

  it("simulates approve before supply in order", async () => {
    const plan = await buildValidPlan();
    const callOrder: string[] = [];
    const publicClient = createMockPublicClient(async ({ data }) => {
      callOrder.push(data.slice(0, 10));
      return { data: "0x" };
    });

    await simulateTransactionPlan({
      plan,
      walletAddress: PREVIEW_WALLET,
      publicClient,
    });

    expect(callOrder).toEqual(["0x095ea7b3", "0x617ba037"]);
    expect(resultTypesInOrder(plan)).toEqual(["erc20-approve", "aave-supply"]);
  });

  it("does not mutate the input plan", async () => {
    const plan = await buildValidPlan();
    const snapshot = structuredClone(plan);
    const publicClient = createMockPublicClient(async () => ({ data: "0x" }));

    await simulateTransactionPlan({
      plan,
      walletAddress: PREVIEW_WALLET,
      publicClient,
    });

    expect(plan).toEqual(snapshot);
  });

  it("does not reference walletClient, writeContract, or sendTransaction", () => {
    const sourcePath = join(
      dirname(fileURLToPath(import.meta.url)),
      "simulateTransactionPlan.ts",
    );
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("walletClient");
    expect(source).not.toContain("writeContract");
    expect(source).not.toContain("sendTransaction");
    expect(source).not.toContain("eth_sendTransaction");
  });

  it("does not simulate when chainId is not Base", async () => {
    const plan = await buildValidPlan();
    plan.encodedTransactions![0]!.chainId = 1 as 8453;

    const publicClient = createMockPublicClient(async () => ({ data: "0x" }));
    const result = await simulateTransactionPlan({
      plan,
      walletAddress: PREVIEW_WALLET,
      publicClient,
    });

    expect(result.simulated).toBe(false);
    expect(result.safeToSimulate).toBe(false);
    expect(publicClient.call).not.toHaveBeenCalled();
  });

  it("adds allowance hint for failed supply after approve", async () => {
    const plan = await buildValidPlan();
    const publicClient = createMockPublicClient(async ({ data }) => {
      if (data.startsWith("0x617ba037")) {
        throw new Error("ERC20: transfer amount exceeds allowance");
      }

      return { data: "0x" };
    });

    const result = await simulateTransactionPlan({
      plan,
      walletAddress: PREVIEW_WALLET,
      publicClient,
    });

    expect(result.results[0]?.success).toBe(true);
    expect(result.results[1]?.success).toBe(false);
    expect(result.results[1]?.errorMessage).toContain(
      SUPPLY_ALLOWANCE_SIMULATION_HINT,
    );
  });
});

function resultTypesInOrder(plan: Awaited<ReturnType<typeof buildValidPlan>>) {
  return plan.encodedTransactions?.map((transaction) => transaction.type) ?? [];
}
