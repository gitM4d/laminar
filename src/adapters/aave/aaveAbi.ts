/**
 * Minimal read-only ABI fragments for Aave Base reserve discovery.
 *
 * IMPORTANT:
 * - These are intentionally MINIMAL. Do not add the full Aave ABI.
 * - Only read-only (view) functions are included. No write/state-changing
 *   functions, no transaction builders.
 */

/**
 * Minimal Aave V3 Pool ABI — read-only reserve discovery and supply rate.
 *
 * - `getReservesList()` returns the list of underlying reserve asset addresses.
 * - `getReserveData(asset)` returns the reserve data struct; only
 *   `currentLiquidityRate` (ray-denominated supply APR) is consumed here.
 *
 * The struct mirrors Aave V3 `DataTypes.ReserveDataLegacy`. It is included only
 * to decode the supply rate; no write/state-changing functions are present.
 */
export const AAVE_POOL_ABI = [
  {
    type: "function",
    name: "getReservesList",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getReserveData",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {
            name: "configuration",
            type: "tuple",
            components: [{ name: "data", type: "uint256" }],
          },
          { name: "liquidityIndex", type: "uint128" },
          { name: "currentLiquidityRate", type: "uint128" },
          { name: "variableBorrowIndex", type: "uint128" },
          { name: "currentVariableBorrowRate", type: "uint128" },
          { name: "currentStableBorrowRate", type: "uint128" },
          { name: "lastUpdateTimestamp", type: "uint40" },
          { name: "id", type: "uint16" },
          { name: "aTokenAddress", type: "address" },
          { name: "stableDebtTokenAddress", type: "address" },
          { name: "variableDebtTokenAddress", type: "address" },
          { name: "interestRateStrategyAddress", type: "address" },
          { name: "accruedToTreasury", type: "uint128" },
          { name: "unbacked", type: "uint128" },
          { name: "isolationModeTotalDebt", type: "uint128" },
        ],
      },
    ],
  },
] as const;

/**
 * Minimal ERC20 ABI — read-only token metadata and supply only.
 *
 * `totalSupply()` is used to read the on-chain TVL of Aave aTokens
 * (read-only, no account or wallet required).
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
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
