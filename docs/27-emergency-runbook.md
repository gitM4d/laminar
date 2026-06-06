# Emergency Runbook

Version: Draft 1

Status: Operations & Risk Management

Priority: Critical

---

# Purpose

This document defines how Laminar responds to abnormal and emergency situations.

The objective is:

```text id="u4h0bz"
Protect Capital

Protect Users

Preserve Liquidity

Maintain Explainability
```

---

# Core Principle

Laminar must behave predictably during crises.

Emergency actions must:

```text id="vq1h86"
Be Deterministic

Be Auditable

Be Explainable

Be Reproducible
```

---

# Emergency Philosophy

When uncertainty increases:

```text id="lqq48k"
Safety
>
Yield
```

Always.

---

# Emergency Lifecycle

Every emergency follows:

```text id="mb3m49"
Detection
↓
Classification
↓
Decision
↓
Execution
↓
Audit
↓
Resolution
```

---

# Severity Levels

Laminar supports:

```text id="9xtb7m"
LOW

MEDIUM

HIGH

CRITICAL
```

---

# LOW

Characteristics

```text id="b8n8p4"
Minor Deviation

No Immediate Risk

Monitoring Required
```

---

Action

```text id="rrpkn6"
Observe
```

---

No portfolio changes.

---

# MEDIUM

Characteristics

```text id="k4d4l4"
Elevated Risk

Potential Degradation

Review Required
```

---

Action

```text id="84bupg"
Evaluate
```

---

Portfolio review may be triggered.

---

# HIGH

Characteristics

```text id="v6cl4l"
Meaningful Risk

Potential Capital Impact
```

---

Action

```text id="a9b4f0"
Immediate Review
```

---

Portfolio may rebalance.

---

# CRITICAL

Characteristics

```text id="d3x0s5"
Potential Capital Loss

Protocol Failure

Severe Depeg

Security Incident
```

---

Action

```text id="i7zz4m"
Emergency Execution
```

---

Scheduler is bypassed.

---

# Emergency Triggers

V1 supports:

```text id="b6b1pq"
Stablecoin Depeg

Protocol Exploit

Protocol Pause

Liquidity Collapse

TVL Collapse

Execution Failure
```

---

# Stablecoin Depeg

Definition

Stablecoin deviates from:

```text id="x4t2r0"
$1.00
```

beyond configured thresholds.

---

# Severity Mapping

Deviation

```text id="s8tvk4"
2%
```

↓

LOW

---

Deviation

```text id="8tq3zl"
5%
```

↓

HIGH

---

Deviation

```text id="kk5uho"
10%
```

↓

CRITICAL

---

# Example

USDC

```text id="n9h3v6"
$0.90
```

---

Result

```text id="g4m3im"
CRITICAL
```

---

Emergency Review Triggered.

---

# Protocol Exploit

Definition

Credible evidence exists that a protocol may be compromised.

Examples

```text id="kw3e8u"
Exploit

Hack

Oracle Manipulation

Critical Vulnerability
```

---

Severity

```text id="8it5zw"
CRITICAL
```

Always.

---

# Response

Protocol State

```text id="h0yzjg"
PAUSED
```

---

New Allocations

```text id="crk32m"
Disabled
```

---

Emergency Exit

Evaluated Immediately.

---

# Protocol Pause

Definition

Protocol voluntarily pauses operations.

---

Examples

```text id="wl6m5d"
Withdrawals Disabled

Deposits Disabled

Emergency Governance Action
```

---

Severity

```text id="r2svj9"
HIGH
```

or

```text id="o2w6it"
CRITICAL
```

depending on impact.

---

# Response

Protocol becomes:

```text id="nt5s7w"
READ_ONLY
```

or

```text id="rz9eg8"
PAUSED
```

---

# Liquidity Collapse

Definition

Available liquidity falls below acceptable levels.

---

Example

```text id="jj2d4u"
50% reduction
```

within monitoring window.

---

Severity

```text id="2lw9kg"
CRITICAL
```

---

Response

```text id="ph72ur"
Emergency Review
```

---

Potential reallocation.

---

# TVL Collapse

Definition

Protocol TVL declines significantly.

---

Warning

```text id="2yvv9l"
25%
```

---

Critical

```text id="y9bhf4"
50%
```

---

Response

Portfolio exposure reduced.

---

# Execution Failure

Definition

Portfolio action repeatedly fails.

---

Examples

