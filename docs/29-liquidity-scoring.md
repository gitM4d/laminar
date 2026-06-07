# Liquidity Scoring

## Purpose

The Liquidity Score measures:

> Capital Accessibility

Liquidity Score answers a single question:

> How easily can a user recover capital from a position?

Liquidity Score is not intended to measure:

- protocol popularity
- protocol TVL
- APY attractiveness
- portfolio performance

Liquidity Score evaluates how accessible capital remains after deployment.

The Liquidity Score is one of the primary inputs used by:

- Portfolio Construction
- Rebalancing Decisions
- Portfolio Recommendations
- Opportunity Scoring

---

# Terminology Distinction

## User Liquidity Preference

Intent Input

```text
1-10
```

User Liquidity Preference expresses how much access to capital the user wants.

---

## Liquidity Score

Opportunity Attribute

```text
0-100
```

Liquidity Score measures how accessible capital remains after deployment into a specific opportunity.

---

# Core Principles

## Capital Accessibility First

Liquidity is not defined as trading efficiency.

Liquidity is defined as:

> The ability of a user to access capital when needed.

Laminar prioritizes:

- withdrawal speed
- withdrawal flexibility
- redemption reliability

over:

- execution optimization
- trading efficiency

---

## Liquidity Scoring Ownership

Liquidity characteristics are evaluated exclusively by Liquidity Scoring.

Examples:

- lockups
- withdrawal delays
- withdrawal queues
- redemption accessibility

These characteristics should not be re-scored by Risk Scoring.

---

## Explainability

Liquidity Scores must be explainable.

Users should understand why a position received a specific score.

Example:

Liquidity Score: 88

Reasons:

- Instant withdrawals
- No lockup period
- Reliable redemption path
- Low exit slippage

Laminar favors explainable scoring over black-box models.

---

## Accessibility Over TVL

High TVL does not necessarily imply high liquidity.

Example:

Protocol A

- $1B TVL
- Instant withdrawals

Protocol B

- $1B TVL
- 21-day withdrawal delay

These positions should not receive the same Liquidity Score.

Liquidity is determined by capital accessibility rather than capital size.

---

# Liquidity Architecture

Liquidity Score is composed of four components.

```text
Withdrawal Speed        35%

Withdrawal Constraints  30%

Redemption Reliability  20%

Exit Slippage           15%
```

These components produce:

```text
Liquidity Score
0-100
```

---

# Component 1

## Withdrawal Speed

Weight:

```text
35%
```

Withdrawal Speed measures:

> How quickly capital becomes available after a withdrawal request.

---

### Philosophy

Faster access to capital increases liquidity.

Long withdrawal periods reduce liquidity.

---

### V1 Bucket Model

#### Instant

Examples:

- Lending withdrawals
- V1-supported lending positions

Contribution:

```text
100
```

---

#### Less Than 1 Day

Contribution:

```text
90
```

---

#### 1–7 Days

Contribution:

```text
75
```

---

#### 7–30 Days

Contribution:

```text
50
```

---

#### 30–90 Days

Contribution:

```text
25
```

---

#### More Than 90 Days

Contribution:

```text
0
```

---

# Component 2

## Withdrawal Constraints

Weight:

```text
30%
```

Withdrawal Constraints measure:

> Structural limitations that restrict access to capital.

---

### Examples

No Restrictions

- Immediate withdrawal

Highest contribution.

---

Cooldown Periods

Examples:

- withdrawal cooldowns
- withdrawal waiting periods

Reduced contribution.

---

Withdrawal Queues

Examples:

- queued redemption systems
- delayed withdrawal processing

Further reduction.

---

Epoch-Based Withdrawals

Examples:

- periodic redemption windows

Lower contribution.

---

Hard Lockups

Examples:

- fixed lock periods
- mandatory holding periods

Significant reduction.

---

### Philosophy

A position may have excellent yield generation.

However, if capital cannot be freely accessed, liquidity should be lower.

Liquidity reflects user flexibility.

---

# Component 3

## Redemption Reliability

Weight:

```text
20%
```

Redemption Reliability measures:

> The probability that capital can be recovered when needed.

It evaluates operational accessibility rather than simply withdrawal availability.

---

### Evaluation Factors

Examples include:

- withdrawal queues
- redemption delays
- liquidity bottlenecks
- counterparty dependencies
- emergency redemption mechanisms
- protocol-specific redemption risks

---

### Philosophy

Liquidity is not merely:

```text
Can a withdrawal be requested?
```

Liquidity is:

```text
Can capital realistically be recovered?
```

---

### Example

Protocol A

