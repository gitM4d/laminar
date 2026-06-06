# Configuration Registry

Version: Draft 1

Status: Core Infrastructure

Priority: High

---

# Purpose

This document defines how Laminar manages configurable parameters.

The Configuration Registry is the canonical home for configurable system parameters.

The Configuration Registry exists to:

* centralize system configuration
* avoid hardcoded business rules
* simplify future adjustments
* improve auditability
* reduce deployment risk

---

# Core Principle

Business behavior should be driven by configuration.

Not by code changes.

Business logic remains defined in the canonical domain documents.

The Configuration Registry stores values consumed by that logic.

It does not redefine formulas, scoring models, profile classification, or policy semantics.

---

Incorrect

```typescript
if (scoreImprovement > 10) {
  rebalance()
}
```

---

Correct

```typescript
if (
  scoreImprovement >
  config.rebalanceThreshold
) {
  rebalance()
}
```

---

# Registry Categories

Laminar V1 configuration is divided into:

```text id="k8g5xt"
Portfolio Configuration

Opportunity Scoring Configuration

Trust Scoring Configuration

Liquidity Scoring Configuration

Normalization and Mapping Configuration

Portfolio Policy Defaults

Risk Configuration

Execution Configuration

Scheduler Configuration

Fee Configuration

Protocol Configuration
```

---

# Configuration Hierarchy

Priority Order

```text id="ny0e0k"
System Configuration
        ↓
Policy Configuration
        ↓
Portfolio Configuration
```

---

Higher levels provide defaults.

Lower levels may override when allowed.

---

# Architectural Constants

Some values are architectural constants, not runtime configuration.

They are documented here to prevent accidental reconfiguration.

---

Not Configurable:

```text
User Intent Dimensions:
Risk
Liquidity
Return Preference

Portfolio Profiles:
Conservative
Balanced
Yield Focused

Core Pipeline:
User Intent
→ Normalization and Mapping
→ Selected Profile
→ Portfolio Policy
→ Opportunity Discovery
→ Opportunity Scoring
→ Portfolio Construction
→ Portfolio Allocation
→ Execution
```

---

Canonical sources:

```text
30-normalization-and-mapping.md
31-policy-model.md
```

---

# System Configuration

Applies globally.

Examples:

```text id="l2z5l5"
Supported Assets

Supported Protocols

Fee Limits

Risk Limits
```

---

Changes affect all portfolios.

---

# Policy Configuration

Generated after Normalization and Mapping selects a profile.

Examples:

```text id="2r5zxt"
Review Frequency

Risk Limits

Liquidity Requirements

Allocation Constraints
```

---

Applies to all portfolios using the same policy.

---

# Portfolio Configuration

Portfolio-specific values.

Examples:

```text id="d4j6gc"
Gas Reserve

Custom Review Window

Emergency Pause
```

---

Used sparingly.

---

# Portfolio Construction Configuration

Controls allocation behavior.

---

Default Exposure Models

Conservative

```text id="3p0y5n"
Lending         90%

Liquidity       10%
```

---

Balanced

```text id="y4u3d9"
Lending         75%

Yield Enhancement 25%
```

---

Yield Focused

```text id="7j6jxb"
Lending         60%

Yield Enhancement 40%
```

---

Configurable.

Not hardcoded.

---

# Allocation Constraints

Default values are consumed by Portfolio Policy.

Canonical source:

```text
31-policy-model.md
```

---

Maximum Protocol Exposure

```text id="0xy5sl"
50%
```

---

Maximum Stablecoin Exposure

```text id="d4x8hl"
80%
```

---

Maximum Active Allocations

```text id="g9v0or"
3
```

---

# Portfolio Policy Defaults

Controls default values used when generating Portfolio Policy.

This section stores configurable defaults only.

It does not define the Policy Model.

Canonical source:

```text
31-policy-model.md
```

---

Configurable Defaults:

