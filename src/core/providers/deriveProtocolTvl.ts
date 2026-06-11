import type { ReadOnlyMarketOpportunity } from "../../adapters/types.js";
import { isRealDataEligibleMarket } from "../../adapters/realDataEligibility.js";
import type {
  ProtocolTrustProfile,
} from "../trust/types.js";

/**
 * Sums TVL from real-data-eligible markets for a single protocol.
 * Returns null when no eligible markets contribute finite positive TVL.
 */
export function deriveProtocolTvlUsdFromMarkets(
  markets: readonly ReadOnlyMarketOpportunity[],
  protocolId: string,
): number | null {
  let sum = 0;
  let count = 0;

  for (const market of markets) {
    if (market.protocolId !== protocolId) {
      continue;
    }

    if (!isRealDataEligibleMarket(market)) {
      continue;
    }

    if (!Number.isFinite(market.tvlUsd) || market.tvlUsd <= 0) {
      continue;
    }

    sum += market.tvlUsd;
    count += 1;
  }

  return count > 0 ? sum : null;
}

/**
 * Builds a trust profile using real market TVL when available, otherwise the
 * curated fallback TVL. Age, audits, incidents, and chain adjustment are unchanged.
 */
export function buildProtocolTrustProfileWithDerivedTvl(
  curatedProfile: ProtocolTrustProfile,
  markets: readonly ReadOnlyMarketOpportunity[],
): ProtocolTrustProfile {
  const derivedTvl = deriveProtocolTvlUsdFromMarkets(
    markets,
    curatedProfile.protocolId,
  );

  if (derivedTvl === null) {
    return {
      ...curatedProfile,
      tvlSource: "curated-fallback",
    };
  }

  return {
    ...curatedProfile,
    tvlUsd: derivedTvl,
    tvlSource: "real-provider-markets",
  };
}
