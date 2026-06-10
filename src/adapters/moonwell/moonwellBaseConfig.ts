import type { ProtocolAdapterChain } from "../types.js";
import type { SupportedAsset } from "../../core/opportunity/types.js";

/**
 * Moonwell on Base — read-only adapter configuration.
 *
 * IMPORTANT:
 * - This adapter is READ-ONLY. It only queries Moonwell's public data API.
 * - No contract addresses are used for writes; no transactions are built.
 * - A read-only data API is used for discovery when configured, with a
 *   deterministic static fallback so local development never blocks.
 *
 * DATA SOURCE CHOICE (see README / sprint summary):
 * - Chosen: a lightweight read-only HTTP/JSON data API client, mirroring the
 *   Morpho adapter. The endpoint is provided via `MOONWELL_BASE_API_URL`.
 * - Discarded: the official `@moonwell-fi/moonwell-sdk` (heavy dependency,
 *   internally RPC-coupled, hard to mock cleanly), the subgraph (endpoint/key
 *   management + schema drift), and direct on-chain mToken reads (Compound-style
 *   APY math + price feed for USD TVL = unnecessary complexity for a spike).
 *   The client interface leaves room to plug any of these in later.
 */
export const MOONWELL_BASE_CONFIG = {
  chain: "Base" as ProtocolAdapterChain,
  chainId: 8453,
  protocolId: "moonwell",
  protocolName: "Moonwell",
} as const;

/**
 * Resolves the Moonwell read-only data API URL.
 *
 * Precedence: MOONWELL_BASE_API_URL override only.
 *
 * NOTE: Unlike Morpho, there is no hardcoded public default endpoint. When the
 * env var is absent/empty the adapter runs in deterministic static-fallback
 * mode (same default posture as the Aave adapter without an RPC URL).
 */
export function resolveMoonwellBaseApiUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const url = env.MOONWELL_BASE_API_URL;
  if (url === undefined) {
    return undefined;
  }
  const trimmed = url.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Builds the deterministic Laminar market id for a supported asset. */
export function buildMoonwellMarketId(asset: SupportedAsset): string {
  return `moonwell-${asset.toLowerCase()}-base`;
}
