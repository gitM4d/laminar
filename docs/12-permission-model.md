# Permission Model

Version: Draft 1

---

# Purpose

The Permission Model defines the operational boundaries within which Laminar may act on behalf of a user.

It is the security layer that connects:

```text
User Intent
      ↓
Portfolio Policy
      ↓
Execution Engine
      ↓
Safe Smart Account
```

Without permissions, automation is impossible.

Without restrictions, automation is dangerous.

The Permission Model exists to balance both.

---

# Core Philosophy

Users should approve boundaries.

Laminar should operate inside those boundaries.

Laminar should never require approval for every individual action.

Laminar should never be able to perform actions outside approved policies.

---

# Architectural Principle

Laminar operates under:

```text
Policy-Based Authorization
```

Not:

```text
Transaction-Based Authorization
```

---

# Policy Definition

A Portfolio Policy is the construction contract defined by the Policy Model.

It defines:

* selected profile
* risk limits
* liquidity requirements
* target exposure
* allocation constraints

Execution Permissions are separate.

They define:

* what actions are permitted
* when actions are permitted
* under which execution conditions actions are permitted

---

# Policy Lifecycle

```text
User Onboarding
        ↓
Intent Collection
        ↓
Normalization and Mapping
        ↓
Selected Profile
        ↓
Versioned Portfolio Policy
        ↓
User Approval
        ↓
Policy Activation
        ↓
Execution Within Policy
```

---

# Policy Ownership

Policies belong to the user.

Users may:

* create policies
* modify policies
* deactivate policies
* revoke policies

at any time.

---

# Policy Scope

Portfolio Policies govern:

* allocations
* risk limits
* liquidity requirements
* target exposure

Execution Permissions govern:

* assets
* protocols
* automation
* emergency behavior
* execution constraints

---

# Portfolio Policy Structure

Illustrative structure:

```typescript
PortfolioPolicy {

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

Execution permission structure is separate:

```typescript
ExecutionPermissions {

  allowedAssets: string[]

  excludedProtocols: string[]

  maxProtocolExposure: number

  rebalanceFrequencyHours: number

  automationEnabled: boolean

  emergencyActionsEnabled: boolean

  gasReserveEnabled: boolean

  minimumNetBenefitBps: number

}
```

---

Actual implementation may evolve.

Policy values are derived from Normalization and Mapping.

Users provide intent inputs.

Laminar derives the selected profile and policy boundaries.

---

# Managed Universe Model

Laminar maintains a managed protocol universe.

Example V1:

```text
Morpho

Aave

Moonwell

Aerodrome
```

---

Users may not add arbitrary protocols.

Users may only restrict the universe further.

---

Example

Allowed Universe:

```text
Morpho

Aave

Moonwell

Aerodrome
```

---

User Override:

```text
Exclude Aerodrome
```

---

Effective Universe:

```text
Morpho

Aave

Moonwell
```

---

# Asset Permissions

Execution permissions define which assets may be used.

---

Example

```text
USDC

EURC

DAI
```

---

User may restrict further.

Example:

```text
USDC Only
```

---

Execution outside approved assets is forbidden.

---

# Allocation Permissions

Portfolio Policy defines allocation boundaries.

Execution permissions validate submitted actions against those boundaries.

---

Example

```text
Maximum Protocol Exposure

50%
```

---

Meaning:

No protocol may exceed 50% allocation.

---

Violations invalidate execution.

---

# Automation Permissions

Execution permissions define whether Laminar may act automatically.

---

Example

```text
Automation Enabled
```

---

Allowed:

* rebalances
* allocation updates
* maintenance operations

within policy limits.

---

Example

```text
Automation Disabled
```

---

Allowed:

* recommendations only

Not allowed:

* execution

---

# Rebalance Permissions

Execution permissions define review frequency.

Examples:

```text
8 Hours

24 Hours

48 Hours

72 Hours
```

---

Actual execution windows remain:

```text
00:00 UTC

08:00 UTC

