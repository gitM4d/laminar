/**
 * Official Aave V3 on Base contract addresses.
 *
 * Source: Aave Address Book (AaveV3Base.sol)
 * https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Base.sol
 *
 * Verify against https://aave.com/docs/resources/addresses before production use.
 */
export const AAVE_V3_BASE_EXECUTION_CONFIG = {
  chain: "Base",
  chainId: 8453,
  protocolId: "aave",
  protocolName: "Aave",
  poolAddress: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  assets: {
    USDC: {
      underlyingAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      aTokenAddress: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB",
      decimals: 6,
    },
    EURC: {
      underlyingAddress: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
      aTokenAddress: "0x90DA57E0A6C0d166Bf15764E03b83745Dc90025B",
      decimals: 6,
    },
  },
} as const;

export type AaveExecutionSupportedAsset = keyof typeof AAVE_V3_BASE_EXECUTION_CONFIG.assets;

export const AAVE_EXECUTION_SUPPORTED_ASSETS: readonly AaveExecutionSupportedAsset[] =
  ["USDC", "EURC"];

export function isAaveExecutionSupportedAsset(
  asset: string,
): asset is AaveExecutionSupportedAsset {
  return (AAVE_EXECUTION_SUPPORTED_ASSETS as readonly string[]).includes(asset);
}

export function getAaveExecutionAssetConfig(asset: AaveExecutionSupportedAsset) {
  return AAVE_V3_BASE_EXECUTION_CONFIG.assets[asset];
}
