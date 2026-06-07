# Portfolio Lifecycle

Version: Draft 1

---

# Purpose

This document defines the lifecycle of a portfolio within Laminar.

A portfolio is not merely a collection of assets.

A portfolio is a managed entity that transitions through well-defined states during its existence.

These states determine:

- available actions
- automation eligibility
- execution permissions
- user experience
- system behavior

---

# Core Philosophy

Portfolio behavior should be deterministic.

At any moment:

- a portfolio must have exactly one state
- the current state must be observable
- valid transitions must be explicit

Undefined states are forbidden.

---

# Lifecycle Overview

```text
Draft
  ↓
PendingFunding
  ↓
Active
  ↓
Paused
  ↓
Active

Active
  ↓
Emergency

Emergency
  ↓
Paused

Paused
  ↓
Active

Paused
  ↓
Closing

Closing
  ↓
Closed
```

---

# State Definitions

---

# Draft

Portfolio has been created but not activated.

User has:

- completed onboarding
- configured intent
- generated policy

User has not yet funded the portfolio.

---

Allowed Actions

```text
Edit Intent
Edit Policy
Delete Portfolio
```

---

Forbidden Actions

```text
Execution
Rebalancing
Allocation
```

---

Exit Conditions

```text
Funding Initiated
```

---

# PendingFunding

Portfolio exists and is awaiting funding.

Safe account may already exist.

Policy may already be approved.

---

Allowed Actions

```text
Deposit Funds
Edit Portfolio
Cancel Portfolio
```

---

Forbidden Actions

```text
Execution
Rebalancing
Automation
```

---

Exit Conditions

```text
Minimum Funding Reached
```

---

# Active

Normal operating state.

Portfolio participates fully in Laminar.

Automation is enabled according to policy.

---

Allowed Actions

```text
Scheduled Reviews
Rebalancing
Allocation Updates
Emergency Monitoring
Execution
```

---

Allowed Triggers

```text
Schedule Trigger

Risk Trigger

User Trigger
```

---

Exit Conditions

```text
User Pause

Emergency Event

Portfolio Closure Request
```

---

# Paused

Portfolio remains funded.

Capital remains allocated.

Automation is suspended.

---

Purpose:

Provide a safe intermediate state.

---

Allowed Actions

```text
View Portfolio

Manual Withdraw

Resume Portfolio
```

---

Forbidden Actions

```text
Scheduled Rebalances

Automatic Allocation Changes
```

---

Exit Conditions

```text
Resume Requested

Close Requested
```

---

# Emergency

Portfolio entered protective mode.

Triggered by:

- exploit
- protocol insolvency
- severe depeg
- critical risk event

---

V1 Behavior

```text
Pause Allocations

Pause Rebalancing

Execute Emergency Exit

Move To Idle Asset

Notify User
```

---

Forbidden Actions

```text
Migration

Yield Optimization

Cross Protocol Reallocation
```

---

Exit Conditions

```text
User Review Required
```

---

Emergency never returns directly to Active.

---

# Closing

Portfolio is shutting down.

System attempts to unwind positions.

Automation is disabled.

---

Allowed Actions

```text
Withdraw Positions

Finalize Closure
```

---

Forbidden Actions

```text
New Allocations

Rebalancing

Optimization
```

---

Exit Conditions

```text
Positions Fully Closed
```

---

# Closed

Terminal state.

Portfolio no longer participates in Laminar.

---

Allowed Actions

```text
View History
Export Data
```

---

Forbidden Actions

```text
Execution

Funding

Reactivation
```

---

Closed portfolios are immutable.

---

# State Transition Rules

Only valid transitions are allowed.

---

Valid Transitions

```text
Draft
  →
PendingFunding
```

```text
PendingFunding
  →
Active
```

```text
Active
  →
Paused
```

```text
Active
  →
Emergency
```

```text
Active
  →
Closing
```

```text
Paused
  →
Active
```

```text
Paused
  →
Closing
```

```text
Emergency
  →
Paused
```

```text
Closing
  →
Closed
```

---

Invalid Transitions

Examples:

```text
Draft
  →
Active
```

```text
Closed
  →
Active
```

```text
Emergency
  →
Active
```

```text
Closed
  →
PendingFunding
```

---

Invalid transitions must be rejected.

---

# Portfolio Activation Requirements

To enter Active:

Required:

```text
Policy Approved

Safe Created

Minimum Capital Deposited

Gas Reserve Available
```

---

Failure of any requirement blocks activation.

---

# Portfolio Closure Requirements

To enter Closed:

Required:

```text
No Open Positions

No Pending Executions

No Pending Withdrawals
```

---

All conditions must be satisfied.

---

# Automation Eligibility

Only Active portfolios may participate in:

```text
Scoring

Optimization

Scheduling

Rebalancing

Execution
```

---

Paused portfolios remain visible but inactive.

---

# Emergency Eligibility

Only Active portfolios may enter Emergency.

---

Emergency entry requires:

```text
Critical Risk Event
```

---

Emergency state should be rare.

---

# Lifecycle Events

Examples:

```text
PortfolioCreated

FundingStarted

PortfolioActivated

PortfolioPaused

EmergencyTriggered

PortfolioResumed

PortfolioClosing

PortfolioClosed
```

---

These events should be persisted.

---

# Auditability

Every transition should record:

```text
Previous State

New State

Timestamp

Reason

Actor
```

---

Examples:

```text
Actor:
User
```

```text
Actor:
Scheduler
```

```text
Actor:
Risk Engine
```

---

# Notification Requirements

Users should be notified when:

```text
Portfolio Activated

Portfolio Paused

Emergency Triggered

Portfolio Closed
```

---

Notification channels depend on user settings.

---

# Future States

Potential V2:

```text
MigrationPending

RecoveryMode

MaintenanceMode
```

---

Not required for V1.

---

# Success Criteria

The lifecycle succeeds when:

- states remain deterministic
- transitions remain explicit
- automation behaves predictably
- users understand portfolio status

---

# Failure Criteria

The lifecycle fails when:

- ambiguous states appear
- transitions become unclear
- automation ignores state restrictions

---

# Architectural Principle

A portfolio is a state machine.

Every action in Laminar must respect the portfolio's current state.

State determines behavior.

Behavior never determines state.
