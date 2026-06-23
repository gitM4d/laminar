import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  ERC20_ALLOWANCE_ABI,
  readErc20Allowance,
  type AllowancePublicClient,
} from "./readErc20Allowance.js";

const TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const OWNER = "0x000000000000000000000000000000000000dEaD" as const;
const SPENDER = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as const;

describe("readErc20Allowance", () => {
  it("calls readContract with token address, owner, and spender", async () => {
    const readContract = vi.fn(async () => 1_000_000_000n);
    const publicClient: AllowancePublicClient = { readContract };

    await readErc20Allowance({
      publicClient,
      tokenAddress: TOKEN,
      owner: OWNER,
      spender: SPENDER,
    });

    expect(readContract).toHaveBeenCalledWith({
      address: TOKEN,
      abi: ERC20_ALLOWANCE_ABI,
      functionName: "allowance",
      args: [OWNER, SPENDER],
    });
  });

  it("returns bigint allowance", async () => {
    const publicClient: AllowancePublicClient = {
      readContract: vi.fn(async () => 2_500_000_000n),
    };

    await expect(
      readErc20Allowance({
        publicClient,
        tokenAddress: TOKEN,
        owner: OWNER,
        spender: SPENDER,
      }),
    ).resolves.toBe(2_500_000_000n);
  });

  it("propagates read failures", async () => {
    const publicClient: AllowancePublicClient = {
      readContract: vi.fn(async () => {
        throw new Error("RPC read failed");
      }),
    };

    await expect(
      readErc20Allowance({
        publicClient,
        tokenAddress: TOKEN,
        owner: OWNER,
        spender: SPENDER,
      }),
    ).rejects.toThrow("RPC read failed");
  });

  it("does not use walletClient, writeContract, or sendTransaction", () => {
    const sourcePath = join(
      dirname(fileURLToPath(import.meta.url)),
      "readErc20Allowance.ts",
    );
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("walletClient");
    expect(source).not.toContain("writeContract");
    expect(source).not.toContain("sendTransaction");
  });
});
