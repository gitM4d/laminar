# Trust Scoring

## Purpose

The Trust Score measures:

> Capital Preservation Confidence

Trust Score is NOT intended to measure:

- popularity
- protocol growth
- marketing strength
- token performance
- APY attractiveness

Trust Score exists to answer a single question:

> How confident is Laminar that user capital can be preserved within a protocol deployment?

The Trust Score is one of the primary inputs used by:

- Asset Universe Selection
- Portfolio Construction
- Rebalancing Decisions
- Portfolio Recommendations

---

# Core Principles

## Evidence-Based Trust

Trust must be based on observable evidence.

Laminar does not evaluate:

- founder reputation
- social media influence
- venture backing
- market narratives

Laminar evaluates:

- security history
- audits
- protocol maturity
- capital confidence
- deployment quality

---

## Explainability

Trust Scores must be explainable.

Users should never receive a score without context.

Example:

Trust Score: 92

Why?

- Long operational history
- Multiple Tier-1 audits
- No recent security incidents
- Strong capital confidence
- High-quality deployment environment

Laminar favors explainable scoring over black-box scoring.

---

## Trust Recovery

Trust is not permanent.

Trust can increase.

Trust can decrease.

Protocols that suffer incidents may recover trust over time.

Trust recovery is determined through:

- incident severity
- elapsed time
- subsequent operational performance

---

# Trust Architecture

Trust Score consists of two layers.

```text
Final Trust Score
=
Protocol Trust Score
+
Chain Adjustment
```

---

## Protocol Trust Score

Measures protocol-level confidence.

Examples:

- audit history
- protocol age
- security incidents
- protocol TVL

Protocol Trust is shared across all deployments.

Example:

```text
Aave Protocol Trust = 95
```

---

## Chain Adjustment

Measures deployment-specific confidence.

In the Base-only V1 deployment, Chain Adjustment defaults to 0.

Examples:

- chain maturity
- chain security assumptions
- ecosystem quality
- operational stability

Example:

```text
Aave Ethereum = 95 + 2 = 97

Aave Base = 95 + 0 = 95

Aave Polygon = 95 - 2 = 93
```

---

# Trust Components

## Security Incidents

Weight:

```text
35%
```

Security incidents are the most important Trust Score component.

Security incidents represent direct evidence regarding capital preservation.

---

### Severity Levels

#### Minor

Examples:

- vulnerability discovered before exploitation
- low-impact bug

Penalty:

```text
-5
```

---

#### Moderate

Examples:

- temporary operational impact
- limited user exposure

Penalty:

```text
-15
```

---

#### Major

Examples:

- meaningful financial impact
- partial capital loss

Penalty:

```text
-35
```

---

#### Critical

Examples:

- major capital impairment
- significant user losses

Penalty:

```text
-60
```

---

#### Catastrophic

Examples:

- large-scale capital loss
- protocol collapse
- trust-destroying exploit

Penalty:

```text
-100
```

---

## Time Decay

Incident penalties decay over time.

Laminar uses:

```text
Severity-Dependent Decay
```

The larger the incident, the slower trust recovers.

Conceptually:

```text
Minor
Recovery ≈ 3 years

Moderate
Recovery ≈ 4 years

Major
Recovery ≈ 5 years

Critical
Recovery ≈ 6 years

Catastrophic
Recovery ≈ 8-10 years
```

Exact decay curves are configurable.

See:

```text
26-configuration-registry.md
```

---

## Audits

Weight:

```text
30%
```

Audit quality matters more than audit quantity.

---

### Audit Philosophy

```text
Audit Quality
>
Audit Quantity
```

Laminar uses diminishing returns.

Multiple audits improve confidence.

However:

```text
10 audits
≠
10x trust
```

---

### Auditor Tiers

#### Tier 1

Examples:

- Trail of Bits
- OpenZeppelin
- Spearbit
- Halborn
- Certora

Highest trust contribution.

---

#### Tier 2

Recognized firms with established industry reputation.

Meaningful trust contribution.

---

#### Tier 3

Emerging or lower-reputation audit providers.

Limited trust contribution.

---

### Diminishing Returns

Example:

```text
1 Tier-1 Audit
```

may contribute more confidence than:

```text
5 Tier-3 Audits
```

Exact weights are configurable.

---

## Protocol Age

Weight:

```text
15%
```

Laminar uses a capped Lindy Effect.

---

### Philosophy

Long-term survival provides evidence of resilience.

However:

```text
10 years
```

should not automatically score twice as high as:

```text
5 years
```

---

### Conceptual Age Curve

```text
< 6 months
Strong penalty

6-12 months
Moderate penalty

1-2 years
Neutral

2-4 years
Positive

4+ years
Maximum age contribution
```

Exact values are configurable.

---

## TVL

Weight:

```text
10%
```

TVL contributes as a secondary confidence signal.

TVL does NOT dominate Trust Score.

---

### Philosophy

TVL may indicate:

- market confidence
- adoption
- capital participation

TVL does NOT guarantee:

- security
- capital preservation

Therefore:

```text
TVL influences Trust
but never dominates Trust.
```

---

These components produce:

```text
Protocol Trust Score
```

Chain Adjustment is then applied as a separate post-processing adjustment.

---

# Chain Adjustment

Chain Adjustment captures deployment-specific differences.

Examples:

- Ethereum
- Base
- Arbitrum
- Optimism
- Polygon

---

## Purpose

Protocol quality alone is insufficient.

Capital is ultimately deployed on a specific chain.

Laminar evaluates:

```text
Protocol Risk
+
Deployment Risk
```

---

# Asset Universe Eligibility

Trust Score determines eligibility.

---

## Layer 1

### Asset Universe Admission

Question:

> Can Laminar invest here?

Protocols must exceed a minimum Trust threshold.

Initial V1 default:

```text
Trust Score >= 65
```

Protocols below this threshold are excluded from the Asset Universe.

---

## Layer 2

### Portfolio Eligibility

Question:

> Should Laminar invest here for this specific user?

Portfolio Construction applies stricter thresholds based on Risk Profile.

---

### Conservative

Initial V1 default:

```text
Trust Score >= 85
```

---

### Balanced

Initial V1 default:

```text
Trust Score >= 75
```

---

### Yield Focused

Initial V1 default:

```text
Trust Score >= 65
```

---

# Explainability Model

Laminar uses Hybrid Explainability.

Users see:

```text
Trust Score = 92
```

with optional drill-down.

---

Example:

```text
Trust Score = 92

Age Contribution: +14

Audit Contribution: +24

TVL Contribution: +8

Incident Penalty: -4

Chain Adjustment: +2
```

Laminar exposes reasoning.

Laminar does not expose proprietary formulas.

---

# Configuration

All weights, thresholds, decay curves, and auditor classifications are configurable.

Configuration source:

```text
26-configuration-registry.md
```

No protocol logic should depend on hardcoded Trust parameters.

---

# Future Extensions

Potential V2 additions:

- Formal chain risk model
- Smart contract verification scoring
- Formal verification bonuses
- Bug bounty scoring
- Insurance coverage scoring
- Governance quality scoring
- Team reputation signals (optional)

These features are explicitly out of scope for V1.
