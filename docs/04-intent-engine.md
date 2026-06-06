# Intent Engine

Version: Draft 1

---

# Purpose

The Intent Engine is responsible for translating human objectives into machine-readable portfolio constraints.

It is the entry point of the Laminar decision pipeline.

The Intent Engine does not:

* select protocols
* allocate capital
* evaluate risk
* execute transactions

Its only responsibility is to transform user intent into normalized portfolio parameters.

---

# Core Philosophy

Users should express desired outcomes.

Users should not be required to understand:

* lending markets
* protocol mechanics
* utilization rates
* yield sources
* liquidity structures

The user defines objectives.

The system translates those objectives into constraints.

---

# High Level Flow

```text id="2hfd4a"
User Intent
      │
      ▼
Intent Questionnaire
      │
      ▼
Normalization and Mapping
      │
      ▼
Selected Profile
      │
      ▼
Portfolio Policy
      │
      ▼
Opportunity Discovery
      │
      ▼
Trust Scoring
      │
      ▼
Liquidity Scoring
      │
      ▼
Risk Engine
      │
      ▼
Opportunity Scoring
      │
      ▼
Portfolio Construction
      │
      ▼
Portfolio Allocation
      │
      ▼
Execution
```

---

# Inputs

The Intent Engine receives:

## Questionnaire Responses

Examples:

* primary objective
* liquidity needs
* investment horizon
* risk comfort level

---

## Manual Adjustments

Users may adjust:

* Risk
* Liquidity
* Return Preference

using sliders.

---

## Portfolio Metadata

Examples:

* portfolio name
* portfolio type
* automation preference

---

# User Experience Model

Laminar follows a:

Guided Intent Builder

approach.

Users are guided through questions.

The system proposes settings.

The user may fine-tune them.

---

# Intent Categories

The Intent Engine produces three primary dimensions.

---

## Risk

Measures risk tolerance.

Range:

```text id="g9wr4v"
1 - 10
```

---

Interpretation:

```text id="ux6j2e"
1   Very Low Risk Tolerance

10  Very High Risk Tolerance

Higher values indicate greater willingness to accept portfolio risk.
```

---

# Liquidity

Measures liquidity requirements.

Range:

```text id="c2q2a8"
1 - 10
```

---

Interpretation:

```text id="9r72l5"
1-3   Liquidity not important

4-6   Moderate liquidity

7-10  High liquidity required
```

---

# Return Preference

Measures preference for maximizing expected portfolio returns.

Range:

```text id="yd4s6o"
1 - 10
```

---

Interpretation:

```text id="lljlwm"
1-3   Stability focused

4-6   Balanced

7-10  Return focused
```

---

# Internal Representation

Frontend displays:

```text id="n0cl6u"
1-10
```

inputs.

Internally, Laminar normalizes values into:

```text id="wlc0mx"
0.0 - 1.0
```

Profile classification uses:

```text id="a8z4wm"
Weighted Distance Classification
```

against:

```text id="l0b2zx"
Ideal Profile Vectors
```

using:

```text id="x2p9da"
Profile Weights
```

Example:

```text id="n7kq1a"
Risk = 4
↓
risk_factor = 0.40

Liquidity = 8
↓
liquidity_factor = 0.80
```

`liquidity_factor` is reserved for normalized user Liquidity intent.

The closest profile becomes the selected portfolio profile.

```text id="bz1m7q"
Conservative
Balanced
Yield Focused
```

---

# Questionnaire Structure

The onboarding process should remain simple.

Maximum target:

```text id="fukxps"
5-10 questions
```

---

# Example Question 1

## What is your primary goal?

Options:

* Preserve capital
* Balance risk and expected returns
* Maximize expected returns

---

Mapping Example:

```text id="v2idqj"
Preserve Capital

Risk = 2
Liquidity = 8
Return Preference = 3
```

---

```text id="wm0pqv"
Balanced

Risk = 5
Liquidity = 5
Return Preference = 5
```

---

```text id="vbx1cz"
Maximize Expected Returns

Risk = 8
Liquidity = 3
Return Preference = 9
```

---

# Example Question 2

## How important is liquidity?

Options:

* Very Important
* Moderately Important
* Not Important

Adjusts:

```text id="8p3w4m"
Liquidity
```

---

# Example Question 3

## What investment horizon best describes you?

Options:

* Short Term
* Medium Term
* Long Term

Adjusts:

* Risk
* Liquidity

---

# Example Question 4

## What concerns you most?

Options:

* Losing capital
* Missing yield opportunities
* Limited liquidity

Adjusts intent scores accordingly.

---

# Fine-Tuning Layer

After onboarding:

Laminar presents:

```text id="rrtfte"
Risk
Liquidity
Return Preference
```

sliders.

Users may manually adjust them.

---

# Design Principle

The system recommends.

The user decides.

---

# Portfolio Preview

The UI should provide a live preview.

Examples:

Expected APY

Expected Liquidity

Expected Risk Profile

Potential Selected Profile

---

# Example

```text id="c5fh7l"
Risk = 2

Selected Profile: Conservative
```

---

```text id="mlbb7g"
Risk = 6

Selected Profile: Balanced
```

---

These are illustrative only.

Actual allocations are generated later by Portfolio Construction.

---

# Output Schema

The Intent Engine produces:

```typescript id="0uksg9"
IntentProfile {

  risk: number

  liquidity: number

  returnPreference: number

  rebalanceFrequency: number

}
```

Selected Profile is produced by Normalization and Mapping.

Portfolio Policy is produced after profile classification.

---

# Rebalance Preference

Users select desired evaluation frequency.

Allowed options:

```text id="lm9u4k"
8h
24h
48h
72h
```

Availability depends on portfolio size.

---

# Frequency Eligibility Rules

Example:

```text id="ydg7kj"
< $1,000
72h only

$1,000 - $10,000
24h+

$10,000+
8h+
```

Exact thresholds may evolve.

---

# Portfolio Types

Future versions may support templates.

Examples:

* Conservative Income
* Treasury Reserve
* Yield Focused
* Stablecoin Savings

Internally, templates still produce Selected Profiles through Normalization and Mapping.

---

# Multiple Portfolios

A user may create multiple portfolios.

Each portfolio has:

* independent user intent
* independent Selected Profile
* independent allocations
* independent risk profile
* independent automation settings

---

# Non-Goals

The Intent Engine does not:

* evaluate protocols
* compute APY
* calculate allocations
* rank opportunities
* manage risk

These responsibilities belong to later stages.

---

# Success Criteria

A successful Intent Engine:

* captures user objectives accurately
* remains understandable
* minimizes onboarding friction
* generates meaningful portfolio constraints
* creates consistent outputs

---

# Failure Criteria

The Intent Engine has failed if:

* users cannot understand questions
* users cannot understand resulting profiles
* different users receive identical profiles despite different objectives
* onboarding becomes protocol-centric

---

# Architectural Position

```text id="snfhdb"
User Intent
  ↓

Normalization and Mapping

  ↓

Selected Profile

  ↓

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

The Intent Engine is the foundation of the Laminar decision pipeline.

Everything downstream depends on the quality of its outputs.
