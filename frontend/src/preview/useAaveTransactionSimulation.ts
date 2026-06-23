import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import {
  simulateTransactionPlan,
  type TransactionRequestPlan,
  type TransactionSimulationResult,
} from "@laminar/frontend-safe";

type UseAaveTransactionSimulationOptions = {
  plan: TransactionRequestPlan | undefined;
  walletAddress: string | undefined;
  enabled: boolean;
  refreshKey?: number;
};

type UseAaveTransactionSimulationResult = {
  simulation: TransactionSimulationResult | null;
  loading: boolean;
  error: string | null;
  publicClientAvailable: boolean;
  rerunSimulation: () => void;
};

export function useAaveTransactionSimulation({
  plan,
  walletAddress,
  enabled,
  refreshKey = 0,
}: UseAaveTransactionSimulationOptions): UseAaveTransactionSimulationResult {
  const publicClient = usePublicClient();
  const [simulation, setSimulation] = useState<TransactionSimulationResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled || plan === undefined || walletAddress === undefined) {
      setSimulation(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (publicClient === undefined) {
      setSimulation(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function runSimulation() {
      setLoading(true);
      setError(null);

      try {
        const result = await simulateTransactionPlan({
          plan,
          walletAddress,
          publicClient,
        });

        if (!cancelled) {
          setSimulation(result);
        }
      } catch (caught) {
        if (!cancelled) {
          setSimulation(null);
          setError(
            caught instanceof Error
              ? caught.message
              : "Failed to simulate Aave transactions.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void runSimulation();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    internalRefreshKey,
    plan,
    publicClient,
    refreshKey,
    walletAddress,
  ]);

  return {
    simulation,
    loading,
    error,
    publicClientAvailable: publicClient !== undefined,
    rerunSimulation: () => {
      setInternalRefreshKey((current) => current + 1);
    },
  };
}
