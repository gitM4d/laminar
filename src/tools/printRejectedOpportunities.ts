import type { RejectedOpportunityDetail } from "../core/explainability/buildRejectedOpportunityExplanations.js";
import type { RejectedOpportunityExplanation } from "../core/explainability/buildRejectedOpportunityExplanations.js";

function formatDetailLine(detail: RejectedOpportunityDetail): string {
  if (
    detail.code === "belowMinTrustScore" &&
    typeof detail.observedValue === "number" &&
    typeof detail.requiredValue === "number"
  ) {
    return `Trust score ${detail.observedValue.toString()} is below required ${detail.requiredValue.toString()}`;
  }

  if (
    detail.code === "belowMinLiquidityScore" &&
    typeof detail.observedValue === "number" &&
    typeof detail.requiredValue === "number"
  ) {
    return `Liquidity score ${detail.observedValue.toString()} is below required ${detail.requiredValue.toString()}`;
  }

  if (
    detail.code === "experimentalProtocolNotAllowed" &&
    detail.observedValue === true &&
    detail.requiredValue === false
  ) {
    return "Policy: allowExperimentalProtocols = false";
  }

  if (
    detail.code === "unauditedProtocolNotAllowed" &&
    detail.requiredValue === false
  ) {
    return "Policy: allowUnauditedProtocols = false";
  }

  return detail.message;
}

export function printRejectedOpportunities(
  explanations: readonly RejectedOpportunityExplanation[],
): void {
  console.log("Rejected Opportunities:");
  if (explanations.length === 0) {
    console.log("Rejected Opportunities: none");
    console.log("");
    return;
  }

  for (const explanation of explanations) {
    console.log(`${explanation.protocolName} ${explanation.asset}`);
    console.log(`  reason: ${explanation.summary}`);
    console.log(`  category: ${explanation.primaryReasonCategory}`);
    if (explanation.details.length > 0) {
      console.log("  details:");
      for (const detail of explanation.details) {
        console.log(`    - ${formatDetailLine(detail)}`);
      }
    }
  }
  console.log("");
}
