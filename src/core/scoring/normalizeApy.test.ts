import { describe, expect, it } from "vitest";
import { normalizeApyToDecimal } from "./normalizeApy.js";

describe("normalizeApyToDecimal", () => {
  it("keeps decimal APY values unchanged", () => {
    expect(normalizeApyToDecimal(0.071)).toBe(0.071);
    expect(normalizeApyToDecimal(0.042)).toBe(0.042);
  });

  it("converts percentage APY values to decimal", () => {
    expect(normalizeApyToDecimal(4.2)).toBe(0.042);
    expect(normalizeApyToDecimal(7.1)).toBe(0.071);
  });
});
