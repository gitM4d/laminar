import { assertValidIntent } from "../core/intent/validateIntent.js";
import { normalizeIntent } from "../core/normalization/normalizeIntent.js";
import { generatePolicy } from "../core/policy/generatePolicy.js";
import { selectProfile } from "../core/profile/selectProfile.js";

const intent = {
  risk: 3,
  liquidity: 8,
  returnPreference: 4,
};

const validatedIntent = assertValidIntent(intent);
const normalizedIntent = normalizeIntent(validatedIntent);
const profileClassification = selectProfile(validatedIntent);
const policy = generatePolicy(profileClassification.selectedProfile);

const output = {
  intent: validatedIntent,
  normalizedIntent,
  profileClassification: {
    selectedProfile: profileClassification.selectedProfile,
    distances: profileClassification.distances,
  },
  policy,
};

console.log(JSON.stringify(output, null, 2));
