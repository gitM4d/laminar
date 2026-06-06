# System Architecture

Version: Draft 1

---

# Purpose

This document defines the high-level architecture of Laminar V1.

The objective is to establish clear boundaries between components, responsibilities, and data flows.

This document intentionally avoids implementation details that may change over time.

It focuses on architectural responsibilities.

---

# Architectural Principles

Laminar follows the following principles:

* Intent-centric
* Non-custodial
* Modular
* Protocol-agnostic
* Explainable
* Automation-first
* Risk-aware
* Extensible

---

# High-Level Architecture

```text
User
 │
 ▼
Frontend
 │
 ▼
Laminar Backend
 │
 ├── Intent Engine
 ├── Normalization and Mapping
 ├── Policy Service
 ├── Opportunity Discovery
 ├── Trust Scoring
 ├── Liquidity Scoring
 ├── Risk Engine
 ├── Opportunity Scoring
 ├── Portfolio Construction Engine
 ├── Portfolio Allocation
 ├── Rebalance Planner
 ├── Data Layer
 ├── Execution Planner
 └── Execution Queue
 │
 ▼
Smart Account (Safe)
 │
 ├── Aave
 ├── Morpho
 ├── Moonwell
 └── Aerodrome
```

---

# Canonical Pipeline

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
```

Opportunity Scoring produces opportunity rankings.

Portfolio Construction produces Portfolio Allocation.

---

# Architectural Separation

Laminar is divided into two domains:

## Offchain Domain

Responsible for:

* intelligence
* planning
* optimization
* monitoring
* scoring
* risk evaluation

---

## Onchain Domain

Responsible for:

* asset ownership
* permissions
* execution
* validation
* accounting

---

# Core Components

---

# Frontend

Responsibilities:

* onboarding
* portfolio creation
* permission visualization
* portfolio monitoring
* analytics
* rebalance history
* risk notifications

The frontend must remain explainable.

Users should always understand:

* current allocations
* target allocations
* pending actions
* active permissions

---

# Smart Accounts

V1 uses Safe-based smart accounts.

Each user receives an isolated smart account.

Assets remain owned by the user.

Laminar never pools user funds.

---

# Intent Engine

Purpose:

Capture user objectives.

Inputs:

* onboarding responses
* user preferences
* slider adjustments

Outputs:

* user intent
* onboarding responses
* slider adjustments

The Intent Engine does not select protocols.

It only defines objectives.

---

# Normalization and Mapping

Purpose:

Convert user intent into normalized construction inputs.

Inputs:

* Risk
* Liquidity
* Return Preference

Outputs:

* normalized intent values
* Selected Profile

---

# Policy Service

Purpose:

Generate and version Portfolio Policy.

Inputs:

* Selected Profile
* normalized intent

Outputs:

* active Portfolio Policy
* policy version

---

# Opportunity Discovery

Purpose:

Discover candidate opportunities.

Inputs:

* Portfolio Policy
* protocol data

Outputs:

* candidate opportunity set

---

# Trust Scoring

Purpose:

Generate Trust Scores for eligible opportunities.

Inputs:

* protocol data
* trust scoring configuration

Outputs:

* normalizedTrustScore
* Trust Score explanation

Trust Scoring owns Trust Score generation.

---

# Liquidity Scoring

Purpose:

Generate Liquidity Scores for eligible opportunities.

Inputs:

* opportunity liquidity data
* liquidity scoring configuration

Outputs:

* normalizedLiquidityScore
* Liquidity Score explanation

Liquidity Scoring owns Liquidity Score generation.

---

# Risk Engine

Purpose:

Continuously evaluate risk conditions.

Responsibilities:

* protocol monitoring
* stablecoin monitoring
* liquidity signal consumption
* protocol health monitoring

Risk categories:

## Hard Risk

Examples:

* confirmed exploit
* confirmed insolvency
* severe depeg
* protocol shutdown

---

## Soft Risk

Examples:

* declining liquidity
* APY deterioration
* TVL decline
* governance concerns

Outputs:

* risk events
* severity levels
* recommended actions
* risk penalties

---

# Opportunity Scoring

Purpose:

Rank available opportunities.

Inputs:

* Portfolio Policy
* APY
* liquidity
* utilization
* normalizedTrustScore
* normalizedLiquidityScore
* risk penalty
* gas costs

Outputs:

* opportunity rankings

Example conceptual formula:

score =
(APY × normalizedLiquidityScore × normalizedTrustScore)
--------------------------------------

(risk_penalty + gas_penalty)

The formula is expected to evolve.

The architecture should support replacing scoring models without affecting other components.

---

# Portfolio Construction Engine

Purpose:

Generate portfolio allocations.

Inputs:

* active Portfolio Policy
* opportunity rankings
* eligible opportunities
* operational constraints

Outputs:

* target allocations
* protocol weights
* portfolio composition

The Portfolio Construction Engine decides:

* where capital should be allocated
* how much capital should be allocated

---

# Portfolio Allocation

Purpose:

Represent the final allocation output produced by Portfolio Construction.

Inputs:

* Portfolio Policy
* opportunity rankings
* construction constraints

Outputs:

* position list
* allocation percentages
* expected portfolio metrics

Portfolio Allocation is consumed by execution planning.

---

# Data Layer

Purpose:

Provide normalized protocol data.

Data Sources:

## Direct Protocol Reads

Primary source.

Examples:

* Aave
* Morpho
* Moonwell
* Aerodrome

---

## Cached Metrics

Local storage of protocol metrics.

Freshness depends on data class.

---

## External Providers

Used only for:

* enrichment
* analytics
* validation

External APIs must never become critical dependencies.

---

# Data Classification

## Class A

Critical risk data.

Requirements:

* near real-time

Examples:

* depeg
* exploit
* insolvency

---

## Class B

Operational data.

Requirements:

* 5–30 minute freshness

Examples:

* APY
* liquidity
* utilization

---

## Class C

Analytics data.

Requirements:

* hourly or daily freshness

Examples:

* historical metrics
* rankings
* charts

---

# Protocol Adapter Layer

Laminar never interacts directly with protocols.

All integrations occur through adapters.

Example:

```text
Portfolio Construction Engine
       │
       ▼
