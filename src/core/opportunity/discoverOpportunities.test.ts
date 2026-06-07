import { describe, expect, it } from "vitest";
import { MOCK_OPPORTUNITIES } from "./mockOpportunities.js";
import { discoverOpportunities } from "./discoverOpportunities.js";

describe("discoverOpportunities", () => {
  it("returns the full mock opportunity dataset by default", () => {
    const result = discoverOpportunities();

    expect(result.source).toBe("mock");
    expect(result.opportunities).toEqual([...MOCK_OPPORTUNITIES]);
    expect(result.opportunities).toHaveLength(6);
  });

  it("filters opportunities by supported asset", () => {
    const result = discoverOpportunities({ assets: ["USDC"] });

    expect(result.opportunities).toHaveLength(4);
    expect(
      result.opportunities.every((opportunity) => opportunity.asset === "USDC"),
    ).toBe(true);
  });

  it("returns unique opportunity ids", () => {
    const result = discoverOpportunities();
    const ids = result.opportunities.map((opportunity) => opportunity.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
