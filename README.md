# Laminar

Laminar is an intent-first portfolio recommendation engine. Users express risk, liquidity, and return preferences; the system deterministically produces portfolio policy, opportunity rankings, construction output, a user-facing snapshot, and a mock execution plan.

This repository contains the Laminar MVP core pipeline and a local HTTP API for development and integration testing.

The core reads opportunities, trust profiles, and liquidity profiles through a **read-only data provider abstraction**. The default provider is mock-only; real protocol adapters are future work.

## MVP pipeline

```text
User Intent
→ Normalization
→ Profile Classification
→ Policy Generation
→ Mock Opportunity Discovery
→ Trust Scoring
→ Liquidity Scoring
→ Risk Engine
→ Opportunity Scoring
→ Portfolio Construction
→ Recommendation Snapshot
→ Mock Execution Plan
```

Public core entrypoint:

```typescript
import { createLaminarRecommendation } from "./core/index.js";
```

## Install

```bash
npm ci
```

## Development

### Run API and frontend together

```bash
npm run dev
```

- API: `http://127.0.0.1:3000`
- Frontend: `http://127.0.0.1:5173`

The Vite dev server proxies `/recommendation` and `/health` to the local API.

### Run demo

```bash
npm run demo
```

### Run local API

```bash
npm run api
```

Default base URL: `http://127.0.0.1:3000`

### Run frontend prototype

Start both services:

```bash
npm run dev
```

Or run them separately:

```bash
npm run api
npm run frontend
```

Frontend URL: `http://127.0.0.1:5173`

Build the frontend:

```bash
npm run frontend:build
```

The dev server proxies `/recommendation` and `/health` to the local API.

### Run tests

```bash
npm test
```

