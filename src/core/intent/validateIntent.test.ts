import { describe, expect, it } from "vitest";
import { assertValidIntent, validateIntent } from "./validateIntent.js";

const validIntent = {
  risk: 3,
  liquidity: 8,
  returnPreference: 4,
};

describe("validateIntent", () => {
  it("accepts valid intent", () => {
    const result = validateIntent(validIntent);

    expect(result).toEqual({
      valid: true,
      intent: validIntent,
    });
    expect(assertValidIntent(validIntent)).toEqual(validIntent);
  });

  it("rejects missing risk", () => {
    const result = validateIntent({
      liquidity: 8,
      returnPreference: 4,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("Missing required field: risk");
    }
  });

  it("rejects missing liquidity", () => {
    const result = validateIntent({
      risk: 3,
      returnPreference: 4,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("Missing required field: liquidity");
    }
  });

  it("rejects missing returnPreference", () => {
    const result = validateIntent({
      risk: 3,
      liquidity: 8,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("Missing required field: returnPreference");
    }
  });

  it("rejects values below 1", () => {
    const result = validateIntent({
      risk: 0,
      liquidity: 8,
      returnPreference: 4,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("risk must be at least 1");
    }
  });

  it("rejects values above 10", () => {
    const result = validateIntent({
      risk: 3,
      liquidity: 11,
      returnPreference: 4,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("liquidity must be at most 10");
    }
  });

  it("rejects non-integers", () => {
    const result = validateIntent({
      risk: 3.5,
      liquidity: 8,
      returnPreference: 4,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain(
        "risk must be an integer between 1 and 10",
      );
    }
  });

  it("rejects non-number values", () => {
    const result = validateIntent({
      risk: "3",
      liquidity: 8,
      returnPreference: 4,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("risk must be a finite number");
    }
  });
});
