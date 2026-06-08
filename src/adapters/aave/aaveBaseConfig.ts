import type { ProtocolAdapterChain } from "../types.js";

/**
 * Aave V3 on Base — read-only adapter configuration.
 *
 * IMPORTANT:
 * - Addresses must be verified against the official Aave address registry
 *   (https://aave.com/docs / address-book) before any production use.
 * - The poolAddress below is used ONLY for read-only health checks in this
 *   sprint. No transactions, approvals, or writes are performed.
 */
export const AAVE_BASE_CONFIG = {
  chain: "Base" as ProtocolAdapterChain,
  chainId: 8453,
  protocolId: "aave",
  protocolName: "Aave",
  // Aave V3 Pool on Base. Verify against the official registry before production.
  // Used only for read-only health checks in Sprint 17.
  poolAddress: "0xa238dd80c259a72e81d7e4664a9801593f98d1c5",
} as const;

/**
 * Resolves the RPC URL for the Aave Base adapter.
 *
 * Precedence: AAVE_BASE_RPC_URL first, then BASE_RPC_URL.
 * Returns undefined when no RPC is configured (static fallback mode).
 */
export function resolveAaveBaseRpcUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const url = env.AAVE_BASE_RPC_URL ?? env.BASE_RPC_URL;

  if (url === undefined) {
    return undefined;
  }

  const trimmed = url.trim();
  return trimmed === "" ? undefined : trimmed;
}
