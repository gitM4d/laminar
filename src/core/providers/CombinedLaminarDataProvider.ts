import { RecommendationDataConsistencyError } from "../recommendation/generatePortfolioRecommendation.js";
import type { OpportunityLiquidityProfile } from "../liquidity/types.js";
import type { Opportunity } from "../opportunity/types.js";
import type { ProtocolTrustProfile } from "../trust/types.js";
import type { LiquidityDerivedSignals } from "../liquidity/deriveLiquiditySignals.js";
import type { LaminarDataProvider, ProviderInfo } from "./types.js";

/**
 * Aggregating read-only data provider that combines multiple LaminarDataProviders
 * into a single unified opportunity universe.
 *
 * ARCHITECTURE:
 * - Aggregation is the sole responsibility of this class.
 * - No protocol-specific logic lives here; each sub-provider owns its data.
 * - Trust and liquidity profiles are resolved by delegating to the sub-provider
 *   that originally supplied the protocol / opportunity.
 * - Duplicate opportunity ids across sub-providers are a hard error
 *   (RecommendationDataConsistencyError) — they must be resolved upstream.
 *
 * SAFETY: Read-only. No wallet, no signer, no transactions.
 *
 * This is experimental. The API/frontend default remains MockLaminarDataProvider.
 */
export class CombinedLaminarDataProvider implements LaminarDataProvider {
  private readonly providers: readonly LaminarDataProvider[];

  /**
   * Builds a merged opportunity universe from every sub-provider.
   *
   * Throws RecommendationDataConsistencyError immediately if two sub-providers
   * return overlapping opportunity ids — there is no automatic resolution.
   */
  constructor(providers: readonly LaminarDataProvider[]) {
    if (providers.length === 0) {
      throw new RecommendationDataConsistencyError(
        "CombinedLaminarDataProvider requires at least one sub-provider",
      );
    }

    // Eagerly validate for duplicate ids at construction time so callers get
    // a clear error before the recommendation pipeline starts.
    const seen = new Set<string>();
    for (const provider of providers) {
      for (const opportunity of provider.discoverOpportunities()) {
        if (seen.has(opportunity.id)) {
          throw new RecommendationDataConsistencyError(
            `Duplicate opportunity id "${opportunity.id}" returned by multiple sub-providers. Resolve the conflict before combining providers.`,
          );
        }
        seen.add(opportunity.id);
      }
    }

    this.providers = providers;
  }

  discoverOpportunities(): Opportunity[] {
    return this.providers.flatMap((provider) =>
      provider.discoverOpportunities(),
    );
  }

  getTrustProfile(protocolId: string): ProtocolTrustProfile {
    for (const provider of this.providers) {
      try {
        return provider.getTrustProfile(protocolId);
      } catch {
        // Provider does not own this protocol — try the next one.
      }
    }

    throw new RecommendationDataConsistencyError(
      `No sub-provider has a trust profile for protocol "${protocolId}". ` +
        `Ensure every protocol in the combined universe has a curated trust profile.`,
    );
  }

  getLiquidityProfile(opportunityId: string): OpportunityLiquidityProfile {
    for (const provider of this.providers) {
      try {
        return provider.getLiquidityProfile(opportunityId);
      } catch {
        // Provider does not own this opportunity — try the next one.
      }
    }

    throw new RecommendationDataConsistencyError(
      `No sub-provider has a liquidity profile for opportunity "${opportunityId}". ` +
        `Ensure every opportunity in the combined universe has a curated liquidity profile.`,
    );
  }

  getLiquidityDerivedSignals(
    protocolId: string,
  ): LiquidityDerivedSignals | undefined {
    for (const provider of this.providers) {
      const signals = provider.getLiquidityDerivedSignals?.(protocolId);
      if (signals !== undefined) {
        return signals;
      }
    }

    return undefined;
  }

  getProviderInfo(): ProviderInfo {
    const names = this.providers
      .map((provider) => provider.getProviderInfo?.()?.providerName)
      .filter((name): name is string => name !== undefined);

    return {
      providerType: "CombinedLaminarDataProvider",
      providerName:
        names.length > 0 ? names.join(" + ") : "Combined (experimental)",
    };
  }
}
