import { describe, expect, it } from "vitest";
import { toFunctionSelector } from "viem";
import type { ExecutionIntent } from "../../core/execution/types.js";
import {
  InvalidExecutionAmountError,
  MissingExecutionAddressError,
  UnsupportedExecutionAssetError,
} from "../types.js";
import { AaveExecutionAdapter } from "./AaveExecutionAdapter.js";
import {
  ERC20_APPROVE_SELECTOR,
} from "./aaveExecutionAbi.js";
import {
  buildAaveSupplyCalldata,
  toStablecoinRawAmount,
} from "./buildAaveCalldata.js";
import { AAVE_V3_BASE_EXECUTION_CONFIG } from "./aaveExecutionConfig.js";

const PREVIEW_USER_ADDRESS = "0x000000000000000000000000000000000000dEaD";

const FORBIDDEN_SIGNING_AND_GAS_FIELDS = [
  "signature",
  "signedTransaction",
  "privateKey",
  "mnemonic",
  "gasLimit",
  "gasPrice",
  "maxFeePerGas",
  "maxPriorityFeePerGas",
  "nonce",
  "from",
  "signer",
  "wallet",
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

describe("toStablecoinRawAmount", () => {
  it("converts 1000 USDC to 1000000000n", () => {
    expect(toStablecoinRawAmount(1_000, 6)).toBe(1_000_000_000n);
  });

  it("rejects zero amount", () => {
    expect(() => toStablecoinRawAmount(0, 6)).toThrow(InvalidExecutionAmountError);
  });

  it("rejects negative amount", () => {
    expect(() => toStablecoinRawAmount(-1, 6)).toThrow(InvalidExecutionAmountError);
  });

  it("rejects non-finite amount", () => {
    expect(() => toStablecoinRawAmount(Number.NaN, 6)).toThrow(
      InvalidExecutionAmountError,
    );
    expect(() => toStablecoinRawAmount(Number.POSITIVE_INFINITY, 6)).toThrow(
      InvalidExecutionAmountError,
    );
  });
});

describe("buildAaveSupplyCalldata", () => {
  it("generates two encoded transactions", () => {
    const encoded = buildAaveSupplyCalldata({
      intent: buildSupplyIntent("USDC", 1_000),
      userAddress: PREVIEW_USER_ADDRESS,
    });

    expect(encoded).toHaveLength(2);
    expect(encoded[0]?.type).toBe("erc20-approve");
    expect(encoded[1]?.type).toBe("aave-supply");
  });

  it("sets approve tx target to token address", () => {
    const encoded = buildAaveSupplyCalldata({
      intent: buildSupplyIntent("USDC", 1_000),
      userAddress: PREVIEW_USER_ADDRESS,
    });

    expect(encoded[0]?.to).toBe(
      AAVE_V3_BASE_EXECUTION_CONFIG.assets.USDC.underlyingAddress,
    );
  });

  it("sets approve calldata selector to 0x095ea7b3", () => {
    const encoded = buildAaveSupplyCalldata({
      intent: buildSupplyIntent("USDC", 1_000),
      userAddress: PREVIEW_USER_ADDRESS,
    });

    expect(encoded[0]?.data.startsWith(ERC20_APPROVE_SELECTOR)).toBe(true);
  });

  it("sets supply tx target to Aave Pool address", () => {
    const encoded = buildAaveSupplyCalldata({
      intent: buildSupplyIntent("USDC", 1_000),
      userAddress: PREVIEW_USER_ADDRESS,
    });

    expect(encoded[1]?.to).toBe(AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress);
  });

  it("sets supply calldata to the Aave supply selector", () => {
    const supplySelector = toFunctionSelector(
      "supply(address,uint256,address,uint16)",
    );
    const encoded = buildAaveSupplyCalldata({
      intent: buildSupplyIntent("USDC", 1_000),
      userAddress: PREVIEW_USER_ADDRESS,
    });

    expect(encoded[1]?.data.startsWith(supplySelector)).toBe(true);
  });

  it("throws when userAddress is missing", () => {
    expect(() =>
      buildAaveSupplyCalldata({
        intent: buildSupplyIntent("USDC", 1_000),
        userAddress: undefined,
      }),
    ).toThrow(MissingExecutionAddressError);
  });

  it("throws for unsupported asset", () => {
    const intent = buildSupplyIntent("USDC", 1_000);
    intent.asset = "DAI";

    expect(() =>
      buildAaveSupplyCalldata({
        intent,
        userAddress: PREVIEW_USER_ADDRESS,
      }),
    ).toThrow(UnsupportedExecutionAssetError);
  });

  it("does not include signing or gas estimation fields", () => {
    const encoded = buildAaveSupplyCalldata({
      intent: buildSupplyIntent("USDC", 1_000),
      userAddress: PREVIEW_USER_ADDRESS,
    });

    for (const tx of encoded) {
      for (const field of FORBIDDEN_SIGNING_AND_GAS_FIELDS) {
        expect(tx).not.toHaveProperty(field);
      }
      expect(tx.value).toBe("0");
      expect(tx.chainId).toBe(8453);
    }
  });
});

describe("AaveExecutionAdapter calldata integration", () => {
  it("preserves Sprint 40 behavior when encodeCalldata is false", async () => {
    const adapter = new AaveExecutionAdapter({ encodeCalldata: false });
    const plan = await adapter.buildTransactions(buildSupplyIntent("USDC", 1_000));

    expect(plan.encodedTransactions).toBeUndefined();
    expect(plan.transactions).toHaveLength(2);
  });

  it("adds encodedTransactions when encodeCalldata is true", async () => {
    const adapter = new AaveExecutionAdapter({
      encodeCalldata: true,
      userAddress: PREVIEW_USER_ADDRESS,
    });
    const plan = await adapter.buildTransactions(buildSupplyIntent("USDC", 1_000));

    expect(plan.encodedTransactions).toHaveLength(2);
    expect(plan.encodedTransactions?.[0]?.data.startsWith(ERC20_APPROVE_SELECTOR)).toBe(
      true,
    );
    expect(plan.warnings.some((warning) => warning.includes("Preview only"))).toBe(
      true,
    );
  });

  it("throws when encodeCalldata is true without userAddress", async () => {
    const adapter = new AaveExecutionAdapter({ encodeCalldata: true });

    await expect(
      adapter.buildTransactions(buildSupplyIntent("USDC", 1_000)),
    ).rejects.toThrow(MissingExecutionAddressError);
  });
});
