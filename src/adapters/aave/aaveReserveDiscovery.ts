import type { Abi, Address } from "viem";
import type { SupportedAsset } from "../../core/opportunity/types.js";
import { AAVE_BASE_CONFIG } from "./aaveBaseConfig.js";
import { AAVE_POOL_ABI, ERC20_ABI } from "./aaveAbi.js";

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
