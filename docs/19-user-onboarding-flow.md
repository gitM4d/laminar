# User Onboarding Flow

Version: Draft 1

---

# Purpose

This document defines the complete onboarding experience for Laminar V1.

The onboarding flow is responsible for transforming:

```text id="7zcx1w"
User Preferences
```

into:

```text id="9xjlwm"
Portfolio
Policy
Safe Account
Automation Configuration
```

without requiring users to understand DeFi internals.

---

# Core Philosophy

Users should think about outcomes.

Laminar should handle implementation.

---

Users should never be forced to answer:

```text id="0ykjmu"
Aave or Morpho?

Moonwell or Aerodrome?

Variable APY or Fixed APY?
```

---

Users should answer:

```text id="dfxv0h"
How much risk?

How much liquidity?

How strong is your return preference?
```

---

# Primary Objective

At the end of onboarding, users should understand:

- what Laminar will do
- what Laminar will not do
- what permissions are granted
- how their portfolio will behave

---

# High-Level Flow

```text id="j9d2kz"
Landing
    ↓
Connect Wallet
    ↓
Create Portfolio
    ↓
Intent Wizard
    ↓
Normalization and Mapping
    ↓
Portfolio Preview
    ↓
Policy Review
    ↓
Safe Creation
    ↓
Funding
    ↓
Activation
    ↓
Dashboard
```

---

# Step 1

Connect Wallet

---

Purpose:

Identity.

---

Supported V1

```text id="bjlwm2"
MetaMask

Rabby

Coinbase Wallet
```

---

Future:

```text id="dijx5f"
WalletConnect
```

---

Success Criteria

```text id="38rq6n"
Authenticated User
```

---

# Step 2

Create Portfolio

---

Purpose:

Create portfolio container.

---

Required Input

```text id="l5jx8s"
Portfolio Name
```

---

Examples

```text id="c7bhzy"
Conservative Stable Yield

Treasury Portfolio

Low Risk Income
```

---

No financial configuration yet.

---

# Step 3

Intent Wizard

Critical step.

---

Purpose:

Capture user objectives.

---

User should never see:

```text id="m9ewhj"
Protocols

Vaults

Markets

Adapters
```

---

Only outcomes.

---

# Question 1

Risk Tolerance

---

Question

```text id="xoh0b0"
How much portfolio risk are you willing to accept?
```

---

Input

```text id="0zsgc7"
Slider

1 → 10
```

---

Examples

```text id="k7smc8"
1
Very Low Risk Tolerance
```

```text id="quz7vo"
10
Very High Risk Tolerance
```

---

# Question 2

Liquidity

---

Question

```text id="9vpxhj"
How quickly might you need access to your funds?
```

---

Input

```text id="zmf6zu"
Slider

1 → 10
```

---

Examples

```text id="e3i56i"
1
Can lock for longer periods
```

```text id="h1mz3f"
10
Need immediate access
```

---

# Question 3

Return Preference

---

Question

```text id="oh9i8r"
How strongly do you prefer maximizing expected portfolio returns?
```

---

Input

```text id="zj2n2k"
Slider

1 → 10
```

---

Examples

```text id="b0mln4"
1
Prefer stability
```

```text id="4m0s5h"
10
Prefer higher expected returns
```

---

# Live Profile Preview

As users answer questions:

Display real-time profile updates.

---

Example

```text id="6jw1b7"
Risk

3 / 10
```

```text id="50r3fr"
Liquidity

8 / 10
```

```text id="swjplx"
Return Preference

5 / 10
```

---

Purpose

Immediate feedback.

---

# Step 4

Portfolio Preview

Purpose:

Show proposed strategy.

Strategy type is derived by Normalization and Mapping.

Profile classification uses Weighted Distance Classification.

---

Example

```text id="aj80cn"
Strategy Type

Conservative Lending Exposure
```

---

Example Summary

```text id="11v2wx"
Risk

Low
```

```text id="k8chcb"
Liquidity

High
```

```text id="zhakci"
Return Preference

Moderate
```

---

Important:

Still no protocol names by default.

---

# Advanced View

Optional.

---

Purpose:

Expose routing transparency.

---

Example

```text id="j1q4q7"
Potential Allocation Universe

Morpho

Aave

Moonwell
```

---

Advanced users may inspect.

Most users will skip.

---

# Step 5

Automation Configuration

Purpose:

Define portfolio behavior.

---

User selects review frequency.

---

Options

```text id="7d9ttf"
8 Hours

24 Hours

48 Hours

72 Hours
```

