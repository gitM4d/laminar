# Smart Account Model

Version: Draft 1

---

# Purpose

This document defines the ownership, custody, account abstraction, and execution model used by Laminar.

The Smart Account Model is one of the most critical architectural components of the protocol.

Its primary goals are:

- preserve user ownership
- enable automation
- support future extensibility
- minimize custodial risk
- provide a foundation for permissioned execution

---

# Core Philosophy

Users should benefit from automation without surrendering ownership.

Laminar should orchestrate capital.

Users should own capital.

This distinction is fundamental.

---

# Why Smart Accounts

Traditional EOAs (Externally Owned Accounts) are not well suited for automated portfolio management.

EOAs introduce limitations:

- poor automation support
- poor permission granularity
- poor recoverability
- weak account abstraction support

Laminar therefore adopts a Smart Account architecture.

---

# Selected V1 Solution

Laminar V1 uses:

Safe

as its smart account infrastructure.

---

# Why Safe

Safe provides:

- battle-tested infrastructure
- account abstraction compatibility
- granular permissions
- execution flexibility
- ecosystem adoption

---

Safe is not merely a wallet.

Safe is programmable account infrastructure.

---

# Design Objective

The account layer should support:

```text id="8h8cwn"
Ownership

Automation

Permissions

Recovery

Future Upgrades
```

without redesign.

---

# Ownership Model

The user remains the ultimate owner.

At all times.

---

# Ownership Principle

User assets remain user assets.

Laminar never owns user funds.

Laminar never takes custody.

Laminar never maintains internal balances.

---

# Custody Classification

Target Classification:

```text id="x0zjkc"
Non-Custodial
```

---

Laminar coordinates actions.

The user retains ownership.

---

# Account Creation Flow

V1 Flow:

```text id="r5n0hz"
User Connects Wallet
          ↓
Create Safe
          ↓
Assign Ownership
          ↓
Configure Permissions
          ↓
Portfolio Activation
```

---

# Portfolio Relationship

V1 Model:

```text id="jlwmxq"
One Portfolio
        ↓
One Safe
```

---

Benefits:

- simplicity
- isolation
- transparency

---

Drawbacks:

- additional account creation
- more on-chain objects

---

Acceptable for V1.

---

# Future Models

Potential V2:

```text id="swn4rj"
One User
      ↓
One Safe
      ↓
Multiple Portfolios
```

---

Decision deferred.

---

# Account Funding

Users transfer assets into the Safe.

Examples:

- USDC
- EURC
- DAI

---

The Safe becomes the operational account.

---

# Asset Ownership

Assets remain inside the Safe.

Examples:

```text id="c3c4yf"
Safe
 ↓

Aave Position

Morpho Position

Moonwell Position
```

---

Ownership remains attributable to the user.

---

# Execution Authority

Execution requires explicit authorization.

---

# Important Principle

Authorization is granted.

Ownership is not transferred.

---

Laminar may execute approved actions.

Laminar may not execute arbitrary actions.

---

# Delegated Automation

Users may grant automation permissions.

Examples:

- rebalance portfolio
- move capital between approved protocols
- respond to approved risk events

---

Permissions remain bounded.

---

# Permission Scope

Examples:

```text id="0nnm1x"
Allowed Protocols

Allowed Assets

Maximum Allocation

Maximum Slippage

Maximum Frequency
```

---

Executions outside these constraints are invalid.

---

# Safe Roles

Conceptual Roles:

---

User

Portfolio Owner

---

Laminar

Authorized Executor

---

Protocols

Execution Targets

---

# Execution Flow

Example:

```text id="x3c7wr"
Active Portfolio Policy
        ↓
Portfolio Allocation
        ↓
Execution Plan
        ↓
Permission Validation
        ↓
Safe Transaction
        ↓
Protocol Interaction
```

---

# Signature Model

V1 Preferred Model:

```text id="zyyx2s"
User Approves Policy

Laminar Executes Within Policy
```

---

This minimizes friction.

---

Alternative Model

Rejected For V1:

```text id="kmtr57"
User Signs Every Rebalance
```

---

Reason:

Automation becomes ineffective.

---

# Automation Policy

Users approve:

- what may happen
- when it may happen
- under what conditions it may happen

---

Laminar executes only inside approved boundaries.

---

# Gas Model

The Safe is responsible for funding execution.

---

Principle:

Every portfolio maintains a gas reserve.

---

Gas reserve exists separately from strategy capital.

---

Example:

```text id="zj7p95"
Total Capital

$10,000
```

---

```text id="4z2wga"
Strategy Capital

$9,950
```

---

```text id="5cb0sa"
Operational Reserve

$50
```

---

Illustrative only.

---

# Gas Reserve Benefits

Supports:

- scheduled rebalances
- emergency actions
- retries
- maintenance operations

---

# Gas Reserve Ownership

The reserve belongs to the user.

Not Laminar.

---

# Emergency Actions

Certain approved actions may bypass normal schedules.

Examples:

- exploit
- severe depeg
- insolvency event

---

Emergency permissions remain configurable.

---

# Revocation

Users must be able to revoke automation.

At any time.

---

Example:

```text id="iml6ln"
Disable Rebalancing

Disable Automation

Disable Executor Access
```

---

Revocation should be straightforward.

---

# Portfolio Deactivation

A user may deactivate a portfolio.

Flow:

```text id="3g80c4"
Withdraw Positions
          ↓
Return Assets
          ↓
Disable Automation
          ↓
Portfolio Closed
```

---

# Recovery

Safe recovery mechanisms should remain available.

Recovery implementation depends on Safe capabilities.

---

Potential Approaches:

- recovery addresses
- social recovery
- recovery modules

---

Decision deferred.

---

# Security Principles

---

Least Privilege

---

Minimal Authority

---

Explicit Permissions

---

Revocable Permissions

---

Auditable Actions

---

These principles are mandatory.

---

# Observability

Users should be able to inspect:

- current permissions
- active automation
- execution history
- approved protocols
- account status

---

Transparency is a product feature.

---

# Regulatory Objective

Laminar should avoid becoming a custodian.

---

Key Requirements

Laminar:

- does not hold user funds
- does not pool user funds
- does not take beneficial ownership
- operates within user-approved boundaries

---

Legal review will ultimately determine jurisdiction-specific treatment.

---

# Future Evolution

Potential V2:

- ERC-4337 enhancements
- session keys
- advanced permissions
- batched execution

---

Potential V3:

- decentralized executor networks
- autonomous execution markets
- cross-chain smart accounts

---

# Non-Goals

The Smart Account Model does not:

- score opportunities
- evaluate risk
- construct portfolios
- select protocols

---

It exists to provide a secure execution environment.

---

# Success Criteria

The Smart Account Model succeeds when:

- users retain ownership
- automation remains effective
- permissions remain understandable
- execution remains secure
- custody risk remains minimized

---

# Failure Criteria

The Smart Account Model fails when:

- users lose visibility
- permissions become confusing
- automation becomes overly powerful
- Laminar gains unnecessary control

---

# Architectural Principle

Laminar is an orchestration layer.

Not a custody layer.

The Smart Account Model exists to preserve that distinction while enabling scalable portfolio automation.