### Typecheck

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
npm run format:check
```

### Full quality gate

```bash
npm run check
```

Runs typecheck, lint, tests, and API contract validation.

## Manual QA

- Sensitivity QA guide: [docs/qa/manual-sensitivity-qa.md](docs/qa/manual-sensitivity-qa.md)
- Request fixtures: [docs/qa/fixtures/](docs/qa/fixtures/)

```bash
npm run qa:sensitivity
```

## Real Provider Mode (experimental)

The Aave Base adapter can be used as an optional data provider for the full
recommendation pipeline. The default provider (`MockLaminarDataProvider`) is
**not changed**.

### Mode A — default mock mode

```ts
createLaminarRecommendation({ intent, portfolioValueUsd });
```

Uses `MockLaminarDataProvider`. All data is static. Safe for development and
testing with no network required.

### Mode B — Aave provider opt-in

```ts
const provider = await createAaveBaseLaminarDataProviderSnapshot();
createLaminarRecommendation({ intent, portfolioValueUsd, dataProvider: provider });
```

Uses `AaveBaseLaminarDataProvider`. Runs the full Laminar pipeline (scoring,
ranking, construction, snapshot, execution plan) with:

- **Supply APY**: real Aave `liquidityRate` APR (approximation; incentives
  excluded).
- **TVL**: static placeholder.
- **Trust/liquidity profiles**: curated/static.
- **Reserve assets**: discovered on-chain (USDC, EURC on Base).

CLI probe (no frontend, no API changes):

```bash
npm run recommendation:aave
```

### Limitations

- APY is the Aave `liquidityRate` APR used as an APY approximation.
- Incentives/reward emissions are not included.
- TVL is a static placeholder.
- Trust and liquidity profiles are curated/static, not sourced on-chain.
- The API/frontend default provider remains `MockLaminarDataProvider`.
- No transactions are created.

## Provider Comparison Matrix

Compare Laminar recommendations across providers for the same sensitivity
scenarios:

```bash
npm run compare:providers
```

Optional JSON output:

```bash
npm run compare:providers -- --json
```

The matrix compares four providers by default:

- **MockLaminarDataProvider** — default product mode (all static data)
- **AaveBaseLaminarDataProvider** — experimental Aave Base provider
- **MorphoBaseLaminarDataProvider** — experimental Morpho Base provider
- **CombinedLaminarDataProvider** — Aave + Morpho combined universe

The CLI prints two tables:

1. **Recommendation comparison** — portfolio metrics (StratAPY, PortAPY,
   allocations, top strategy, warnings, opportunity count) per provider/scenario.
2. **Provider Data Quality** — what is real vs static vs curated per provider.

Data quality labels:

| Provider | APY Data | TVL Data | Trust Data | Liquidity Data |
|---|---|---|---|---|
| Mock | static | static | mock | mock |
| Aave (RPC) | real-onchain | real-onchain-approx | curated | curated |
| Aave (fallback) | static-fallback | static-fallback | curated | curated |
| Morpho (API) | real-api | real-api | curated | curated |
| Morpho (fallback) | static-fallback | static-fallback | curated | curated |
| Combined | mixed-real | mixed-real | curated | curated |

Difference summaries compare each real provider against Mock:

- Aave vs Mock
- Morpho vs Mock
- Combined vs Mock

JSON mode returns `providers`, `providerDataQuality`, `scenarios`, `results`,
and `differences` (`aaveVsMock`, `morphoVsMock`, `combinedVsMock`).

Notes:

- Mock provider is the default product mode (API/frontend unchanged).
- Aave, Morpho, and Combined providers are experimental and opt-in only.
- Aave APY/TVL are real on-chain when RPC is configured (`AAVE_BASE_RPC_URL` /
  `BASE_RPC_URL`). TVL uses a stablecoin peg (1 token ≈ 1 USD).
- Without RPC, Aave falls back to static markets and is labeled accordingly.
- Morpho APY/TVL are real when the Morpho API is reachable; static fallback
  otherwise (`MORPHO_BASE_API_URL` or the public default).
- Combined reuses the same Aave/Morpho snapshots (no duplicate external calls).
- Trust/liquidity profiles remain curated for all real providers.

## Protocol adapters (experimental)

The read-only protocol adapter for Aave V3 on Base is **not** wired into the API
or frontend default flow; the default data provider remains
`MockLaminarDataProvider`.

Run the read-only adapter probe:

```bash
npm run adapter:aave:base
```

### RPC configuration

The adapter optionally reads an RPC URL from environment variables (precedence
`AAVE_BASE_RPC_URL`, then `BASE_RPC_URL`). RPC is **not required**.

```bash
# .env (optional)
AAVE_BASE_RPC_URL=https://base-mainnet.example/v2/<key>
BASE_RPC_URL=https://base-mainnet.example/v2/<key>
```

### Adapter modes

- **Static fallback mode** (no RPC configured): `getHealth()` returns a healthy
  static status and `discoverMarkets()` returns deterministic static markets
  (`source = "static-fallback"`).
- **RPC read-only mode** (RPC configured): `getHealth()` performs a read-only
  connectivity check (`getBlockNumber`), and `discoverMarkets()` discovers Aave
  reserve assets **on-chain** via `Pool.getReservesList()` plus ERC20
  `symbol()`/`decimals()`, filtered to Laminar V1 assets (USDC/EURC/DAI), and
  reads the **real supply APR** from `Pool.getReserveData().currentLiquidityRate`.
  Those markets report `source = "rpc-reserve-discovery"`.

### Reserve and APY discovery (on-chain)

When RPC is configured, reserve **assets** are discovered on-chain (read-only)
and the **supply APY** is derived from Aave's `liquidityRate` (ray units,
`1e27 = 100%`). The APY is currently the Aave **APR used as an APY
approximation** — incentives/reward emissions are **not** included.

If on-chain reserve discovery fails, the adapter falls back to static markets
unless `strictRpc: true` is passed, in which case it throws an
`AaveReserveDiscoveryError`. If only the per-market supply APR read fails
(non-strict), the reserve is kept but its APY falls back to a static
placeholder.

### Warnings

- **APY is the Aave `liquidityRate` APR** used as an APY approximation;
  incentives are not included.
- **TVL remains a static placeholder.** Real TVL math is not implemented yet.
- Trust/liquidity metadata for Aave is curated/static.
- The adapter is **read-only**: no wallet, no private key, no signer, and
  **no transactions are created**.

## Morpho Base Adapter (experimental)

The read-only Morpho adapter for Base discovers Morpho vaults via Morpho's
public GraphQL API when available, and falls back to deterministic static
markets otherwise. It is **not** wired into the API or frontend default flow;
the default data provider remains `MockLaminarDataProvider`.

Run the read-only adapter probe:

```bash
npm run adapter:morpho:base
```

Run the Morpho provider recommendation probe (Balanced intent, $10,000):

```bash
npm run recommendation:morpho
```

### Data source

- **Morpho public API** (`https://api.morpho.org/graphql`, chainId `8453`) is
  queried read-only when reachable. APY (`state.netApy`) and TVL
  (`state.totalAssetsUsd`) are sourced from the API.
- If the API is unavailable, returns an unexpected shape, or yields no supported
  markets, the adapter falls back to **deterministic static markets** so local
  development never blocks.
- Override or disable the endpoint with `MORPHO_BASE_API_URL` (set to an empty
  string to force static-fallback mode).

### Adapter modes

- **Static fallback mode** (`disableApi` / empty `MORPHO_BASE_API_URL`):
  `discoverMarkets()` returns deterministic static markets
  (`source = "static-fallback"`); APY/TVL are static placeholders
  (`apySource`/`tvlSource = "static-placeholder"`).
- **API read-only mode** (default): `getHealth()` performs a read-only vaults
  query and `discoverMarkets()` returns API-sourced markets
  (`source = "morpho-api"`, `apySource`/`tvlSource = "morpho-api"`). On failure
  (non-strict) it falls back to static markets; with `strictApi: true` it throws
  a `MorphoDiscoveryError`.

### Warnings

- **APY/TVL are real only when the Morpho API is reachable**; otherwise they are
  static placeholders.
