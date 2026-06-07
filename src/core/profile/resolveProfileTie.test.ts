import { describe, expect, it } from "vitest";
import { resolveProfileTie } from "./selectProfile.js";

describe("resolveProfileTie", () => {
  it("prefers Balanced when Balanced is among tied profiles", () => {
    expect(resolveProfileTie(["Conservative", "Balanced"])).toBe("Balanced");
    expect(
      resolveProfileTie(["Yield Focused", "Balanced", "Conservative"]),
    ).toBe("Balanced");
  });

  it("prefers Conservative over Yield Focused when Balanced is not tied", () => {
    expect(resolveProfileTie(["Conservative", "Yield Focused"])).toBe(
      "Conservative",
    );
  });

  it("applies tie priority order Balanced, Conservative, Yield Focused", () => {
    expect(
      resolveProfileTie(["Balanced", "Conservative", "Yield Focused"]),
    ).toBe("Balanced");
    expect(resolveProfileTie(["Conservative", "Yield Focused"])).toBe(
      "Conservative",
    );
    expect(resolveProfileTie(["Yield Focused"])).toBe("Yield Focused");
  });
});
