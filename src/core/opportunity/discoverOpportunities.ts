import { MOCK_OPPORTUNITIES } from "./mockOpportunities.js";
import type {
  Opportunity,
  OpportunityDiscoveryResult,
  SupportedAsset,
} from "./types.js";

export function discoverOpportunities(
  options: { assets?: readonly SupportedAsset[] } = {},
): OpportunityDiscoveryResult {
  const assets = options.assets;

  const opportunities =
    assets === undefined
      ? [...MOCK_OPPORTUNITIES]
      : MOCK_OPPORTUNITIES.filter((opportunity) =>
          assets.includes(opportunity.asset),
        );

  return {
    opportunities,
    source: "mock",
  };
}
