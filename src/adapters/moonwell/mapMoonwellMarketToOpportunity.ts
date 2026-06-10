import type { Opportunity } from "../../core/opportunity/types.js";
import { MOONWELL_BASE_CONFIG } from "./moonwellBaseConfig.js";
import type { ReadOnlyMarketOpportunity } from "../types.js";

/**
 * Maps a read-only Moonwell Base market to a Laminar Opportunity.
 *
 * NOTE:
 * - APY here is adapter-provided (Moonwell API when available, static otherwise).
 * - Trust Score and Liquidity Score are NOT calculated here; they are produced
 *   downstream from curated trust/liquidity profiles.
 * - protocolRiskLevel / auditCount are curated static metadata for Moonwell.
 *   Moonwell is an established Compound V2-style lending protocol with audits;
 *   it is treated as "medium" risk (comparable to Morpho) for V1.
 */
export function mapMoonwellMarketToOpportunity(
  market: ReadOnlyMarketOpportunity,
): Opportunity {
  return {
    id: market.id,
    protocolId: MOONWELL_BASE_CONFIG.protocolId,
    protocolName: MOONWELL_BASE_CONFIG.protocolName,
    asset: market.asset,
    chain: market.chain,
    apy: market.apy,
    isExperimental: false,
    protocolRiskLevel: "medium",
    auditCount: 2,
    exposureCategory: "lending",
  };
}
