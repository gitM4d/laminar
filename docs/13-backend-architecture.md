# Backend Architecture

Version: Draft 1

---

# Purpose

This document defines the backend architecture of Laminar V1.

The backend exists to coordinate:

* data collection
* scoring
* risk evaluation
* portfolio construction
* scheduling
* execution planning
* execution monitoring

while remaining scalable, observable, and cost-efficient.

---

# Core Philosophy

Laminar is not a monolith.

Laminar is a collection of specialized services.

Each service should have:

* a clear responsibility
* minimal coupling
* explicit interfaces

---

# Design Goals

The backend should be:

* modular
* deterministic
* observable
* scalable
* inexpensive to operate
* protocol-agnostic

---

# Architectural Overview

```text
                    ┌─────────────────┐
                    │     Frontend    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │      API        │
                    └────────┬────────┘
                             │
      ┌──────────────────────┼──────────────────────┐
      ▼                      ▼                      ▼

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Intent Svc   │    │ PortfolioSvc │    │ User Svc     │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └────────────┬──────┴──────────────┬────┘
                    ▼                     ▼

            ┌──────────────────────┐
            │ Normalization/Mapping │
            └──────────┬───────────┘
                       ▼

            ┌──────────────────────┐
            │     Policy Svc       │
            └──────────┬───────────┘
                       ▼

            ┌──────────────────────┐
            │ Opportunity Discovery│
            └──────────┬───────────┘
                       ▼

            ┌──────────────────────┐
            │   Trust Scoring    │
            └──────────┬───────────┘
                       ▼

            ┌──────────────────────┐
            │  Liquidity Scoring   │
            └──────────┬───────────┘
                       ▼

            ┌──────────────────────┐
            │    Risk Engine       │
            └──────────┬───────────┘
                       ▼

            ┌──────────────────────┐
            │ Opportunity Scoring  │
            └──────────┬───────────┘
                       ▼

                   ┌──────────────────────┐
                   │Portfolio Construction│
                   └────────┬─────────────┘
                            ▼

                   ┌──────────────────────┐
                   │ Portfolio Allocation │
                   └────────┬─────────────┘
                            ▼

                   ┌─────────────────┐
                   │ Execution Plan  │
                   └────────┬────────┘
                            ▼

                   ┌─────────────────┐
                   │ Execution Queue │
                   └────────┬────────┘
                            ▼

                   ┌─────────────────┐
                   │Execution Engine │
                   └────────┬────────┘
                            ▼

                   ┌─────────────────┐
                   │ProtocolAdapters │
                   └─────────────────┘
```

---

# High-Level Components

V1 consists of:

```text
API Layer

Data Layer

Risk Engine

Trust Scoring

Liquidity Scoring

Normalization and Mapping

Policy Service

Opportunity Discovery

Opportunity Scoring

Portfolio Construction Engine

Execution Planner

Execution Queue

Execution Engine

Protocol Adapters
```

---

# Backend Principles

---

## Principle 1

Services own responsibilities.

---

## Principle 2

Engines remain deterministic.

---

## Principle 3

Execution remains isolated.

---

## Principle 4

Protocol-specific logic remains inside adapters.

---

## Principle 5

Every decision must be auditable.

---

# API Layer

Purpose:

Serve frontend requests.

---

Responsibilities:

* authentication
* portfolio queries
* policy management
* dashboard data
* execution history
* analytics

---

Responsibilities NOT Included:

* scoring
* risk calculations
* execution

---

The API should orchestrate.

Not compute.

---

# Suggested Stack

V1 Recommendation:

```text
TypeScript

Node.js

NestJS
```

---

Reasons:

* strong typing
* modularity
* mature ecosystem
* familiar tooling

---

# Service Architecture

---

# User Service

Responsible for:

```text
Wallets

Users

Profiles

Preferences
```

---

# Policy Service

Responsible for:

```text
Policy Generation

Policy Storage

Policy Versioning

Policy Validation

Policy History
```

---

# Portfolio Service

Responsible for:

```text
Portfolios

Allocations

Portfolio History

Portfolio Metadata
```

---

# Data Layer Service

Responsible for:

```text
Protocol Reads

Caching

Normalization

Historical Storage
```

---

# Risk Engine Service

Responsible for:

```text
Risk Signals

Risk Penalties

Risk Events
```

Consumes:

```text
Trust Scores

Liquidity Scores
```

Risk Engine does not calculate Trust Scores or Liquidity Scores.

---

# Trust Scoring Service

Responsible for:

```text
Trust Score Generation

Trust Score Explanations

Protocol Trust Evaluation
```

---

# Liquidity Scoring Service

Responsible for:

```text
Liquidity Score Generation

Withdrawal Accessibility Evaluation

Market Depth Signals
```

---

# Normalization and Mapping Service

Responsible for:

