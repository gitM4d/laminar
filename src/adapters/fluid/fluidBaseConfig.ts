import type { ProtocolAdapterChain } from "../types.js";
import type { SupportedAsset } from "../../core/opportunity/types.js";

/**
 * Fluid on Base — read-only adapter configuration.
 *
 * DATA SOURCE: Fluid/Instadapp official public REST API
 * (`GET /v2/lending/{chainId}/tokens`). Documented at docs.fluid.instadapp.io.
 *
 * Unlike Moonwell, Fluid has a stable public default endpoint (mirrors Morpho).
 * When the API is disabled/unconfigured, the adapter exposes zero markets —
 * no silent static fallback in real provider flows.
 */
export const FLUID_BASE_CONFIG = {
  chain: "Base" as ProtocolAdapterChain,
  chainId: 8453,
  protocolId: "fluid",
  protocolName: "Fluid",
  /** Fluid/Instadapp official lending tokens API (read-only). */
  apiUrl: "https://api.fluid.instadapp.io/v2/lending/8453/tokens",
} as const;

/**
 * Resolves the Fluid read-only API URL.
 *
 * Precedence: FLUID_BASE_API_URL override, then the public default.
 * Returns undefined when the API is explicitly disabled (empty string).
 */
export function resolveFluidBaseApiUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const url = env.FLUID_BASE_API_URL ?? FLUID_BASE_CONFIG.apiUrl;
  const trimmed = url.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Builds the deterministic Laminar market id for a supported asset. */
export function buildFluidMarketId(asset: SupportedAsset): string {
  return `fluid-${asset.toLowerCase()}-base`;
}
