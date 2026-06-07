# Laminar Local API

Local MVP HTTP API exposing the Laminar core recommendation pipeline.

This API is intended for local development, UI prototyping, and service integration tests. It is not a production deployment.

## Base URL

```text
http://127.0.0.1:3000
```

Override with environment variables:

- `HOST` (default `127.0.0.1`)
- `PORT` (default `3000`)

## Endpoints

| Method | Path              | Description                       |
| ------ | ----------------- | --------------------------------- |
| `GET`  | `/health`         | Service health check              |
| `POST` | `/recommendation` | Generate portfolio recommendation |

## Request example

```bash
curl -X POST http://127.0.0.1:3000/recommendation \
  -H "Content-Type: application/json" \
  -d '{
    "intent": {
      "risk": 3,
      "liquidity": 8,
      "returnPreference": 4
    },
    "portfolioValueUsd": 10000,
    "asOf": "2026-06-01T00:00:00.000Z"
  }'
```

`asOf` is optional.

## Response shape

Successful responses return:

```json
{
  "recommendation": {},
  "snapshot": {},
  "executionPlan": {}
}
```

- `recommendation` — full developer-facing pipeline result
- `snapshot` — compact summary for review screens
- `executionPlan` — mock plan only

## Error shape

All API errors use:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Human-readable message",
    "details": {}
  }
}
```

`details` is optional.

## Error codes

| Code                      | HTTP | Meaning                                             |
| ------------------------- | ---- | --------------------------------------------------- |
| `INVALID_REQUEST`         | 400  | Request body shape or basic field validation failed |
| `INVALID_INTENT`          | 400  | Intent failed core semantic validation              |
| `INVALID_PORTFOLIO_VALUE` | 400  | `portfolioValueUsd` must be greater than 0          |
| `DATA_CONSISTENCY_ERROR`  | 500  | Mock scoring data inconsistency                     |
| `INTERNAL_ERROR`          | 500  | Unexpected server error                             |

## Health check

```bash
curl http://127.0.0.1:3000/health
```

```json
{
  "status": "ok",
  "service": "laminar-api",
  "version": "0.1.0"
}
```

## Notes

- This is a local MVP API with no authentication or persistence.
- `executionPlan` is mock-only. It describes planned `deposit`, `hold`, and `reserve` actions and creates no blockchain transactions.
- Deep intent semantics are validated by the Laminar core, not only by HTTP schema validation.

## Contract artifacts

- OpenAPI: `docs/api/openapi.json`
- Examples: `docs/api/examples/`
- JSON Schemas: `src/api/schemas/`

Validate contract files:

```bash
npm run api:contract
```
