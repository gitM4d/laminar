import type { ExecutionIntent } from "../../core/execution/types.js";
import { AAVE_V3_BASE_EXECUTION_CONFIG } from "../aave/aaveExecutionConfig.js";

export const BASE_CHAIN_ID = AAVE_V3_BASE_EXECUTION_CONFIG.chainId;

export function isBaseChainId(chainId: number | undefined): boolean {
  return chainId === BASE_CHAIN_ID;
}

export function selectAaveSupplyIntents(
  intents: ExecutionIntent[] | undefined,
): ExecutionIntent[] {
  if (intents === undefined) {
    return [];
  }

  return intents.filter(
    (intent) =>
      intent.protocolId === AAVE_V3_BASE_EXECUTION_CONFIG.protocolId &&
      intent.action === "supply",
  );
}

export function formatShortTxData(
  data: string,
  headChars = 8,
  tailChars = 6,
): string {
  const prefixLength = headChars + 2;

  if (data.length <= prefixLength + tailChars + 3) {
    return data;
  }

  return `${data.slice(0, prefixLength)}...${data.slice(-tailChars)}`;
}

export function formatAaveSupplyIntentLabel(intent: ExecutionIntent): string {
  const asset = intent.asset ?? "asset";
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(intent.amountUsd);

  return `Supply ${amount} ${asset} to Aave`;
}

export function shortenAddress(address: string): string {
  if (address.length < 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
