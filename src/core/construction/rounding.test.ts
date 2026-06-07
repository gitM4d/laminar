import { describe, expect, it } from "vitest";
import { roundWeightsLargestRemainder } from "./rounding.js";

describe("roundWeightsLargestRemainder", () => {
  it("rounds weights to 4 decimals with exact total of 1.0", () => {
    const rounded = roundWeightsLargestRemainder([
      { id: "a", weight: 0.457875 },
      { id: "b", weight: 0.19215 },
      { id: "c", weight: 0.14196 },
      { id: "d", weight: 0.198015 },
      { id: "e", weight: 0.01 },
    ]);

    const total = [...rounded.values()].reduce(
      (sum, weight) => sum + weight,
      0,
    );

    expect(total).toBe(1);
    expect(rounded.get("a")).toBe(0.4579);
  });
});
