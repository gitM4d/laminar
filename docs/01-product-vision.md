# Laminar Product Vision

Version: Draft 1

---

# Purpose

This document defines the product philosophy, user experience principles, and strategic direction of Laminar.

It is intentionally product-focused rather than implementation-focused.

Technical architecture is defined in separate documents.

---

# Product Mission

Enable any DeFi user to obtain optimized capital allocation without becoming an expert in protocol selection, risk analysis, yield monitoring, or portfolio management.

Users should define objectives.

Laminar should handle execution.

---

# Product Philosophy

Traditional DeFi products force users to think in terms of protocols.

Examples:

- Deposit into Aave
- Deposit into Morpho
- Provide liquidity on Aerodrome
- Use Moonwell

This creates a protocol-centric user experience.

Laminar adopts a different model.

Laminar is user-intent-centric.

The user should never need to ask:

"Which protocol should I use?"

Instead, the user should ask:

"What outcome am I trying to achieve?"

---

# User Intent First

Every portfolio begins with intent.

The protocol selection process is a consequence of intent.

It is not the starting point.

Examples:

User A:

- Preserve capital
- High liquidity
- Stable returns

User B:

- Moderate risk
- Moderate liquidity
- Higher return preference

User C:

- Expected return maximization
- Lower liquidity requirements
- Higher protocol risk tolerance

Each user may receive a different allocation.

---

# Portfolio Personalization

Laminar assumes that no two users are identical.

Users may differ in:

- risk tolerance
- liquidity requirements
- investment horizon
- return preferences
- automation preferences

The system should support individualized portfolio construction whenever possible.

Portfolio standardization should only occur when it improves operational efficiency without reducing user intent fidelity.

---

# Explainability

Automation must remain understandable.

Users should always be able to inspect:

- selected protocols
- allocation percentages
- expected yield
- risk assumptions
- rebalance decisions

Laminar should avoid becoming a black box.

Users do not need to understand every implementation detail.

They should understand why decisions were made.

---

## Return Preference Definition

In Laminar, Return Preference does not mean highest APY.

Return Preference expresses how strongly a user prefers maximizing expected portfolio returns.

Return Preference operates within the user's selected Risk and Liquidity constraints.

Laminar does not optimize for raw APY in isolation.

It optimizes for risk-adjusted outcomes that reflect the user's full intent.

---

# Guided Decision Making

Users should not be required to understand DeFi terminology.

The onboarding experience should guide users through simple questions.

Examples:

- What matters most to you?
- How important is liquidity?
- How much risk are you comfortable taking?
- What is your investment horizon?

The system translates answers into portfolio parameters.

---

# Assisted Control

Laminar provides recommendations.

Users retain final control.

The system should recommend:

- risk settings
- liquidity settings
- return preference settings

Users may adjust those recommendations before portfolio creation.

---

# Intent Dimensions

Laminar represents user preferences using canonical intent dimensions.

Examples:

- Risk
- Liquidity
- Return Preference

Frontend experiences should not expose internal complexity unless beneficial.

---

# Transparency Over Complexity

Whenever possible:

Prefer:

- simple explanations
- understandable terminology
- visual summaries

Avoid:

- protocol-specific jargon
- unnecessary complexity
- technical overload

---

# Trust Through Visibility

Users should clearly understand:

- what Laminar can do
- what Laminar cannot do
- which permissions have been granted
- how automation operates

Permission visibility is a trust feature.

Not a compliance feature.

---

# Non-Custodial by Design

Users maintain ownership of their assets.

Laminar coordinates allocation.

Laminar does not custody funds.

This principle should remain visible throughout the product experience.

---

# Multiple Portfolio Future

The architecture should support multiple portfolios per user.

Examples:

Portfolio A:

- Treasury
- Conservative

Portfolio B:

- Yield Focused

Portfolio C:

- Stablecoin Savings

Portfolio isolation should remain a first-class concept.

---

# Human-Centric Automation

Automation exists to reduce workload.

Automation should never remove visibility.

Every automated action should remain explainable.

Every automated action should remain constrained.

Every automated action should remain reversible whenever possible.

---

# Product Success Criteria

A successful Laminar user should:

- spend less time monitoring DeFi
- maintain acceptable risk exposure
- achieve competitive yield
- understand where capital is allocated
- feel in control of automation

---

# Product Failure Criteria

Laminar has failed if users:

- cannot understand why actions occur
- feel they have lost control
- cannot inspect allocations
- cannot understand permissions
- must continuously monitor the system themselves

---

# Long-Term Vision

Laminar evolves through three stages.

Stage 1:

Intent-Based Yield Allocation

Stage 2:

Automated Risk-Aware Portfolio Management

Stage 3:

AI-Native Capital Allocation Infrastructure

The long-term objective is not merely yield aggregation.

The objective is autonomous capital orchestration aligned with user-defined intent.
