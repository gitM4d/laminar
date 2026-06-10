import type { Abi, Address } from "viem";
import type { SupportedAsset } from "../../core/opportunity/types.js";
import { AAVE_BASE_CONFIG } from "./aaveBaseConfig.js";
import { AAVE_POOL_ABI, ERC20_ABI } from "./aaveAbi.js";
import { aTokenSupplyToUsd, rayToDecimal } from "./aaveMath.js";

/**
 * Minimal read-only client surface required for Aave Base reserve discovery.
 *
 * SAFETY: read-only methods only. No wallet client, no account, no signing.
 */
export type AaveReadOnlyClient = {
  getBlockNumber(): Promise<bigint>;
  readContract(args: {
    address: Address;
    abi: Abi | readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }): Promise<unknown>;
};

export type DiscoveredReserve = {
  address: Address;
  symbol: SupportedAsset;
  decimals: number;
};

/** Laminar V1 supported assets. */
export const V1_SUPPORTED_ASSETS: readonly SupportedAsset[] = [
  "USDC",
  "EURC",
  "DAI",
];

export function isV1SupportedAsset(symbol: string): symbol is SupportedAsset {
  return (V1_SUPPORTED_ASSETS as readonly string[]).includes(symbol);
}

/** Builds the deterministic Laminar market id for a supported asset. */
export function buildAaveMarketId(asset: SupportedAsset): string {
  return `aave-${asset.toLowerCase()}-base`;
}

export class AaveReserveDiscoveryError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(`Aave Base reserve discovery failed: ${message}`);
    this.name = "AaveReserveDiscoveryError";
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Discovers Aave Base reserve assets through read-only RPC calls.
 *
 * Steps:
 * 1. Pool.getReservesList() → underlying reserve asset addresses.
 * 2. ERC20.symbol() for each reserve to identify the asset.
 * 3. Filter to Laminar V1 supported assets (USDC/EURC/DAI).
 * 4. ERC20.decimals() for each supported reserve.
 *
 * Throws AaveReserveDiscoveryError on any RPC failure; callers decide whether
 * to fall back to static markets (non-strict) or propagate (strict).
 */
export async function discoverAaveBaseReserves(
  client: AaveReadOnlyClient,
): Promise<DiscoveredReserve[]> {
  let reserveAddresses: readonly Address[];

  try {
    reserveAddresses = (await client.readContract({
      address: AAVE_BASE_CONFIG.poolAddress as Address,
      abi: AAVE_POOL_ABI,
      functionName: "getReservesList",
    })) as readonly Address[];
  } catch (error) {
    throw new AaveReserveDiscoveryError("getReservesList() call failed", error);
  }

  const supported: DiscoveredReserve[] = [];

  for (const address of reserveAddresses) {
    let symbol: string;

    try {
      symbol = (await client.readContract({
        address,
        abi: ERC20_ABI,
        functionName: "symbol",
      })) as string;
    } catch (error) {
      throw new AaveReserveDiscoveryError(
        `ERC20 symbol() call failed for ${address}`,
        error,
      );
    }

    if (!isV1SupportedAsset(symbol)) {
      continue;
    }

    let decimals: number;

    try {
      decimals = Number(
        (await client.readContract({
          address,
          abi: ERC20_ABI,
          functionName: "decimals",
        })) as number | bigint,
      );
    } catch (error) {
      throw new AaveReserveDiscoveryError(
        `ERC20 decimals() call failed for ${address}`,
        error,
      );
    }

    supported.push({ address, symbol, decimals });
  }

  return supported;
}

export type AaveReserveSupplyData = {
  /** Raw Aave currentLiquidityRate in ray units (1e27 = 100%). */
  liquidityRateRay: bigint;
  /** Supply APR as a decimal (e.g. 0.045 = 4.5%). */
  supplyApr: number;
  /**
   * Aave aToken contract address for this reserve, decoded from
   * getReserveData(). Used to read on-chain TVL via aToken.totalSupply().
   */
  aTokenAddress: Address;
};

export type AaveReserveTvlData = {
  /**
   * TVL in USD derived from aToken.totalSupply() on-chain.
   *
   * STABLECOIN PEG ASSUMPTION: 1 token ≈ 1 USD (USDC/EURC/DAI only).
   * No price feed is used. Document this assumption at call sites.
   */
  tvlUsd: number;
  /** Raw aToken totalSupply as returned by the contract. */
  totalSupplyRaw: bigint;
  /** Address of the aToken whose totalSupply was read. */
  aTokenAddress: Address;
};

/**
 * Extracts the Aave `currentLiquidityRate` (ray) from a decoded getReserveData
 * result. Supports both viem's named-object decoding and a positional tuple.
 *
 * In the ReserveDataLegacy struct, `currentLiquidityRate` is the 3rd field
 * (index 2), after `configuration` (0) and `liquidityIndex` (1).
 */