```text id="m2g7zt"
Failed Rebalance

Failed Withdrawal

Failed Allocation
```

---

Severity

```text id="ryx76g"
MEDIUM
```

or

```text id="55ix7i"
HIGH
```

depending on impact.

---

# Response

Retry according to execution policy.

---

# Emergency Decision Matrix

## Stablecoin Depeg

LOW

```text id="vkx7s7"
Monitor
```

---

MEDIUM

```text id="t8grd8"
Review
```

---

HIGH

```text id="6kg4dh"
Reduce Exposure
```

---

CRITICAL

```text id="7jlwmx"
Exit Position
```

---

# Protocol Exploit

LOW

```text id="4vjttz"
Not Applicable
```

---

MEDIUM

```text id="bg5s9i"
Not Applicable
```

---

HIGH

```text id="h0d5gx"
Not Applicable
```

---

CRITICAL

```text id="o5yxfn"
Emergency Exit
```

---

# Liquidity Collapse

LOW

```text id="apb2yd"
Monitor
```

---

MEDIUM

```text id="f0quj5"
Review
```

---

HIGH

```text id="e8pryk"
Reduce Exposure
```

---

CRITICAL

```text id="kl5u7x"
Exit Position
```

---

# Emergency Exit

Definition

Rapid portfolio withdrawal from one or more protocols.

---

Objective

```text id="r9o9j4"
Preserve Capital
```

---

Not

```text id="wwc27o"
Optimize Yield
```

---

# Emergency Exit Priority

Priority Order

```text id="kjb2lq"
Capital Preservation

Liquidity

Execution Speed

Yield
```

---

# Emergency Exit Destination

V1 Destination

```text id="b9ch2m"
Supported Stablecoins
```

held directly by portfolio Safe.

---

Examples

```text id="nhf8xt"
USDC

DAI

EURC
```

---

# Portfolio Safe Protection

Emergency actions never move assets to:

```text id="5w7n6i"
Laminar Treasury

Operator Wallets

Third Party Wallets
```

---

Assets always remain:

```text id="8j3syj"
User Controlled
```

through the portfolio Safe.

---

# Scheduler Override

Critical emergencies bypass:

```text id="42slf8"
8h

24h

48h

72h
```

windows.

---

Execution occurs immediately.

---

# Notification Requirements

Emergency events generate:

```text id="hs0l5f"
Portfolio Event

Risk Event

User Notification
```

---

Required Channels

V1

```text id="9f6x9f"
In-App Notification
```

---

Future

```text id="n8b4z6"
Email

Push

SMS
```

---

Not part of V1.

---

# Explainability Requirement

Every emergency action must record:

```text id="c7k9v7"
Trigger

Threshold

Timestamp

Decision

Execution Result
```

---

Users must be able to answer:

```text id="zk7dh7"
Why did Laminar act?
```

---

At any point in the future.

---

# Emergency Event Storage

All emergency events are immutable.

---

Stored Data

```text id="s7v8k6"
Event Type

Severity

Affected Protocol

Affected Portfolio

Action Taken

Outcome
```

---

Retention

```text id="h9j6f0"
Permanent
```

---

# False Positives

Emergency systems may trigger unnecessarily.

This is acceptable.

---

Reason

```text id="m0r4gz"
False Positive Cost
<
Capital Loss Cost
```

---

# Manual Intervention

V1 Philosophy

```text id="zt8j2x"
System First
```

---

Laminar should be capable of responding automatically.

---

Operators may:

```text id="cw9x8x"
Pause Protocols

Adjust Configurations

Disable Execution
```

---

Operators may not:

```text id="a3l5v4"
Move User Funds
```

---

Ever.

---

# Post-Incident Review

Every HIGH or CRITICAL incident requires:

```text id="u5n6l2"
Incident Report
```

---

Required Sections

```text id="v2d8r5"
Timeline

Detection

Decision

Execution

Outcome

Lessons Learned
```

---

# Future Evolution

Future versions may introduce:

```text id="r6x8k3"
Multi-Chain Emergency Routing

Cross-Protocol Recovery

AI-Assisted Incident Analysis
```

---

Not part of V1.

---

# Success Criteria

A successful emergency response:

```text id="m8j4x7"
Protects Capital

Maintains Auditability

Preserves User Trust
```

even at the cost of reduced yield.

---

# Architectural Principle

During normal conditions Laminar optimizes outcomes.

During emergencies Laminar optimizes survival.

Capital preservation always takes precedence over yield generation.
