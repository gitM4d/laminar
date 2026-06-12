import { MoonwellBaseReadOnlyAdapter } from "../../adapters/moonwell/MoonwellBaseReadOnlyAdapter.js";
import type { MoonwellBaseReadOnlyAdapterOptions } from "../../adapters/moonwell/MoonwellBaseReadOnlyAdapter.js";
import { mapMoonwellMarketToOpportunity } from "../../adapters/moonwell/mapMoonwellMarketToOpportunity.js";
import { MOONWELL_BASE_CONFIG } from "../../adapters/moonwell/moonwellBaseConfig.js";
import {
  filterRealDataEligibleMarkets,
  resolveAllowStaticMarketData,
} from "../../adapters/realDataEligibility.js";
import {
  getOpportunityLiquidityProfile,
  UnknownOpportunityLiquidityProfileError,
} from "../liquidity/scoreOpportunityLiquidity.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import type { Opportunity } from "../opportunity/types.js";
import {
  getProtocolTrustProfile,
  UnknownProtocolTrustProfileError,
} from "../trust/scoreOpportunityTrust.js";
import type { ProtocolTrustProfile } from "../trust/types.js";
import { buildCuratedProtocolTrustProfile } from "../protocols/protocolRegistry.js";
import { buildProtocolTrustProfileWithDerivedTvl } from "./deriveProtocolTvl.js";
import {
  deriveLiquiditySignalsFromMarkets,
  type LiquidityDerivedSignals,
} from "../liquidity/deriveLiquiditySignals.js";
import type { LaminarDataProvider, ProviderInfo } from "./types.js";

/** @deprecated Import from protocol registry via buildCuratedProtocolTrustProfile("moonwell"). */
export const MOONWELL_BASE_CURATED_TRUST_PROFILE: ProtocolTrustProfile =
  buildCuratedProtocolTrustProfile(MOONWELL_BASE_CONFIG.protocolId);

/**
 * Curated liquidity profile for Moonwell Base stablecoin lending markets.
 *
 * RATIONALE:
 * - Moonwell uses a Compound V2-style pooled lending model. Supplied
 *   stablecoins can normally be withdrawn instantly, subject to pool
 *   utilization. Redemption reliability is treated as "high" (not "veryHigh")
 *   to reflect occasional high-utilization periods where withdrawals can be
 *   temporarily constrained until borrowers repay or new supply arrives.
 * - No lockup, no withdrawal queue/cooldown for V1 stablecoin markets.
 * - Liquidity metadata is curated/static; it is NOT discovered on-chain.
 */
function buildCuratedLiquidityProfile(
  opportunityId: string,
): OpportunityLiquidityProfile {
  return {
    opportunityId,
    withdrawalSpeedBucket: "instant",
    withdrawalConstraintType: "none",
    redemptionReliabilityLevel: "high",
    assetLiquidityLevel: "veryHigh",
    maxWithdrawalDelay: "instant",
    hasLockup: false,
  };
}

/**
 * Read-only Moonwell Base data provider.
 *
 * Wraps API-discovered (or static fallback) opportunities and curated
 * trust/liquidity profiles into a synchronous `LaminarDataProvider` that can be
 * passed directly into `createLaminarRecommendation`.
 *
 * IMPORTANT:
 * - APY/TVL are real when the Moonwell API is reachable; static placeholders
 *   otherwise.
 * - Trust/liquidity profiles are curated/static.
 * - No transactions are created; the adapter is read-only.
 * - This is experimental. The API/frontend default remains MockLaminarDataProvider.
 */
class MoonwellBaseLaminarDataProvider implements LaminarDataProvider {
  private readonly opportunities: readonly Opportunity[];
  private readonly trustProfiles: Record<string, ProtocolTrustProfile>;
  private readonly liquidityProfiles: Record<
    string,
    OpportunityLiquidityProfile
  >;
  private readonly liquidityDerivedSignalsByProtocol: Record<
    string,
    LiquidityDerivedSignals
  >;

  constructor(
    opportunities: readonly Opportunity[],
    trustProfiles: Record<string, ProtocolTrustProfile>,
    liquidityProfiles: Record<string, OpportunityLiquidityProfile>,
    liquidityDerivedSignalsByProtocol: Record<string, LiquidityDerivedSignals>,
  ) {
    this.opportunities = opportunities;
    this.trustProfiles = trustProfiles;
    this.liquidityProfiles = liquidityProfiles;
    this.liquidityDerivedSignalsByProtocol = liquidityDerivedSignalsByProtocol;
  }

