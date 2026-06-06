# MVP Scope Boundaries

Version: Draft 1

Status: Frozen Scope Definition for V1

---

# Purpose

This document defines exactly what is included and excluded from Laminar V1.

Its purpose is to prevent:

* scope creep
* architectural drift
* premature optimization
* unnecessary complexity

This document takes precedence over feature requests that are not explicitly included in the V1 scope.

---

# Core Principle

Laminar V1 is not attempting to become:

* Yearn
* Enzyme
* Morpho
* Beefy
* DeBank
* Zapper

Laminar V1 exists to validate one hypothesis:

```text
Users want intent-based portfolio management
without manually monitoring DeFi opportunities.
```

Everything that does not contribute to validating that hypothesis should be deferred.

---

# V1 Product Definition

Laminar V1 is:

```text
An intent-based stablecoin portfolio manager
for Base.
```

---

Users define:

```text
Risk

Liquidity

Return Preference
```

Laminar determines:

```text
Portfolio Construction

Capital Allocation

Rebalancing

Risk Monitoring
```

---

# V1 Supported Network

Included

```text
Base
```

---

Excluded

```text
Ethereum

Arbitrum

Optimism

Polygon

BNB Chain

Avalanche

Solana
```

---

Reason

Focus.

Single-chain execution dramatically reduces complexity.

---

# V1 Supported Assets

Included

```text
USDC

EURC

DAI
```

---

Potentially Included Later

```text
USDbC derivatives

sUSDe

USDS

USD+
```

---

Excluded

```text
ETH

BTC

Memecoins

Governance Tokens

Volatile Assets
```

---

Reason

Stablecoins simplify:

* risk management
* scoring
* portfolio construction
* user understanding

---

# V1 Supported Protocols (Execution)

Laminar may allocate capital to:

```text
Morpho

Aave

Moonwell

Aerodrome
```

---

Execution adapters are required.

---

Only these protocols may receive capital.

---

# V1 Supported Protocols (Read Only)

Laminar may analyze:

```text
Any protocol with publicly available data
```

Examples:

```text
Compound

Spark

Fluid

Seamless

ExtraFi

Euler

Others
```

---

Read-only support does not imply execution support.

---

# Portfolio Model

Included

```text
Multiple portfolios per user
```

Example

```text
Portfolio A

Conservative Stable Yield
```

```text
Portfolio B

High Liquidity Treasury
```

---

Excluded

```text
Sub-portfolios

Nested portfolios
```

---

# Intent Model

Included

```text
Risk

Liquidity

Return Preference
```

---

Excluded

```text
Custom strategies

Manual protocol selection

Custom portfolio construction rules

User-written automation
```

---

Reason

Laminar owns portfolio construction.

---

# Rebalancing

Included

Scheduled Reviews

```text
8h

24h

48h

72h
```

Subject to eligibility tiers.

---

Hard Triggers

```text
Protocol Risk Event

Stablecoin Risk Event

Emergency Event
```

---

Excluded

```text
Per-minute rebalancing

High-frequency optimization

MEV-sensitive execution
```

---

# Gas Model

Included

```text
User-funded gas reserve
```

---

Laminar maintains:

```text
Operational reserve
```

inside each portfolio.

---

Excluded

```text
Gas sponsorship

Meta-transactions

Gas abstraction
```

---

Reason

Too much complexity for V1.

---

# Automation

Included

```text
Allocation

Rebalancing

Risk Monitoring

Emergency Exits
```

---

Excluded

```text
Autonomous strategy discovery

Autonomous leverage

Autonomous borrowing

Cross-chain execution
```

---

# AI Features

Included

```text
None
```

---

Important

V1 is deterministic-first.

---

Trust Scoring

```text
Deterministic
```

---

Liquidity Scoring

```text
Deterministic
```

---

Opportunity Scoring

```text
Deterministic
```

---

Portfolio Construction

```text
Deterministic
```

---

Risk Engine

```text
Rule-Based
```

---

Excluded

```text
LLMs

AI Agents

Autonomous AI Decisions

Predictive Models
```

---

Reason

Trust before intelligence.

---

# Explainability Layer

Included

```text
Why is my capital allocated this way?

Why did Laminar rebalance?

Why did Laminar exit a position?
```

---

Endpoints

```text
GET /why

GET /executions/:id/why
```

---

This is a core V1 differentiator.

---

# Smart Accounts

Included

```text
Safe Smart Accounts
```

Per Portfolio.

---

Excluded

```text
Custom Account Abstraction

Custom Smart Wallets
```

---

Reason

Safe is battle-tested.

---

# Notifications

Included

```text
In-App Notifications
```

---

Examples

```text
Portfolio Activated

Rebalance Completed

Risk Event Detected

Emergency Triggered
```

---

Excluded

```text
SMS

Push Notifications

Telegram Bots

Discord Alerts
```

---

# Risk Engine

Included

```text
Protocol Risk

Liquidity Risk

Stablecoin Risk
```

---

Excluded

```text
Credit Risk

Counterparty Credit Models

Macro Analysis
```

---

# Analytics

Included

```text
Portfolio Value

Estimated APY

Allocation History

Execution History
```

---

Excluded

```text
Tax Reporting

PnL Attribution Engine

Advanced Performance Analytics
```

---

# Frontend

Included

```text
Landing Page

Portfolio Dashboard

Portfolio Detail

Activity Timeline

Intent Wizard

Policy Review
```

---

Excluded

```text
Mobile App

Native Desktop App
```

---

Responsive Web Only.

---

# Admin Tools

Included

Internal Admin Interface

```text
Protocol Status

Risk Events

Scheduler Monitoring
```

---

Excluded

```text
Public Admin APIs
```

---

# Governance

Included

```text
None
```

---

Excluded

```text
DAO

Voting

Delegation

Governance Token Utility
```

---

Reason

No token before product-market fit.

---

# Token

Included

```text
No Token
```

---

Explicitly Excluded

```text
LMNR

LAMINAR

Governance Token

Rewards Token

Yield Token
```

---

Reason

Token launch is a post-PMF decision.

---

# Revenue Model

Included

```text
Management Fee

Performance Fee
```

Final percentages TBD.

---

Excluded

```text
Token Emissions

Liquidity Mining

Governance Incentives
```

---

# Multi-Chain

Included

```text
None
```

---

Excluded

```text
Cross-chain execution

Cross-chain portfolios

Cross-chain rebalancing
```

---

Reason

Single-chain focus.

---

# V1 Success Criteria

V1 succeeds if:

```text
Users create portfolios

Users fund portfolios

Users keep capital deployed

Users trust automation

Users understand decisions
```

---

V1 success is not measured by:

```text
TVL

Token Price

DAO Participation

Number of Chains
```

---

# Explicit Non-Goals

Laminar V1 is NOT:

```text
An AI Agent

A Yield Farm

A Leverage Protocol

A Lending Protocol

A Stablecoin

A DAO

A Cross-Chain Router
```

---

Laminar V1 is:

```text
An Intent-Based Portfolio Manager
for Stablecoin Capital on Base.
```

---

# Scope Freeze Rule

Any feature request must answer:

```text
Does this help validate
intent-based portfolio management?
```

If the answer is:

```text
No
```

the feature belongs to V2 or later.

---

# Architectural Principle

A smaller product shipped is more valuable than a larger product imagined.

Laminar V1 should optimize for:

* clarity
* trust
* explainability
* execution

not feature count.
