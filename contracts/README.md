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
script/
  DeployLaminar.s.sol
test/
deployments/   # future address artifacts only
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

## Deployment readiness

**Status: not deployed.** No `deployments/base-sepolia.json` until a real broadcast is recorded.

Target: **Base Sepolia** (`chainId = 84532`).

### Pre-deploy checklist

1. Copy `contracts/.env.example` → `contracts/.env` (gitignored).
2. Set `BASE_SEPOLIA_RPC_URL` and `AAVE_V3_BASE_SEPOLIA_POOL`.
3. Set `DEPLOYER_PRIVATE_KEY` only when you intend to broadcast (never commit it).
4. Optionally set `LAMINAR_INITIAL_OWNER` (non-zero; defaults to deployer).
5. Run dry-run (below) and confirm logs: chainId, pool, router, adapter, registered, allowed.
6. **Verify the Aave Pool address from an official source before broadcast** — do not trust docs alone.
7. Fund the deployer with Base Sepolia ETH.
8. Broadcast manually (command below). Do not use CI auto-deploy.

### Required env vars

```bash
BASE_SEPOLIA_RPC_URL=           # required for dry-run / broadcast
BASESCAN_API_KEY=               # required for --verify
DEPLOYER_PRIVATE_KEY=           # required for --broadcast only
LAMINAR_INITIAL_OWNER=          # optional; defaults to deployer; must be non-zero if set
AAVE_V3_BASE_SEPOLIA_POOL=      # required from env; must be non-zero (no script fallback)
```

Candidate Aave V3 Pool (Base Sepolia) — **verify before broadcast**:

`0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27`

Source to re-check: [aave-address-book AaveV3BaseSepolia](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3BaseSepolia.sol)

The deploy script reads the pool **only** from `AAVE_V3_BASE_SEPOLIA_POOL`. Never commit private keys or filled `.env` files.

### Dry-run (no broadcast)

```bash
npm run contracts:deploy:base-sepolia:dry-run
```

Equivalent:

```bash
forge script script/DeployLaminar.s.sol --root contracts --rpc-url $BASE_SEPOLIA_RPC_URL
```

Reverts unless `block.chainid == 84532` and `AAVE_V3_BASE_SEPOLIA_POOL` is non-zero.

### Broadcast + verify (manual only)

```bash
forge script script/DeployLaminar.s.sol --root contracts \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

Deploy flow:

1. Deploy `LaminarRouter` (temporary owner = deployer)
2. Deploy `AaveV3Adapter(router, pool)`
3. `registerAdapter(keccak256("AAVE_V3"), adapter)`
4. Optionally `transferOwnership(LAMINAR_INITIAL_OWNER)`
5. Assert adapter registered + allowed; owner matches expected

Protocol id: `LaminarConstants.AAVE_V3_PROTOCOL_ID` = `keccak256("AAVE_V3")`.

## Status

Local contracts only. Not deployed. Not wired to the TypeScript frontend yet.
