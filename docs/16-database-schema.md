# Database Schema

Version: Draft 1

---

# Purpose

This document defines the logical database model for Laminar V1.

The database is the source of truth for:

* users
* portfolios
* policies
* executions
* events
* historical state

The database should prioritize:

* auditability
* simplicity
* traceability
* operational efficiency

---

# Core Philosophy

The database exists to answer:

```text
What happened?

Why did it happen?

Who triggered it?

What was the portfolio state at the time?
```

Every important decision should be reconstructable.

---

# Database Recommendation

V1:

```text
PostgreSQL
```

---

Reasons:

* mature
* reliable
* transactional
* excellent TypeScript ecosystem
* future analytics support

---

# High-Level Entity Diagram

```text
User
 ↓
Portfolio
 ↓
Policy
 ↓
Execution

Portfolio
 ↓
PortfolioEvent

Portfolio
 ↓
PortfolioSnapshot

Protocol
 ↓
ProtocolSnapshot

Portfolio
 ↓
RiskEvent
```

---

# Entity: User

Represents a Laminar user.

---

Fields

```typescript
User {

  id: UUID

  walletAddress: string

  createdAt: timestamp

  updatedAt: timestamp

}
```

---

Notes

* Wallet is primary identity.
* No email required in V1.
* Additional profile data optional.

---

# Entity: Portfolio

Core portfolio entity.

---

Fields

```typescript
Portfolio {

  id: UUID

  userId: UUID

  safeAddress: string

  status: PortfolioStatus

  name: string

  createdAt: timestamp

  updatedAt: timestamp

}
```

---

Relationships

```text
User
 ↓
Many Portfolios
```

---

# Portfolio Status Enum

```typescript
enum PortfolioStatus {

  DRAFT,

  PENDING_FUNDING,

  ACTIVE,

  PAUSED,

  EMERGENCY,

  CLOSING,

  CLOSED

}
```

---

# Entity: Policy

Represents the currently active policy.

---

Fields

```typescript
Policy {

  id: UUID

  portfolioId: UUID

  version: number

  isActive: boolean

  policyJson: jsonb

  createdAt: timestamp

}
```

---

Notes

Policies are immutable.

New version = new row.

The `version` field maps to `policyVersion` in the stored policy payload.

`policyJson` conforms to the canonical Portfolio Policy model.

Example structure:

```typescript
PolicyJson {

  policyVersion: number

  selectedProfile: string

  riskLimits: {
    minTrustScore: number
    maxProtocolRisk: string
    allowUnauditedProtocols: boolean
    allowExperimentalProtocols: boolean
  }

  liquidityRequirements: {
    minLiquidityScore: number
    maxWithdrawalDelay: string
    allowLockups: boolean
  }

  targetExposure: {
    lending: number
    yieldEnhancement: number
    liquidityBuffer: number
  }

  allocationConstraints: {
    maxActiveAllocations: number
    maxProtocolExposure: number
    maxStablecoinExposure: number
    minAllocationSize: number
    rebalanceThreshold: number
    gasReserve: {
      minUsd: number
      targetRate: number
      maxUsd: number
    }
  }

}
```

---

# Entity: PolicyVersion

Optional V1.1 separation.

Not required initially.

Current recommendation:

Store versioning directly in Policy.

---

# Entity: Execution

Represents a planned or executed action.

---

Fields

```typescript
Execution {

  id: UUID

  portfolioId: UUID

  policyId: UUID

  executionType: ExecutionType

  status: ExecutionStatus

  txHash: string | null

  createdAt: timestamp

  executedAt: timestamp | null

}
```

---

# ExecutionType Enum

```typescript
enum ExecutionType {

  INITIAL_ALLOCATION,

  REBALANCE,

  EMERGENCY_EXIT,

  WITHDRAWAL,

  MAINTENANCE

}
```

---

# ExecutionStatus Enum

```typescript
enum ExecutionStatus {

  PENDING,

  VALIDATING,

  READY,

  EXECUTING,

  COMPLETED,

  FAILED,

  CANCELLED

}
```

---

# Entity: ExecutionPlan

Stores the decision that led to execution.

---

Purpose:

Auditability.

Explainability.

---

Fields

```typescript
ExecutionPlan {

  id: UUID

  executionId: UUID

  scoreBefore: number

  scoreAfter: number

  expectedImprovement: number

  planJson: jsonb

  createdAt: timestamp

}
```

---

# Entity: PortfolioEvent

Critical entity.

---

Purpose:

Portfolio timeline.

