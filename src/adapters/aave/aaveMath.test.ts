import { describe, expect, it } from "vitest";
import { aTokenSupplyToUsd, rayToDecimal, RAY } from "./aaveMath.js";

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

describe("aTokenSupplyToUsd (stablecoin peg assumption)", () => {
  it("converts 500M USDC totalSupply (6 decimals) to 500_000_000 USD", () => {
    const raw = 500_000_000n * 10n ** 6n;
    expect(aTokenSupplyToUsd(raw, 6)).toBe(500_000_000);
  });

  it("converts 1 USDC (1_000_000 raw) to 1 USD", () => {
    expect(aTokenSupplyToUsd(1_000_000n, 6)).toBe(1);
  });

  it("converts 1 DAI (1e18 raw, 18 decimals) to 1 USD", () => {
    expect(aTokenSupplyToUsd(10n ** 18n, 18)).toBeCloseTo(1, 10);
  });

  it("converts 0 supply to 0 USD", () => {
    expect(aTokenSupplyToUsd(0n, 6)).toBe(0);
  });

  it("throws RangeError for out-of-range decimals", () => {
    expect(() => aTokenSupplyToUsd(1_000_000n, -1)).toThrow(RangeError);
    expect(() => aTokenSupplyToUsd(1_000_000n, 19)).toThrow(RangeError);
  });
});