```text
Intent Normalization

Selected Profile

Weighted Distance Classification
```

---

# Opportunity Discovery Service

Responsible for:

```text
Opportunity Discovery

Candidate Opportunity Sets

Supported Protocol Opportunities
```

---

# Opportunity Scoring Service

Responsible for:

```text
Opportunity Ranking

Composite Scores
```

Consumes:

```text
Trust Scoring Outputs

Liquidity Scoring Outputs

Risk Penalties
```

Opportunity Scoring does not calculate Trust Scores or Liquidity Scores.

---

# Portfolio Construction Engine Service

Responsible for:

```text
Portfolio Construction

Allocation Logic

Diversification

Optimization
```

Consumes:

```text
active Portfolio Policy

opportunity rankings

eligible opportunities
```

---

# Execution Planner Service

Responsible for:

```text
Execution Plans

Rebalance Plans

Transaction Planning
```

---

# Execution Engine Service

Responsible for:

```text
Transaction Submission

Transaction Monitoring

Execution Status
```

---

# Scheduler Service

Purpose:

Trigger evaluations.

---

Examples:

```text
00:00 UTC

08:00 UTC

16:00 UTC
```

---

Responsibilities:

```text
Review Scheduling

Execution Scheduling

Maintenance Jobs
```

---

# Queue System

Purpose:

Decouple planning from execution.

---

Recommended:

```text
Redis

BullMQ
```

---

Queue Types

---

Portfolio Queue

---

Risk Queue

---

Execution Queue

---

Notification Queue

---

Benefits:

* retries
* isolation
* scalability

---

# Database Layer

V1 Recommendation:

```text
PostgreSQL
```

---

Reasons:

* maturity
* reliability
* analytics support
* transactional integrity

---

# Primary Entities

---

User

---

Portfolio

---

Policy

---

Execution

---

Risk Event

---

Protocol Snapshot

---

Portfolio Snapshot

---

# Suggested Relationships

```text
User
 ↓
Portfolio
 ↓
Policy
 ↓
Execution
```

---

# Caching Layer

Recommendation:

```text
Redis
```

---

Purpose:

* protocol metrics
* APY data
* TVL data
* temporary state

---

# Observability Stack

V1 Recommendation:

```text
Structured Logging

Metrics

Alerts
```

---

Examples:

```text
Execution Failures

Queue Backlogs

RPC Failures

Risk Events
```

---

# Logging Requirements

Every major action should be logged.

---

Examples:

```text
Policy Created

Policy Modified

Portfolio Rebalanced

Execution Submitted

Execution Failed
```

---

# Auditability

Auditability is a first-class requirement.

---

Every decision should be traceable.

---

Example

```text
Execution
      ↓
Execution Plan
      ↓
Portfolio Decision
      ↓
Policy
```

---

Users should always understand:

```text
What happened

Why it happened
```

---

# Protocol Adapter Layer

Adapters should be deployed as independent modules.

---

Example

```text
Morpho Adapter

Aave Adapter

Moonwell Adapter

Aerodrome Adapter
```

---

Benefits:

* isolation
* independent testing
* easier upgrades

---

# RPC Strategy

Use multiple RPC providers.

Never depend on a single provider.

---

Example

```text
Primary RPC

Secondary RPC

Fallback RPC
```

---

Purpose:

* resilience
* uptime
* reliability

---

# Notification System

V1 Support:

```text
In-App Notifications

Email
```

---

Future:

```text
Telegram

Discord

Push Notifications
```

---

# Security Requirements

---

Least Privilege

---

Secret Management

---

Audit Logging

---

Execution Validation

---

Permission Enforcement

---

Mandatory.

---

# Deployment Strategy

V1 Recommendation:

```text
Docker
```

---

Environment Separation:

```text
Development

Staging

Production
```

---

Mandatory.

---

# Cost Optimization

The backend should prioritize:

```text
Caching

Batch Processing

Event-Driven Updates
```

before:

```text
Large Infrastructure
```

---

V1 should remain operationally lean.

---

# Future Architecture

Potential V2:

```text
Microservices

Event Bus

Dedicated Indexers
```

---

Potential V3:

```text
Decentralized Executors

Keeper Networks

Cross-Chain Infrastructure
```

---

# Non-Goals

The backend does not:

* hold user funds
* become a custodian
* bypass policy restrictions

---

# Success Criteria

The backend succeeds when:

* decisions remain deterministic
* services remain modular
* infrastructure costs remain low
* scaling remains straightforward
* execution remains reliable

---

# Failure Criteria

The backend fails when:

* services become tightly coupled
* execution becomes opaque
* protocol integrations require large refactors
* infrastructure costs scale faster than user growth

---

# Architectural Principle

Laminar should be built as a collection of deterministic, auditable services connected through explicit interfaces.

Every component should be replaceable.

Every decision should be explainable.

Every action should be traceable.
