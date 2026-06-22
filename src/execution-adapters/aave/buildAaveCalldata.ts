import { encodeFunctionData, isAddress } from "viem";
import type { ExecutionIntent } from "../../core/execution/types.js";
import type { EncodedTransactionRequest } from "../types.js";
import {
  InvalidExecutionAmountError,
  MissingExecutionAddressError,
  UnsupportedExecutionAssetError,
  UnsupportedExecutionIntentError,
} from "../types.js";
import {
  AAVE_POOL_SUPPLY_ABI,
  ERC20_APPROVE_ABI,
} from "./aaveExecutionAbi.js";
import {
  AAVE_V3_BASE_EXECUTION_CONFIG,
  getAaveExecutionAssetConfig,
  isAaveExecutionSupportedAsset,
  type AaveExecutionSupportedAsset,
} from "./aaveExecutionConfig.js";

export type BuildAaveSupplyCalldataInput = {
  intent: ExecutionIntent;
  userAddress: string | undefined;
};

export function toStablecoinRawAmount(
  amountUsd: number,
  decimals: number,
): bigint {
  if (!Number.isFinite(amountUsd)) {
    throw new InvalidExecutionAmountError(amountUsd, "amount must be finite");
  }

  if (amountUsd <= 0) {
    throw new InvalidExecutionAmountError(amountUsd, "amount must be positive");
  }

  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new InvalidExecutionAmountError(
      amountUsd,
      `decimals must be a non-negative integer, got ${decimals}`,
    );
  }

  const factor = 10 ** decimals;
  return BigInt(Math.floor(amountUsd * factor));
}

function assertSupplyIntent(intent: ExecutionIntent): AaveExecutionSupportedAsset {
  if (intent.protocolId !== AAVE_V3_BASE_EXECUTION_CONFIG.protocolId) {
    throw new UnsupportedExecutionIntentError(
      AAVE_V3_BASE_EXECUTION_CONFIG.protocolId,
      intent.id,
      `Expected protocolId "${AAVE_V3_BASE_EXECUTION_CONFIG.protocolId}", got "${intent.protocolId}".`,
    );
  }

  if (intent.action !== "supply") {
    throw new UnsupportedExecutionIntentError(
      AAVE_V3_BASE_EXECUTION_CONFIG.protocolId,
      intent.id,
      `Action "${intent.action}" is not supported for Aave calldata generation.`,
    );
  }

  if (intent.asset === null || !isAaveExecutionSupportedAsset(intent.asset)) {
    throw new UnsupportedExecutionAssetError(intent.asset ?? "null");
  }

  return intent.asset;
}

function resolveUserAddress(userAddress: string | undefined): `0x${string}` {
  if (userAddress === undefined || userAddress.trim() === "") {
    throw new MissingExecutionAddressError();
  }

  if (!isAddress(userAddress)) {
    throw new MissingExecutionAddressError(
      `userAddress must be a valid EVM address, got "${userAddress}".`,
    );
  }

  return userAddress as `0x${string}`;
}

export function buildAaveSupplyCalldata(
  input: BuildAaveSupplyCalldataInput,
): EncodedTransactionRequest[] {
  const asset = assertSupplyIntent(input.intent);
  const userAddress = resolveUserAddress(input.userAddress);
  const assetConfig = getAaveExecutionAssetConfig(asset);
  const rawAmount = toStablecoinRawAmount(
    input.intent.amountUsd,
    assetConfig.decimals,
  );
  const tokenAddress = assetConfig.underlyingAddress as `0x${string}`;
  const poolAddress = AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress as `0x${string}`;

  const approveData = encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [poolAddress, rawAmount],
  });

  const supplyData = encodeFunctionData({
    abi: AAVE_POOL_SUPPLY_ABI,
    functionName: "supply",
    args: [tokenAddress, rawAmount, userAddress, 0],
  });

  return [
    {
      to: assetConfig.underlyingAddress,
      data: approveData,
      value: "0",
      chainId: AAVE_V3_BASE_EXECUTION_CONFIG.chainId,
      description: `Approve Aave Pool to spend ${asset}.`,
      type: "erc20-approve",
      asset,
      amountUsd: input.intent.amountUsd,
    },
    {
      to: AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress,
      data: supplyData,
      value: "0",
      chainId: AAVE_V3_BASE_EXECUTION_CONFIG.chainId,
      description: `Supply ${asset} into Aave V3 Base.`,
      type: "aave-supply",
      asset,
      amountUsd: input.intent.amountUsd,
    },
  ];
}
