import type { Opportunity } from "../../core/opportunity/types.js";
import { MORPHO_BASE_CONFIG } from "./morphoBaseConfig.js";
import type { ReadOnlyMarketOpportunity } from "../types.js";

/**
 * Maps a read-only Morpho Base market to a Laminar Opportunity.
 *
 * NOTE:
 * - APY here is adapter-provided (Morpho API when available, static otherwise).
 * - Trust Score and Liquidity Score are NOT calculated here; they are produced
 *   downstream from curated trust/liquidity profiles.
 * - protocolRiskLevel / auditCount are curated static metadata for Morpho.
 *   Morpho is a curated lending protocol with multiple audits; it is treated as
 *   "medium" risk (slightly above Aave) for V1.
 */
export function mapMorphoMarketToOpportunity(
  market: ReadOnlyMarketOpportunity,
): Opportunity {
  return {
    id: market.id,
    protocolId: MORPHO_BASE_CONFIG.protocolId,
    protocolName: MORPHO_BASE_CONFIG.protocolName,
    asset: market.asset,
    chain: market.chain,
    apy: market.apy,
    isExperimental: false,
    protocolRiskLevel: "medium",
    auditCount: 2,
    exposureCategory: "lending",
  };
}
