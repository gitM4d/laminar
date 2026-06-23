import {
  AAVE_V3_BASE_EXECUTION_CONFIG,
  formatRawTokenAmount,
  getAaveExecutionAssetConfig,
  isAaveExecutionSupportedAsset,
  type AllowanceStatus,
} from "@laminar/frontend-safe";

type AllowanceStatusViewProps = {
  status: AllowanceStatus | null;
  loading: boolean;
  error: string | null;
  enabled: boolean;
  onBaseChain: boolean;
  publicClientAvailable: boolean;
};

function resolveAssetDecimals(asset: string): number {
  if (!isAaveExecutionSupportedAsset(asset)) {
    return 6;
  }

  return getAaveExecutionAssetConfig(asset).decimals;
}

export function AllowanceStatusView({
  status,
  loading,
  error,
  enabled,
  onBaseChain,
  publicClientAvailable,
}: AllowanceStatusViewProps) {
  if (!enabled) {
    return (
      <div className="wallet-preview-allowance">
        <h4>Allowance Status</h4>
        <p className="muted wallet-preview-message">
          Connect wallet on Base to check allowance.
        </p>
      </div>
    );
  }

  if (!onBaseChain) {
    return (
      <div className="wallet-preview-allowance">
        <h4>Allowance Status</h4>
        <p className="wallet-preview-warning wallet-preview-message">
          Switch to Base to check allowance.
        </p>
      </div>
    );
  }

  if (!publicClientAvailable) {
    return (
      <div className="wallet-preview-allowance">
        <h4>Allowance Status</h4>
        <p className="wallet-preview-message">
          Allowance could not be checked. Approval may be required.
        </p>
      </div>
    );
  }

  return (
    <div className="wallet-preview-allowance">
      <h4>Allowance Status</h4>

      {loading && (
        <p className="status wallet-preview-message">Checking allowance...</p>
      )}

      {!loading && status === null && error === null && (
        <p className="muted wallet-preview-message">
          Allowance check unavailable.
        </p>
      )}

      {!loading && error !== null && (status === null || status.checked !== true) && (
        <p className="wallet-preview-message">
          Allowance could not be checked. Approval may be required.
        </p>
      )}

      {!loading && status !== null && status.checked && (
        <>
          <ul className="wallet-preview-allowance-details">
            <li>Asset: {status.asset}</li>
            <li>
              Required amount:{" "}
              {formatRawTokenAmount(
                status.requiredRawAmount,
                resolveAssetDecimals(status.asset),
              )}{" "}
              {status.asset}
            </li>
            <li>
              Current allowance:{" "}
              {status.currentRawAllowance !== undefined
                ? `${formatRawTokenAmount(
                    status.currentRawAllowance,
                    resolveAssetDecimals(status.asset),
                  )} ${status.asset}`
                : "unknown"}
            </li>
            <li>
              Spender: Aave Pool (
              {AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress.slice(0, 6)}...
              {AAVE_V3_BASE_EXECUTION_CONFIG.poolAddress.slice(-4)})
            </li>
          </ul>

          {status.sufficient ? (
            <p className="status wallet-preview-message">
              Existing allowance is sufficient. Approval can be skipped.
            </p>
          ) : (
            <p className="wallet-preview-warning wallet-preview-message">
              Approval required before supply.
            </p>
          )}
        </>
      )}
    </div>
  );
}
