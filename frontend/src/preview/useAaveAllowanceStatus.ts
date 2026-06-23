import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import {
  getAaveAllowanceStatus,
  isBaseChainId,
  type AllowanceStatus,
} from "@laminar/frontend-safe";

type UseAaveAllowanceStatusOptions = {
  walletAddress: string | undefined;
  chainId: number | undefined;
  asset: string | undefined;
  amountUsd: number | undefined;
  enabled: boolean;
  refreshKey?: number;
};

type UseAaveAllowanceStatusResult = {
  status: AllowanceStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  publicClientAvailable: boolean;
};

export function useAaveAllowanceStatus({
  walletAddress,
  chainId,
  asset,
  amountUsd,
  enabled,
  refreshKey = 0,
}: UseAaveAllowanceStatusOptions): UseAaveAllowanceStatusResult {
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<AllowanceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  useEffect(() => {
    if (
      !enabled ||
      walletAddress === undefined ||
      asset === undefined ||
      amountUsd === undefined ||
      amountUsd <= 0 ||
      !isBaseChainId(chainId)
    ) {
      setStatus(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (publicClient === undefined) {
      setStatus(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAllowanceStatus() {
      setLoading(true);
      setError(null);

      try {
        const nextStatus = await getAaveAllowanceStatus({
          publicClient,
          walletAddress,
          asset,
          amountUsd,
        });

        if (!cancelled) {
          setStatus(nextStatus);

          if (!nextStatus.checked && nextStatus.errorMessage !== undefined) {
            setError(nextStatus.errorMessage);
          }
        }
      } catch (caught) {
        if (!cancelled) {
          setStatus(null);
          setError(
            caught instanceof Error
              ? caught.message
              : "Failed to read ERC20 allowance.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAllowanceStatus();

    return () => {
      cancelled = true;
    };
  }, [
    amountUsd,
    asset,
    chainId,
    enabled,
    internalRefreshKey,
    publicClient,
    refreshKey,
    walletAddress,
  ]);

  return {
    status,
    loading,
    error,
    refetch: () => {
      setInternalRefreshKey((current) => current + 1);
    },
    publicClientAvailable: publicClient !== undefined,
  };
}

export function isAllowanceSufficient(
  status: AllowanceStatus | null | undefined,
): boolean {
  return status?.checked === true && status.sufficient === true;
}
