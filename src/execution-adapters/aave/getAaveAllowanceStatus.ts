import { isAddress } from "viem";
import {
  readErc20Allowance,
  type AllowancePublicClient,
} from "../allowance/readErc20Allowance.js";
import type { AllowanceStatus, AllowanceStatusErrorCode } from "../allowance/types.js";
import { toStablecoinRawAmount } from "./buildAaveCalldata.js";
import {
  AAVE_V3_BASE_EXECUTION_CONFIG,
  getAaveExecutionAssetConfig,
  isAaveExecutionSupportedAsset,
  type AaveExecutionSupportedAsset,
} from "./aaveExecutionConfig.js";

export type GetAaveAllowanceStatusInput = {
  publicClient: AllowancePublicClient;
  walletAddress: string | undefined;
  asset: string;
  amountUsd: number;
};

function buildUncheckedStatus(
  asset: string,
  errorCode: AllowanceStatusErrorCode,
  errorMessage: string,
  overrides: Partial<
    Pick<
      AllowanceStatus,
      "owner" | "spender" | "tokenAddress" | "requiredRawAmount"
    >
  > = {},
): AllowanceStatus {
  return {
    checked: false,
    asset,
    owner:
      overrides.owner ?? ("0x0000000000000000000000000000000000000000" as const),
    spender:
      overrides.spender ??
      (AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress as `0x${string}`),
    tokenAddress:
      overrides.tokenAddress ??
      ("0x0000000000000000000000000000000000000000" as const),
    requiredRawAmount: overrides.requiredRawAmount ?? 0n,
    sufficient: false,
    errorCode,
    errorMessage,
  };
}

export async function getAaveAllowanceStatus(
  input: GetAaveAllowanceStatusInput,
): Promise<AllowanceStatus> {
  const { publicClient, walletAddress, asset, amountUsd } = input;

  if (walletAddress === undefined || walletAddress.trim() === "") {
    return buildUncheckedStatus(
      asset,
      "MISSING_WALLET_ADDRESS",
      "walletAddress is required to read allowance.",
    );
  }

  if (!isAddress(walletAddress)) {
    return buildUncheckedStatus(
      asset,
      "MISSING_WALLET_ADDRESS",
      `walletAddress must be a valid EVM address, got "${walletAddress}".`,
    );
  }

  if (!isAaveExecutionSupportedAsset(asset)) {
    return buildUncheckedStatus(
      asset,
      "UNSUPPORTED_ASSET",
      `Asset "${asset}" is not supported for Aave allowance checks.`,
    );
  }

  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return buildUncheckedStatus(
      asset,
      "INVALID_REQUIRED_AMOUNT",
      "amountUsd must be a positive finite number.",
    );
  }

  const supportedAsset = asset as AaveExecutionSupportedAsset;
  const assetConfig = getAaveExecutionAssetConfig(supportedAsset);
  const owner = walletAddress as `0x${string}`;
  const spender = AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress as `0x${string}`;
  const tokenAddress = assetConfig.underlyingAddress as `0x${string}`;

  let requiredRawAmount: bigint;

  try {
    requiredRawAmount = toStablecoinRawAmount(amountUsd, assetConfig.decimals);
  } catch (error) {
    return buildUncheckedStatus(
      asset,
      "INVALID_REQUIRED_AMOUNT",
      error instanceof Error ? error.message : "Invalid required amount.",
      {
        owner,
        spender,
        tokenAddress,
      },
    );
  }

  try {
    const currentRawAllowance = await readErc20Allowance({
      publicClient,
      tokenAddress,
      owner,
      spender,
    });

    return {
      checked: true,
      asset: supportedAsset,
      owner,
      spender,
      tokenAddress,
      requiredRawAmount,
      currentRawAllowance,
      sufficient: currentRawAllowance >= requiredRawAmount,
    };
  } catch (error) {
    return buildUncheckedStatus(
      asset,
      "READ_FAILED",
      error instanceof Error ? error.message : "Failed to read ERC20 allowance.",
      {
        owner,
        spender,
        tokenAddress,
        requiredRawAmount,
      },
    );
  }
}
