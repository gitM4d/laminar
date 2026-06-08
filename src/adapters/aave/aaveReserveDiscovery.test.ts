import { describe, expect, it } from "vitest";
import { AAVE_POOL_ABI, ERC20_ABI } from "./aaveAbi.js";
import {
  AaveReserveDiscoveryError,
  buildAaveMarketId,
  discoverAaveBaseReserves,
  extractCurrentLiquidityRate,
  isV1SupportedAsset,
  readAaveReserveSupplyApr,
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

  it("Aave Pool ABI includes getReserveData", () => {
    const getReserveData = AAVE_POOL_ABI.find(
      (entry) => entry.name === "getReserveData",
    );
    expect(getReserveData).toBeDefined();
    expect(getReserveData?.stateMutability).toBe("view");
    expect(getReserveData?.inputs[0]?.type).toBe("address");
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

describe("extractCurrentLiquidityRate", () => {
  it("reads currentLiquidityRate from a named-object decode", () => {
    expect(
      extractCurrentLiquidityRate({
        configuration: { data: 0n },
        liquidityIndex: 10n,
        currentLiquidityRate: 45n * 10n ** 24n,
      }),
    ).toBe(45n * 10n ** 24n);
  });

  it("reads currentLiquidityRate from a positional tuple (index 2)", () => {
    expect(
      extractCurrentLiquidityRate([{ data: 0n }, 10n, 5n * 10n ** 25n]),
    ).toBe(5n * 10n ** 25n);
  });

  it("returns undefined when the rate cannot be decoded", () => {
    expect(extractCurrentLiquidityRate({})).toBeUndefined();
    expect(extractCurrentLiquidityRate(null)).toBeUndefined();
  });
});

describe("readAaveReserveSupplyApr", () => {
  it("maps liquidityRate to a supply APR decimal", async () => {
    const client: AaveReadOnlyClient = {
      getBlockNumber: async () => 1n,
      readContract: async (args) => {
        expect(args.functionName).toBe("getReserveData");
        return { currentLiquidityRate: 45n * 10n ** 24n };
      },
    };

    const result = await readAaveReserveSupplyApr(
      client,
      "0x1111111111111111111111111111111111111111",
    );

    expect(result.liquidityRateRay).toBe(45n * 10n ** 24n);
    expect(result.supplyApr).toBe(0.045);
  });

  it("throws AaveReserveDiscoveryError when getReserveData fails", async () => {
    const client: AaveReadOnlyClient = {
      getBlockNumber: async () => 1n,
      readContract: async () => {
        throw new Error("reserve data unavailable");
      },
    };

    await expect(
      readAaveReserveSupplyApr(
        client,
        "0x1111111111111111111111111111111111111111",
      ),
    ).rejects.toBeInstanceOf(AaveReserveDiscoveryError);
  });

  it("throws when the liquidity rate cannot be decoded", async () => {
    const client: AaveReadOnlyClient = {
      getBlockNumber: async () => 1n,
      readContract: async () => ({ somethingElse: 1n }),
    };

    await expect(
      readAaveReserveSupplyApr(
        client,
        "0x1111111111111111111111111111111111111111",
      ),
    ).rejects.toBeInstanceOf(AaveReserveDiscoveryError);
  });
});
