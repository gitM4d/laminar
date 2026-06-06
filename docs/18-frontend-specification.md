# Frontend Specification

Version: Draft 1

---

# Purpose

This document defines the frontend architecture, user experience, screens, navigation, and interaction model of Laminar V1.

The frontend exists to translate a sophisticated portfolio automation system into a simple and understandable user experience.

---

# Core Philosophy

Users should never need to understand:

* APY optimization
* protocol routing
* scoring algorithms
* execution planning

to successfully use Laminar.

However:

Advanced users should always be able to inspect the underlying mechanics.

---

# UX Principles

---

## Principle 1

Simple by default.

---

## Principle 2

Detailed on demand.

---

## Principle 3

Explain every important decision.

---

## Principle 4

Never surprise the user.

---

## Principle 5

Portfolio automation should feel understandable.

Not magical.

---

# User Journey

V1 user journey:

```text
Landing
    ↓
Connect Wallet
    ↓
Create Portfolio
    ↓
Intent Wizard
    ↓
Policy Review
    ↓
Create Safe
    ↓
Fund Portfolio
    ↓
Activate
    ↓
Portfolio Dashboard
```

---

# Navigation Structure

```text
Dashboard

Portfolios

Protocols

Activity

Notifications

Settings
```

---

# Primary Screens

---

# Landing Page

Purpose:

Explain Laminar.

---

Headline Concept:

```text
Your Capital.
Your Intent.
Automated Execution.
```

---

Key Sections

---

Hero

---

How It Works

---

Supported Protocols

---

Security

---

FAQ

---

Connect Wallet

---

# Dashboard

Primary application screen.

---

Purpose:

Portfolio overview.

---

Widgets

---

Total Portfolio Value

---

Estimated APY

---

Risk Profile

---

Liquidity Profile

---

Pending Actions

---

Recent Events

---

Recent Executions

---

Portfolio Status

---

Example

```text
Portfolio Value

$15,420
```

---

```text
Estimated Yield

5.8%
```

---

```text
Risk Profile

Conservative
```

---

# Portfolio List

Purpose:

Display all user portfolios.

---

Card Example

```text
Conservative Stable Yield

ACTIVE

$15,420

5.8% APY
```

---

Supported Actions

```text
View

Pause

Resume

Close
```

---

# Portfolio Detail

Most important screen.

---

Purpose:

Portfolio management.

---

Sections

```text
Overview

Allocations

Performance

Policy

Activity

Settings
```

---

# Overview Tab

Displays:

```text
Current Value

Current APY

Risk

Liquidity

Return Preference

Portfolio Status
```

---

# Allocations Tab

Displays current allocation.

Example:

```text
USDC

Morpho

45%
```

```text
USDC

Aave

35%
```

```text
EURC

Moonwell

20%
```

---

# Protocol Routing View

Important V1 Feature.

---

Purpose:

Expose sophistication without increasing complexity.

---

Default View

```text
Conservative Lending Exposure
```

---

Advanced View

```text
Morpho     45%

Aave       35%

Moonwell   20%
```

---

Users should be able to inspect routing.

Not required to understand routing.

---

# Performance Tab

Displays:

```text
Portfolio Value

Performance History

Historical APY

Allocation History
```

---

Charts:

```text
Portfolio Value

Portfolio APY
```

---

V1 should prioritize simplicity.

---

# Policy Tab

Displays active policy.

---

Example

```text
Risk

3/10
```

```text
Liquidity

8/10
```

```text
Return Preference

5/10
```

---

Additional Information

```text
Rebalance Frequency

24 Hours
```

---

```text
Automation

Enabled
```

---

# Activity Tab

Displays:

```text
Portfolio Events

Executions

Risk Events
```

---

Timeline Example

```text
Portfolio Activated

2026-06-01
```

```text
Rebalance Executed

2026-06-03
```

---

# Why Tab

Strategic Differentiator.

---

Purpose:

Explain portfolio decisions.

---

Question:

```text
Why is my capital allocated this way?
```

---

Example Response

```text
Morpho

Highest Opportunity Score
```

```text
Aave

Highest Trust Score
```

```text
Moonwell

Diversification Requirement
```

---

Users should always understand:

