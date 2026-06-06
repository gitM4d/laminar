# Cursor Development Guide

Version: Draft 1

Status: Engineering Reference

---

# Purpose

This document defines how Laminar should be developed.

It exists to ensure:

* architectural consistency
* predictable implementation
* maintainable code
* AI-assisted development alignment

This document is intended for:

* developers
* AI coding assistants
* future contributors

---

# Source of Truth

All implementation decisions must follow the documentation located in:

```text
/docs
```

When documentation conflicts with generated code:

Documentation wins.

---

# Engineering Philosophy

Laminar is a portfolio management platform.

It is not:

* a protocol-first application
* a yield farm
* a trading bot

The architecture should reflect portfolio management concepts.

---

# Business First

Business concepts must drive architecture.

Never build:

```text
MorphoService
AaveService
MoonwellService
```

as primary business abstractions.

Instead build:

```text
Portfolio
Policy
Intent
Allocation
Execution
Risk
```

Protocols are implementation details.

---

# Domain Driven Design

Preferred structure:

```text
src/

  portfolio/

  policy/

  execution/

  risk/

  protocol/

  scheduler/

  auth/

  notification/
```

Avoid:

```text
src/

  controllers/

  services/

  repositories/
```

organized globally.

Group by domain.

---

# Architecture Layers

Every feature should follow:

```text
API
 ↓
Application Layer
 ↓
Domain Layer
 ↓
Infrastructure Layer
```

---

# API Layer

Responsibilities:

* validation
* authentication
* request parsing
* response formatting

Must not contain:

* portfolio logic
* risk logic
* scoring logic

---

# Application Layer

Responsibilities:

* orchestration
* workflows
* use cases

Examples:

```text
CreatePortfolio

ActivatePortfolio

ExecuteRebalance

PausePortfolio
```

---

# Domain Layer

Contains business rules.

Examples:

```text
Portfolio

Policy

Intent

Allocation
```

Domain layer should remain independent.

---

# Infrastructure Layer

Contains:

```text
Database

Protocol Adapters

Queues

External APIs
```

Business logic should never depend directly on infrastructure.

---

# Core Principle

Everything revolves around:

```text
Portfolio
```

Not around protocols.

---

# Protocol Adapters

All protocol integrations must use adapters.

Required interface:

```typescript
interface ProtocolAdapter {

  getOpportunities()

  getPositions()

  allocate()

  withdraw()

  rebalance()

}
```

---

Never allow:

```typescript
if (protocol === "Morpho")
```

inside business logic.

---

Always:

```typescript
adapter.allocate()
```

---

# Portfolio State Machine

The portfolio lifecycle document is authoritative.

Portfolio states must be enforced.

---

Forbidden:

```typescript
portfolio.status = "ACTIVE"
```

from arbitrary code.

---

Required:

```typescript
portfolio.activate()
```

or equivalent domain transition.

---

# Policy Immutability

Policies are immutable.

Never update:

```text
Policy.version = 1
```

---

Instead:

```text
Create Policy.version = 2
```

---

Historical policies must remain accessible.

---

# Event Driven Design

Important actions should generate events.

Examples:

```text
PortfolioCreated

PortfolioActivated

PolicyCreated

ExecutionCompleted

EmergencyTriggered
```

---

Events should be persisted.

---

# Explainability First

Every execution must be explainable.

If the system cannot explain:

```text
Why?
```

then the feature should not be implemented.

---

Required:

```text
ExecutionPlan

Reasoning

Score Delta

Decision Trace
```

---

# Opportunity Scoring Rules

Opportunity Scoring must remain deterministic.

---

Forbidden:

```text
Randomness

AI Decisions

Opaque Heuristics
```

---

Required:

```text
Inputs
→ Opportunity Scoring
→ Opportunity Rankings
→ Portfolio Construction
→ Portfolio Allocation
```

Always reproducible.

---

# Risk Engine Rules

Risk Engine must be rule-based.

---

Examples:

```text
Depeg Threshold

TVL Collapse

Protocol Pause

Liquidity Drop
```

