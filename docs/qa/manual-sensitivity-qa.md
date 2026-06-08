# Manual Sensitivity QA Guide

Deterministic manual QA pack for validating Laminar recommendation behavior across profiles.

This is a developer QA aid, not a product feature.

## Prerequisites

```bash
npm run api          # terminal 1
npm run frontend     # terminal 2 (optional, for UI checks)
npm run sensitivity  # or: npm run qa:sensitivity
```

Fixed reference date used by fixtures and the sensitivity matrix:

```text
asOf: 2026-06-01T00:00:00.000Z
```

Always include `asOf` from the fixture when calling the API manually. Without it, trust decay and outputs may drift over time.

## Tolerances

Use these tolerances when comparing API, frontend, or `npm run sensitivity` output to expected summaries:

| Field | Tolerance |
|---|---|
| `expectedApy` | ±0.5 percentage points |
| `strategyAllocationPercent` | ±2.0% |
| `liquidityBufferPercent` | ±2.0% |
| `gasReservePercent` | ±0.05% (or ±0.1% for large portfolios) |
| `topStrategyLabel` | exact match |
| `selectedProfile` | exact match |
| `warningCodes` | same codes; order may differ |

## Fixtures

Request bodies:

```text
docs/qa/fixtures/*.request.json
```

Expected summary references:

```text
docs/qa/fixtures/expected/*.summary.json
```

### API smoke test (one case)

```bash
curl -s -X POST http://127.0.0.1:3000/recommendation \
  -H "Content-Type: application/json" \
  -d @docs/qa/fixtures/balanced-default.request.json \
  | jq '.snapshot | {profile, metrics, warnings: [.warnings[].code]}'
```

## What to verify

### Frontend (`http://127.0.0.1:5173`)

1. Enter intent sliders and portfolio value from the test case.
2. Submit **Generate Recommendation**.
3. Confirm **Recommendation Snapshot**:
   - Profile matches expected `selectedProfile`.
   - Expected APY within tolerance.
   - Positions table shows expected strategy labels and allocation %.
   - Liquidity buffer and gas reserve visible when expected.
4. Confirm **Warnings** list includes expected codes.
5. Confirm **Mock Execution Plan** shows deposit steps for strategy positions and the notice that no blockchain transaction is created.

### API / sensitivity output

1. `snapshot.profile` matches expected profile.
2. Snapshot metrics (`expectedApy`, `strategyAllocationPercent`, `liquidityBufferPercent`, `gasReservePercent`) within tolerance.
3. Strategy position count and top allocation label match expected summary.
4. `snapshot.warnings[].code` includes expected warning codes.
5. `npm run sensitivity` table row for the scenario aligns with the expected summary.

---

## Test cases

### 1. Conservative default

**Fixture:** `conservative-default.request.json`  
**Expected:** `expected/conservative-default.summary.json`

| Field | Value |
|---|---|
| Intent | risk `1`, liquidity `10`, returnPreference `2` |
| portfolioValueUsd | `10000` |
| selectedProfile | `Conservative` |

**Qualitative behavior**

- Selects **Conservative** profile.
- Allocates to **Aave Prime USDC** only (Conservative-safe mock opportunity).
- Low expected APY (~3.7%).
- Large liquidity buffer (~55%) because Conservative policy keeps significant idle capital.
- Does **not** include Aerodrome or experimental opportunities.

**Expected warning codes**

- `highLiquidityBuffer`
- `rejectedOpportunities`

**Frontend checks**

- Profile: Conservative.
- One strategy row: Aave Prime USDC (~44.5%).
- Liquidity buffer ~54.5%.
- Warnings mention high liquidity buffer and rejected opportunities.

**API / sensitivity checks**

- `#Strat = 1`, `#Rej = 8`, top strategy `Aave Prime USDC`.

---

### 2. Balanced default

**Fixture:** `balanced-default.request.json`  
**Expected:** `expected/balanced-default.summary.json`

| Field | Value |
|---|---|
| Intent | risk `5`, liquidity `6`, returnPreference `5` |
| portfolioValueUsd | `10000` |
| selectedProfile | `Balanced` |

**Qualitative behavior**

- Selects **Balanced** profile.
- Allocates to **lending** opportunities: Morpho USDC and Aave Prime USDC.
- Aerodrome (yieldEnhancement) is **rejected** by Balanced liquidity policy, so yield bucket is reassigned to lending.
- Moderate expected APY (~5.4%).
- Two strategy positions, equal top lending weights (~39.6% each).

**Expected warning codes**

- `rejectedOpportunities`
- `sameAssetConcentration`

**Frontend checks**

- Profile: Balanced.
- Two strategy rows: Morpho USDC and Aave Prime USDC.
- No Aerodrome row.
- Implicit liquidity buffer ~19.8% from stablecoin cap overflow.

**API / sensitivity checks**

- `#Strat = 2`, `#Rej = 4`, top strategy `Morpho USDC` at ~39.6%.

---

### 3. Yield Focused default

**Fixture:** `yield-focused-default.request.json`  
**Expected:** `expected/yield-focused-default.summary.json`

