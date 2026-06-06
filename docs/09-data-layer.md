# Data Layer

Version: Draft 1

---

# Purpose

The Data Layer is responsible for collecting, normalizing, storing, and serving data required by Laminar.

It acts as the information foundation of the protocol.

All higher-level systems depend on the quality of data provided by the Data Layer.

Examples:

* Risk Engine
* Trust Scoring
* Liquidity Scoring
* Opportunity Scoring
* Portfolio Construction Engine
* Execution Planner
* Frontend Analytics

---

# Core Philosophy

Not all data requires the same precision.

Not all data requires the same freshness.

Not all data justifies the same infrastructure cost.

Laminar intentionally adopts a tiered data strategy.

Data quality should match business requirements.

---

# Design Goals

The Data Layer should be:

* reliable
* inexpensive
* scalable
* observable
* protocol-agnostic
* resilient

---

# Architectural Principles

## Principle 1

Critical data receives priority.

---

## Principle 2

Avoid unnecessary infrastructure.

---

## Principle 3

Prefer direct protocol reads whenever possible.

---

## Principle 4

External APIs should never become critical dependencies.

---

## Principle 5

Cache aggressively when precision requirements permit.

---

# Position In Architecture

```text id="w8n0x2"
Protocols
      ↓
Protocol Adapters
      ↓
Data Layer
      ↓
Trust Scoring

Liquidity Scoring

Risk Engine

Opportunity Scoring

Portfolio Construction

Frontend
```

Downstream allocation follows the canonical pipeline:

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

---

# Data Categories

Laminar classifies data into three categories.

---

# Class A

Critical Data

---

Requirements:

```text id="z04ch9"
Near Real-Time

High Accuracy

Low Latency
```

---

Examples:

* stablecoin depeg
* exploit detection
* protocol pause
* insolvency event
* critical liquidity collapse

---

Consumers:

* Risk Engine
* Execution Engine

---

Failure Impact:

Very High

---

# Class B

Operational Data

---

Requirements:

```text id="1ld59s"
Minute-Level Freshness

Moderate Accuracy
```

---

Examples:

* APY
* TVL
* utilization
* lending rates
* pool liquidity

---

Consumers:

* Trust Scoring
* Liquidity Scoring
* Opportunity Scoring
* Portfolio Construction Engine

---

Failure Impact:

Moderate

---

# Class C

Analytical Data

---

Requirements:

```text id="84qu71"
Hourly

Daily

Historical
```

---

Examples:

* charts
* rankings
* trends
* historical analytics

---

Consumers:

* frontend
* reporting
* analytics

---

Failure Impact:

Low

---

# Data Sources

Laminar may consume data from multiple sources.

---

# Source Type 1

Direct Protocol Reads

Preferred source.

---

Examples:

```text id="gbhpkj"
Aave

Morpho

Moonwell

Aerodrome
```

---

Advantages:

* trustless
* accurate
* no API dependency

---

Disadvantages:

* more RPC load
* more engineering effort

---

# Source Type 2

Cached Protocol State

Laminar stores frequently used metrics.

---

Examples:

```text id="52nkva"
Current APY

TVL

Utilization
```

---

Advantages:

* fast
* inexpensive
* scalable

---

Disadvantages:

* not perfectly fresh

---

# Source Type 3

External Providers

Used only when justified.

---

Examples:

* market data
* historical analytics
* enrichment data

---

External providers should never be a single point of failure.

---

# Data Freshness Targets

---

Class A

Target:

```text id="3ckm71"
Seconds
```

---

Class B

Target:

```text id="4ofl5m"
5-30 Minutes
```

---

Class C

Target:

```text id="d2u4dl"
1-24 Hours
```

---

Targets may evolve.

---

# Normalization Layer

Different protocols expose different data structures.

The Data Layer standardizes them.

---

Example

Raw:

```text id="nqmqdb"
Protocol A

supplyRate
```

---

Raw:

```text id="n08h55"
Protocol B

apy
```

---

Normalized:

```typescript id="h6bh4d"
yieldRate
```

---

All downstream engines consume normalized data.

---

# Data Models

Examples:

---

Protocol Metrics

```typescript id="umoxn9"
ProtocolMetrics {

  protocolId: string

  tvl: number

  apy: number

  utilization: number

  liquidity: number

}
```

---

Asset Metrics

```typescript id="s0x9hn"
AssetMetrics {

  asset: string

  price: number

  liquidity: number

  volatility: number

}
```

---

Scoring Output Metrics

Normalized outputs consumed by Opportunity Scoring.

These fields are not user intent values.

```typescript id="pxgjjk"
ScoringOutputMetrics {

  protocolId: string

  normalizedTrustScore: number

  normalizedLiquidityScore: number

  riskPenalty: number

}
```

---

# Storage Strategy

Laminar uses a hybrid approach.

---

Real-Time State

Short-lived cache.

Purpose:

Serve operational decisions.

---

Historical State

Persistent storage.

Purpose:

Analytics.

Reporting.

Backtesting.

---

# Cache Strategy

Cache aggressively.

Invalidate intentionally.

---

Examples

---

APY

```text id="zn5ypi"
15 minutes
```

---

TVL

```text id="m3v4x2"
15 minutes
```

---

Protocol Metadata

```text id="n0mpkx"
24 hours
```

---

Actual values remain configurable.

---

# RPC Strategy

RPC cost management is critical.

---

Preferred Model

```text id="6e9vki"
Read Once

Cache

Reuse Many Times
```

---

Avoid

```text id="o3qz14"
Repeated Reads

Per User

Per Request
```

---

# Event-Driven Updates

Where possible:

Prefer events over polling.

---

Example

```text id="6a3i0x"
Protocol Event
        ↓
Data Update
        ↓
Cache Refresh
```

---

Benefits:

* lower cost
* faster updates
* improved scalability

---

# Failure Handling

The Data Layer must tolerate failures.

---

Examples:

```text id="wwpdwv"
RPC Failure

API Failure

Protocol Timeout
```

---

Fallback mechanisms should exist whenever practical.

---

# Data Quality Monitoring

The system should monitor:

* stale data
* missing data
* inconsistent data
* delayed updates

---

Data quality metrics should be observable.

---

# Historical Data

V1 should store:

* portfolio history
* execution history
* risk history
* allocation history

---

Optional:

* protocol metric history

depending on storage costs.

---

# Cost Optimization Strategy

The Data Layer should minimize operational costs.

---

Preferred Order

```text id="5mpgl0"
Direct Reads
        ↓
Cache
        ↓
External APIs
```

---

Not:

```text id="nmgv0d"
External APIs First
```

---

# Future Enhancements

Potential V2:

* protocol event indexing
* custom indexers
* protocol forecasting

---

Potential V3:

* predictive analytics
* anomaly detection
* AI-assisted risk signals

---

# Non-Goals

The Data Layer does not:

* evaluate risk
* construct portfolios
* score opportunities
* execute transactions

---

# Success Criteria

The Data Layer succeeds when:

* data remains reliable
* infrastructure costs remain low
* freshness matches business needs
* downstream systems receive consistent information

---

# Failure Criteria

The Data Layer fails when:

* critical data becomes stale
* infrastructure costs scale faster than users
* external APIs become mandatory
* protocol integrations become difficult to maintain

---

# Architectural Principle

The Data Layer exists to provide the right data at the right cost with the right level of freshness.

Perfect precision is not always necessary.

Operational efficiency is a feature.

Data quality should be proportional to business value.
