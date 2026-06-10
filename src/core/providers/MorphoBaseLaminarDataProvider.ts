import { MorphoBaseReadOnlyAdapter } from "../../adapters/morpho/MorphoBaseReadOnlyAdapter.js";
import type { MorphoBaseReadOnlyAdapterOptions } from "../../adapters/morpho/MorphoBaseReadOnlyAdapter.js";
import { mapMorphoMarketToOpportunity } from "../../adapters/morpho/mapMorphoMarketToOpportunity.js";
import { MORPHO_BASE_CONFIG } from "../../adapters/morpho/morphoBaseConfig.js";
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
import type { LaminarDataProvider, ProviderInfo } from "./types.js";

/**
 * Curated Morpho trust profile for the read-only adapter.
 *
 * NOTE: Trust metadata is curated/static — not sourced on-chain or via API.
 * Morpho is a well-audited lending protocol, slightly younger than Aave.
 */
export const MORPHO_BASE_CURATED_TRUST_PROFILE: ProtocolTrustProfile = {
  protocolId: MORPHO_BASE_CONFIG.protocolId,
  protocolName: MORPHO_BASE_CONFIG.protocolName,
  protocolAgeYears: 3,
  tvlUsd: 2_500_000_000,
  audits: [
    {
      auditor: "Spearbit",
      tier: 1,
      completedAt: "2023-11-01",
    },
    {
      auditor: "ChainSecurity",
      tier: 1,
      completedAt: "2024-02-15",
    },
  ],
  incidents: [],
  chainAdjustment: 0,
};

/**
 * Curated liquidity profile for Morpho Base stablecoin vaults.
 *
 * NOTE: Liquidity metadata is curated/static. USDC/EURC/DAI vault positions are
 * generally instant to withdraw, though redemption reliability is treated as
 * "high" (rather than "veryHigh") to reflect occasional vault utilization.
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
 * Read-only Morpho Base data provider.
 *
 * Wraps API-discovered (or static fallback) opportunities and curated
 * trust/liquidity profiles into a synchronous `LaminarDataProvider` that can be
 * passed directly into `createLaminarRecommendation`.
 *
 * IMPORTANT:
 * - APY/TVL are real when the Morpho API is reachable; static placeholders
 *   otherwise.
 * - Trust/liquidity profiles are curated/static.
 * - No transactions are created; the adapter is read-only.
 * - This is experimental. The API/frontend default remains MockLaminarDataProvider.
 */
class MorphoBaseLaminarDataProvider implements LaminarDataProvider {
  private readonly opportunities: readonly Opportunity[];
  private readonly trustProfiles: Record<string, ProtocolTrustProfile>;
  private readonly liquidityProfiles: Record<
    string,
    OpportunityLiquidityProfile
  >;

  constructor(
    opportunities: readonly Opportunity[],
    trustProfiles: Record<string, ProtocolTrustProfile>,
    liquidityProfiles: Record<string, OpportunityLiquidityProfile>,
  ) {
    this.opportunities = opportunities;
    this.trustProfiles = trustProfiles;
    this.liquidityProfiles = liquidityProfiles;
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

  getProviderInfo(): ProviderInfo {
    return {
      providerType: "MorphoBaseLaminarDataProvider",
      providerName: "Morpho Base (experimental)",
    };
  }
}

export {
  UnknownOpportunityLiquidityProfileError,
  UnknownProtocolTrustProfileError,
};

export type MorphoBaseProviderSnapshotOptions =
  MorphoBaseReadOnlyAdapterOptions;

/**
 * Experimental factory that builds a LaminarDataProvider snapshot from the
 * read-only Morpho Base adapter.
 *
 * This is async because adapter discovery is async, but it returns a plain
 * synchronous LaminarDataProvider snapshot so that createLaminarRecommendation
 * stays synchronous.
 *
 * Usage:
 * ```ts
 * const provider = await createMorphoBaseLaminarDataProviderSnapshot();
 * const result = createLaminarRecommendation({ intent, portfolioValueUsd, dataProvider: provider });
 * ```
 *
 * IMPORTANT:
 * - This is experimental and is NOT the default provider.
 * - APY/TVL are from the Morpho public API when reachable; static otherwise.
 * - Trust/liquidity metadata is curated/static.
 * - No transactions are created; the adapter is read-only.
 */
export async function createMorphoBaseLaminarDataProviderSnapshot(
  options: MorphoBaseProviderSnapshotOptions = {},
): Promise<LaminarDataProvider> {
  const adapter = new MorphoBaseReadOnlyAdapter(options);
  const markets = await adapter.discoverMarkets();
  const opportunities: Opportunity[] = markets.map(mapMorphoMarketToOpportunity);

  const trustProfiles: Record<string, ProtocolTrustProfile> = {
    [MORPHO_BASE_CONFIG.protocolId]: MORPHO_BASE_CURATED_TRUST_PROFILE,
  };

  const liquidityProfiles: Record<string, OpportunityLiquidityProfile> = {};
  for (const opportunity of opportunities) {
    liquidityProfiles[opportunity.id] = buildCuratedLiquidityProfile(
      opportunity.id,
    );
  }

  return new MorphoBaseLaminarDataProvider(
    opportunities,
    trustProfiles,
    liquidityProfiles,
  );
}
