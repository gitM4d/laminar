import { describe, expect, it } from "vitest";
import { AAVE_POOL_ABI, ERC20_ABI } from "./aaveAbi.js";
import {
  AaveReserveDiscoveryError,
  buildAaveMarketId,
  discoverAaveBaseReserves,
  isV1SupportedAsset,
  V1_SUPPORTED_ASSETS,
  type AaveReadOnlyClient,
} from "./aaveReserveDiscovery.js";

type ReadContractArgs = {
  address: `0x${string}`;
  abi: unknown;
  functionName: string;
  args?: readonly unknown[];
};

const USDC = "0x1111111111111111111111111111111111111111" as const;
const EURC = "0x2222222222222222222222222222222222222222" as const;
const DAI = "0x3333333333333333333333333333333333333333" as const;
const WETH = "0x4444444444444444444444444444444444444444" as const;

function buildMockClient(
  reserves: Record<`0x${string}`, { symbol: string; decimals: number }>,
  order: readonly `0x${string}`[],
): AaveReadOnlyClient {
  return {
    getBlockNumber: async () => 1n,
    readContract: async (args: ReadContractArgs) => {
      if (args.functionName === "getReservesList") {
        return order;
      }
      const reserve = reserves[args.address];
      if (reserve === undefined) {
        throw new Error(`unknown reserve ${args.address}`);
      }
      if (args.functionName === "symbol") {
        return reserve.symbol;
      }
      if (args.functionName === "decimals") {
        return reserve.decimals;
      }
      throw new Error(`unexpected function ${args.functionName}`);
    },
  };
}

describe("aave ABI fragments", () => {
  it("minimal Aave Pool ABI includes getReservesList", () => {
    const names = AAVE_POOL_ABI.map((entry) => entry.name);
    expect(names).toContain("getReservesList");
    expect(
      AAVE_POOL_ABI.every((entry) => entry.stateMutability === "view"),
    ).toBe(true);
  });

  it("ERC20 ABI includes symbol and decimals", () => {
    const names = ERC20_ABI.map((entry) => entry.name);
    expect(names).toContain("symbol");
    expect(names).toContain("decimals");
    expect(ERC20_ABI.every((entry) => entry.stateMutability === "view")).toBe(
      true,
    );
  });
});

describe("V1 asset filtering", () => {
  it("keeps only USDC/EURC/DAI", () => {
    expect(V1_SUPPORTED_ASSETS).toEqual(["USDC", "EURC", "DAI"]);
    expect(isV1SupportedAsset("USDC")).toBe(true);
    expect(isV1SupportedAsset("EURC")).toBe(true);
    expect(isV1SupportedAsset("DAI")).toBe(true);
    expect(isV1SupportedAsset("WETH")).toBe(false);
    expect(isV1SupportedAsset("cbBTC")).toBe(false);
  });
});

describe("buildAaveMarketId", () => {
  it("maps a supported asset symbol to a market id", () => {
    expect(buildAaveMarketId("USDC")).toBe("aave-usdc-base");
    expect(buildAaveMarketId("EURC")).toBe("aave-eurc-base");
    expect(buildAaveMarketId("DAI")).toBe("aave-dai-base");
  });
});

describe("discoverAaveBaseReserves", () => {
  it("filters discovered reserves to supported assets only", async () => {
    const client = buildMockClient(
      {
        [USDC]: { symbol: "USDC", decimals: 6 },
        [EURC]: { symbol: "EURC", decimals: 6 },
        [WETH]: { symbol: "WETH", decimals: 18 },
      },
      [USDC, WETH, EURC],
    );

    const reserves = await discoverAaveBaseReserves(client);

    expect(reserves.map((reserve) => reserve.symbol)).toEqual(["USDC", "EURC"]);
    expect(reserves[0]).toEqual({
      address: USDC,
      symbol: "USDC",
      decimals: 6,
    });
  });

  it("omits DAI when not present on Aave Base", async () => {
    const client = buildMockClient(
      {
        [USDC]: { symbol: "USDC", decimals: 6 },
        [EURC]: { symbol: "EURC", decimals: 6 },
      },
      [USDC, EURC],
    );

    const reserves = await discoverAaveBaseReserves(client);
    expect(reserves.map((reserve) => reserve.symbol)).not.toContain("DAI");
  });

  it("includes DAI when present", async () => {
    const client = buildMockClient(
      {
        [USDC]: { symbol: "USDC", decimals: 6 },
        [DAI]: { symbol: "DAI", decimals: 18 },
      },
      [USDC, DAI],
    );

    const reserves = await discoverAaveBaseReserves(client);
    expect(reserves.map((reserve) => reserve.symbol)).toEqual(["USDC", "DAI"]);
  });

  it("throws AaveReserveDiscoveryError when getReservesList fails", async () => {
    const client: AaveReadOnlyClient = {
      getBlockNumber: async () => 1n,
      readContract: async () => {
        throw new Error("rpc down");
      },
    };

    await expect(discoverAaveBaseReserves(client)).rejects.toBeInstanceOf(
      AaveReserveDiscoveryError,
    );
  });
});
