import type { ProtocolAdapterChain } from "../types.js";
import type { SupportedAsset } from "../../core/opportunity/types.js";

/**
 * Morpho on Base — read-only adapter configuration.
 *
 * IMPORTANT:
 * - This adapter is READ-ONLY. It only queries Morpho's public data API.
 * - No contract addresses are used for writes; no transactions are built.
 * - The public GraphQL API is used for discovery when available, with a
 *   deterministic static fallback so local development never blocks.
 */
export const MORPHO_BASE_CONFIG = {
  chain: "Base" as ProtocolAdapterChain,
  chainId: 8453,
  protocolId: "morpho",
  protocolName: "Morpho",
  /** Morpho public GraphQL API (read-only). */
  apiUrl: "https://api.morpho.org/graphql",
} as const;

/**
 * Resolves the Morpho read-only API URL.
 *
 * Precedence: MORPHO_BASE_API_URL override, then the public default.
 * Returns undefined when the API is explicitly disabled (empty string),
 * which forces static-fallback mode.
 */
export function resolveMorphoBaseApiUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const url = env.MORPHO_BASE_API_URL ?? MORPHO_BASE_CONFIG.apiUrl;
  const trimmed = url.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Builds the deterministic Laminar market id for a supported asset. */
export function buildMorphoMarketId(asset: SupportedAsset): string {
  return `morpho-${asset.toLowerCase()}-base`;
}
