# Protocol Adapters

Version: Draft 1

---

# Purpose

The Protocol Adapter Layer is responsible for abstracting protocol-specific logic behind a standardized interface.

Every interaction between Laminar and external protocols must occur through adapters.

This is a mandatory architectural rule.

No engine may interact directly with protocol contracts.

---

# Core Philosophy

Protocols change.

Architecture should not.

Laminar should be able to:

* add protocols
* remove protocols
* upgrade integrations

without modifying core business logic.

Adapters exist to isolate protocol complexity.

---

# Position In Architecture

```text id="lq2n8v"
Protocols
      ↓
Protocol Adapters
      ↓
Data Layer
      ↓
Trust Scoring

Liquidity Scoring

Risk Engine

Opportunity Scoring

Portfolio Construction

Execution Engine
```

Downstream allocation follows the canonical pipeline:

```text
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

---

# Architectural Rule

All protocol-specific knowledge belongs inside adapters.

Examples:

* contract addresses
* ABI definitions
* transaction construction
* protocol quirks
* protocol-specific calculations

These concerns must never leak into core engines.

---

# Benefits

Adapter architecture provides:

* modularity
* extensibility
* testability
* protocol independence
* simplified maintenance

---

# V1 Supported Protocols

Execution Support:

```text id="1fzktm"
Morpho

Aave

Moonwell

Aerodrome
```

---

Read-Only Support:

Unlimited.

Any protocol may be integrated as a read-only source through an adapter.

---

# Adapter Responsibilities

Adapters are responsible for:

* reading protocol state
* normalizing protocol data
* estimating execution costs
* constructing transactions
* validating protocol operations
* exposing protocol metadata

---

Adapters are not responsible for:

* scoring
* portfolio construction
* risk evaluation
* execution scheduling

---

# Standard Adapter Interface

Every adapter must implement a common interface.

---

Example:

```typescript id="j2pax8"
interface ProtocolAdapter {

  getProtocolMetadata()

  getSupportedAssets()

  getMetrics()

  getPositions()

  estimateDeposit()

  estimateWithdraw()

  buildDepositTx()

  buildWithdrawTx()

}
```

---

The interface may evolve.

Core compatibility must remain stable.

---

# Adapter Categories

---

# Read Adapter

Provides protocol data.

Examples:

* APY
* TVL
* utilization
* liquidity

---

Responsibilities:

```text id="sphjzy"
Read Only
```

---

No transaction creation.

---

# Execution Adapter

Supports on-chain actions.

Examples:

* deposit
* withdraw

---

Responsibilities:

```text id="e7zpq7"
Read

Estimate

Build Transactions
```

---

# Protocol Metadata

Every adapter should expose metadata.

Example:

```typescript id="mwnkg6"
ProtocolMetadata {

  protocolId: string

  name: string

  category: string

  supportedAssets: string[]

}
```

---

# Protocol Categories

Examples:

```text id="rxtaq1"
Lending

Yield

Liquidity

Staking
```

---

Categories may expand.

---

# Metrics Interface

Every adapter should provide normalized metrics.

---

Example:

```typescript id="3ydyy4"
ProtocolMetrics {

  protocolId: string

  tvl: number

  apy: number

  liquidity: number

  utilization: number

}
```

---

Raw protocol formats should never reach core engines.

---

# Supported Assets Interface

Example:

```typescript id="jlwmfw"
SupportedAsset {

  symbol: string

  address: string

}
```

---

# Position Interface

Example:

```typescript id="xcyq3m"
ProtocolPosition {

  asset: string

  balance: string

  valueUSD: number

}
```

---

# Deposit Estimation

Adapters must estimate outcomes before execution.

---

Example:

```typescript id="p84gdz"
DepositEstimate {

  expectedShares: string

  estimatedGas: number

}
```

---

Purpose:

Support execution planning.

---

# Withdrawal Estimation

Example:

```typescript id="7mg4p5"
WithdrawEstimate {

  expectedAssets: string

  estimatedGas: number

}
```

---

# Transaction Builders

Adapters build transactions.

They do not submit them.

---

Example:

```typescript id="vq6yrg"
buildDepositTx()

buildWithdrawTx()
```

---

Output:

```typescript id="11ncyg"
TransactionRequest
```

---

Execution submission belongs to the Execution Engine.

---

# Adapter Isolation Principle

If a protocol changes:

Only the adapter should require modification.

---

Example

Aave upgrades contracts.

Expected Impact:

```text id="l05g2j"
Aave Adapter Updated

Everything Else Unchanged
```

---

This is a critical design objective.

---

# Adapter Registry

Laminar maintains a registry.

Example:

```typescript id="f0zwwh"
AdapterRegistry {

  adapters: ProtocolAdapter[]

}
```

---

Purpose:

* discovery
* routing
* capability detection

---

# Capability Flags

Adapters should expose supported capabilities.

---

Example:

```typescript id="w2a2jv"
Capabilities {

  read: true

  deposit: true

  withdraw: true

}
```

---

Future:

```typescript id="8tmz7h"
swap

bridge

stake

unstake
```

---

# Asset Compatibility

Not every protocol supports every asset.

Adapters must expose compatibility.

---

Example:

```text id="lbgz2x"
Aave

USDC
DAI
EURC
```

---

```text id="z9a0qk"
Protocol X

USDC only
```

---

Portfolio construction depends on these constraints.

---

# Error Handling

Adapters must return standardized errors.

---

Avoid:

```text id="dzq8l5"
Protocol-Specific Errors
```

---

Prefer:

```typescript id="cy6d6z"
AdapterError {

  code

  message

  severity

}
```

---

# Retry Strategy

Adapters should classify failures.

---

Transient

Examples:

```text id="3tpm0k"
RPC Timeout

Temporary Failure
```

---

Permanent

Examples:

```text id="kux8hh"
Unsupported Asset

Invalid Operation
```

---

Execution Engine uses this information.

---

# Risk Metadata Support

Adapters may expose risk-related information.

Example:

```typescript id="1wsc2f"
RiskMetadata {

  protocolAge

  audits

  tvl

}
```

---

The Risk Engine consumes this information.

---

# Testing Requirements

Every adapter must provide:

---

Unit Tests

---

Integration Tests

---

Simulation Tests

---

Minimum Requirement

An adapter should be testable independently of the rest of Laminar.

---

# Adapter Versioning

Adapters should support versioning.

Example:

```text id="gytbyf"
Morpho Adapter v1

Morpho Adapter v2
```

---

Purpose:

Support protocol migrations.

---

# V1 Adapter Priority

Execution Adapters:

```text id="jppjhs"
Morpho

Aave

Moonwell

Aerodrome
```

---

Read-Only Adapters:

As many as practical.

---

# Future Expansion

Potential Future Protocols:

Examples:

```text id="lt0hkk"
Compound

Spark

Fluid

Euler

Seamless

ExtraFi

Curve
```

---

Core architecture should not require changes.

---

# Non-Goals

Adapters do not:

* allocate capital
* rank opportunities
* evaluate risk
* execute transactions
* manage user permissions

---

# Success Criteria

The Adapter Layer succeeds when:

* protocols are easy to add
* protocols are easy to remove
* protocol complexity remains isolated
* core architecture remains unchanged

---

# Failure Criteria

The Adapter Layer fails when:

* protocol-specific logic leaks into core systems
* adding a protocol requires modifying business logic
* protocol upgrades require large refactors

---

# Architectural Principle

The Adapter Layer is the boundary between Laminar and external protocols.

All protocol complexity must terminate at the adapter boundary.

Core engines should operate on normalized abstractions and remain completely unaware of protocol-specific implementations.