  discoverOpportunities(): Opportunity[] {
    return [...this.opportunities];
  }

  getTrustProfile(protocolId: string): ProtocolTrustProfile {
    return getProtocolTrustProfile(protocolId, this.trustProfiles);
  }

  getLiquidityProfile(opportunityId: string): OpportunityLiquidityProfile {
    return getOpportunityLiquidityProfile(opportunityId, this.liquidityProfiles);
  }

  getLiquidityDerivedSignals(
    protocolId: string,
  ): LiquidityDerivedSignals | undefined {
    return this.liquidityDerivedSignalsByProtocol[protocolId];
  }

  getProviderInfo(): ProviderInfo {
    return {
      providerType: "MoonwellBaseLaminarDataProvider",
      providerName: "Moonwell Base (experimental)",
    };
  }
}

export {
  UnknownOpportunityLiquidityProfileError,
  UnknownProtocolTrustProfileError,
};

export type MoonwellBaseProviderSnapshotOptions =
  MoonwellBaseReadOnlyAdapterOptions & {
    /**
     * When true, static placeholder markets are excluded from the provider
     * snapshot. Real provider flows (combined probe, compare:providers) should
     * set this. Override with `allowStaticMarketData: true` or
     * `ALLOW_STATIC_MARKET_DATA=true` for tests/dev only.
     */
    requireRealData?: boolean;
    /** Explicit dev/test override to include static placeholder markets. */
    allowStaticMarketData?: boolean;
  };

/**
 * Experimental factory that builds a LaminarDataProvider snapshot from the
 * read-only Moonwell Base adapter.
 *
 * This is async because adapter discovery is async, but it returns a plain
 * synchronous LaminarDataProvider snapshot so that createLaminarRecommendation
 * stays synchronous.
 *
 * Usage:
 * ```ts
 * const provider = await createMoonwellBaseLaminarDataProviderSnapshot();
 * const result = createLaminarRecommendation({ intent, portfolioValueUsd, dataProvider: provider });
 * ```
 *
 * IMPORTANT:
 * - This is experimental and is NOT the default provider.
 * - APY/TVL are from the Moonwell public API when reachable.
 * - With `requireRealData: true` (default for real flows), static fallback
 *   markets are excluded and the provider exposes zero opportunities when no
 *   real API source is configured.
 * - Trust/liquidity metadata is curated/static.
 * - No transactions are created; the adapter is read-only.
 */
export async function createMoonwellBaseLaminarDataProviderSnapshot(
  options: MoonwellBaseProviderSnapshotOptions = {},
): Promise<LaminarDataProvider> {
  const env = options.env ?? process.env;
  const allowStaticMarketData =
    options.allowStaticMarketData === true ||
    resolveAllowStaticMarketData(env);
  const requireRealData =
    options.requireRealData === true && !allowStaticMarketData;

  const adapter = new MoonwellBaseReadOnlyAdapter(options);
  const discoveredMarkets = await adapter.discoverMarkets();
  const markets = requireRealData
    ? filterRealDataEligibleMarkets(discoveredMarkets)
    : discoveredMarkets;
  const opportunities: Opportunity[] = markets.map(
    mapMoonwellMarketToOpportunity,
  );

  const trustProfiles: Record<string, ProtocolTrustProfile> = {
    [MOONWELL_BASE_CONFIG.protocolId]: buildProtocolTrustProfileWithDerivedTvl(
      MOONWELL_BASE_CURATED_TRUST_PROFILE,
      discoveredMarkets,
    ),
  };

  const liquidityProfiles: Record<string, OpportunityLiquidityProfile> = {};
  for (const opportunity of opportunities) {
    liquidityProfiles[opportunity.id] = buildCuratedLiquidityProfile(
      opportunity.id,
    );
  }

  return new MoonwellBaseLaminarDataProvider(
    opportunities,
    trustProfiles,
    liquidityProfiles,
    {
      [MOONWELL_BASE_CONFIG.protocolId]: deriveLiquiditySignalsFromMarkets(
        discoveredMarkets,
        MOONWELL_BASE_CONFIG.protocolId,
      ),
    },
  );
}
