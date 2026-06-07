# Core Principles

Version: Draft 1

---

# Purpose

This document defines the non-negotiable principles that govern Laminar.

These principles take precedence over implementation convenience, short-term optimizations, and feature requests.

Whenever uncertainty exists, decisions should be evaluated against these principles.

---

# Principle 1

## User Intent Comes First

Laminar exists to serve user objectives.

Not protocol objectives.

Not yield rankings.

Not TVL rankings.

Not protocol incentives.

Every allocation decision must ultimately optimize for user intent.

---

### Good Example

User:

- low risk
- high liquidity

System selects lower yield opportunities.

---

### Bad Example

User:

- low risk

System allocates capital into a higher-risk protocol solely because APY is higher.

---

# Principle 2

## User Assets Remain User Assets

Laminar is not a custody protocol.

Laminar is not a pooled vault protocol.

Assets remain owned by users at all times.

---

### Implications

No shared vaults.

No pooled balances.

No internal balance accounting.

No synthetic ownership model.

---

### Goal

Users should always be able to say:

> My assets remain in my account.

---

# Principle 3

## Transparency Over Optimization

A slightly less efficient system that users understand is preferable to a more efficient system that users do not understand.

---

### Implications

Every allocation should be explainable.

Every rebalance should be explainable.

Every recommendation should be explainable.

---

### Avoid

Black-box decision making.

---

# Principle 4

## Explainability Is a Product Feature

Explainability is not documentation.

Explainability is part of the product itself.

Users should understand:

- where funds are allocated
- why funds are allocated
- why changes occurred
- why risk actions occurred

---

# Principle 5

## Automation Must Remain Constrained

Automation exists to reduce effort.

Automation does not replace ownership.

Automation does not replace consent.

---

### Laminar May

Execute approved actions.

---

### Laminar May Not

Operate outside approved boundaries.

---

# Principle 6

## Safety Before Yield

Capital preservation takes precedence over yield maximization.

Whenever a conflict exists:

Safety wins.

---

### Example

If APY increases but risk increases disproportionately:

Do not rebalance.

---

# Principle 7

## Deterministic Before Intelligent

V1 prioritizes deterministic systems.

Rules should outperform complexity.

---

### Examples

Preferred:

- scoring models
- rules-based allocation
- rules-based risk systems

Avoid:

- opaque AI decisions
- non-deterministic execution paths

---

### Rationale

Trust is easier to establish when behavior is predictable.

---

# Principle 8

## Intelligence Must Be Auditable

Future AI systems must produce reasoning that can be inspected.

A recommendation without explanation is unacceptable.

---

### Future Requirement

Every AI-driven recommendation should produce:

- rationale
- confidence
- assumptions
- expected outcomes

---

# Principle 9

## Protocol Agnostic Design

Laminar should not depend on any specific protocol.

Protocols are integrations.

Not foundations.

---

### Implications

A protocol may be added.

A protocol may be removed.

Core architecture should remain unchanged.

---

# Principle 10

## Adapters Are The Boundary

All protocol interactions must occur through adapters.

No engine should directly interact with protocol-specific logic.

---

### Benefits

- extensibility
- maintainability
- testing
- portability

---

# Principle 11

## Infrastructure Minimalism

Infrastructure should only be built when it provides strategic advantage.

---

### Avoid

Building:

- indexers
- services
- databases
- monitoring systems

without clear justification.

---

### Preferred Approach

Use existing solutions when:

- reliable
- inexpensive
- non-critical

---

# Principle 12

## Data Quality Should Match Business Need

Not every data point requires real-time precision.

Different data classes require different freshness guarantees.

---

### Class A

Critical risk.

Near real-time.

---

### Class B

Operational.

Minutes.

---

### Class C

Analytical.

Hours or days.

---

# Principle 13

## Rebalance Only When Beneficial

Rebalancing is not free.

Every rebalance consumes:

- gas
- liquidity
- operational complexity

---

### Requirement

Expected benefit should exceed expected cost.

---

### Goal

Avoid unnecessary churn.

---

# Principle 14

## Evaluation Is Not Execution

Detection and execution are separate responsibilities.

---

### Process

Observe

↓

Analyze

↓

Plan

↓

Validate

↓

Execute

---

Never combine all steps into a single component.

---

# Principle 15

## Risk Classification Is Mandatory

Every risk event must be classified before action is taken.

---

### Categories

Hard Risk

Soft Risk

---

### Purpose

Prevent overreaction.

Prevent underreaction.

---

# Principle 16

## Portfolio Construction Must Be Personalized

Different users should receive different portfolios when their intents differ.

---

### Avoid

One-size-fits-all strategies.

---

### Goal

Individualized capital allocation.

---

# Principle 17

## Simplicity Over Feature Count

More features do not necessarily create a better product.

Every feature must justify its existence.

---

### Questions

Does this improve user outcomes?

Does this improve user understanding?

Does this reduce operational burden?

If not, reconsider.

---

# Principle 18

## Security Is A Product Requirement

Security is not an engineering concern alone.

Security directly impacts user trust.

---

### Implications

Security reviews are mandatory.

Permission boundaries are mandatory.

Risk controls are mandatory.

---

# Principle 19

## Revenue Must Not Depend On Token Speculation

Laminar should generate revenue without requiring a token.

---

### Acceptable Revenue

- AUM fees
- premium analytics
- premium automation
- institutional offerings

---

### Avoid

Business models dependent on token appreciation.

---

# Principle 20

## Long-Term Goal

Laminar is not merely a yield aggregator.

Laminar is a capital orchestration platform.

The ultimate objective is:

Autonomous Capital Allocation Infrastructure

capable of deploying capital according to user-defined objectives while preserving transparency, ownership, and control.
