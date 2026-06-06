# Policy Model

## Purpose

This document defines the Portfolio Policy model used by Laminar.

The Policy acts as the executable bridge between:

```text
User Intent
```

and:

```text
Portfolio Construction
```

A Policy translates user preferences into concrete portfolio construction rules.

---

# Philosophy

Laminar is an intent-first system.

Users express preferences.

Users do not directly select:

* protocols
* allocations
* strategies
* vaults

Laminar converts user intent into a Portfolio Policy.

Portfolio Construction consumes the Policy and generates portfolio allocations.

---

# Architectural Position

Portfolio Policy sits between:

```text
Normalization and Mapping
```

and:

```text
Portfolio Construction
```

Flow:

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
Opportunity Scoring
↓
Portfolio Construction
↓
Portfolio Allocation
↓
Execution
```

---

# Policy Definition

A Portfolio Policy is:

> A versioned executable representation of user intent, enriched with profile selection, constraints, and system configuration.

A Policy is not:

```json
{
  "risk": 4,
  "liquidity": 8,
  "returnPreference": 6
}
```

This is Intent.

A Policy is not:

```json
{
  "selectedProfile": "Balanced"
}
```

This is Profile Classification.

A Policy contains the information required for Portfolio Construction to generate allocations.

---

# Policy Lifecycle

Portfolio Policies are versioned.

Every Policy represents a specific interpretation of user intent at a specific point in time.

Policies are immutable.

Changes create new versions.

---

# Examples

## Initial Policy

```text
Policy v1
```

Generated after onboarding.

---

## Updated Policy

```text
Policy v2
```

Generated after:

* intent modification
* profile change
* policy rebuild
* configuration change

---

# Why Versioning Exists

Versioning enables:

* explainability
* auditability
* historical reconstruction
* debugging
* rebalance transparency

---

# Explainability Example

Laminar should be able to answer:

```text
Why did my portfolio change?
```

By comparing:

```text
Policy v1
↓
Policy v2
```

---

# Policy Structure

Portfolio Policy contains five primary sections.

```yaml
selectedProfile:

riskLimits:

liquidityRequirements:

targetExposure:

allocationConstraints:
```

---

# Selected Profile

Selected Profile is produced by:

```text
30-normalization-and-mapping.md
```

Possible values:

```text
Conservative

Balanced

Yield Focused
```

The selected profile becomes the foundation of the generated Policy.

Example:

```yaml
selectedProfile: Balanced
```

---

# Risk Limits

Purpose:

Define what levels of protocol risk are acceptable.

Portfolio Construction uses Risk Limits to filter opportunities.

---

## Structure

```yaml
riskLimits:

  minTrustScore:

  maxProtocolRisk:

  allowUnauditedProtocols:

  allowExperimentalProtocols:
```

---

## Conservative Example

```yaml
riskLimits:

  minTrustScore: 85

  maxProtocolRisk: low

  allowUnauditedProtocols: false

  allowExperimentalProtocols: false
```

---

## Balanced Example

```yaml
riskLimits:

  minTrustScore: 75

  maxProtocolRisk: medium

  allowUnauditedProtocols: false

  allowExperimentalProtocols: false
```

---

## Yield Focused Example

```yaml
riskLimits:

  minTrustScore: 65

  maxProtocolRisk: medium

  allowUnauditedProtocols: false

  allowExperimentalProtocols: true
```

---

# Relationship To Trust Scoring

Trust Scoring remains responsible for:

```text
Trust Score Calculation
```

The Policy only defines:

```text
Minimum Acceptable Trust
```

for portfolio construction.

# Liquidity Requirements

Purpose:

Define the minimum liquidity characteristics acceptable for portfolio positions.

Portfolio Construction uses Liquidity Requirements to filter opportunities before allocation.

---

## Structure

```yaml
liquidityRequirements:

  minLiquidityScore:

  maxWithdrawalDelay:

  allowLockups:
```

---

## Conservative Example

```yaml
liquidityRequirements:

  minLiquidityScore: 85

  maxWithdrawalDelay: 1 day

  allowLockups: false
```

---

## Balanced Example

```yaml
liquidityRequirements:

  minLiquidityScore: 75

  maxWithdrawalDelay: 7 days

  allowLockups: false
```

---

## Yield Focused Example

```yaml
liquidityRequirements:

  minLiquidityScore: 65

  maxWithdrawalDelay: 30 days

  allowLockups: true