```yaml
allocationConstraints:
  maxActiveAllocations: 3
  maxProtocolExposure: 50%
  maxStablecoinExposure: 80%
  minAllocationSize: 10%
  rebalanceThreshold: 10%
  gasReserve:
    min: 5 USD
```

---

Architectural Constants:

```text
Portfolio Policy sections:
selectedProfile
riskLimits
liquidityRequirements
targetExposure
allocationConstraints
```

These sections are not configurable.

Only values inside the sections may be configured.

---

# Normalization and Mapping Configuration

Controls parameters consumed by Normalization and Mapping.

Canonical source:

```text
30-normalization-and-mapping.md
```

---

Configurable Values:

```text
Input normalization boundaries
Ideal Profile Vectors
Profile Weights
Classification tie-break rules
Selected Profile display labels
```

---

Architectural Constants:

```text
Input dimensions:
Risk
Liquidity
Return Preference

Profile classification output:
Selected Profile
```

The classification model is defined in the canonical Normalization and Mapping document.

The registry stores the configured values used by that model.

---

# Trust Scoring Configuration

Controls parameters consumed by Trust Scoring.

Canonical source:

```text
28-trust-scoring.md
```

---

Configurable Values:

```text
Component weights
Eligibility thresholds
Decay curves
Auditor classifications
Chain Adjustment defaults
```

---

Default Component Weights:

```text
Security Incidents  35%
Audits              30%
Protocol Age        15%
TVL                 10%
```

---

Default Chain Adjustment:

```text
0
```

In the Base-only V1 deployment, Chain Adjustment defaults to 0.

---

Architectural Constants:

```text
Trust Scoring owns Trust Score generation.
Trust Score scale is 0-100.
Chain Adjustment is post-processing.
```

The registry does not define the Trust Score formula.

---

# Liquidity Scoring Configuration

Controls parameters consumed by Liquidity Scoring.

Canonical source:

```text
29-liquidity-scoring.md
```

---

Configurable Values:

```text
Component weights
Liquidity caps
Eligibility thresholds
Withdrawal time buckets
Redemption reliability thresholds
Exit slippage buckets
Market depth classifications
```

---

Default Component Weights:

```text
Withdrawal Speed        35%
Withdrawal Constraints  30%
Redemption Reliability  20%
Exit Slippage           15%
```

---

Architectural Constants:

```text
Liquidity Scoring owns Liquidity Score generation.
Liquidity Score scale is 0-100.
Liquidity Score is an opportunity attribute.
```

The registry does not define Liquidity Scoring logic.

---

# Opportunity Scoring Configuration

Controls opportunity ranking parameters.

---

Canonical source:

```text
05-scoring-engine.md
```

---

Configurable Weights

APY Weight

Default

```text id="k6v1v3"
1.0
```

---

Liquidity Weight

Default

```text id="y3j7wt"
1.0
```

---

Trust Weight

Default

```text id="0p6cbm"
1.0
```

---

Risk Weight

Default

```text id="c5f7gv"
1.0
```

---

Gas Weight

Default

```text id="q2v8ea"
1.0
```

---

Future versions may tune these values.

---

# Risk Configuration

Controls risk evaluation.

Risk Configuration consumes outputs from Trust Scoring and Liquidity Scoring.

It does not configure Trust Score or Liquidity Score generation.

---

Stablecoin Depeg

Warning

```text id="n4z8jz"
2%
```

---

High Risk

```text id="w4s1t6"
5%
```

---

Critical

```text id="y7w0ux"
10%
```

---

Consumed Liquidity Signal Change

Warning

```text id="r2l4m8"
20%
```

---

Critical

```text id="d7n1qt"
50%
```

---

Consumed Trust Signal Change

Warning

```text id="a8g3yh"
25%
```

---

Critical

```text id="u5e6wp"
50%
```

---

Review thresholds are configurable.

---

# Execution Configuration

Controls execution behavior.

---

Minimum Allocation Change

Default

```text id="n7j2hm"
5%
```

---

Reason

Avoid excessive churn.

---

Rebalance Threshold

