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

## Protocol adapters (experimental)

Sprint 17 introduces the first read-only protocol adapter spike for Aave V3 on
Base. It is **not** wired into the API or frontend default flow; the default
data provider remains `MockLaminarDataProvider`.

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
- **RPC read-only mode** (RPC configured): `getHealth()` performs a minimal
  read-only connectivity check (`getBlockNumber`) and discovered markets report
  `source = "static-fallback-rpc-verified"`.

### Warnings

- **APY/TVL are static placeholders in Sprint 17**, even when RPC health
  succeeds. Real Aave reserve math is not implemented yet.
- Trust/liquidity metadata for Aave is curated/static in this sprint.
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
