# Laminar Contracts

Foundry-based Solidity foundation for Laminar's non-custodial intent execution layer.

## Layout

```text
src/
  LaminarRouter.sol
  adapters/AaveV3Adapter.sol
  interfaces/
  libraries/
  errors/
test/
  LaminarRouter.t.sol
  AaveV3Adapter.t.sol
  mocks/
```

## Commands

From repo root:

```bash
npm run contracts:build
npm run contracts:test
```

Or from this directory:

```bash
forge install
forge build
forge test
```

Dependencies are git submodules under `lib/`:

- `forge-std`
- `openzeppelin-contracts` (v5.x)

After clone:

```bash
git submodule update --init --recursive
# or from contracts/
forge install
```

## Status

Local contracts only. Not deployed. Not wired to the TypeScript frontend yet.
