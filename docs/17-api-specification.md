# API Specification

Version: Draft 1

---

# Purpose

This document defines the public backend API exposed by Laminar V1.

The API exists to:

* manage portfolios
* manage policies
* expose protocol data
* expose portfolio analytics
* expose execution history
* expose risk information

The API should remain:

* simple
* explicit
* auditable
* versioned

---

# API Design Principles

---

## Principle 1

APIs should expose business concepts.

Not database tables.

---

Good:

```text
GET /portfolios
```

Bad:

```text
GET /portfolio_allocations
```

---

## Principle 2

APIs should be deterministic.

The same request should always produce the same result for the same state.

---

## Principle 3

APIs should be explainable.

Every portfolio decision should expose reasoning.

---

## Principle 4

APIs should be versioned.

All endpoints should be namespaced.

---

Example

```text
/api/v1/*
```

---

# Authentication

V1 Authentication Model:

```text
Wallet Signature Authentication
```

---

Flow

```text
Connect Wallet
        ↓
Request Challenge
        ↓
Sign Message
        ↓
Receive JWT
        ↓
Authenticated Session
```

---

# Base URL

```text
/api/v1
```

---

# Health Endpoints

---

## GET /health

Purpose:

Service health check.

---

Response

```json
{
  "status": "ok"
}
```

---

# Authentication Endpoints

---

## POST /auth/challenge

Purpose:

Generate challenge message.

---

Request

```json
{
  "walletAddress": "0x..."
}
```

---

Response

```json
{
  "challenge": "Sign this message..."
}
```

---

## POST /auth/verify

Purpose:

Verify signature.

---

Request

```json
{
  "walletAddress": "0x...",
  "signature": "0x..."
}
```

---

Response

```json
{
  "accessToken": "...",
  "expiresAt": "..."
}
```

---

# User Endpoints

---

## GET /me

Purpose:

Current user profile.

---

Response

```json
{
  "id": "...",
  "walletAddress": "0x..."
}
```

---

# Portfolio Endpoints

---

## GET /portfolios

Purpose:

List user portfolios.

---

Response

```json
[
  {
    "id": "...",
    "name": "Conservative Stable Yield",
    "status": "ACTIVE",
    "valueUsd": 15000
  }
]
```

---

## POST /portfolios

Purpose:

Create portfolio.

---

Request

```json
{
  "name": "Conservative Stable Yield"
}
```

---

Response

```json
{
  "portfolioId": "..."
}
```

---

## GET /portfolios/:id

Purpose:

Portfolio details.

---

Response

```json
{
  "id": "...",
  "status": "ACTIVE",
  "valueUsd": 15000,
  "safeAddress": "0x..."
}
```

---

## DELETE /portfolios/:id

Purpose:

Close portfolio.

---

Behavior:

Moves portfolio into:

```text
CLOSING
```

state.

Never physically deletes.

---

# Portfolio Lifecycle Endpoints

---

## POST /portfolios/:id/activate

Purpose:

Activate funded portfolio.

---

## POST /portfolios/:id/pause

Purpose:

Pause automation.

---

## POST /portfolios/:id/resume

Purpose:

Resume automation.

---

## POST /portfolios/:id/close

Purpose:

Initiate closure.

---

# Portfolio Analytics

---

## GET /portfolios/:id/performance

Purpose:

Performance history.

---

Response

```json
{
  "currentValue": 15320,
  "pnl": 320,
  "pnlPercent": 2.14
}
```

---

## GET /portfolios/:id/allocations

Purpose:

Current allocation breakdown.

---

Response

```json
[
  {
    "protocol": "Morpho",
    "asset": "USDC",
    "allocationPercent": 45
  }
]
```

---

## GET /portfolios/:id/timeline

Purpose:

Portfolio events.

---

Response

```json
[
  {
    "eventType": "PortfolioActivated",
    "timestamp": "..."
  }
]
```

---

# Policy Endpoints

---

Policy values are derived from Normalization and Mapping.

Policy payloads expose the canonical Portfolio Policy structure.

Intent inputs remain separate under Intent Endpoints.

---

## GET /portfolios/:id/policy

Purpose:

Retrieve active policy.

---

Response

```json
{
  "policyVersion": 1,
  "selectedProfile": "Balanced",
  "riskLimits": {
    "minTrustScore": 75,
    "maxProtocolRisk": "medium",
    "allowUnauditedProtocols": false,
    "allowExperimentalProtocols": false
  },
  "liquidityRequirements": {
    "minLiquidityScore": 75,
    "maxWithdrawalDelay": "7 days",
    "allowLockups": false
  },
  "targetExposure": {
    "lending": 75,
    "yieldEnhancement": 25,
    "liquidityBuffer": 0
  },
  "allocationConstraints": {
    "maxActiveAllocations": 3,
    "maxProtocolExposure": 50,
    "maxStablecoinExposure": 80,
    "minAllocationSize": 10,
    "rebalanceThreshold": 10,
    "gasReserve": {
      "minUsd": 5,
      "targetRate": 1,
      "maxUsd": 100
    }
  }
}
```

