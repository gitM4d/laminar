import "dotenv/config";
import { AaveBaseReadOnlyAdapter } from "../adapters/aave/AaveBaseReadOnlyAdapter.js";
import { mapAaveMarketToOpportunity } from "../adapters/aave/mapAaveMarketToOpportunity.js";
import { resolveAaveBaseRpcUrl } from "../adapters/aave/aaveBaseConfig.js";

async function main(): Promise<void> {
  const rpcUrl = resolveAaveBaseRpcUrl();
  const adapter = new AaveBaseReadOnlyAdapter();

  console.log("Aave Base Read-Only Adapter Probe");
  console.log("=================================");
  console.log(`Mode: ${adapter.getMode()}`);
  console.log(`RPC configured: ${rpcUrl !== undefined ? "yes" : "no"}`);
  console.log(`Strict RPC: ${adapter.isStrictRpc() ? "yes" : "no"}`);
  console.log("");

  const health = await adapter.getHealth();
  console.log("Health:");
  console.log(JSON.stringify(health, null, 2));
  console.log("");

  const markets = await adapter.discoverMarkets();
  const discoverySource = markets[0]?.source ?? "static-fallback";
  console.log(`Reserve discovery mode: ${discoverySource}`);
  console.log(
    `Discovered reserve asset symbols: ${markets.map((market) => market.asset).join(", ") || "(none)"}`,
  );
  console.log("");

  console.log(`Discovered markets (${markets.length}):`);
  console.log(JSON.stringify(markets, null, 2));
  console.log("");

  const opportunities = markets.map(mapAaveMarketToOpportunity);
  console.log(`Mapped Laminar opportunities (${opportunities.length}):`);
  console.log(JSON.stringify(opportunities, null, 2));
  console.log("");

  const reservesOnChain = markets.some(
    (market) => market.metadata?.reserveDiscovery === "on-chain",
  );

  console.log("Notes:");
  console.log(
    `- RPC used for health check: ${health.rpcChecked ? "yes" : "no"}`,
  );
  console.log(
    `- Reserve assets discovered on-chain: ${reservesOnChain ? "yes" : "no (static fallback)"}`,
  );
  console.log("- Market APY/TVL are STATIC placeholders in Sprint 18.");
  console.log("- Trust/liquidity metadata is curated/static.");
  console.log("- No transactions were created. Read-only adapter only.");
}

main().catch((error: unknown) => {
  console.error("Adapter probe failed:");
  console.error(error);
  process.exitCode = 1;
});
