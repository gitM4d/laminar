import type { Opportunity } from "../opportunity/types.js";
import type { LaminarDataProvider } from "../providers/types.js";
import type { ProtocolLiquidityDerivedSignals } from "./deriveLiquiditySignals.js";

export function collectLiquidityDerivedSignals(
  opportunities: readonly Opportunity[],
  dataProvider: LaminarDataProvider,
): ProtocolLiquidityDerivedSignals[] {
  if (dataProvider.getLiquidityDerivedSignals === undefined) {
    return [];
  }

  const byProtocol = new Map<string, ProtocolLiquidityDerivedSignals>();

  for (const opportunity of opportunities) {
    if (byProtocol.has(opportunity.protocolId)) {
      continue;
    }

    const signals = dataProvider.getLiquidityDerivedSignals(
      opportunity.protocolId,
    );
    if (signals === undefined) {
      continue;
    }

    byProtocol.set(opportunity.protocolId, {
      protocolId: opportunity.protocolId,
      protocolName: opportunity.protocolName,
      ...signals,
    });
  }

  return [...byProtocol.values()];
}

export function resolveLiquidityDiagnostics(
  signals: readonly ProtocolLiquidityDerivedSignals[],
): {
  liquiditySignalsAvailable: boolean;
  liquiditySignalSources?: string[];
} {
  const realSignals = signals.filter(
    (signal) => signal.source === "real-market-data",
  );

  if (realSignals.length === 0) {
    return { liquiditySignalsAvailable: false };
  }

  return {
    liquiditySignalsAvailable: true,
    liquiditySignalSources: realSignals.map((signal) => signal.protocolName),
  };
}
