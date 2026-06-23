import { describe, expect, it, vi } from "vitest";
import type { AllowancePublicClient } from "../allowance/readErc20Allowance.js";
import { getAaveAllowanceStatus } from "./getAaveAllowanceStatus.js";

const WALLET = "0x000000000000000000000000000000000000dEaD";

function createMockPublicClient(allowance: bigint): AllowancePublicClient {
  return {
    readContract: vi.fn(async () => allowance),
  };
}

describe("getAaveAllowanceStatus", () => {
  it("returns sufficient true for USDC when allowance is enough", async () => {
    const publicClient = createMockPublicClient(2_000_000_000n);
    const status = await getAaveAllowanceStatus({
      publicClient,
      walletAddress: WALLET,
      asset: "USDC",
      amountUsd: 1_000,
    });

    expect(status.checked).toBe(true);
    expect(status.sufficient).toBe(true);
    expect(status.requiredRawAmount).toBe(1_000_000_000n);
    expect(status.currentRawAllowance).toBe(2_000_000_000n);
  });

  it("returns sufficient false for USDC when allowance is insufficient", async () => {
    const publicClient = createMockPublicClient(500_000_000n);
    const status = await getAaveAllowanceStatus({
      publicClient,
      walletAddress: WALLET,
      asset: "USDC",
      amountUsd: 1_000,
    });

    expect(status.checked).toBe(true);
    expect(status.sufficient).toBe(false);
    expect(status.requiredRawAmount).toBe(1_000_000_000n);
  });

  it("returns sufficient true for EURC when allowance is enough", async () => {
    const publicClient = createMockPublicClient(1_500_000_000n);
    const status = await getAaveAllowanceStatus({
      publicClient,
      walletAddress: WALLET,
      asset: "EURC",
      amountUsd: 1_000,
    });

    expect(status.checked).toBe(true);
    expect(status.sufficient).toBe(true);
    expect(status.asset).toBe("EURC");
  });

  it("returns unsupported asset status", async () => {
    const publicClient = createMockPublicClient(0n);
    const status = await getAaveAllowanceStatus({
      publicClient,
      walletAddress: WALLET,
      asset: "DAI",
      amountUsd: 1_000,
    });

    expect(status.checked).toBe(false);
    expect(status.errorCode).toBe("UNSUPPORTED_ASSET");
    expect(status.sufficient).toBe(false);
  });

  it("matches 1000 USD to 1000000000n raw units", async () => {
    const publicClient = createMockPublicClient(1_000_000_000n);
    const status = await getAaveAllowanceStatus({
      publicClient,
      walletAddress: WALLET,
      asset: "USDC",
      amountUsd: 1_000,
    });

    expect(status.requiredRawAmount).toBe(1_000_000_000n);
    expect(status.sufficient).toBe(true);
  });

  it("maps read failures to READ_FAILED", async () => {
    const publicClient: AllowancePublicClient = {
      readContract: vi.fn(async () => {
        throw new Error("allowance read failed");
      }),
    };

    const status = await getAaveAllowanceStatus({
      publicClient,
      walletAddress: WALLET,
      asset: "USDC",
      amountUsd: 1_000,
    });

    expect(status.checked).toBe(false);
    expect(status.errorCode).toBe("READ_FAILED");
    expect(status.sufficient).toBe(false);
  });
});
