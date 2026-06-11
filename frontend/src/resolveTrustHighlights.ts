import type {
  ProtocolTrustExplanation,
  RecommendationSnapshot,
  SnapshotTrustHighlight,
} from "./types.js";

export function resolveTrustHighlights(
  snapshot: RecommendationSnapshot,
  trustExplanations?: ProtocolTrustExplanation[],
): SnapshotTrustHighlight[] {
  const highlights = snapshot.trustHighlights;
  if (highlights === undefined || highlights.length === 0) {
    return [];
  }

  const explanationByProtocol = new Map(
    (trustExplanations ?? []).map((entry) => [
      entry.protocolId,
      entry.trustExplanation,
    ]),
  );

  return highlights.map((highlight) => ({
    ...highlight,
    trustExplanation:
      highlight.trustExplanation ??
      explanationByProtocol.get(highlight.protocolId),
  }));
}
