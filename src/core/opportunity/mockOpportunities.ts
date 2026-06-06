import type { Opportunity } from "./types.js";

export const MOCK_OPPORTUNITIES: readonly Opportunity[] = [
  {
    id: "morpho-usdc-base",
    protocolId: "morpho",
    protocolName: "Morpho",
    asset: "USDC",
    chain: "Base",
    apy: 0.071,
  },
  {
    id: "aave-usdc-base",
    protocolId: "aave",
    protocolName: "Aave",
    asset: "USDC",
    chain: "Base",
    apy: 0.052,
  },
  {
    id: "moonwell-usdc-base",
    protocolId: "moonwell",
    protocolName: "Moonwell",
    asset: "USDC",
    chain: "Base",
    apy: 0.048,
  },
  {
    id: "aave-eurc-base",
    protocolId: "aave",
    protocolName: "Aave",
    asset: "EURC",
    chain: "Base",
    apy: 0.041,
  },
  {
    id: "moonwell-dai-base",
    protocolId: "moonwell",
    protocolName: "Moonwell",
    asset: "DAI",
    chain: "Base",
    apy: 0.039,
  },
  {
    id: "experimental-usdc-base",
    protocolId: "experimental-lend",
    protocolName: "Experimental Lend",
    asset: "USDC",
    chain: "Base",
    apy: 0.112,
  },
] as const;