Notifications.

Audit history.

Analytics.

---

Fields

```typescript
PortfolioEvent {

  id: UUID

  portfolioId: UUID

  eventType: string

  payload: jsonb

  createdAt: timestamp

}
```

---

Examples

```text
PortfolioCreated

PolicyUpdated

PortfolioActivated

EmergencyTriggered

RebalanceExecuted

PortfolioClosed
```

---

# Entity: PortfolioSnapshot

Historical portfolio state.

---

Purpose:

Performance tracking.

Charts.

Historical analytics.

---

Fields

```typescript
PortfolioSnapshot {

  id: UUID

  portfolioId: UUID

  totalValueUsd: decimal

  allocationsJson: jsonb

  createdAt: timestamp

}
```

---

Recommended Frequency

```text
Every 6 Hours
```

for V1.

---

# Entity: RiskEvent

Represents detected risk events.

---

Fields

```typescript
RiskEvent {

  id: UUID

  portfolioId: UUID | null

  protocolId: UUID | null

  severity: RiskSeverity

  eventType: string

  payload: jsonb

  createdAt: timestamp

}
```

---

# RiskSeverity Enum

```typescript
enum RiskSeverity {

  LOW,

  MEDIUM,

  HIGH,

  CRITICAL

}
```

---

Examples

```text
ProtocolExploit

StablecoinDepeg

LiquidityCollapse

ProtocolPause
```

---

# Entity: Protocol

Registry of supported protocols.

---

Fields

```typescript
Protocol {

  id: UUID

  slug: string

  name: string

  category: string

  enabled: boolean

}
```

---

Examples

```text
Morpho

Aave

Moonwell

Aerodrome
```

---

# Entity: ProtocolSnapshot

Historical protocol metrics.

---

Fields

```typescript
ProtocolSnapshot {

  id: UUID

  protocolId: UUID

  tvl: decimal

  apy: decimal

  liquidity: decimal

  utilization: decimal

  trustScore: decimal

  createdAt: timestamp

}
```

---

Purpose

Historical analytics.

Scoring.

Research.

---

# Entity: PortfolioAllocation

Current allocation state.

---

Fields

```typescript
PortfolioAllocation {

  id: UUID

  portfolioId: UUID

  protocolId: UUID

  asset: string

  allocationPercent: decimal

  valueUsd: decimal

}
```

---

Purpose

Fast reads.

Dashboard rendering.

---

# Entity: Notification

User notifications.

---

Fields

```typescript
Notification {

  id: UUID

  userId: UUID

  type: string

  payload: jsonb

  read: boolean

  createdAt: timestamp

}
```

---

Examples

```text
Emergency Triggered

Portfolio Activated

Rebalance Completed
```

---

# Entity: SchedulerJob

Optional V1.

Useful for observability.

---

Fields

```typescript
SchedulerJob {

  id: UUID

  portfolioId: UUID

  nextExecutionAt: timestamp

  jobType: string

}
```

---

# Entity: AuditLog

System-wide audit trail.

---

Fields

```typescript
AuditLog {

  id: UUID

  actorType: string

  actorId: string

  action: string

  payload: jsonb

  createdAt: timestamp

}
```

---

Examples

```text
PolicyCreated

ExecutionSubmitted

RiskEventDetected

PortfolioClosed
```

---

# Indexing Strategy

Must index:

```text
walletAddress

portfolioId

policyId

executionId

protocolId

createdAt
```

---

High-priority indexes only.

Avoid premature optimization.

---

# Data Retention

V1 Recommendation:

```text
Never Delete Critical Records
```

---

Examples

Keep:

* executions
* policies
* events
* audit logs

---

Reason:

Auditability.

---

# Soft Deletes

Preferred over hard deletes.

---

Example

```typescript
deletedAt: timestamp | null
```

---

Applicable to:

```text
Portfolios

Notifications
```

---

Not applicable to:

```text
Executions

Policies

Audit Logs
```

---

# JSON Usage

Allowed for:

```text
Policy Data

Execution Plans

Events

Notifications
```

---

Avoid excessive normalization in V1.

---

# Success Criteria

The database succeeds when:

* portfolio history is reconstructable
* decisions are auditable
* state transitions are traceable
* performance remains acceptable

---

# Failure Criteria

The database fails when:

* decisions cannot be explained
* history is lost
* policy versions disappear
* executions become disconnected from decisions

---

# Architectural Principle

The database should preserve the complete history of portfolio decisions.

Optimization can be added later.

Lost history cannot.
