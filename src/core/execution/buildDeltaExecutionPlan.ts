import type { PortfolioPosition } from "../construction/types.js";
import type { PortfolioRecommendationResult } from "../recommendation/types.js";
import type { CurrentPortfolioPosition } from "../types.js";
import type {
  DeltaExecutionPlan,
  DeltaExecutionStep,
} from "./types.js";
import type { SnapshotDeltaExecutionSummary } from "../snapshot/types.js";

export type BuildDeltaExecutionPlanInput = {
  recommendation: PortfolioRecommendationResult;
  currentPortfolio: CurrentPortfolioPosition[];
};

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
] as const;

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

export function calculateDeltaTolerance(portfolioValueUsd: number): number {
  return Math.max(1, portfolioValueUsd * 0.0001);
}

function targetAmountUsd(weight: number, portfolioValueUsd: number): number {
  return roundTo(weight * portfolioValueUsd, 2);
}

function sumCurrentAmount(
  currentPortfolio: CurrentPortfolioPosition[],
  predicate: (position: CurrentPortfolioPosition) => boolean,
): number {
  return roundTo(
    currentPortfolio
      .filter(predicate)
      .reduce((total, position) => total + position.amountUsd, 0),
    2,
  );
}

function strategyTargetMatchesCurrent(
  target: Extract<PortfolioPosition, { type: "strategy" }>,
  current: CurrentPortfolioPosition,
): boolean {
  if (current.type !== "strategy") {
    return false;
  }

  if (
    target.opportunityId !== undefined &&
    current.opportunityId !== undefined &&
    current.opportunityId === target.opportunityId
  ) {
    return true;
  }

  if (
    current.protocolId !== undefined &&
    current.protocolId === target.protocolId &&
    current.asset === target.asset
  ) {
    return true;
  }

  if (
    current.protocolName !== undefined &&
    current.protocolName === target.protocolName &&
    current.asset === target.asset
  ) {
    return true;
  }

  return false;
}

export function getCurrentStrategyAmountUsd(
  target: Extract<PortfolioPosition, { type: "strategy" }>,
  currentPortfolio: CurrentPortfolioPosition[],
): number {
  const strategies = currentPortfolio.filter(
    (position) => position.type === "strategy",
  );

  const byOpportunityId = strategies.filter(
    (position) =>
      target.opportunityId !== undefined &&
      position.opportunityId !== undefined &&
      position.opportunityId === target.opportunityId,
  );

  if (byOpportunityId.length > 0) {
    return roundTo(
      byOpportunityId.reduce((total, position) => total + position.amountUsd, 0),
      2,
    );
  }

  const byProtocolId = strategies.filter(
    (position) =>
      position.protocolId !== undefined &&
      position.protocolId === target.protocolId &&
      position.asset === target.asset,
  );

  if (byProtocolId.length > 0) {
    return roundTo(
      byProtocolId.reduce((total, position) => total + position.amountUsd, 0),
      2,
    );
  }

  return roundTo(
    strategies
      .filter(
        (position) =>
          position.protocolName !== undefined &&
          position.protocolName === target.protocolName &&
          position.asset === target.asset,
      )
      .reduce((total, position) => total + position.amountUsd, 0),
    2,
  );
}

function hasMatchingTargetStrategy(
  current: CurrentPortfolioPosition,
  targetStrategies: Extract<PortfolioPosition, { type: "strategy" }>[],
): boolean {
  return targetStrategies.some((target) =>
    strategyTargetMatchesCurrent(target, current),
  );
}

function createStep(
  stepIndex: number,
  step: Omit<DeltaExecutionStep, "id" | "informationalOnly">,
): DeltaExecutionStep {
  return {
    id: `delta-${stepIndex.toString()}`,
    informationalOnly: true,
    ...step,
  };
}

