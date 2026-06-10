import { describe, expect, it } from "vitest";
import { AAVE_POOL_ABI, ERC20_ABI } from "./aaveAbi.js";
import {
  AaveReserveDiscoveryError,
  buildAaveMarketId,
  discoverAaveBaseReserves,
  extractATokenAddress,
  extractCurrentLiquidityRate,
  isV1SupportedAsset,
  readAaveReserveSupplyApr,
  readAaveReserveTvl,
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

const MOCK_ATOKEN = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" as const;

describe("extractATokenAddress", () => {
  it("reads aTokenAddress from a named-object decode", () => {
    expect(
      extractATokenAddress({
        aTokenAddress: MOCK_ATOKEN,
        currentLiquidityRate: 45n * 10n ** 24n,
      }),
    ).toBe(MOCK_ATOKEN);
  });

  it("reads aTokenAddress from a positional tuple (index 8)", () => {
    // Positional: [config(0), liquidityIndex(1), currentLiquidityRate(2),
    //              variableBorrowIndex(3), currentVariableBorrowRate(4),
    //              currentStableBorrowRate(5), lastUpdateTimestamp(6),
    //              id(7), aTokenAddress(8)]
    const tuple = [
      { data: 0n }, // 0 configuration
      1n,           // 1 liquidityIndex
      45n * 10n ** 24n, // 2 currentLiquidityRate
      1n,           // 3 variableBorrowIndex
      1n,           // 4 currentVariableBorrowRate
      0n,           // 5 currentStableBorrowRate
      1n,           // 6 lastUpdateTimestamp
      1n,           // 7 id
      MOCK_ATOKEN,  // 8 aTokenAddress
    ];
    expect(extractATokenAddress(tuple)).toBe(MOCK_ATOKEN);
  });

  it("returns undefined when aTokenAddress is absent", () => {
    expect(extractATokenAddress({ somethingElse: 1n })).toBeUndefined();
    expect(extractATokenAddress(null)).toBeUndefined();
  });
});

describe("readAaveReserveSupplyApr", () => {
  it("maps liquidityRate to a supply APR decimal and returns aTokenAddress", async () => {
    const client: AaveReadOnlyClient = {
      getBlockNumber: async () => 1n,
      readContract: async (args) => {
        expect(args.functionName).toBe("getReserveData");
        return {
          currentLiquidityRate: 45n * 10n ** 24n,
          aTokenAddress: MOCK_ATOKEN,
        };
      },
    };

    const result = await readAaveReserveSupplyApr(
      client,
      "0x1111111111111111111111111111111111111111",
    );

    expect(result.liquidityRateRay).toBe(45n * 10n ** 24n);
    expect(result.supplyApr).toBe(0.045);
    expect(result.aTokenAddress).toBe(MOCK_ATOKEN);
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
      readContract: async () => ({ aTokenAddress: MOCK_ATOKEN }),
    };

    await expect(
      readAaveReserveSupplyApr(
        client,
        "0x1111111111111111111111111111111111111111",
      ),
    ).rejects.toBeInstanceOf(AaveReserveDiscoveryError);
  });

  it("throws when aTokenAddress cannot be decoded", async () => {
    const client: AaveReadOnlyClient = {
      getBlockNumber: async () => 1n,
      readContract: async () => ({
        currentLiquidityRate: 45n * 10n ** 24n,
        // aTokenAddress intentionally absent
      }),
    };

    await expect(
      readAaveReserveSupplyApr(
        client,
        "0x1111111111111111111111111111111111111111",
      ),
    ).rejects.toBeInstanceOf(AaveReserveDiscoveryError);
  });
});

describe("readAaveReserveTvl", () => {
  // 500_000_000 USDC → 500_000_000_000_000 raw (6 decimals)
  const USDC_SUPPLY_RAW = 500_000_000n * 10n ** 6n;

  it("converts aToken totalSupply to USD (stablecoin peg, 6 decimals)", async () => {
    const client: AaveReadOnlyClient = {
      getBlockNumber: async () => 1n,
      readContract: async (args) => {
        expect(args.functionName).toBe("totalSupply");
        expect(args.address).toBe(MOCK_ATOKEN);
        return USDC_SUPPLY_RAW;
      },
    };

    const result = await readAaveReserveTvl(client, MOCK_ATOKEN, 6);

    expect(result.tvlUsd).toBe(500_000_000);
    expect(result.totalSupplyRaw).toBe(USDC_SUPPLY_RAW);
    expect(result.aTokenAddress).toBe(MOCK_ATOKEN);
  });

  it("handles 18-decimal assets (DAI)", async () => {
    // 1_000_000 DAI = 1_000_000 * 1e18 raw
    const daiSupplyRaw = 1_000_000n * 10n ** 18n;
    const client: AaveReadOnlyClient = {
      getBlockNumber: async () => 1n,
      readContract: async () => daiSupplyRaw,
    };

    const result = await readAaveReserveTvl(client, MOCK_ATOKEN, 18);

    expect(result.tvlUsd).toBeCloseTo(1_000_000, 4);
  });

  it("throws AaveReserveDiscoveryError when totalSupply call fails", async () => {
    const client: AaveReadOnlyClient = {
      getBlockNumber: async () => 1n,
      readContract: async () => {
        throw new Error("totalSupply call failed");
      },
    };

    await expect(
      readAaveReserveTvl(client, MOCK_ATOKEN, 6),
    ).rejects.toBeInstanceOf(AaveReserveDiscoveryError);
  });
});
