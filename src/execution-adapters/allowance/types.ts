export type AllowanceStatusErrorCode =
  | "MISSING_WALLET_ADDRESS"
  | "MISSING_APPROVE_TRANSACTION"
  | "UNSUPPORTED_ASSET"
  | "READ_FAILED"
  | "INVALID_REQUIRED_AMOUNT";

export type AllowanceStatus = {
  checked: boolean;
  asset: string;
  owner: `0x${string}`;
  spender: `0x${string}`;
  tokenAddress: `0x${string}`;
  requiredRawAmount: bigint;
  currentRawAllowance?: bigint;
  sufficient: boolean;
  errorCode?: AllowanceStatusErrorCode;
  errorMessage?: string;
};

export function formatRawTokenAmount(raw: bigint, decimals: number): string {
  const divisor = 10 ** decimals;
  const value = Number(raw) / divisor;

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.min(decimals, 6),
  }).format(value);
}
