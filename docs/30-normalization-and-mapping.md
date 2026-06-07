# Normalization and Mapping

## Purpose

This document defines how Laminar transforms user intent into portfolio construction inputs.

It acts as the bridge between:

```text
Intent Engine
```

and:

```text
Portfolio Construction Engine
```

The objective is to convert user preferences into a normalized representation that can be consumed consistently by all downstream systems.

---

# Philosophy

Laminar is an intent-first protocol.

Users do not select:

- protocols
- vaults
- strategies
- allocations

Users express preferences.

Laminar translates those preferences into portfolio decisions.

---

# Intent Inputs

Laminar V1 uses three user-facing intent dimensions.

```text
Risk
Liquidity
Return Preference
```

Each dimension is collected on a:

```text
1-10
```

scale.

---

## Risk

Meaning:

```text
Risk Tolerance
```

Official semantics:

```text
1
=
Very Low Risk Tolerance
```

```text
10
=
Very High Risk Tolerance
```

Higher values indicate greater willingness to accept portfolio risk.

---

## Liquidity

Meaning:

```text
Liquidity Preference
```

Official semantics:

```text
1
=
Low Liquidity Requirement
```

```text
10
=
High Liquidity Requirement
```

Higher values indicate stronger preference for capital accessibility.

---

## Return Preference

Meaning:

```text
Return Preference
```

Official semantics:

```text
1
=
Return Is Low Priority
```

```text
10
=
Return Maximization Is High Priority
```

Return Preference does not represent a target APY.

Return Preference expresses willingness to pursue higher expected portfolio returns.

---

# Canonical Scale Model

Laminar uses three different score representations.

---

## User Layer

User-facing inputs:

```text
1-10
```

Examples:

```text
Risk               = 4

Liquidity          = 8

Return Preference  = 6
```

---

## Internal Layer

Internal computation values:

```text
0.0 - 1.0
```

Examples:

```text
risk_factor        = 0.40

liquidity_factor   = 0.80

return_factor      = 0.60
```

All scoring engines should operate using normalized values.

---

## Explainability Layer

User-visible scores:

```text
0-100
```

Examples:

```text
Trust Score      = 92

Liquidity Score  = 85

Risk Score       = 71
```

These scores are display representations.

They are not the canonical internal format.

---

# Normalization

Laminar converts user inputs into normalized values.

Example:

```text
Risk = 4
```

↓

```text
risk_factor = 0.40
```

---

Example:

```text
Liquidity = 8
```

↓

```text
liquidity_factor = 0.80
```

---

Example:

```text
Return Preference = 6
```

↓

```text
return_factor = 0.60
```

---

# Portfolio Profiles

Laminar V1 defines three portfolio profiles.

```text
Conservative

Balanced

Yield Focused
```

These profiles are not selected manually.

Profiles are derived automatically from user intent.

---

# Profile Classification

Laminar does not use:

- rigid buckets
- simple averages
- dominant-dimension classification

Laminar uses:

```text
Weighted Distance Classification
```

The system measures how closely a user matches each profile.

The closest profile becomes the selected portfolio profile.

---

# Ideal Profile Vectors

Each profile is represented by an ideal vector.

---

## Conservative

```text
Risk               = 1

Liquidity          = 10

Return Preference  = 2
```

---

## Balanced

```text
Risk               = 5

Liquidity          = 6

Return Preference  = 5
```

---

## Yield Focused

```text
Risk               = 8

Liquidity          = 5

Return Preference  = 10
```

---

# Profile Weights

Each profile defines the relative importance of the three intent dimensions.

These weights are used during profile classification.

---

## Conservative

```text id="nq7b7w"
Risk               50%

Liquidity          40%

Return Preference  10%
```

### Philosophy

Conservative users prioritize:

1. Capital preservation
2. Capital accessibility
3. Return optimization

---

## Balanced

