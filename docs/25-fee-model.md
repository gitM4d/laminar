# Fee Model

Version: Draft 1

Status: Business Model

Priority: Critical

---

# Purpose

This document defines how Laminar generates revenue.

The fee model must:

* align incentives
* remain transparent
* be simple to understand
* avoid hidden costs
* scale with portfolio growth

---

# Core Philosophy

Users should only pay when Laminar provides value.

Laminar is not:

```text id="gvhzq2"
A Yield Farm

A Token Farm

A Governance Farm
```

Laminar is:

```text id="y56gl4"
Portfolio Management Infrastructure
```

---

# Value Provided

Laminar performs:

```text id="7udv6x"
Portfolio Construction

Protocol Discovery

Risk Monitoring

Portfolio Reviews

Rebalancing

Gas Management

Explainability
```

Users pay for these services.

---

# Revenue Streams

V1 supports:

```text id="4v4dy4"
Management Fee
```

Only.

---

Not included in V1:

```text id="3w98tr"
Performance Fee

Subscription Fee

Token Utility Fee
```

---

Reason

Keep business model simple.

Reduce legal complexity.

Improve user trust.

---

# V1 Management Fee

Annualized fee.

Default:

```text id="5pq3me"
0.50% / year
```

---

Example

Portfolio:

```text id="wpjprn"
$10,000
```

Annual Fee:

```text id="w8pd5f"
$50
```

---

Example

Portfolio:

```text id="jvrshz"
$100,000
```

Annual Fee:

```text id="bzmrv5"
$500
```

---

# Why Management Fee

The service operates continuously.

Laminar provides value even when:

```text id="4n4xj9"
Markets Are Flat

Yield Falls

No Rebalancing Occurs
```

---

Portfolio monitoring remains active.

Risk monitoring remains active.

---

# Fee Collection Method

V1 uses:

```text id="7q5t8n"
Continuous Accrual
```

---

The fee accumulates over time.

---

Example

0.50% annual fee

↓

```text id="69bhph"
0.00136986% per day
```

↓

Accrued continuously.

---

# Collection Trigger

Fee collection occurs only when:

```text id="1v3p6m"
Portfolio Review
```

or

```text id="a7h6im"
Portfolio Withdrawal
```

---

Reason

Avoid unnecessary transactions.

Reduce gas usage.

---

# Fee Source

Fees are collected from:

```text id="o3dyg3"
Generated Portfolio Value
```

---

Not from external user deposits.

---

Example

Portfolio Value

```text id="8s4mha"
$10,000
```

Accrued Fee

```text id="wxkn1v"
$1.20
```

Portfolio becomes:

```text id="9eq3ae"
$9,998.80
```

Treasury receives:

```text id="2nzzzi"
$1.20
```

---

# Fee Asset

Preferred collection asset:

```text id="4gq8xv"
USDC
```

---

Fallback

Any supported stablecoin.

---

Reason

Simplified accounting.

---

# Fee Transparency

Every portfolio must expose:

```text id="rvgnaz"
Current Fee Rate

Accrued Fees

Collected Fees

Lifetime Fees
```

---

Users must always know:

```text id="d2xtyk"
What They Pay

Why They Pay

When They Pay
```

---

# Fee Calculation

Formula

```text id="69rzhw"
Fee =
Portfolio Value
×
Annual Fee Rate
×
Elapsed Time
```

---

Example

```text id="5pzt2d"
Portfolio Value = $50,000

Fee Rate = 0.50%

Elapsed Time = 30 Days
```

---

Result

```text id="efdt2n"
≈ $20.55
```

---

# Minimum Fee

None.

---

Reason

Avoid complexity.

Avoid edge cases.

---

# Maximum Fee

V1 Hard Cap

```text id="35vnj9"
1.00% annualized
```

---

No configuration may exceed this value.

---

Reason

Protect users.

---

# Fee Governance

V1

```text id="w3n9eb"
Static Configuration
```

---

Changes require:

```text id="9d6j7a"
Protocol Upgrade
```

---

Users must be informed.

---

# Treasury Destination

All collected fees are transferred to:

```text id="ubrx2o"
Laminar Treasury
```

---

Treasury details defined in:

```text id="v4v7k3"
Treasury Model
```

---

# Rebalancing Fees

V1

```text id="n9yt6j"
No Additional Fee
```

---

Rebalancing is included.

---

Users do not pay:

```text id="0ys2dz"
Management Fee
+
Rebalance Fee
```

---

Reason

Cleaner UX.

---

# Withdrawal Fees

V1

```text id="8w2jqv"
No Withdrawal Fee
```

---

Users may only incur:

```text id="f2ry4q"
Network Gas Costs
```

---

# Deposit Fees

V1

```text id="n71v0v"
No Deposit Fee
```

---

Reason

Reduce onboarding friction.

---

# Protocol Incentives

Any protocol incentives received by the portfolio belong to:

```text id="zvbl53"
The Portfolio
```

---

Not to Laminar.

---

Example

A protocol distributes:

```text id="n1n6vl"
Reward Tokens
```

---

Ownership belongs to:

```text id="mkh70l"
Portfolio Owner
```

---

# Future Revenue Streams

Potential V2+

```text id="uy6nmk"
Performance Fee
```

---

Possible Model

```text id="o2q6mg"
10%
of yield generated
```

above baseline.

---

Not included in V1.

---

Potential V3+

```text id="cbv5xm"
Premium Automation

Advanced Policies

Institutional Accounts
```

---

Not included in V1.

---

# Explainability Requirement

Users must always be able to answer:

```text id="d3qdr7"
How much have I paid?
```

---

and

```text id="6dtxv4"
What did I receive in exchange?
```

---

The dashboard must expose:

```text id="zxikf9"
Fee History

Fee Accrual

Fee Collection Events
```

---

# Anti-Abuse Principle

Fees must never:

```text id="50u8uk"
Depend On Hidden Logic

Depend On Opaque Calculations

Depend On Token Ownership
```

---

All fee calculations must be reproducible.

---

# Future Token Interaction

If a Laminar token exists:

Possible utility:

```text id="4n7z7l"
Fee Discounts
```

---

Example

```text id="w6h0kv"
0.50%
↓
0.40%
```

for qualifying holders.

---

Not part of V1.

---

# Success Criteria

Users should perceive:

```text id="c4f37n"
Fee Paid
<
Value Received
```

at all times.

---

# Architectural Principle

Laminar earns revenue by managing portfolios, not by extracting value from users.

The fee model must remain simple, transparent, and aligned with long-term trust.
