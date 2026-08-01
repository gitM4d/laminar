// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {LaminarRouter} from "../src/LaminarRouter.sol";
import {LaminarConstants} from "../src/libraries/LaminarConstants.sol";

/// @title DeployLaminar
/// @notice Base Sepolia deployment script for LaminarRouter + AaveV3Adapter.
/// @dev Pool address comes only from env `AAVE_V3_BASE_SEPOLIA_POOL` (no hardcoded fallback).
///      Does not broadcast unless forge is invoked with `--broadcast`.
///      Never commit DEPLOYER_PRIVATE_KEY. Never log private keys.
///
/// Dry-run (no broadcast):
///   forge script script/DeployLaminar.s.sol --root contracts --rpc-url $BASE_SEPOLIA_RPC_URL
///
/// Broadcast + verify (manual):
///   forge script script/DeployLaminar.s.sol --root contracts \
///     --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify \
///     --etherscan-api-key $BASESCAN_API_KEY
contract DeployLaminar is Script {
    error WrongChain(uint256 actual, uint256 expected);
    error ZeroAavePool();
    error ZeroInitialOwner();
    error AdapterNotRegistered();
    error AdapterNotAllowed();
    error UnexpectedRouterOwner(address actual, address expected);

    struct DeployConfig {
        address aavePool;
        address deployer;
        address initialOwner;
        bool hasDeployerKey;
        uint256 deployerKey;
    }

    function run() external {
        DeployConfig memory cfg = _loadAndValidateConfig();
        _logPreflight(cfg);

        if (cfg.hasDeployerKey) {
            vm.startBroadcast(cfg.deployerKey);
        } else {
            // Dry-run / simulation: Foundry default script sender (no key in repo).
            vm.startBroadcast();
        }

        // Order: router first (adapter constructor requires router).
        LaminarRouter router = new LaminarRouter(cfg.deployer);
        AaveV3Adapter adapter = new AaveV3Adapter(address(router), cfg.aavePool);

        router.registerAdapter(LaminarConstants.AAVE_V3_PROTOCOL_ID, address(adapter));

        if (cfg.initialOwner != cfg.deployer) {
            console2.log("Transferring ownership to:", cfg.initialOwner);
            router.transferOwnership(cfg.initialOwner);
        } else {
            console2.log("Ownership retained by deployer");
        }

        vm.stopBroadcast();

        _assertPostDeploy(router, address(adapter), cfg.initialOwner);
        _logResult(router, address(adapter), cfg);
    }

    function _loadAndValidateConfig() internal view returns (DeployConfig memory cfg) {
        if (block.chainid != LaminarConstants.BASE_SEPOLIA_CHAIN_ID) {
            revert WrongChain(block.chainid, LaminarConstants.BASE_SEPOLIA_CHAIN_ID);
        }

        // Required from env — never use a hardcoded pool fallback.
        cfg.aavePool = vm.envAddress("AAVE_V3_BASE_SEPOLIA_POOL");
        if (cfg.aavePool == address(0)) revert ZeroAavePool();

        cfg.hasDeployerKey = vm.envExists("DEPLOYER_PRIVATE_KEY");
        if (cfg.hasDeployerKey) {
            cfg.deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
            cfg.deployer = vm.addr(cfg.deployerKey);
        } else {
            cfg.deployer = msg.sender;
        }

        // Optional; if set (including via envOr default path) must be non-zero.
        cfg.initialOwner = vm.envOr("LAMINAR_INITIAL_OWNER", cfg.deployer);
        if (cfg.initialOwner == address(0)) revert ZeroInitialOwner();
    }

    function _logPreflight(DeployConfig memory cfg) internal view {
        console2.log("=== Laminar Base Sepolia preflight ===");
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", cfg.deployer);
        console2.log("Initial owner:", cfg.initialOwner);
        console2.log("Aave pool:", cfg.aavePool);
        console2.log("Protocol ID:");
        console2.logBytes32(LaminarConstants.AAVE_V3_PROTOCOL_ID);
        console2.log("Deployer key present:", cfg.hasDeployerKey);
    }

    function _assertPostDeploy(LaminarRouter router, address adapter, address expectedOwner)
        internal
        view
    {
        if (router.protocolAdapters(LaminarConstants.AAVE_V3_PROTOCOL_ID) != adapter) {
            revert AdapterNotRegistered();
        }
        if (!router.allowedAdapters(adapter)) {
            revert AdapterNotAllowed();
        }
        if (router.owner() != expectedOwner) {
            revert UnexpectedRouterOwner(router.owner(), expectedOwner);
        }
    }

    function _logResult(LaminarRouter router, address adapter, DeployConfig memory cfg)
        internal
        view
    {
        bool registered =
            router.protocolAdapters(LaminarConstants.AAVE_V3_PROTOCOL_ID) == adapter;
        bool allowed = router.allowedAdapters(adapter);

        console2.log("=== Laminar deployment result ===");
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", cfg.deployer);
        console2.log("Initial owner:", cfg.initialOwner);
        console2.log("Aave pool:", cfg.aavePool);
        console2.log("Protocol ID:");
        console2.logBytes32(LaminarConstants.AAVE_V3_PROTOCOL_ID);
        console2.log("LaminarRouter:", address(router));
        console2.log("AaveV3Adapter:", adapter);
        console2.log("Adapter registered:", registered);
        console2.log("Adapter allowed:", allowed);
        console2.log("Router owner:", router.owner());
    }
}