---

## POST /portfolios/:id/policy

Purpose:

Create new policy version.

---

Request:

No body.

Policy is generated from current intent through Normalization and Mapping.

---

Response

```json
{
  "policyId": "...",
  "policyVersion": 2
}
```

---

## GET /portfolios/:id/policies

Purpose:

Policy history.

---

# Intent Endpoints

---

## GET /portfolios/:id/intent

Purpose:

Current user intent.

---

## POST /portfolios/:id/intent

Purpose:

Update intent.

---

Example

```json
{
  "risk": 3,
  "liquidity": 9,
  "returnPreference": 4
}
```

---

# Execution Endpoints

---

## GET /portfolios/:id/executions

Purpose:

Execution history.

---

Response

```json
[
  {
    "executionId": "...",
    "type": "REBALANCE",
    "status": "COMPLETED"
  }
]
```

---

## GET /executions/:id

Purpose:

Execution details.

---

Response

```json
{
  "executionId": "...",
  "status": "COMPLETED",
  "txHash": "0x..."
}
```

---

## GET /executions/:id/plan

Purpose:

Execution reasoning.

---

Response

```json
{
  "scoreBefore": 72,
  "scoreAfter": 81,
  "expectedImprovement": 9
}
```

---

Critical endpoint.

---

# Risk Endpoints

---

## GET /risk/events

Purpose:

Global risk events.

---

Response

```json
[
  {
    "severity": "HIGH",
    "eventType": "ProtocolPause"
  }
]
```

---

## GET /portfolios/:id/risk

Purpose:

Portfolio-specific risk view.

---

Response

```json
{
  "riskScore": 32,
  "alerts": []
}
```

---

# Protocol Endpoints

---

## GET /protocols

Purpose:

Supported protocols.

---

Response

```json
[
  {
    "name": "Morpho",
    "enabled": true
  }
]
```

---

## GET /protocols/:slug

Purpose:

Protocol details.

---

Response

```json
{
  "name": "Morpho",
  "tvl": 1000000000,
  "apy": 5.2
}
```

---

## GET /protocols/:slug/history

Purpose:

Historical metrics.

---

# Notification Endpoints

---

## GET /notifications

Purpose:

User notifications.

---

## POST /notifications/:id/read

Purpose:

Mark notification as read.

---

# Dashboard Endpoint

---

## GET /dashboard

Purpose:

Single endpoint for dashboard rendering.

---

Response

```json
{
  "totalValueUsd": 25000,
  "activePortfolios": 2,
  "pendingActions": 0
}
```

---

Purpose:

Reduce frontend requests.

---

# Explainability Endpoints

One of Laminar's differentiators.

---

## GET /portfolios/:id/why

Purpose:

Explain current allocation.

---

Example Response

```json
{
  "portfolioId": "...",
  "reasoning": [
    {
      "protocol": "Morpho",
      "reason": "Highest composite score"
    }
  ]
}
```

---

## GET /executions/:id/why

Purpose:

Explain execution.

---

Example Response

```json
{
  "executionId": "...",
  "reason": "Portfolio score improvement"
}
```

---

These endpoints are strategic.

---

# Admin Endpoints

V1 Internal Use.

Not publicly exposed.

---

Examples

```text
/admin/protocols

/admin/risk-events

/admin/jobs
```

---

# Pagination

All list endpoints should support:

```text
limit
offset
```

---

Example

```text
GET /executions?limit=20&offset=0
```

---

# Sorting

Standard support:

```text
sortBy
sortOrder
```

---

Example

```text
sortBy=createdAt

sortOrder=desc
```

---

# Error Format

Standardized.

---

Example

```json
{
  "error": {
    "code": "PORTFOLIO_NOT_FOUND",
    "message": "Portfolio not found"
  }
}
```

---

# API Success Criteria

The API succeeds when:

* business concepts remain clear
* portfolio decisions are explainable
* frontend requirements are satisfied
* endpoints remain stable

---

# API Failure Criteria

The API fails when:

* frontend requires direct database knowledge
* decision-making becomes opaque
* business logic leaks into clients

---

# Architectural Principle

The API should expose portfolios, policies, risk, and decisions as first-class concepts.

Users should always be able to understand:

* what Laminar did
* why Laminar did it
* what Laminar may do next