---

Eligibility Rules Apply

---

Example

```text id="l1s5gd"
<$1,000

72h Only
```

---

```text id="6zk5c8"
$1k-$10k

24h+
```

---

```text id="jjlwm8"
$10k+

8h Allowed
```

---

Purpose

Avoid inefficient rebalancing.

---

# Step 6

Policy Review

Most important legal and trust step.

---

Purpose:

Explicit user consent.

---

Must Explain

```text id="5mxm7t"
What Laminar Can Do
```

---

And

```text id="40r1zi"
What Laminar Cannot Do
```

---

Examples

---

Can

```text id="t8zsl1"
Allocate Capital

Rebalance

Monitor Risk

Exit During Emergency
```

---

Cannot

```text id="cwst0r"
Use Unsupported Protocols

Operate Outside Policy

Override User Restrictions
```

---

Users must approve.

---

# Step 7

Safe Smart Account Creation

Purpose:

Create portfolio account.

---

User Messaging

```text id="zyj4um"
You retain ownership.

Laminar does not custody funds.
```

---

Avoid technical explanations.

---

Focus on:

```text id="0o6hhr"
Security

Ownership

Automation
```

---

# Step 8

Funding

Purpose:

Deposit capital.

---

Supported Assets V1

```text id="7vkm2m"
USDC

EURC

DAI
```

---

Display

```text id="0bh46n"
Investment Capital
```

and

```text id="ppsjm0"
Gas Reserve
```

separately.

---

Users must understand the difference.

---

# Gas Reserve Explanation

Purpose:

Educate users.

---

Example

```text id="2p0e2k"
Laminar requires a small reserve to perform future portfolio operations.
```

---

Examples

```text id="s90msp"
Rebalances

Emergency Exits

Maintenance Operations
```

---

Transparency is important.

---

# Step 9

Activation Review

Final confirmation.

---

Summary

```text id="3s7v4i"
Portfolio Name

Risk

Liquidity

Return Preference

Review Frequency

Automation Status

Supported Assets
```

---

Example

```text id="sg6m5f"
Risk

3 / 10
```

```text id="x85kcu"
Liquidity

8 / 10
```

```text id="xjlwm9"
Return Preference

5 / 10
```

---

# Final Consent

User explicitly confirms:

```text id="u5b5ns"
Activate Portfolio
```

---

Portfolio State Transition

```text id="kq8v4m"
PendingFunding
       ↓
Active
```

---

# First Allocation

After activation:

Portfolio enters execution pipeline.

---

Flow

```text id="bd95f4"
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

User should see progress.

---

Example

```text id="m8jlwm"
Analyzing Opportunities
```

↓

```text id="v50pm9"
Building Portfolio
```

↓

```text id="rx7tb8"
Allocating Capital
```

↓

```text id="fw7twn"
Portfolio Active
```

---

# First Dashboard Experience

Upon completion:

User lands on Portfolio Overview.

---

Must Immediately Show

```text id="n4n43v"
Portfolio Value

Current Allocation

Estimated Yield

Portfolio Status
```

---

Users should feel:

```text id="nh57ul"
Funded

Configured

Operational
```

---

# Abandonment Recovery

Users may leave onboarding.

---

Persist:

```text id="jlwm21"
Current Step

Intent Values

Draft Portfolio
```

---

Purpose

Resume onboarding later.

---

# Explainability Requirements

At every step:

Users should understand:

```text id="mql5ld"
What is happening
```

and

```text id="vzjlwm"
Why it matters
```

---

No hidden automation.

---

No unexplained permissions.

---

# Success Metrics

Track:

```text id="4ur4z5"
Wallet Connected

Wizard Completion

Policy Approval

Funding Completed

Portfolio Activated
```

---

Purpose

Optimize conversion.

---

# Future Enhancements

V2

```text id="jlwm22"
Portfolio Templates

Suggested Profiles

Risk Personas
```

---

V3

```text id="jlwm23"
AI Assisted Intent Discovery

Conversational Onboarding

Portfolio Simulation
```

---

# Success Criteria

The onboarding succeeds when:

- users understand automation
- users understand permissions
- users understand ownership
- portfolio creation feels simple

---

# Failure Criteria

The onboarding fails when:

- users are forced to understand protocols
- permissions feel unclear
- automation feels risky
- users abandon due to complexity

---

# Architectural Principle

Users should configure goals.

Laminar should determine implementation.

The onboarding experience should transform intent into a portfolio without exposing unnecessary complexity.