| Field | Value |
|---|---|
| Intent | risk `8`, liquidity `5`, returnPreference `10` |
| portfolioValueUsd | `10000` |
| selectedProfile | `Yield Focused` |

**Qualitative behavior**

- Selects **Yield Focused** profile.
- Multi-bucket construction: **lending** (Morpho, Aave Prime) + **yieldEnhancement** (Aerodrome).
- Higher expected APY (~7.7%) than Balanced.
- Top strategy position is **Aerodrome USDC** (~31.7%).
- Three strategy positions total.

**Expected warning codes**

- `rejectedOpportunities`
- `sameAssetConcentration`

**Frontend checks**

- Profile: Yield Focused.
- Three strategy rows including Aerodrome USDC.
- Expected APY noticeably higher than Balanced default case.

**API / sensitivity checks**

- `#Strat = 3`, `#Rej = 1`, top strategy `Aerodrome USDC`.
- APY > Balanced default APY.

---

### 4. Low liquidity / high return

**Fixture:** `low-liquidity-high-return.request.json`  
**Expected:** `expected/low-liquidity-high-return.summary.json`

| Field | Value |
|---|---|
| Intent | risk `8`, liquidity `2`, returnPreference `10` |
| portfolioValueUsd | `10000` |
| selectedProfile | `Yield Focused` |

**Qualitative behavior**

- Classifies as **Yield Focused** despite very low liquidity input.
- Portfolio outcome matches Yield Focused default (same ranking/construction with current mock universe).
- Confirms return-preference and risk inputs can dominate profile selection.

**Expected warning codes**

- `rejectedOpportunities`
- `sameAssetConcentration`

**Frontend checks**

- Profile: Yield Focused.
- Same three-position pattern as Yield Focused default.

**API / sensitivity checks**

- Row matches Yield Focused default in sensitivity matrix.

---

### 5. High liquidity / low risk

**Fixture:** `high-liquidity-low-risk.request.json`  
**Expected:** `expected/high-liquidity-low-risk.summary.json`

| Field | Value |
|---|---|
| Intent | risk `1`, liquidity `10`, returnPreference `1` |
| portfolioValueUsd | `10000` |
| selectedProfile | `Conservative` |

**Qualitative behavior**

- Selects **Conservative** profile.
- Outcome matches Conservative default: Aave Prime only, low APY, high liquidity buffer.
- Lowest return preference reinforces capital-preservation posture.

**Expected warning codes**

- `highLiquidityBuffer`
- `rejectedOpportunities`

**Frontend checks**

- Profile: Conservative.
- Single Aave Prime strategy position.

**API / sensitivity checks**

- Row matches Conservative default in sensitivity matrix.

---

### 6. Balanced small portfolio

**Fixture:** `balanced-small.request.json`  
**Expected:** `expected/balanced-small.summary.json`

| Field | Value |
|---|---|
| Intent | risk `5`, liquidity `6`, returnPreference `5` |
| portfolioValueUsd | `500` |
| selectedProfile | `Balanced` |

**Qualitative behavior**

- Same Balanced intent as default but with **$500** portfolio.
- Allocation **percentages** match $10k case; USD amounts scale down.
- Gas reserve still respects minimum USD clamp.

**Expected warning codes**

- `rejectedOpportunities`
- `sameAssetConcentration`

**Frontend checks**

- Enter portfolio value `500`.
- Profile Balanced; two lending strategy positions.
- USD allocations roughly 1/20 of $10k case.

**API / sensitivity checks**

- Strategy % and APY match Balanced default; `portfolioValueUsd` is `500`.

---

### 7. Balanced large portfolio

**Fixture:** `balanced-large.request.json`  
**Expected:** `expected/balanced-large.summary.json`

| Field | Value |
|---|---|
| Intent | risk `5`, liquidity `6`, returnPreference `5` |
| portfolioValueUsd | `100000` |
| selectedProfile | `Balanced` |

**Qualitative behavior**

- Same Balanced intent with **$100,000** portfolio.
- APY unchanged; strategy/buffer **percentages** slightly shift due to gas reserve clamp (max USD cap).
- Gas reserve % drops to ~0.1% (max $100 gas reserve on large portfolio).

**Expected warning codes**

- `rejectedOpportunities`
- `sameAssetConcentration`

**Frontend checks**

- Enter portfolio value `100000`.
- Gas reserve % much smaller than $10k case.
- Strategy labels unchanged (Morpho + Aave Prime).

**API / sensitivity checks**

- `gasReservePercent` ~0.1%.
- `strategyAllocationPercent` ~79.9%, `liquidityBufferPercent` ~20.0%.

---

## Quick matrix check

Run:

```bash
npm run qa:sensitivity
```

Compare the printed table against `docs/qa/fixtures/expected/*.summary.json` using the tolerances above.

## Regression checklist

- [ ] All 7 API fixtures return HTTP 200 from `POST /recommendation`
- [ ] `selectedProfile` exact match for all 7 cases
- [ ] Yield Focused APY > Balanced APY
- [ ] Conservative has ≥1 strategy position (Aave Prime)
- [ ] Yield Focused includes Aerodrome in strategy positions
- [ ] Balanced does **not** include Aerodrome
- [ ] `npm run check` passes