Default

```text id="q4f0nx"
10%
```

---

Meaning

Expected score improvement must exceed:

```text id="q7v6zy"
10%
```

before execution occurs.

---

# Gas Reserve Configuration

Default

```text id="m6z9rd"
1%
```

---

Minimum

```text id="s2v7pk"
0.5%
```

---

Maximum

```text id="g5t4fh"
5%
```

---

Purpose

```text id="m9r1wc"
Rebalances

Emergency Actions

Withdrawals
```

---

# Scheduler Configuration

Supported Windows

```text id="z7m2lw"
8h

24h

48h

72h
```

---

Execution Slots

```text id="v4x9pu"
00:00 UTC

08:00 UTC

16:00 UTC
```

---

Hard Triggers

Always override schedules.

---

# Emergency Trigger Configuration

Emergency triggers execute immediately.

---

Examples

```text id="w7f3dr"
Protocol Pause

Critical Depeg

Protocol Exploit

Critical Liquidity Loss
```

---

Bypass scheduler.

---

# Fee Configuration

Default Management Fee

```text id="h6m5jz"
0.50%
```

annualized.

---

Maximum Allowed

```text id="b8n3qw"
1.00%
```

annualized.

---

Collection Frequency

```text id="f1y7gp"
Review Event

Withdrawal Event
```

---

# Protocol Configuration

Every protocol maintains metadata.

Protocol configuration stores configurable metadata.

It does not store calculated Trust Scores or Liquidity Scores as configuration.

---

Example

Morpho

```json
{
  "enabled": true,
  "executionEnabled": true,
  "trustScoringEnabled": true,
  "liquidityScoringEnabled": true,
  "maxExposure": 0.50
}
```

---

Example

Aerodrome

```json
{
  "enabled": true,
  "executionEnabled": true,
  "trustScoringEnabled": true,
  "liquidityScoringEnabled": true,
  "maxExposure": 0.30
}
```

---

# Protocol States

Allowed States

```text id="g2x6wp"
ACTIVE

READ_ONLY

PAUSED

DEPRECATED
```

---

ACTIVE

```text id="h3v0cy"
Read + Execute
```

---

READ_ONLY

```text id="m4s9tr"
Read Only
```

---

PAUSED

```text id="v7r2fy"
No Reads
No Execution
```

---

DEPRECATED

```text id="u6p5zn"
Existing Positions Only
```

---

# Configuration Storage

Configurations are stored in:

```text id="y2d7aw"
Database
```

---

Not source code.

---

Reason

Operational flexibility.

---

# Configuration Versioning

Every configuration change creates:

```text id="t9m8qx"
New Version
```

---

Previous versions remain accessible.

---

Required Fields

```text id="n8j5ze"
Version

Timestamp

Author

Reason
```

---

# Auditability

Every configuration change generates:

```text id="e3v7lc"
ConfigurationChanged Event
```

---

Stored permanently.

---

# Change Management

V1 Changes Allowed By

```text id="j6q4vx"
Protocol Operators
```

---

Future versions may support governance.

---

Not part of V1.

---

# Safety Limits

Certain values cannot exceed hardcoded safety caps.

---

Examples

Management Fee

```text id="z2t8wu"
≤ 1.00%
```

---

Protocol Exposure

```text id="j4w6kn"
≤ 50%
```

---

Active Allocations

```text id="s5p2ef"
≤ 3
```

---

These limits protect users.

---

# Explainability Requirement

When a configuration affects a decision:

Laminar must expose:

```text id="u4f9ga"
Configuration Name

Value

Version
```

used during evaluation.

---

Reason

Reproducibility.

---

# Future Evolution

Future versions may add:

```text id="x9r2vd"
Market Regimes

AI Weight Adjustments

Dynamic Risk Thresholds
```

---

Not part of V1.

---

# Architectural Principle

Business logic consumes configuration.

Business logic does not define configuration.

The Configuration Registry is the single source of truth for all operational parameters in Laminar.
