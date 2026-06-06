# Execution Engine

Version: Draft 1

---

# Purpose

The Execution Engine is responsible for transforming approved portfolio actions into blockchain transactions.

It is the operational layer of Laminar.

All intelligence, scoring, portfolio construction, and risk analysis occur before execution.

The Execution Engine does not make portfolio decisions.

It executes decisions that have already been approved.

---

# Position In Architecture

```text
User Intent
      ↓
Normalization and Mapping
      ↓
Selected Profile
      ↓
Portfolio Policy
      ↓
Opportunity Discovery
      ↓
Trust Scoring
      ↓
Liquidity Scoring
      ↓
Risk Engine
      ↓
Opportunity Scoring
      ↓
Portfolio Construction
      ↓
Portfolio Allocation
      ↓
Execution
      ↓
Execution Queue
      ↓
Execution Engine
      ↓
Safe Smart Account
      ↓
Protocols
```

---

# Core Philosophy

Separate decision-making from execution.

The Execution Engine should be:

* deterministic
* auditable
* observable
* permission-constrained

Execution should never introduce independent strategy decisions.

---

# Responsibilities

The Execution Engine is responsible for:

* transaction generation
* transaction submission
* transaction monitoring
* retry handling
* execution status tracking
* gas management
* execution validation

---

# Non-Responsibilities

The Execution Engine does not:

* select protocols
* evaluate APY
* evaluate risk
* determine allocations
* modify intent profiles

---

# Execution Lifecycle

Every execution follows the same lifecycle.

```text
Portfolio Decision
        ↓
Execution Plan
        ↓
Validation
        ↓
Queue
        ↓
Transaction Creation
        ↓
Submission
        ↓
Confirmation
        ↓
State Update
```

---

# Execution Planner

The Execution Planner converts allocation changes into actionable steps.

Example:

Current:

```text
Aave       70%
Morpho     30%
```

Target:

```text
Aave       40%
Morpho     60%
```

Execution Plan:

```text
Withdraw 30% from Aave

Deposit 30% into Morpho
```

---

# Execution Jobs

The planner produces jobs.

Example:

```typescript
ExecutionJob {

  id: string

  portfolioId: string

  type: string

  protocolId: string

  asset: string

  amount: string

}
```

---

# Job Types

V1 Supported:

```text
Deposit

Withdraw

Transfer

Rebalance
```

Future versions may introduce:

```text
Swap

Bridge

Leverage

Hedge
```

---

# Execution Queue

Purpose:

Separate planning from execution.

Benefits:

* retries
* prioritization
* observability
* rate limiting

---

# Queue States

```text
Pending

Scheduled

Executing

Confirmed

Failed

Cancelled
```

---

# Execution Windows

V1 uses fixed execution windows.

Global Windows:

```text
00:00 UTC

08:00 UTC

16:00 UTC
```

---

# Scheduling Philosophy

Portfolio evaluations may occur continuously.

Execution occurs only during approved windows.

Benefits:

* predictable gas usage
* predictable operations
* easier user expectations

---

# Frequency Eligibility

Example:

```text
Portfolio < $1,000

72h
```

---

```text
Portfolio $1k-$10k

24h+
```

---

```text
Portfolio > $10k

8h+
```

---

Thresholds remain configurable.

---

# Emergency Execution

Certain events may bypass normal schedules.

Examples:

* protocol exploit
* severe stablecoin depeg
* insolvency event

---

Emergency execution remains subject to user permissions.

---

# Permission Validation

Every execution must pass validation.

Validation occurs immediately before submission.

---

# Validation Checklist

Example:

```text
Allowed protocol?

Allowed asset?

Within allocation limits?

Within risk policy?

Within rebalance policy?

Within slippage limits?
```

---

Any failure aborts execution.

---

# Safe Smart Account Integration

V1 uses Safe smart accounts.

Each user receives:

```text
One Portfolio
      ↓
One Safe
```

---

Future versions may support:

```text
Multiple Portfolios
      ↓
Multiple Safes
```

or

```text
Multiple Portfolios
      ↓
Single Safe
      ↓
Virtual Sub-Portfolios
```

Decision deferred.

---

# Gas Management

Gas management is a first-class concern.

---

# Principle

Execution must never fail because the system unexpectedly lacks gas.

---

# Gas Reserve

Every portfolio maintains a gas reserve.

Example:

```text
USDC
      ↓
Gas Reserve Buffer
```

---

Gas reserve remains outside strategy allocation.

---

# Example

User deposits:

```text
$10,000
```

---

System allocates:

```text
$9,950 strategy capital

$50 operational reserve
```

Illustrative only.

---

# Reserve Objectives

Support:

* scheduled rebalances
* emergency actions
* retries

---

# Dynamic Reserve Sizing

Reserve requirements may depend on:

* portfolio size
* protocol count
* rebalance frequency
* network conditions

---

Example:

```text
Higher Frequency
      ↓
Larger Reserve
```

---

# Gas Deficiency Handling

If reserve becomes insufficient:

Possible Actions:

```text
Pause new rebalances

Notify user

Request reserve refill

Reduce automation
```

---

The system must never silently ignore reserve shortages.

---

# Transaction Creation

Transactions are generated through protocol adapters.

Execution Engine never directly interacts with protocol contracts.

---

Example:

```text
Execution Engine
        ↓
Aave Adapter
        ↓
Aave Contract
```

---

This abstraction is mandatory.

---

# Slippage Controls

Every transaction must respect slippage limits.

Example:

```text
Maximum Slippage

0.5%
```

---

Values remain configurable.

---

# Transaction Monitoring

The engine tracks:

* submission
* inclusion
* confirmation
* failure

---

Transaction history becomes part of portfolio history.

---

# Retry Policy

Temporary failures may be retried.

Examples:

* RPC failure
* transient network issue
* temporary gas spike

---

Permanent failures should not be retried automatically.

Examples:

* permission violation
* protocol rejection
* insufficient funds

---

# Observability

Every execution should be observable.

Users should see:

```text
Planned

Executing

Completed

Failed
```

---

# Explainability

Execution explanations should be human-readable.

Example:

```text
Moved 15% of capital from Aave to Morpho because:

- higher portfolio score
- within risk limits
- expected net benefit exceeded cost threshold
```

---

# Cost Awareness

Execution costs matter.

The system should estimate:

* gas cost
* expected benefit
* break-even horizon

---

Rebalances should only occur when expected benefit exceeds expected cost.

---

# Execution Safety Rules

Never execute:

```text
Outside permissions

Outside allocation constraints

Outside approved protocols

Outside approved assets
```

---

These rules are non-negotiable.

---

# Future Executor Layer

V1:

```text
Laminar Managed Executors
```

---

Potential Future:

```text
Gelato

Autonolas

 Decentralized Keeper Networks
```

---

Execution Engine should remain executor-agnostic.

---

# Future Enhancements

Potential V2:

* execution batching
* smart route optimization
* gas-aware scheduling

---

Potential V3:

* autonomous execution markets
* decentralized executors
* AI-assisted execution planning

---

# Success Criteria

The Execution Engine succeeds when:

* execution is reliable
* execution is transparent
* gas costs remain controlled
* user permissions are respected
* portfolio changes are accurately implemented

---

# Failure Criteria

The Execution Engine fails when:

* transactions occur outside approved permissions
* gas reserves are exhausted unexpectedly
* rebalances become excessively expensive
* execution behavior becomes difficult to explain

---

# Architectural Principle

The Execution Engine should be boring.

All intelligence happens before execution.

Execution exists to reliably and safely translate approved portfolio decisions into blockchain state changes.