export function extractCurrentLiquidityRate(
  reserveData: unknown,
): bigint | undefined {
  if (
    reserveData !== null &&
    typeof reserveData === "object" &&
    "currentLiquidityRate" in reserveData
  ) {
    const value = (reserveData as Record<string, unknown>).currentLiquidityRate;
    if (typeof value === "bigint") {
      return value;
    }
    if (typeof value === "number") {
      return BigInt(value);
    }
    return undefined;
  }

  if (Array.isArray(reserveData)) {
    const value = reserveData[2];
    if (typeof value === "bigint") {
      return value;
    }
  }

  return undefined;
}

/**
 * Extracts the Aave aToken address from a decoded getReserveData result.
 * Supports both viem's named-object decoding and a positional tuple.
 *
 * In the ReserveDataLegacy struct, `aTokenAddress` is the 9th field (index 8),
 * after configuration(0), liquidityIndex(1), currentLiquidityRate(2),
 * variableBorrowIndex(3), currentVariableBorrowRate(4),
 * currentStableBorrowRate(5), lastUpdateTimestamp(6), id(7).
 */
export function extractATokenAddress(
  reserveData: unknown,
): Address | undefined {
  if (
    reserveData !== null &&
    typeof reserveData === "object" &&
    "aTokenAddress" in reserveData
  ) {
    const value = (reserveData as Record<string, unknown>).aTokenAddress;
    if (typeof value === "string" && value.startsWith("0x")) {
      return value as Address;
    }
    return undefined;
  }

  if (Array.isArray(reserveData)) {
    const value = reserveData[8];
    if (typeof value === "string" && value.startsWith("0x")) {
      return value as Address;
    }
  }

  return undefined;
}

/**
 * Reads the real Aave supply APR (and aToken address) for a reserve via a
 * single read-only getReserveData call.
 *
 * NOTE: Aave `liquidityRate` is an APR (not compounded). For MVP we use APR as
 * an APY approximation. Incentives/rewards are NOT included.
 *
 * The returned `aTokenAddress` can be passed directly to `readAaveReserveTvl()`
 * — no additional getReserveData call is needed.
 *
 * Throws AaveReserveDiscoveryError on RPC failure or decode failure.
 */
export async function readAaveReserveSupplyApr(
  client: AaveReadOnlyClient,
  assetAddress: Address,
): Promise<AaveReserveSupplyData> {
  let reserveData: unknown;

  try {
    reserveData = await client.readContract({
      address: AAVE_BASE_CONFIG.poolAddress as Address,
      abi: AAVE_POOL_ABI,
      functionName: "getReserveData",
      args: [assetAddress],
    });
  } catch (error) {
    throw new AaveReserveDiscoveryError(
      `getReserveData() call failed for ${assetAddress}`,
      error,
    );
  }

  const liquidityRateRay = extractCurrentLiquidityRate(reserveData);

  if (liquidityRateRay === undefined) {
    throw new AaveReserveDiscoveryError(
      `could not decode currentLiquidityRate for ${assetAddress}`,
    );
  }

  const aTokenAddress = extractATokenAddress(reserveData);

  if (aTokenAddress === undefined) {
    throw new AaveReserveDiscoveryError(
      `could not decode aTokenAddress for ${assetAddress}`,
    );
  }

  return {
    liquidityRateRay,
    supplyApr: rayToDecimal(liquidityRateRay),
    aTokenAddress,
  };
}

/**
 * Reads the real on-chain TVL for an Aave reserve by calling
 * `aToken.totalSupply()` on the aToken contract.
 *
 * STABLECOIN PEG ASSUMPTION:
 * For USDC/EURC/DAI we assume 1 token = 1 USD (no price feed).
 * This approximation is valid while the asset maintains its peg.
 * The returned `tvlNote` field documents this assumption explicitly.
 *
 * SAFETY: Read-only ERC20 call. No wallet, no signer, no account.
 *
 * Throws AaveReserveDiscoveryError on RPC or decode failure.
 *
 * @param client        Read-only client.
 * @param aTokenAddress aToken contract address (from readAaveReserveSupplyApr).
 * @param decimals      Underlying asset ERC20 decimals (e.g. 6 for USDC).
 */
export async function readAaveReserveTvl(
  client: AaveReadOnlyClient,
  aTokenAddress: Address,
  decimals: number,
): Promise<AaveReserveTvlData> {
  let totalSupplyRaw: bigint;

  try {
    const raw = await client.readContract({
      address: aTokenAddress,
      abi: ERC20_ABI,
      functionName: "totalSupply",
    });

    if (typeof raw === "bigint") {
      totalSupplyRaw = raw;
    } else if (typeof raw === "number" || typeof raw === "string") {
      totalSupplyRaw = BigInt(raw);
    } else {
      throw new AaveReserveDiscoveryError(
        `unexpected totalSupply return type for aToken ${aTokenAddress}`,
      );
    }
  } catch (error) {
    if (error instanceof AaveReserveDiscoveryError) {
      throw error;
    }
    throw new AaveReserveDiscoveryError(
      `aToken.totalSupply() call failed for ${aTokenAddress}`,
      error,
    );
  }

  return {
    tvlUsd: aTokenSupplyToUsd(totalSupplyRaw, decimals),
    totalSupplyRaw,
    aTokenAddress,
  };
}
