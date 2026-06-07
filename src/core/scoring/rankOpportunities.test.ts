import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MOCK_OPPORTUNITIES } from "../opportunity/mockOpportunities.js";
import { generatePolicy } from "../policy/generatePolicy.js";
import { scoreOpportunitiesLiquidity } from "../liquidity/scoreOpportunityLiquidity.js";
import { assessOpportunitiesRisk } from "../risk/assessOpportunitiesRisk.js";
import { scoreOpportunitiesTrust } from "../trust/scoreOpportunityTrust.js";
import { rankOpportunities } from "./rankOpportunities.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const asOf = new Date("2026-06-01T00:00:00.000Z");

describe("rankOpportunities", () => {
  it("excludes rejected opportunities from rankings", () => {
    const policy = generatePolicy("Balanced");
    const trustScores = scoreOpportunitiesTrust(MOCK_OPPORTUNITIES, { asOf });
    const liquidityScores = scoreOpportunitiesLiquidity(MOCK_OPPORTUNITIES);
    const riskAssessments = assessOpportunitiesRisk(
      MOCK_OPPORTUNITIES,
      policy,
      trustScores,
      liquidityScores,
    );

    const ranking = rankOpportunities({
      opportunities: MOCK_OPPORTUNITIES,
      policy,
      trustScores,
      liquidityScores,
      riskAssessments,
    });

    const rankedIds = ranking.ranked.map((entry) => entry.opportunityId);

    expect(rankedIds).not.toContain("moonwell-dai-base");
    expect(rankedIds).not.toContain("experimental-usdc-base");
  });

  it("includes rejected opportunities in the rejected list", () => {
    const policy = generatePolicy("Balanced");
    const trustScores = scoreOpportunitiesTrust(MOCK_OPPORTUNITIES, { asOf });
    const liquidityScores = scoreOpportunitiesLiquidity(MOCK_OPPORTUNITIES);
    const riskAssessments = assessOpportunitiesRisk(
      MOCK_OPPORTUNITIES,
      policy,
      trustScores,
      liquidityScores,
    );

    const ranking = rankOpportunities({
      opportunities: MOCK_OPPORTUNITIES,
      policy,
      trustScores,
      liquidityScores,
      riskAssessments,
    });

    const rejectedIds = ranking.rejected.map((entry) => entry.opportunityId);

    expect(rejectedIds).toContain("moonwell-dai-base");
    expect(rejectedIds).toContain("experimental-usdc-base");
    expect(ranking.rejected[0]?.rejectionReasons.length).toBeGreaterThan(0);
  });

  it("produces non-zero differentiated scores for eligible Aave and Moonwell opportunities", () => {
    const policy = generatePolicy("Balanced");
    const trustScores = scoreOpportunitiesTrust(MOCK_OPPORTUNITIES, { asOf });
    const liquidityScores = scoreOpportunitiesLiquidity(MOCK_OPPORTUNITIES);
    const riskAssessments = assessOpportunitiesRisk(
      MOCK_OPPORTUNITIES,
      policy,
      trustScores,
      liquidityScores,
    );

    const ranking = rankOpportunities({
      opportunities: MOCK_OPPORTUNITIES,
      policy,
      trustScores,
      liquidityScores,
      riskAssessments,
    });

    const byId = Object.fromEntries(
      ranking.ranked.map((entry) => [entry.opportunityId, entry.scoring.score]),
    );

    expect(byId["aave-usdc-base"]).toBeGreaterThan(0);
    expect(byId["moonwell-usdc-base"]).toBeGreaterThan(0);
    expect(byId["aave-usdc-base"]).not.toBe(byId["moonwell-usdc-base"]);
    expect(byId["aave-eurc-base"]).toBeGreaterThan(0);
  });

  it("sorts ranked opportunities descending by score", () => {
    const policy = generatePolicy("Balanced");
    const trustScores = scoreOpportunitiesTrust(MOCK_OPPORTUNITIES, { asOf });
    const liquidityScores = scoreOpportunitiesLiquidity(MOCK_OPPORTUNITIES);
    const riskAssessments = assessOpportunitiesRisk(
      MOCK_OPPORTUNITIES,
      policy,
      trustScores,
      liquidityScores,
    );

    const ranking = rankOpportunities({
      opportunities: MOCK_OPPORTUNITIES,
      policy,
      trustScores,
      liquidityScores,
      riskAssessments,
    });

    const scores = ranking.ranked.map((entry) => entry.scoring.score);

    expect(ranking.ranked[0]?.rank).toBe(1);
    expect(scores).toEqual([...scores].sort((left, right) => right - left));
  });

  it("does not import trust calculation modules", () => {
    const source = readFileSync(
      resolve(testDir, "rankOpportunities.ts"),
      "utf8",
    );

    expect(source).not.toContain("calculateTrustScore");
    expect(source).not.toContain("scoreOpportunitiesTrust");
  });

  it("does not import liquidity calculation modules", () => {
    const source = readFileSync(
      resolve(testDir, "rankOpportunities.ts"),
      "utf8",
    );

    expect(source).not.toContain("calculateLiquidityScore");
    expect(source).not.toContain("scoreOpportunitiesLiquidity");
  });

  it("does not import risk evaluation modules", () => {
    const source = readFileSync(
      resolve(testDir, "rankOpportunities.ts"),
      "utf8",
    );

    expect(source).not.toContain("evaluateOpportunityRisk");
    expect(source).not.toContain("assessOpportunitiesRisk");
  });
});