Protocol Adapter Interface
       │
 ┌─────┼─────┬─────┐
 ▼     ▼     ▼     ▼

Aave Morpho Moonwell Aerodrome
```

Each adapter exposes a standardized interface.

Responsibilities:

* deposits
* withdrawals
* metric retrieval
* gas estimation
* risk metadata

---

# Rebalance Planner

Purpose:

Determine when allocations should change.

Inputs:

* current portfolio
* target portfolio
* protocol data
* risk data

Outputs:

* rebalance plans

A rebalance plan is not an execution.

It is a proposal.

---

# Execution Planner

Purpose:

Convert rebalance plans into executable actions.

Example:

```text
Withdraw:
20% USDC from Moonwell

Deposit:
20% USDC into Morpho
```

Outputs:

* execution jobs

---

# Execution Queue

Purpose:

Manage pending execution jobs.

Responsibilities:

* scheduling
* prioritization
* retries
* batching opportunities

The queue separates planning from execution.

---

# Execution Engine

Purpose:

Execute approved actions.

The execution engine receives jobs from the queue and submits transactions.

The engine must remain abstracted from the execution provider.

---

# Executor Layer

V1:

Laminar-managed executors.

Future:

* Gelato integration
* Keeper networks
* Decentralized executors

The rest of the system should not depend on the executor implementation.

---

# Rebalance Scheduling

Global execution windows:

* 00:00 UTC
* 08:00 UTC
* 16:00 UTC

Users select participation frequency.

Examples:

* every 8h
* every 24h
* every 48h
* every 72h

Execution only occurs within approved windows.

---

# Emergency Actions

Hard Risk Events may bypass normal scheduling.

Examples:

* exploit
* insolvency
* severe depeg

Emergency actions are executed according to the risk policy.

---

# Permission Model

Laminar operates using constrained automation.

Users pre-authorize actions within explicit boundaries.

Examples:

* allowed protocols
* allowed assets
* max slippage
* max rebalance size
* frequency limits

All executions must pass permission validation before submission.

---

# Future Evolution

The architecture must support:

* AI-driven scoring
* AI-driven allocation
* advanced risk models
* additional protocols
* additional chains
* account abstraction upgrades

without requiring a redesign of core components.

---

# Architectural Goal

Laminar should become a generalized capital orchestration layer capable of optimizing user portfolios across multiple protocols while preserving ownership, transparency, and control.