```

---

# Relationship To Liquidity Scoring

Liquidity Scoring remains responsible for:

```text
Liquidity Score Calculation
```

The Policy only defines:

```text
Minimum Acceptable Liquidity
```

for portfolio construction.

---

# Target Exposure

Purpose:

Define the desired portfolio composition.

Target Exposure expresses portfolio objectives.

It does not specify protocols.

Portfolio Construction remains responsible for selecting actual opportunities.

---

## Structure

```yaml
targetExposure:

  lending:

  yieldEnhancement:

  liquidityBuffer:
```

---

# Conservative Exposure

```yaml
targetExposure:

  lending: 90%

  liquidityBuffer: 10%

  yieldEnhancement: 0%
```

---

# Balanced Exposure

```yaml
targetExposure:

  lending: 75%

  yieldEnhancement: 25%

  liquidityBuffer: 0%
```

---

# Yield Focused Exposure

```yaml
targetExposure:

  lending: 60%

  yieldEnhancement: 40%

  liquidityBuffer: 0%
```

---

# Why Exposure Exists

Intent alone does not tell Portfolio Construction:

```text
What types of opportunities should be pursued?
```

Target Exposure translates profile selection into portfolio objectives.

---

# Allocation Constraints

Purpose:

Define hard limits that Portfolio Construction must respect.

Allocation Constraints improve:

* diversification
* liquidity
* operational efficiency
* portfolio stability

---

## Structure

```yaml
allocationConstraints:

  maxActiveAllocations:

  maxProtocolExposure:

  maxStablecoinExposure:

  minAllocationSize:

  rebalanceThreshold:

  gasReserve:
```

---

## Example Values

```yaml
allocationConstraints:

  maxActiveAllocations: 3

  maxProtocolExposure: 50%

  maxStablecoinExposure: 80%

  minAllocationSize: 10%

  rebalanceThreshold: 10%

  gasReserve:

    min: 5 USD

    targetRate: 1%

    max: 100 USD
```

---

# Constraint Purpose

## maxActiveAllocations

Limits portfolio fragmentation.

---

## maxProtocolExposure

Limits concentration risk.

---

## maxStablecoinExposure

Limits excessive dependence on a single stablecoin.

---

## minAllocationSize

Prevents inefficient micro-allocations.

---

## rebalanceThreshold

Avoids unnecessary portfolio churn.

---

## gasReserve

Maintains operational capital for future transactions.

---

# Policy Generation

Portfolio Policies are generated by:

```text
30-normalization-and-mapping.md
```

Generation inputs:

```text
Risk

Liquidity

Return Preference
```

↓

```text
Normalization
```

↓

```text
Weighted Distance Classification
```

↓

```text
Selected Profile
```

↓

```text
Portfolio Policy
```

---

# Policy Consumption

Portfolio Construction consumes Policy objects.

The construction process should:

```text
Discover Opportunities
```

↓

```text
Apply Risk Limits
```

↓

```text
Apply Liquidity Requirements
```

↓

```text
Generate Eligible Universe
```

↓

```text
Apply Target Exposure
```

↓

```text
Apply Allocation Constraints
```

↓

```text
Generate Portfolio Allocation
```

---

# Full Policy Example

```yaml
policyVersion: 2

selectedProfile: Balanced

riskLimits:

  minTrustScore: 75

  maxProtocolRisk: medium

  allowUnauditedProtocols: false

  allowExperimentalProtocols: false

liquidityRequirements:

  minLiquidityScore: 75

  maxWithdrawalDelay: 7 days

  allowLockups: false

targetExposure:

  lending: 75%

  yieldEnhancement: 25%

  liquidityBuffer: 0%

allocationConstraints:

  maxActiveAllocations: 3

  maxProtocolExposure: 50%

  maxStablecoinExposure: 80%

  minAllocationSize: 10%

  rebalanceThreshold: 10%

  gasReserve:

    min: 5 USD

    targetRate: 1%

    max: 100 USD
```

---

# V1 Scope Boundaries

Policy Model V1 intentionally excludes:

* AI-generated policies
* adaptive policy evolution
* policy optimization engines
* personalized policy templates
* behavioral learning systems
* policy recommendation systems

Laminar V1 uses deterministic policy generation.

---

# Future Extensions

Potential future enhancements include:

* policy confidence scores
* adaptive policies
* dynamic policy updates
* AI-assisted policy generation
* behavioral policy tuning

These capabilities are explicitly outside the scope of Laminar V1.
