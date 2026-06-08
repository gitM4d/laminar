import type { Opportunity } from "../../core/opportunity/types.js";
import { AAVE_BASE_CONFIG } from "./aaveBaseConfig.js";
import type { ReadOnlyMarketOpportunity } from "../types.js";

/**
 * Maps a read-only Aave Base market to a Laminar Opportunity.
 *
 * NOTE:
 * - APY here is adapter-provided (static in Sprint 17).
 * - Trust Score and Liquidity Score are NOT calculated here; they are produced
 *   downstream from curated trust/liquidity profiles.
 * - protocolRiskLevel / auditCount are curated static metadata for Aave.
 */
export function mapAaveMarketToOpportunity(
  market: ReadOnlyMarketOpportunity,
): Opportunity {
  return {
    id: market.id,
    protocolId: AAVE_BASE_CONFIG.protocolId,
    protocolName: AAVE_BASE_CONFIG.protocolName,
    asset: market.asset,
    chain: market.chain,
    apy: market.apy,
    isExperimental: false,
    protocolRiskLevel: "low",
    auditCount: 2,
    exposureCategory: "lending",
  };
}