```text id="lz70tb"
Risk               33%

Liquidity          33%

Return Preference  34%
```

### Philosophy

Balanced users seek equilibrium between:

- safety
- accessibility
- portfolio returns

No dimension dominates.

---

## Yield Focused

```text id="1wl7vb"
Risk               15%

Liquidity          25%

Return Preference  60%
```

### Philosophy

Yield Focused users prioritize portfolio returns while maintaining reasonable liquidity and risk controls.

---

# Weighted Distance Model

For each profile, Laminar calculates a weighted distance between:

```text id="sp7yzl"
User Intent Vector
```

and:

```text id="7pwnlp"
Ideal Profile Vector
```

---

Conceptually:

```text id="x3h4bl"
distance

=

weighted_difference(
    user_vector,
    profile_vector
)
```

---

The profile with the smallest distance becomes the selected profile.

---

# Example

User:

```text id="r7r4ra"
Risk               = 2

Liquidity          = 9

Return Preference  = 3
```

---

Distance to:

```text id="yxzjku"
Conservative
```

↓

Small

---

Distance to:

```text id="jlwmgk"
Balanced
```

↓

Moderate

---

Distance to:

```text id="9jsrmz"
Yield Focused
```

↓

Large

---

Result:

```text id="9l1l7g"
Selected Profile

=

Conservative
```

---

# Profile Selection

Profile selection is fully automatic.

Users do not choose:

```text id="wgg17u"
Conservative

Balanced

Yield Focused
```

directly.

Laminar determines the most appropriate profile based on intent inputs.

---

# Tie Resolution

Ties are expected to be uncommon.

If two profiles produce identical classification scores:

Laminar should prefer:

```text id="r2m89s"
Balanced
```

over extreme profiles.

---

Example:

```text id="nq6g2i"
Conservative Score = 78

Balanced Score     = 78

Yield Focused Score = 61
```

Result:

```text id="2w9ecg"
Balanced
```

---

# Mapping to Portfolio Construction

Profile selection does not create allocations directly.

Profile selection creates:

```text id="q7owxe"
Portfolio Policy
```

---

Portfolio Policy then defines:

- risk limits
- liquidity requirements
- protocol eligibility
- exposure targets
- allocation constraints

---

Example:

```text id="vwxnd8"
User Intent
```

↓

```text id="htqv4z"
Selected Profile
```

↓

```text id="dx20ht"
Portfolio Policy
```

↓

```text id="dyepwl"
Target Exposure Model
```

↓

```text id="v5j29e"
Opportunity Scoring
```

↓

```text id="ekg0tv"
Portfolio Allocation
```

---

# Explainability

Laminar should expose profile classification reasoning.

Example:

```text id="ec3wwi"
Conservative Score = 84

Balanced Score     = 62

Yield Focused Score = 41
```

Selected:

```text id="7jocv4"
Conservative
```

---

Users should be able to understand:

```text id="txzh96"
Why was this profile selected?
```

without requiring knowledge of internal calculations.

---

# Architectural Role

This document defines the normalization layer between:

```text id="5ibjlwm"
Intent Engine
```

and:

```text id="bbs74k"
Portfolio Construction Engine
```

It does not define:

- Trust Scoring
- Liquidity Scoring
- Risk Scoring
- Opportunity Scoring
- Portfolio Allocation

Those systems consume the outputs produced by this mapping layer.

---

# V1 Scope Boundaries

Normalization and Mapping V1 intentionally excludes:

- machine learning classification
- adaptive profile generation
- personalized profile discovery
- behavioral feedback loops
- dynamic profile evolution
- profile clustering
- AI-generated user segmentation

Laminar V1 uses deterministic profile classification.

---

# Future Extensions

Potential future enhancements include:

- adaptive profile vectors
- continuous profile spaces
- behavioral reclassification
- profile confidence scoring
- AI-assisted intent interpretation

These features are explicitly outside the scope of Laminar V1.
