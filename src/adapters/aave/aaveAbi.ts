/**
 * Minimal read-only ABI fragments for Aave Base reserve discovery.
 *
 * IMPORTANT:
 * - These are intentionally MINIMAL. Do not add the full Aave ABI.
 * - Only read-only (view) functions are included. No write/state-changing
 *   functions, no transaction builders.
 */

/**
 * Minimal Aave V3 Pool ABI — read-only reserve discovery only.
 *
 * `getReservesList()` returns the list of underlying reserve asset addresses.
 */
export const AAVE_POOL_ABI = [
  {
    type: "function",
    name: "getReservesList",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;

/**
 * Minimal ERC20 ABI — read-only token metadata only.
 */
export const ERC20_ABI = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;
