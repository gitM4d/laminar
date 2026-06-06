import type { Opportunity } from "../opportunity/types.js";
import { calculateTrustScore } from "./calculateTrustScore.js";
import { MOCK_PROTOCOL_TRUST_PROFILES } from "./mockProtocolTrustProfiles.js";
import type { ProtocolTrustProfile, ScoredOpportunityTrust } from "./types.js";

export class UnknownProtocolTrustProfileError extends Error {
  readonly protocolId: string;

  constructor(protocolId: string) {
    super(`No trust profile found for protocol: ${protocolId}`);
    this.name = "UnknownProtocolTrustProfileError";
    this.protocolId = protocolId;
  }
}

export function getProtocolTrustProfile(
  protocolId: string,
  profiles: Record<string, ProtocolTrustProfile> = MOCK_PROTOCOL_TRUST_PROFILES,
): ProtocolTrustProfile {
  const profile = profiles[protocolId];

  if (profile === undefined) {
    throw new UnknownProtocolTrustProfileError(protocolId);
  }

  return profile;
}

export function scoreOpportunityTrust(
  opportunity: Opportunity,
  options: {
    asOf?: Date;
    profiles?: Record<string, ProtocolTrustProfile>;
  } = {},
): ScoredOpportunityTrust {
  const profile = getProtocolTrustProfile(
    opportunity.protocolId,
    options.profiles,
  );
  const trust = calculateTrustScore(profile, options.asOf);

  return {
    opportunityId: opportunity.id,
    protocolId: opportunity.protocolId,
    protocolName: opportunity.protocolName,
    trust,
  };
}

export function scoreOpportunitiesTrust(
  opportunities: readonly Opportunity[],
  options: {
    asOf?: Date;
    profiles?: Record<string, ProtocolTrustProfile>;
  } = {},
): ScoredOpportunityTrust[] {
  return opportunities.map((opportunity) =>
    scoreOpportunityTrust(opportunity, options),
  );
}
