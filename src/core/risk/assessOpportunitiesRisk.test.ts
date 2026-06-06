import { describe, expect, it } from "vitest";
import { MOCK_OPPORTUNITIES } from "../opportunity/mockOpportunities.js";
import { generatePolicy } from "../policy/generatePolicy.js";
import { scoreOpportunitiesLiquidity } from "../liquidity/scoreOpportunityLiquidity.js";
import { scoreOpportunitiesTrust } from "../trust/scoreOpportunityTrust.js";
import { assessOpportunitiesRisk } from "./assessOpportunitiesRisk.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

describe("assessOpportunitiesRisk", () => {
  it("assesses all mock opportunities against a balanced policy", () => {
    const policy = generatePolicy("Balanced");
    const trustScores = scoreOpportunitiesTrust(MOCK_OPPORTUNITIES, { asOf });
    const liquidityScores = scoreOpportunitiesLiquidity(MOCK_OPPORTUNITIES);
    const assessments = assessOpportunitiesRisk(
      MOCK_OPPORTUNITIES,
      policy,
      trustScores,
      liquidityScores,
    );

    expect(assessments).toHaveLength(MOCK_OPPORTUNITIES.length);

    const byId = Object.fromEntries(
      assessments.map((entry) => [entry.opportunityId, entry.assessment]),
    );

    expect(byId["morpho-usdc-base"]?.decision).toBe("eligible");
    expect(byId["experimental-usdc-base"]?.decision).toBe("rejected");
    expect(byId["moonwell-dai-base"]?.decision).toBe("rejected");
  });
});
