import { describe, expect, it } from "vitest";
import { rayToDecimal, RAY } from "./aaveMath.js";

describe("rayToDecimal", () => {
  it("converts 0 ray to 0", () => {
    expect(rayToDecimal(0n)).toBe(0);
  });

  it("converts 0.05 ray-equivalent to 0.05", () => {
    expect(rayToDecimal(5n * 10n ** 25n)).toBe(0.05);
  });

  it("converts 1.0 ray-equivalent (1e27) to 1", () => {
    expect(rayToDecimal(RAY)).toBe(1);
  });

  it("converts a realistic supply rate (4.5%) to 0.045", () => {
    expect(rayToDecimal(45n * 10n ** 24n)).toBe(0.045);
  });

  it("handles large rates without unsafe precision loss", () => {
    // 1234% APR
    expect(rayToDecimal(1234n * 10n ** 25n)).toBeCloseTo(12.34, 9);
  });
});
