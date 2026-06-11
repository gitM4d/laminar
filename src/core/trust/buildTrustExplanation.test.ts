import { describe, expect, it } from "vitest";
import { AAVE_BASE_CURATED_TRUST_PROFILE } from "../providers/AaveBaseLaminarDataProvider.js";
import { MORPHO_BASE_CURATED_TRUST_PROFILE } from "../providers/MorphoBaseLaminarDataProvider.js";
import { MOONWELL_BASE_CURATED_TRUST_PROFILE } from "../providers/MoonwellBaseLaminarDataProvider.js";
import { calculateTrustScore } from "./calculateTrustScore.js";
import {
  buildTrustExplanation,
  sumTrustExplanationComponents,
} from "./buildTrustExplanation.js";
import type { ProtocolTrustProfile } from "./types.js";

const asOf = new Date("2026-06-01T00:00:00.000Z");

const profiles: readonly ProtocolTrustProfile[] = [
  AAVE_BASE_CURATED_TRUST_PROFILE,
  MORPHO_BASE_CURATED_TRUST_PROFILE,
  MOONWELL_BASE_CURATED_TRUST_PROFILE,
];

describe("buildTrustExplanation", () => {
  it.each(profiles)(
    "keeps the trust score unchanged for $protocolName",
    (profile) => {
      const before = calculateTrustScore(profile, asOf);
      const explained = buildTrustExplanation(profile, asOf);

      expect(explained.trustScore).toBe(before.trustScore);
      expect(explained.protocolId).toBe(profile.protocolId);
      expect(explained.protocolName).toBe(profile.protocolName);
    },
  );

  it.each(profiles)(
    "explained components sum to the trust score for $protocolName",
    (profile) => {
      const explained = buildTrustExplanation(profile, asOf);
      const componentTotal = sumTrustExplanationComponents(
        explained.trustExplanation,
      );

      expect(componentTotal).toBeCloseTo(explained.trustScore, 2);
    },
  );

  it("builds an Aave explanation from existing trust inputs", () => {
    const explained = buildTrustExplanation(AAVE_BASE_CURATED_TRUST_PROFILE, asOf);

    expect(explained.trustExplanation.protocolAgeYears).toBe(5.5);
    expect(explained.trustExplanation.auditCount).toBe(2);
    expect(explained.trustExplanation.auditTier).toBe("tier1");
    expect(explained.trustExplanation.historicalIncidents).toBe(0);
    expect(explained.trustExplanation.tvlBucket).toBe("high");
    expect(explained.summary).toContain("tier-1 audits");
  });

  it("builds a Morpho explanation from existing trust inputs", () => {
    const explained = buildTrustExplanation(
      MORPHO_BASE_CURATED_TRUST_PROFILE,
      asOf,
    );

    expect(explained.trustExplanation.protocolAgeYears).toBe(3);
    expect(explained.trustExplanation.auditCount).toBe(2);
    expect(explained.trustExplanation.auditTier).toBe("tier1");
    expect(explained.trustExplanation.historicalIncidents).toBe(0);
    expect(explained.trustExplanation.tvlBucket).toBe("high");
  });

  it("builds a Moonwell explanation from existing trust inputs", () => {
    const explained = buildTrustExplanation(
      MOONWELL_BASE_CURATED_TRUST_PROFILE,
      asOf,
    );

    expect(explained.trustExplanation.protocolAgeYears).toBe(4);
    expect(explained.trustExplanation.auditCount).toBe(3);
    expect(explained.trustExplanation.auditTier).toBe("tier2");
    expect(explained.trustExplanation.historicalIncidents).toBe(0);
    expect(explained.trustExplanation.tvlUsd).toBe(60_000_000);
    expect(explained.trustExplanation.tvlBucket).toBe("medium");
  });

  it("propagates tvlSource into trust explanations when present", () => {
    const explained = buildTrustExplanation(
      {
        ...MORPHO_BASE_CURATED_TRUST_PROFILE,
        tvlUsd: 107_000_000,
        tvlSource: "real-provider-markets",
      },
      asOf,
    );

    expect(explained.trustExplanation.tvlSource).toBe("real-provider-markets");
    expect(explained.trustExplanation.tvlUsd).toBe(107_000_000);
  });

  it("is deterministic for the same input and asOf", () => {
    const left = buildTrustExplanation(MOONWELL_BASE_CURATED_TRUST_PROFILE, asOf);
    const right = buildTrustExplanation(
      MOONWELL_BASE_CURATED_TRUST_PROFILE,
      asOf,
    );

    expect(right).toEqual(left);
  });
});
