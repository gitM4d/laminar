import type { ReadOnlyMarketOpportunity } from "./types.js";

const PLACEHOLDER_ADDRESS_PATTERN = /PLACEHOLDER/i;

export function isPlaceholderMarketAddress(address: string): boolean {
  return PLACEHOLDER_ADDRESS_PATTERN.test(address);
}

/**
 * Returns true when a discovered market has real enough APY/TVL provenance for
 * production/real provider flows. Static fallback and placeholder markets are
 * excluded.
 */
export function isRealDataEligibleMarket(
  market: ReadOnlyMarketOpportunity,
): boolean {
  if (
    market.source === "static-fallback" ||
    market.source === "static-fallback-rpc-verified"
  ) {
    return false;
  }

  if (market.metadata?.apySource === "static-placeholder") {
    return false;
  }

  if (market.metadata?.tvlSource === "static-placeholder") {
    return false;
  }

  const reserveAddress = market.metadata?.reserveAddress;
  if (
    reserveAddress !== undefined &&
    isPlaceholderMarketAddress(reserveAddress)
  ) {
    return false;
  }

  return true;
}

export function filterRealDataEligibleMarkets(
  markets: readonly ReadOnlyMarketOpportunity[],
): ReadOnlyMarketOpportunity[] {
  return markets.filter(isRealDataEligibleMarket);
}

export function resolveAllowStaticMarketData(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.ALLOW_STATIC_MARKET_DATA === "true";
}