- Instant redemption
- No queues
- No dependencies

Result:

```text
Very High Reliability
```

Protocol B

- Withdrawal queue
- Redemption bottlenecks
- Emergency withdrawal mode

Result:

```text
Lower Reliability
```

---

# Component 4

## Exit Slippage

Weight:

```text id="g92t0m"
15%
```

Exit Slippage measures:

> Expected value loss when exiting a position.

Laminar V1 evaluates slippage at the asset level.

---

### V1 Scope

Liquidity assessment considers:

- asset liquidity quality
- asset market depth classification
- expected exit efficiency

Examples:

#### Very High Liquidity

```text id="1jkk1o"
USDC

EURC

DAI
```

---

#### High Liquidity

```text id="0vbd4k"
Aave lending positions

Morpho lending positions

Moonwell lending positions
```

---

#### Medium Liquidity

```text id="1t7tx6"
Aerodrome stable pool positions

Yield enhancement positions using V1-supported assets
```

---

#### Low Liquidity

```text id="3cqknw"
V1-supported positions with extended withdrawal constraints

V1-supported positions with limited redemption accessibility
```

---

### Philosophy

Liquidity Score should answer:

```text id="b8v3u5"
How accessible is capital?
```

not:

```text id="t1i7ob"
What is the exact execution cost?
```

Precise execution impact belongs to the Execution Engine.

---

# Liquidity Evaluation Model

Laminar V1 uses:

```text id="yv58vt"
Weighted Score
+
Liquidity Caps
+
Eligibility Rules
```

---

## Layer 1

### Liquidity Score

Calculated from:

```text id="9nld0w"
Withdrawal Speed        35%

Withdrawal Constraints  30%

Redemption Reliability  20%

Exit Slippage           15%
```

Produces:

```text id="pxk6q4"
Liquidity Score
0-100
```

---

## Layer 2

### Liquidity Caps

Certain characteristics limit the maximum achievable Liquidity Score.

---

### Example

```text id="o4ykgp"
90-day lockup
```

may prevent a position from reaching:

```text id="2v4q4m"
Liquidity Score > 90
```

even if other characteristics are excellent.

---

### Philosophy

Some liquidity restrictions are too significant to be offset by other positive attributes.

---

## Layer 3

### Eligibility Rules

Certain positions may become ineligible regardless of score.

Examples:

```text id="jj6p9j"
Permanent capital lock

Undefined redemption process

Unavailable withdrawals

Unbounded withdrawal queues
```

Result:

```text id="n1d8yl"
Non-Eligible
```

---

### Philosophy

A high score should never hide structural liquidity limitations.

---

# Portfolio Construction Usage

Liquidity Score is used during portfolio construction.

---

## Conservative Profiles

Prefer positions with:

```text id="rrn42j"
Very High Liquidity
```

Characteristics:

- instant withdrawals
- minimal constraints
- highly reliable redemption

---

## Balanced Profiles

Accept moderate liquidity tradeoffs.

Characteristics:

- short withdrawal periods
- limited restrictions
- predictable redemption paths

---

## Yield Focused Profiles

May accept reduced liquidity in exchange for improved portfolio outcomes.

Characteristics:

- longer withdrawal periods
- moderate restrictions
- acceptable redemption complexity

All liquidity decisions remain constrained by user intent.

---

# Explainability Model

Liquidity Scores must be explainable.

Example:

```text id="e6cg11"
Liquidity Score = 84

Withdrawal Speed: 30 / 35

Withdrawal Constraints: 24 / 30

Redemption Reliability: 18 / 20

Exit Slippage: 12 / 15
```

Users should understand:

```text id="s7e6de"
Why is liquidity high?

Why is liquidity low?
```

without requiring knowledge of internal formulas.

---

# Configuration

Liquidity scoring parameters should be configurable.

Examples:

- component weights
- lockup buckets
- liquidity caps
- eligibility thresholds

Configuration should be centralized through protocol configuration systems.

No portfolio logic should depend on hardcoded liquidity values.

---

# V1 Scope Boundaries

Liquidity Scoring V1 intentionally excludes:

- real-time order book analysis
- dynamic slippage simulation
- user-specific exit impact modeling
- maturity-adjusted liquidity curves
- stress-testing engines
- market microstructure analysis

These features may be considered in future protocol versions.

---

# Future Extensions

Potential future enhancements include:

- portfolio-level liquidity modeling
- dynamic market depth evaluation
- maturity-aware fixed-income scoring
- chain-specific liquidity adjustments
- stress-condition liquidity analysis

These capabilities are explicitly outside the scope of Laminar V1.
