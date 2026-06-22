import type { PortfolioRecommendationResult } from "../recommendation/types.js";
import type {
  ExecutionIntent,
  ExecutionIntentPlan,
  ExecutionPlanStepV2,
  SnapshotExecutionIntentSummary,
} from "./types.js";

export type BuildExecutionIntentsInput = {
  stepsV2: ExecutionPlanStepV2[];
  recommendation?: PortfolioRecommendationResult;
};

const STABLECOIN_ASSETS = new Set(["USDC", "EURC", "DAI"]);

const TRANSACTION_FORBIDDEN_FIELDS = [
  "calldata",
  "transaction",
  "to",
  "data",
  "value",
  "signer",
  "wallet",
  "privateKey",
  "txHash",
  "transactionHash",
  "from",
  "nonce",
  "gasLimit",
  "gasPrice",
  "chainId",
  "signature",
  "abi",
  "contractAddress",
] as const;

const PLANNING_RISK_WARNING =
  "This is a planning intent only. No transaction was generated.";

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatUsdAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function resolveOpportunityId(
  step: ExecutionPlanStepV2,
  recommendation: PortfolioRecommendationResult | undefined,
): string | undefined {
  if (step.action !== "supply" || recommendation === undefined) {
    return undefined;
  }

  const match = recommendation.portfolioConstruction.positions.find(
    (position): position is Extract<typeof position, { type: "strategy" }> =>
      position.type === "strategy" &&
      position.protocolId === step.protocolId &&
      position.asset === step.asset,
  );

  return match?.opportunityId;
}

function estimateAssetAmount(
  asset: string | null,
  amountUsd: number,
): number | null {
  if (asset === null || !STABLECOIN_ASSETS.has(asset)) {
    return null;
  }

  return roundTo(amountUsd, 2);
}

function buildIntent(
  index: number,
  step: ExecutionPlanStepV2,
  recommendation: PortfolioRecommendationResult | undefined,
): ExecutionIntent {
  const id = `intent-${index.toString()}`;
  const base = {
    id,
    sourceStepId: step.id,
    chain: "Base" as const,
    amountUsd: step.amountUsd,
    status: "planned" as const,
    informationalOnly: true as const,
    riskWarnings: [PLANNING_RISK_WARNING],
  };

  if (step.action === "prepareFunds") {
    return {
      ...base,
      action: "prepareFunds",
      protocolId: null,
      protocolName: null,
      asset: null,
      amountAssetEstimate: null,
      requiresWallet: true,
      requiresApproval: false,
      executionAdapterRequired: false,
      preconditions: [
        `User must hold at least ${formatUsdAmount(step.amountUsd)} of stablecoins on Base.`,
      ],
    };
  }

  if (step.action === "supply") {
    const asset = step.asset ?? "USDC";
    const amountAssetEstimate = estimateAssetAmount(asset, step.amountUsd);
    const opportunityId = resolveOpportunityId(step, recommendation);
    const protocolName = step.protocolName ?? "protocol";

    return {
      ...base,
      action: "supply",
      protocolId: step.protocolId,
      protocolName: step.protocolName,
      ...(opportunityId !== undefined ? { opportunityId } : {}),
      asset,
      amountAssetEstimate,
      requiresWallet: true,
      requiresApproval: true,
      executionAdapterRequired: true,
      preconditions: [
        `User must hold at least ${formatUsdAmount(step.amountUsd)} ${asset} on Base.`,
        `${protocolName} execution adapter must support supply.`,
        `Approval may be required before supplying to ${protocolName}.`,
      ],
      riskWarnings: [
        PLANNING_RISK_WARNING,
        "Amount is a USD-based estimate; on-chain asset amount may differ.",
      ],
    };
  }

  if (step.action === "holdLiquidityBuffer") {
    const asset = step.asset ?? "USDC";

    return {
      ...base,
      action: "holdLiquidityBuffer",
      protocolId: null,
      protocolName: null,
      asset,
      amountAssetEstimate: estimateAssetAmount(asset, step.amountUsd),
      requiresWallet: false,
      requiresApproval: false,
      executionAdapterRequired: false,
      preconditions: [
        `Keep ${formatUsdAmount(step.amountUsd)} ${asset} available as liquidity buffer.`,
      ],
    };
  }

  return {
    ...base,
    action: "holdGasReserve",
    protocolId: null,
    protocolName: null,
    asset: step.asset ?? "USDC",
    amountAssetEstimate: estimateAssetAmount(step.asset, step.amountUsd),
    requiresWallet: false,
    requiresApproval: false,
    executionAdapterRequired: false,
    preconditions: [
      `Reserve ${formatUsdAmount(step.amountUsd)} ${step.asset ?? "USDC"} equivalent for gas and operational expenses.`,
    ],
  };
}

function dedupeSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function buildExecutionIntentSummary(
  plan: ExecutionIntentPlan,
): ExecutionIntentPlan["summary"] {
  const executableIntents = plan.intents.filter(
    (intent) => intent.executionAdapterRequired,
  ).length;
  const protocols = dedupeSorted(
    plan.intents
      .map((intent) => intent.protocolName ?? intent.protocolId)
      .filter((value): value is string => value !== null && value !== undefined),
  );
  const assets = dedupeSorted(
    plan.intents
      .map((intent) => intent.asset)
      .filter((value): value is string => value !== null),
  );

  return {
    totalIntents: plan.intents.length,
    executableIntents,
    nonExecutableIntents: plan.intents.length - executableIntents,
    protocols,
    assets,
  };
}

export function buildExecutionIntents(
  input: BuildExecutionIntentsInput,
): ExecutionIntentPlan {
  const intents = input.stepsV2.map((step, index) =>
    buildIntent(index + 1, step, input.recommendation),
  );
  const plan: ExecutionIntentPlan = {
    version: "intent-v1",
    informationalOnly: true,
    intents,
    summary: {
      totalIntents: 0,
      executableIntents: 0,
      nonExecutableIntents: 0,
      protocols: [],
      assets: [],
    },
  };

  plan.summary = buildExecutionIntentSummary(plan);

  return plan;
}

export function buildSnapshotExecutionIntentSummary(
  plan: ExecutionIntentPlan | undefined,
): SnapshotExecutionIntentSummary | undefined {
  if (plan === undefined) {
    return undefined;
  }

  return {
    totalIntents: plan.summary.totalIntents,
    executableIntents: plan.summary.executableIntents,
    protocols: plan.summary.protocols,
    assets: plan.summary.assets,
  };
}

export function intentHasForbiddenTransactionField(
  intent: ExecutionIntent,
): string | null {
  for (const field of TRANSACTION_FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(intent, field)) {
      return field;
    }
  }

  return null;
}

export function buildWithdrawIntentExample(
  index: number,
  input: {
    sourceStepId: string;
    protocolId: string;
    protocolName: string;
    opportunityId?: string;
    asset: string;
    amountUsd: number;
  },
): ExecutionIntent {
  const amountAssetEstimate = estimateAssetAmount(input.asset, input.amountUsd);

  return {
    id: `intent-${index.toString()}`,
    sourceStepId: input.sourceStepId,
    action: "withdraw",
    protocolId: input.protocolId,
    protocolName: input.protocolName,
    ...(input.opportunityId !== undefined
      ? { opportunityId: input.opportunityId }
      : {}),
    chain: "Base",
    asset: input.asset,
    amountUsd: input.amountUsd,
    amountAssetEstimate,
    status: "planned",
    requiresWallet: true,
    requiresApproval: false,
    executionAdapterRequired: true,
    informationalOnly: true,
    preconditions: [
      `User must have at least ${formatUsdAmount(input.amountUsd)} ${input.asset} supplied to ${input.protocolName} on Base.`,
      `${input.protocolName} execution adapter must support withdraw.`,
    ],
    riskWarnings: [
      PLANNING_RISK_WARNING,
      "Amount is a USD-based estimate; on-chain asset amount may differ.",
    ],
  };
}
