import { discoverOpportunities } from "../core/opportunity/discoverOpportunities.js";
import { assertValidIntent } from "../core/intent/validateIntent.js";
import { normalizeIntent } from "../core/normalization/normalizeIntent.js";
import { generatePolicy } from "../core/policy/generatePolicy.js";
import { selectProfile } from "../core/profile/selectProfile.js";
import { scoreOpportunitiesTrust } from "../core/trust/scoreOpportunityTrust.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

const intent = {
  risk: 3,
  liquidity: 8,
  returnPreference: 4,
};

const validatedIntent = assertValidIntent(intent);
const normalizedIntent = normalizeIntent(validatedIntent);
const profileClassification = selectProfile(validatedIntent);
const policy = generatePolicy(profileClassification.selectedProfile);
const discovery = discoverOpportunities();
const trustScores = scoreOpportunitiesTrust(discovery.opportunities, { asOf });

const output = {
  intent: validatedIntent,
  normalizedIntent,
  profileClassification: {
    selectedProfile: profileClassification.selectedProfile,
    distances: profileClassification.distances,
  },
  policy,
  opportunities: discovery.opportunities,
  trustScores: trustScores.map((entry) => ({
    opportunityId: entry.opportunityId,
    protocolId: entry.protocolId,
    protocolName: entry.protocolName,
    trustScore: entry.trust.trustScore,
    breakdown: entry.trust.breakdown,
    explanations: entry.trust.explanations,
  })),
};

console.log(JSON.stringify(output, null, 2));
