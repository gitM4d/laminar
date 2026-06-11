import type { Opportunity } from "../../core/opportunity/types.js";
import { FLUID_BASE_CONFIG } from "./fluidBaseConfig.js";
import type { ReadOnlyMarketOpportunity } from "../types.js";

/**
 * Maps a read-only Fluid Base market to a Laminar Opportunity.
 *
 * Trust and liquidity scores are produced downstream from curated profiles.
 */
export function mapFluidMarketToOpportunity(
  market: ReadOnlyMarketOpportunity,
): Opportunity {
  return {
    id: market.id,
    protocolId: FLUID_BASE_CONFIG.protocolId,
    protocolName: FLUID_BASE_CONFIG.protocolName,
    asset: market.asset,
    chain: market.chain,
    apy: market.apy,
    isExperimental: false,
    protocolRiskLevel: "medium",
    auditCount: 2,
    exposureCategory: "lending",
  };
}