export function buildDeltaExecutionPlan(
  input: BuildDeltaExecutionPlanInput,
): DeltaExecutionPlan {
  const { recommendation, currentPortfolio } = input;
  const portfolioValueUsd = recommendation.diagnostics.portfolioValueUsd;
  const tolerance = calculateDeltaTolerance(portfolioValueUsd);
  const positions = recommendation.portfolioConstruction.positions;
  const targetStrategies = positions.filter(
    (position): position is Extract<PortfolioPosition, { type: "strategy" }> =>
      position.type === "strategy",
  );
  const warnings: string[] = [];
  const steps: DeltaExecutionStep[] = [];
  let stepIndex = 1;

  const currentPortfolioValueUsd = roundTo(
    currentPortfolio.reduce((total, position) => total + position.amountUsd, 0),
    2,
  );

  if (Math.abs(currentPortfolioValueUsd - portfolioValueUsd) > tolerance) {
    warnings.push("Current portfolio value differs from target portfolio value.");
  }

  for (const target of targetStrategies) {
    const targetUsd = targetAmountUsd(target.weight, portfolioValueUsd);
    const currentUsd = getCurrentStrategyAmountUsd(target, currentPortfolio);
    const delta = roundTo(targetUsd - currentUsd, 2);

    if (delta > tolerance) {
      steps.push(
        createStep(stepIndex, {
          action: "supply",
          protocolId: target.protocolId,
          protocolName: target.protocolName,
          opportunityId: target.opportunityId,
          asset: target.asset,
          amountUsd: delta,
          description: `Supply ${formatUsdAmount(delta)} ${target.asset} to ${target.protocolName} to reach target allocation.`,
        }),
      );
      stepIndex += 1;
    } else if (delta < -tolerance) {
      const withdrawAmount = roundTo(Math.abs(delta), 2);
      steps.push(
        createStep(stepIndex, {
          action: "withdraw",
          protocolId: target.protocolId,
          protocolName: target.protocolName,
          opportunityId: target.opportunityId,
          asset: target.asset,
          amountUsd: withdrawAmount,
          description: `Withdraw ${formatUsdAmount(withdrawAmount)} ${target.asset} from ${target.protocolName} to align with target allocation.`,
        }),
      );
      stepIndex += 1;
    } else {
      steps.push(
        createStep(stepIndex, {
          action: "noAction",
          protocolId: target.protocolId,
          protocolName: target.protocolName,
          opportunityId: target.opportunityId,
          asset: target.asset,
          amountUsd: 0,
          description: `No change needed for ${target.protocolName} ${target.asset} (within tolerance).`,
        }),
      );
      stepIndex += 1;
    }
  }

  for (const current of currentPortfolio) {
    if (current.type !== "strategy") {
      continue;
    }

    if (hasMatchingTargetStrategy(current, targetStrategies)) {
      continue;
    }

    steps.push(
      createStep(stepIndex, {
        action: "withdraw",
        asset: current.asset,
        amountUsd: roundTo(current.amountUsd, 2),
        description: `Withdraw ${formatUsdAmount(current.amountUsd)} ${current.asset} from ${current.protocolName ?? "strategy position"} (not in target portfolio).`,
        ...(current.protocolId !== undefined
          ? { protocolId: current.protocolId }
          : {}),
        ...(current.protocolName !== undefined
          ? { protocolName: current.protocolName }
          : {}),
        ...(current.opportunityId !== undefined
          ? { opportunityId: current.opportunityId }
          : {}),
      }),
    );
    stepIndex += 1;
  }

  const bufferPosition = positions.find(
    (position) => position.type === "liquidityBuffer",
  );

  if (bufferPosition !== undefined) {
    const targetBufferUsd = targetAmountUsd(
      bufferPosition.weight,
      portfolioValueUsd,
    );
    const currentBufferUsd = sumCurrentAmount(
      currentPortfolio,
      (position) =>
        position.type === "liquidityBuffer" &&
        position.asset === bufferPosition.asset,
    );
    const currentWalletUsd = sumCurrentAmount(
      currentPortfolio,
      (position) =>
        position.type === "wallet" && position.asset === bufferPosition.asset,
    );
    const currentTotal = roundTo(currentBufferUsd + currentWalletUsd, 2);
    const bufferShortfall = roundTo(targetBufferUsd - currentTotal, 2);

    if (bufferShortfall > tolerance) {
      steps.push(
        createStep(stepIndex, {
          action: "hold",
          asset: bufferPosition.asset,
          amountUsd: bufferShortfall,
          description: `Hold ${formatUsdAmount(bufferShortfall)} ${bufferPosition.asset} as liquidity buffer to reach target buffer.`,
        }),
      );
      stepIndex += 1;
    } else if (currentTotal > targetBufferUsd + tolerance) {
      warnings.push(
        `Current liquidity buffer (${formatUsdAmount(currentTotal)}) exceeds target (${formatUsdAmount(targetBufferUsd)}); no reallocation step suggested.`,
      );
    }
  }

  const gasPosition = positions.find((position) => position.type === "gasReserve");

  if (gasPosition !== undefined) {
    const targetGasUsd = targetAmountUsd(gasPosition.weight, portfolioValueUsd);
    const currentGasUsd = sumCurrentAmount(
      currentPortfolio,
      (position) =>
        position.type === "gasReserve" && position.asset === gasPosition.asset,
    );
    const gasShortfall = roundTo(targetGasUsd - currentGasUsd, 2);

    if (gasShortfall > tolerance) {
      steps.push(
        createStep(stepIndex, {
          action: "reserve",
          asset: gasPosition.asset,
          amountUsd: gasShortfall,
          description: `Reserve ${formatUsdAmount(gasShortfall)} ${gasPosition.asset} for gas to reach target gas reserve.`,
        }),
      );
    } else if (currentGasUsd > targetGasUsd + tolerance) {
      warnings.push(
        `Current gas reserve (${formatUsdAmount(currentGasUsd)}) exceeds target (${formatUsdAmount(targetGasUsd)}); no reallocation step suggested.`,
      );
    }
  }

  const netDeltaUsd = roundTo(portfolioValueUsd - currentPortfolioValueUsd, 2);

  return {
    available: true,
    informationalOnly: true,
    currentPortfolioValueUsd,
    targetPortfolioValueUsd: portfolioValueUsd,
    netDeltaUsd,
    steps,
    warnings,
  };
}

export function buildDeltaExecutionSummary(
  deltaExecutionPlan: DeltaExecutionPlan | undefined,
): SnapshotDeltaExecutionSummary | undefined {
  if (deltaExecutionPlan === undefined || !deltaExecutionPlan.available) {
    return undefined;
  }

  return {
    available: true,
    numberOfSteps: deltaExecutionPlan.steps.length,
    numberOfWithdrawals: deltaExecutionPlan.steps.filter(
      (step) => step.action === "withdraw",
    ).length,
    numberOfSupplies: deltaExecutionPlan.steps.filter(
      (step) => step.action === "supply",
    ).length,
    netDeltaUsd: deltaExecutionPlan.netDeltaUsd,
  };
}

export function deltaStepHasForbiddenTransactionField(
  step: DeltaExecutionStep,
): string | null {
  for (const field of TRANSACTION_FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(step, field)) {
      return field;
    }
  }

  return null;
}
