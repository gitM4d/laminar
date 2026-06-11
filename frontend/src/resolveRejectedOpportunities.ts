import type {
  RejectedOpportunityExplanation,
  RecommendationSnapshot,
  SnapshotRejectionHighlight,
} from "./types.js";

export type ResolvedRejectedOpportunity = SnapshotRejectionHighlight & {
  details?: RejectedOpportunityExplanation["details"];
  primaryReasonCode?: string;
};

export function resolveRejectedOpportunities(
  snapshot: RecommendationSnapshot,
  rejectedOpportunityExplanations?: RejectedOpportunityExplanation[],
): ResolvedRejectedOpportunity[] {
  const highlights = snapshot.rejectionHighlights;
  if (
    (highlights === undefined || highlights.length === 0) &&
    (rejectedOpportunityExplanations === undefined ||
      rejectedOpportunityExplanations.length === 0)
  ) {
    return [];
  }

  const explanationById = new Map(
    (rejectedOpportunityExplanations ?? []).map((entry) => [
      entry.opportunityId,
      entry,
    ]),
  );

  if (highlights !== undefined && highlights.length > 0) {
    return highlights.map((highlight) => {
      const explanation = explanationById.get(highlight.opportunityId);
      return {
        ...highlight,
        primaryReasonCode: explanation?.primaryReasonCode,
        details: explanation?.details,
      };
    });
  }

  return (rejectedOpportunityExplanations ?? []).map((explanation) => ({
    opportunityId: explanation.opportunityId,
    label: `${explanation.protocolName} ${explanation.asset}`,
    protocolName: explanation.protocolName,
    asset: explanation.asset,
    primaryReasonCategory: explanation.primaryReasonCategory,
    summary: explanation.summary,
    primaryReasonCode: explanation.primaryReasonCode,
    details: explanation.details,
  }));
}
