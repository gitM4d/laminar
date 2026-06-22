import type { ExecutionIntent } from "../../core/execution/types.js";
import {
  UnsupportedExecutionIntentError,
  type ExecutionAdapter,
  type PlannedTransaction,
  type TransactionRequestPlan,
} from "../types.js";
import {
  AAVE_V3_BASE_EXECUTION_CONFIG,
  getAaveExecutionAssetConfig,
  isAaveExecutionSupportedAsset,
} from "./aaveExecutionConfig.js";

const BASE_PLANNING_WARNINGS = [
  "Planning only. No transaction was generated.",
  "No calldata or ABI encoding in this sprint.",
  "No wallet connected.",
  "Amount is a USD-based estimate for stablecoins (1 USD ≈ 1 token unit).",
] as const;

function formatUsdAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function assertAaveSupplyIntent(intent: ExecutionIntent): void {
  if (intent.protocolId !== AAVE_V3_BASE_EXECUTION_CONFIG.protocolId) {
    throw new UnsupportedExecutionIntentError(
      AAVE_V3_BASE_EXECUTION_CONFIG.protocolId,
      intent.id,
      `Expected protocolId "${AAVE_V3_BASE_EXECUTION_CONFIG.protocolId}", got "${intent.protocolId}".`,
    );
  }

  if (intent.action === "withdraw") {
    throw new UnsupportedExecutionIntentError(
      AAVE_V3_BASE_EXECUTION_CONFIG.protocolId,
      intent.id,
      "Withdraw is not supported yet in the Aave execution adapter.",
    );
  }

  if (intent.action !== "supply") {
    throw new UnsupportedExecutionIntentError(
      AAVE_V3_BASE_EXECUTION_CONFIG.protocolId,
      intent.id,
      `Action "${intent.action}" is not supported by the Aave execution adapter.`,
    );
  }

  if (intent.asset === null || !isAaveExecutionSupportedAsset(intent.asset)) {
    throw new UnsupportedExecutionIntentError(
      AAVE_V3_BASE_EXECUTION_CONFIG.protocolId,
      intent.id,
      `Asset "${intent.asset ?? "null"}" is not supported. Supported assets: USDC, EURC.`,
    );
  }
}

function buildSupplyTransactions(
  intent: ExecutionIntent,
  asset: "USDC" | "EURC",
): PlannedTransaction[] {
  const assetConfig = getAaveExecutionAssetConfig(asset);
  const poolAddress = AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress;

  return [
    {
      type: "erc20-approve",
      target: assetConfig.underlyingAddress,
      functionName: "approve",
      description: `Approve Aave Pool to spend ${asset}.`,
      asset,
      amountUsd: intent.amountUsd,
      executionRequired: true,
    },
    {
      type: "aave-supply",
      target: poolAddress,
      functionName: "supply",
      description: `Supply ${formatUsdAmount(intent.amountUsd)} ${asset} into Aave V3 Base.`,
      asset,
      amountUsd: intent.amountUsd,
      executionRequired: true,
    },
  ];
}

export class AaveExecutionAdapter implements ExecutionAdapter {
  readonly protocolId = AAVE_V3_BASE_EXECUTION_CONFIG.protocolId;

  async buildTransactions(intent: ExecutionIntent): Promise<TransactionRequestPlan> {
    assertAaveSupplyIntent(intent);

    const asset = intent.asset as "USDC" | "EURC";
    const transactions = buildSupplyTransactions(intent, asset);

    return {
      version: "tx-plan-v1",
      protocolId: this.protocolId,
      intentId: intent.id,
      informationalOnly: true,
      transactions,
      warnings: [...BASE_PLANNING_WARNINGS],
    };
  }
}

export const aaveExecutionAdapter = new AaveExecutionAdapter();