- V1 assets only (USDC / EURC / DAI). No ETH/BTC/LSTs/long-tail assets.
- Trust/liquidity metadata for Morpho is curated/static.
- `protocolRiskLevel` for Morpho is curated as `medium`.
- The adapter is **read-only**: no wallet, no private key, no signer, and
  **no transactions are created**.
- The API/frontend default provider remains `MockLaminarDataProvider`.

## Moonwell Base Adapter (experimental)

The read-only Moonwell adapter for Base discovers Moonwell lending markets
(mTokens) via Moonwell's public read-only data API when configured, and falls
back to deterministic static markets otherwise. It is **not** wired into the API
or frontend default flow, nor into the provider comparison or Combined provider;
the default data provider remains `MockLaminarDataProvider`.

Run the read-only adapter probe:

```bash
npm run adapter:moonwell:base
```

Run the Moonwell provider recommendation probe (Balanced intent, $10,000):

```bash
npm run recommendation:moonwell
```

### Data source

- **Chosen source: a lightweight read-only HTTP/JSON data API client**, mirroring
  the Morpho adapter exactly. The endpoint is provided via the
  `MOONWELL_BASE_API_URL` environment variable (chainId `8453`). When reachable,
  supply APY (`supplyApy`) and TVL (`totalSupplyUsd`) are sourced from the API.
- **Why this source:** simplest and most robust for a read-only spike; no heavy
  SDK dependency; no signer/wallet; matches the existing Morpho architecture; and
  tests stay deterministic via an injected mock client.
- **Discarded alternatives:**
  - The official `@moonwell-fi/moonwell-sdk` — a heavyweight dependency that is
    internally RPC-coupled (viem multicall) and harder to mock cleanly; overkill
    for a read-only spike.
  - The subgraph — requires endpoint/key management and carries schema-drift
    risk.
  - Direct on-chain mToken reads — feasible but the Compound-style APY math
    (per-timestamp rate → APY) and USD TVL (needs a price) add complexity and
    approximation. The client interface leaves room to plug any of these in later.
- Unlike Morpho, there is **no hardcoded public default endpoint**. Without
  `MOONWELL_BASE_API_URL`, the adapter runs in deterministic static-fallback mode
  (same default posture as the Aave adapter without an RPC URL).

### Adapter modes

- **Static fallback mode** (default / `disableApi` / unset `MOONWELL_BASE_API_URL`):
  `discoverMarkets()` returns deterministic static markets
  (`source = "static-fallback"`); APY/TVL are static placeholders
  (`apySource`/`tvlSource = "static-placeholder"`).
- **API read-only mode** (when `MOONWELL_BASE_API_URL` is set): `getHealth()`
  performs a read-only markets query and `discoverMarkets()` returns API-sourced
  markets (`source = "moonwell-api"`, `apySource`/`tvlSource = "moonwell-api"`).
  On failure (non-strict) it falls back to static markets; with `strictApi: true`
  it throws a `MoonwellDiscoveryError`.

### Data quality

- **Real (when API reachable):** supply APY and TVL per market.
- **Curated/static:** trust profile (≈3y operation, ~$60M TVL, two Halborn
  tier-2 audits, no modeled incidents) and liquidity profile (instant withdrawal,
  no lockup, `high` redemption reliability to reflect pooled-utilization risk).
- **Fallback (static placeholders):** APY/TVL when the API is unset/unavailable
  or returns no supported markets.

### Warnings

- **APY/TVL are real only when the Moonwell API is reachable**; otherwise they
  are static placeholders.
- V1 assets only (USDC / EURC / DAI). No ETH/BTC/LSTs/long-tail assets.
- Trust/liquidity metadata for Moonwell is curated/static.
- `protocolRiskLevel` for Moonwell is curated as `medium`.
- The adapter is **read-only**: no wallet, no private key, no signer, and
  **no transactions are created**.
- The API/frontend default provider remains `MockLaminarDataProvider`.
- Moonwell is **not** integrated into `compare:providers` or the Combined
  provider yet (intentionally out of scope for this spike).

## API documentation

- API guide: [docs/api/README.md](docs/api/README.md)
- OpenAPI contract: [docs/api/openapi.json](docs/api/openapi.json)
- Examples: [docs/api/examples/](docs/api/examples/)

## MVP limitations

- Mock opportunities only; no live protocol adapters
- No database or persistence
- No authentication or authorization
- No blockchain, RPC, smart accounts, or real execution
- `executionPlan` is mock-only and creates no transactions
- No rebalancing or deployment infrastructure
- Frontend is a local UX prototype only (no wallet, auth, or persistence)

## Project structure

```text
src/core/     Domain pipeline and public core API
src/core/providers/  Read-only data provider interfaces (mock default)
src/adapters/ Read-only protocol adapters (Aave + Morpho Base spikes, experimental)
src/api/      Local HTTP API
src/demo/     CLI demo
frontend/     Minimal React prototype UI
docs/api/     HTTP contract and examples
docs/qa/      Manual sensitivity QA guide and fixtures
```
