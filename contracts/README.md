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

**Status:** local contracts only; not deployed. No `deployments/base-sepolia.json` until a real broadcast is recorded.

Target: **Base Sepolia** (`chainId = 84532`).

### Required env vars

Copy `contracts/.env.example` → `contracts/.env` (gitignored):

```bash
BASE_SEPOLIA_RPC_URL=           # required for dry-run / broadcast
BASESCAN_API_KEY=               # required for --verify
DEPLOYER_PRIVATE_KEY=           # required for --broadcast only
LAMINAR_INITIAL_OWNER=          # optional; defaults to deployer
AAVE_V3_BASE_SEPOLIA_POOL=      # required; must be non-zero
```


Official Aave V3 Pool on Base Sepolia (set as `AAVE_V3_BASE_SEPOLIA_POOL`):

`0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27`

Source: [aave-address-book AaveV3BaseSepolia](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3BaseSepolia.sol)

Never commit private keys or filled `.env` files.

### Dry-run (no broadcast)

```bash
# from repo root, with env vars exported or contracts/.env loaded
npm run contracts:deploy:base-sepolia:dry-run
```

Equivalent:

```bash
forge script script/DeployLaminar.s.sol --root contracts --rpc-url $BASE_SEPOLIA_RPC_URL
```

The script reverts unless `block.chainid == 84532` and `AAVE_V3_BASE_SEPOLIA_POOL` is set.

### Broadcast + verify (manual later)

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

Protocol id constant: `LaminarConstants.AAVE_V3_PROTOCOL_ID` = `keccak256("AAVE_V3")`.

## Status

Local contracts only. Not deployed. Not wired to the TypeScript frontend yet.
