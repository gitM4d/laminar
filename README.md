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

The matrix compares:

- **MockLaminarDataProvider** — default product mode (all static data)
- **AaveBaseLaminarDataProvider** — experimental opt-in provider

Notes:

- Mock provider is the default product mode (API/frontend unchanged).
- Aave provider is experimental and opt-in only.
- Aave APY is real when RPC is configured (`AAVE_BASE_RPC_URL` / `BASE_RPC_URL`).
- Without RPC, Aave falls back to static markets and is labeled accordingly.
- Aave TVL remains a static placeholder.
- Trust/liquidity profiles remain curated.

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
src/adapters/ Read-only protocol adapters (Aave Base spike, experimental)
src/api/      Local HTTP API
src/demo/     CLI demo
frontend/     Minimal React prototype UI
docs/api/     HTTP contract and examples
docs/qa/      Manual sensitivity QA guide and fixtures
```
