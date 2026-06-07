import { describe, expect, it } from "vitest";
import { normalizeIntent } from "./normalizeIntent.js";

describe("normalizeIntent", () => {
  it("maps 1 to 0.1", () => {
    expect(
      normalizeIntent({ risk: 1, liquidity: 1, returnPreference: 1 }),
    ).toEqual({
      riskFactor: 0.1,
      liquidityFactor: 0.1,
      returnFactor: 0.1,
    });
  });

  it("maps 5 to 0.5", () => {
    expect(
      normalizeIntent({ risk: 5, liquidity: 5, returnPreference: 5 }),
    ).toEqual({
      riskFactor: 0.5,
      liquidityFactor: 0.5,
      returnFactor: 0.5,
    });
  });

  it("maps 10 to 1.0", () => {
    expect(
      normalizeIntent({ risk: 10, liquidity: 10, returnPreference: 10 }),
    ).toEqual({
      riskFactor: 1,
      liquidityFactor: 1,
      returnFactor: 1,
    });
  });

  it("maps a full intent correctly", () => {
    expect(
      normalizeIntent({ risk: 3, liquidity: 8, returnPreference: 4 }),
    ).toEqual({
      riskFactor: 0.3,
      liquidityFactor: 0.8,
      returnFactor: 0.4,
    });
  });
});