```text
What happened

Why it happened
```

---

# Intent Wizard

Critical onboarding component.

---

Purpose:

Translate user preferences into portfolio policy.

---

Not:

```text
Protocol Selection
```

---

Instead:

```text
Desired Outcome Selection
```

---

# Wizard Question 1

Capital Preservation

---

Question:

```text
How important is preserving capital?
```

---

Answer Type:

Slider

```text
1 → 10
```

---

Default Mapping:

```text
Low

Medium

High
```

---

Slider allows refinement.

---

# Wizard Question 2

Liquidity

---

Question:

```text
How quickly might you need access to your funds?
```

---

Slider:

```text
1 → 10
```

---

# Wizard Question 3

Return Preference

---

Question:

```text
How strongly do you prefer maximizing expected portfolio returns?
```

---

Slider:

```text
1 → 10
```

---

# Dynamic Profile Preview

As questions are answered:

Show live updates.

---

Example

```text
Risk

3/10
```

```text
Liquidity

8/10
```

```text
Return Preference

5/10
```

---

Purpose:

Immediate feedback.

---

# Policy Review Screen

Before approval.

---

Must clearly explain:

```text
What Laminar May Do

What Laminar Cannot Do
```

---

Examples

---

May:

```text
Rebalance

Allocate

Withdraw During Emergency
```

---

May Not:

```text
Move Funds Outside Policy

Use Unsupported Protocols

Execute Unauthorized Actions
```

---

User understanding is mandatory.

---

# Safe Creation Screen

Purpose:

Explain Smart Account.

---

User should understand:

```text
Funds remain yours.

Laminar is not a custodian.
```

---

Avoid technical jargon.

---

# Funding Screen

Purpose:

Fund portfolio.

---

Display:

```text
Supported Assets

USDC

EURC

DAI
```

---

Show:

```text
Minimum Gas Reserve
```

---

Clearly separated from investment capital.

---

# Activation Screen

Final confirmation.

---

Example Summary

```text
Portfolio

Conservative Stable Yield
```

```text
Risk

3/10
```

```text
Liquidity

8/10
```

```text
Return Preference

5/10
```

---

```text
Automation

Enabled
```

---

User explicitly confirms.

---

# Rebalance Settings

User configurable.

---

Options

```text
8 Hours

24 Hours

48 Hours

72 Hours
```

---

Subject to eligibility tiers.

---

Display Schedule

Example

```text
Reviews occur at:

00:00 UTC

08:00 UTC

16:00 UTC
```

---

Important:

Transparent scheduling.

---

# Notification Center

Displays:

```text
Portfolio Events

Execution Results

Risk Alerts

Emergency Events
```

---

Priority Levels

```text
Info

Warning

Critical
```

---

# Emergency UI

Critical design area.

---

Display:

```text
Portfolio Status

EMERGENCY
```

---

Explain:

```text
What happened

What Laminar did

What happens next
```

---

Example

```text
Protocol Risk Event Detected

Funds moved to USDC idle position.

No further actions taken.
```

---

Clarity is mandatory.

---

# Mobile Experience

V1 should be:

```text
Responsive
```

---

Not:

```text
Mobile First
```

---

Desktop remains primary.

---

# Recommended Stack

Frontend

```text
Next.js
```

---

Language

```text
TypeScript
```

---

UI

```text
Tailwind

shadcn/ui
```

---

Charts

```text
Recharts
```

---

Wallet Integration

```text
wagmi

viem
```

---

# Future Features

V2

```text
Multi Portfolio Dashboard

Portfolio Templates

Comparative Strategies
```

---

V3

```text
AI Copilot

Natural Language Intent

Portfolio Simulator
```

---

# Success Criteria

The frontend succeeds when:

* users understand their portfolio
* users understand automation
* users understand permissions
* portfolio decisions remain explainable

---

# Failure Criteria

The frontend fails when:

* users feel surprised
* users cannot explain allocations
* automation feels opaque
* protocol behavior appears magical

---

# Architectural Principle

The frontend should make sophisticated portfolio automation feel transparent, predictable, and trustworthy.

Users should always understand:

What they own.

What Laminar is doing.

Why Laminar is doing it.