16:00 UTC
```

---

Frequency determines eligibility.

Not execution timing.

---

# Cost Permissions

Execution permissions define economic constraints.

---

Example

```text
Minimum Net Benefit

25 bps
```

---

Meaning:

Expected benefit must exceed:

* gas cost
* execution cost
* configured threshold

before execution.

---

Purpose:

Prevent unnecessary churn.

---

# Emergency Permissions

Execution permissions define emergency behavior.

---

# Emergency Actions Disabled

Laminar may:

```text
Detect

Alert

Recommend
```

---

Laminar may not:

```text
Withdraw

Pause

Act
```

---

# Emergency Actions Enabled

Laminar may perform approved defensive actions.

---

Only defensive actions.

---

# Emergency Policy V1

Permitted:

```text
Pause Allocations

Pause Rebalances

Withdraw Positions

Move To Idle Asset

Notify User
```

---

Not Permitted:

```text
Cross-Protocol Migration

Emergency Yield Optimization

Emergency Reallocation

Asset Swaps
```

---

This restriction is intentional.

---

# Idle Asset Definition

V1 Idle Assets:

```text
USDC

EURC

DAI
```

subject to portfolio configuration.

---

Idle assets are not considered active investments.

---

# Execution Validation

Every execution must pass permission validation.

---

Validation occurs:

```text
Immediately Before Submission
```

---

Validation Checklist

Example:

```text
Active Policy Version?

Allowed Asset?

Allowed Protocol?

Within Allocation Limits?

Automation Enabled?

Within Schedule?

Emergency Permission Valid?
```

---

Any failure blocks execution.

---

# Policy Versioning

Portfolio Policies are versioned.

Example:

```text
Policy v1
```

↓

```text
Policy v2
```

---

Every Portfolio Policy modification creates a new version.

---

Benefits:

* auditability
* transparency
* rollback capability

---

# Policy Activation

Portfolio Policy changes require user approval.

---

Flow:

```text
Modify Policy
       ↓
User Approval
       ↓
Activate New Version
```

---

No silent policy changes.

---

# Policy Revocation

Users may revoke automation at any time.

---

Examples:

```text
Disable Automation

Disable Emergency Actions

Disable Execution Rights
```

---

Revocation takes effect immediately.

---

# Policy Auditability

Users should be able to inspect:

* current policy
* current policy version
* policy history
* active permissions
* execution history

---

Transparency is mandatory.

---

# Explainability Requirements

Every execution should reference:

```text
Policy Rule

Policy Version

Execution Reason

Portfolio Decision
```

---

Example

```text
Executed because:

Policy:
v2

Policy:
Automation Enabled

Policy:
24h Review Window

Policy:
Maximum Exposure Constraint

Portfolio Score Improvement:
+7
```

---

# Security Principles

---

Least Privilege

---

Explicit Authorization

---

Revocable Permissions

---

Deterministic Enforcement

---

Auditable Decisions

---

These principles are mandatory.

---

# Future Enhancements

Potential V2:

* emergency migrations
* advanced constraints
* protocol-specific permissions
* dynamic thresholds

---

Potential V3:

* programmable policies
* delegated managers
* policy marketplaces
* AI-assisted policy generation

---

# Non-Goals

The Permission Model does not:

* score opportunities
* evaluate risk
* construct portfolios
* execute transactions

---

It only defines what execution is allowed.

---

# Success Criteria

The Permission Model succeeds when:

* users understand approvals
* permissions remain transparent
* automation remains useful
* execution remains constrained
* security remains enforceable

---

# Failure Criteria

The Permission Model fails when:

* permissions become confusing
* execution exceeds approved boundaries
* policy changes are not auditable
* users lose visibility into automation

---

# Architectural Principle

The Portfolio Policy is the construction contract between the user and Laminar.

Execution Permissions define what Laminar may execute.

The Execution Engine may only operate within the boundaries defined by the active policy and execution permissions.

Anything outside the policy is forbidden by design.
