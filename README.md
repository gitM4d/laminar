# Laminar

Laminar is an intent-first portfolio recommendation engine. Users express risk, liquidity, and return preferences; the system deterministically produces portfolio policy, opportunity rankings, construction output, a user-facing snapshot, and a mock execution plan.

This repository contains the Laminar MVP core pipeline and a local HTTP API for development and integration testing.

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

In one terminal, start the API:

```bash
npm run api
```

In another terminal, start the frontend:

```bash
npm run frontend
```

Open `http://127.0.0.1:5173` in your browser.

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
src/api/      Local HTTP API
src/demo/     CLI demo
frontend/     Minimal React prototype UI
docs/api/     HTTP contract and examples
```