---

No machine learning.

No AI.

---

# Scheduler Rules

Scheduler triggers reviews.

Scheduler does not make decisions.

---

Correct:

```text
Scheduler
 ↓
Review Portfolio
 ↓
Execution Engine
```

---

Incorrect:

```text
Opportunity Scoring
 ↓
Portfolio Allocation
```

---

# Smart Account Rules

Each portfolio owns exactly one Safe account.

---

Relationship:

```text
Portfolio
   ↓
One Safe
```

---

Never:

```text
One Safe
↓
Many Portfolios
```

---

# Database Rules

Database is an audit system.

Not merely storage.

---

Every important action should leave evidence.

---

Required:

```text
Events

Executions

Policies

Snapshots
```

---

History must not be lost.

---

# API Design Rules

Expose business concepts.

---

Good:

```text
GET /portfolio/:id
```

---

Bad:

```text
GET /allocations_table
```

---

Good:

```text
GET /why
```

---

Bad:

```text
GET /raw_scores
```

---

# Frontend Rules

Frontend should expose:

```text
Intent

Policy

Reasoning
```

Not protocol complexity.

---

Default Mode:

Simple.

---

Advanced Mode:

Transparent.

---

Never overwhelm users with protocol details.

---

# Dependency Rules

Allowed:

```text
Portfolio
 ↓
Policy
```

```text
Portfolio
 ↓
Execution
```

---

Forbidden:

```text
Protocol
 ↓
Portfolio
```

Protocols should never own business logic.

---

# Testing Philosophy

Business logic must be tested.

---

Highest Priority:

```text
Portfolio Lifecycle

Normalization and Mapping

Risk Engine

Trust Scoring

Liquidity Scoring

Opportunity Scoring

Portfolio Construction

Portfolio Policy Validation
```

---

Lower Priority:

```text
Controllers

DTOs
```

---

# Logging Rules

Every critical action must be logged.

Examples:

```text
Portfolio Activated

Execution Started

Execution Completed

Risk Event Detected
```

---

Logs should answer:

```text
What happened?

Why?

When?
```

---

# Security Rules

Never trust frontend inputs.

Always validate:

```text
Wallet

Policy

Execution Requests
```

---

Never allow direct protocol execution from frontend.

All execution must pass through:

```text
Policy Validation
```

---

# AI Usage Rules

AI tools may generate code.

AI tools may not redefine architecture.

---

Generated code must conform to:

```text
Product Docs

Architecture Docs

Engineering Docs
```

---

# Refactoring Rule

Prefer deleting code over adding abstraction.

---

Prefer:

```text
Simple
```

over:

```text
Flexible
```

until flexibility is required.

---

# V1 Optimization Rule

Optimize for:

```text
Correctness

Auditability

Maintainability
```

Do not optimize for:

```text
Micro Performance

Premature Scalability

Theoretical Future Needs
```

---

# Scope Protection Rule

When implementing a feature:

Ask:

```text
Is this part of V1?
```

If uncertain:

Consult:

```text
20-mvp-scope-boundaries.md
```

---

# Development Order

Implementation should follow:

```text
Database
```

↓

```text
Domain Models
```

↓

```text
Normalization and Mapping
```

↓

```text
Policy Engine
```

↓

```text
Trust Scoring
```

↓

```text
Liquidity Scoring
```

↓

```text
Risk Engine
```

↓

```text
Opportunity Scoring
```

↓

```text
Portfolio Construction
```

↓

```text
Protocol Adapters
```

↓

```text
Execution Engine
```

↓

```text
API
```

↓

```text
Frontend
```

---

Never build UI before business logic.

---

# Success Criteria

The codebase succeeds when:

* portfolio decisions are explainable
* architecture remains deterministic
* protocols remain interchangeable
* history remains auditable

---

# Failure Criteria

The codebase fails when:

* protocol logic leaks everywhere
* decisions become opaque
* policies become mutable
* state transitions become uncontrolled

---

# Architectural Principle

Laminar is an intent-based portfolio management platform.

Every line of code should reinforce that idea.
