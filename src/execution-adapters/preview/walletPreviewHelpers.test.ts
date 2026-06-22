import { describe, expect, it } from "vitest";
import type { ExecutionIntent } from "../../core/execution/types.js";
import {
  BASE_CHAIN_ID,
  formatAaveSupplyIntentLabel,
  formatShortTxData,
  isBaseChainId,
  selectAaveSupplyIntents,
  shortenAddress,
} from "./walletPreviewHelpers.js";

function createIntent(
  overrides: Partial<ExecutionIntent> = {},
): ExecutionIntent {
  return {
    id: "intent-1",
    sourceStepId: "step-1",
    action: "supply",
    protocolId: "aave",
    protocolName: "Aave",
    chain: "Base",
    asset: "USDC",
    amountUsd: 1_902,
    amountAssetEstimate: 1_902,
    status: "planned",
    requiresWallet: true,
    requiresApproval: true,
    executionAdapterRequired: true,
    informationalOnly: true,
    preconditions: [],
    riskWarnings: [],
    ...overrides,
  };
}

describe("walletPreviewHelpers", () => {
  it("detects Base chain id", () => {
    expect(isBaseChainId(BASE_CHAIN_ID)).toBe(true);
    expect(isBaseChainId(1)).toBe(false);
    expect(isBaseChainId(undefined)).toBe(false);
  });

  it("selects only Aave supply intents", () => {
    const intents = [
      createIntent(),
      createIntent({ id: "intent-2", protocolId: "morpho" }),
      createIntent({ id: "intent-3", action: "holdLiquidityBuffer" }),
    ];

    expect(selectAaveSupplyIntents(intents)).toHaveLength(1);
    expect(selectAaveSupplyIntents(intents)[0]?.id).toBe("intent-1");
    expect(selectAaveSupplyIntents(undefined)).toEqual([]);
  });

  it("formats short transaction data", () => {
    const data =
      "0x095ea7b3000000000000000000000000a238dd80c259a72e81d7e4664a9801593f98d1c5";

    expect(formatShortTxData(data)).toBe(
      "0x095ea7b3...98d1c5",
    );
    expect(formatShortTxData("0xabc")).toBe("0xabc");
  });

  it("formats Aave supply intent labels", () => {
    expect(formatAaveSupplyIntentLabel(createIntent())).toBe(
      "Supply $1,902 USDC to Aave",
    );
  });

  it("shortens addresses", () => {
    expect(
      shortenAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
    ).toBe("0x8335...2913");
  });
});
