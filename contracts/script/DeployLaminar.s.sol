// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {LaminarRouter} from "../src/LaminarRouter.sol";
import {LaminarConstants} from "../src/libraries/LaminarConstants.sol";

/// @title DeployLaminar
/// @notice Base Sepolia deployment script for LaminarRouter + AaveV3Adapter.
/// @dev Requires env vars (see contracts/.env.example). Does not broadcast unless
///      forge is invoked with `--broadcast`. Never commit DEPLOYER_PRIVATE_KEY.
///
/// Dry-run (no broadcast):
///   forge script script/DeployLaminar.s.sol --root contracts --rpc-url $BASE_SEPOLIA_RPC_URL
///
/// Broadcast + verify:
///   forge script script/DeployLaminar.s.sol --root contracts \
///     --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify \
///     --etherscan-api-key $BASESCAN_API_KEY
contract DeployLaminar is Script {
    error WrongChain(uint256 actual, uint256 expected);
    error ZeroAavePool();
    error ZeroInitialOwner();
    error AdapterNotRegistered();
    error AdapterNotAllowed();

    function run() external {
        if (block.chainid != LaminarConstants.BASE_SEPOLIA_CHAIN_ID) {
            revert WrongChain(block.chainid, LaminarConstants.BASE_SEPOLIA_CHAIN_ID);
        }

        address aavePool = vm.envAddress("AAVE_V3_BASE_SEPOLIA_POOL");
        if (aavePool == address(0)) revert ZeroAavePool();

        // Private key is only required for a real broadcast. Dry-runs may omit it and
        // use Foundry's default script sender (no key is hardcoded in the repo).
        bool hasDeployerKey = vm.envExists("DEPLOYER_PRIVATE_KEY");
        uint256 deployerKey;
        address deployer;
        if (hasDeployerKey) {
            deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
            deployer = vm.addr(deployerKey);
        } else {
            deployer = msg.sender;
        }

        address finalOwner = vm.envOr("LAMINAR_INITIAL_OWNER", deployer);
        if (finalOwner == address(0)) revert ZeroInitialOwner();

        console2.log("Laminar deployment");
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("Initial owner (final):", finalOwner);
        console2.log("Aave pool:", aavePool);

        if (hasDeployerKey) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        // Deploy with deployer as temporary owner so registration can succeed.
        LaminarRouter router = new LaminarRouter(deployer);
        AaveV3Adapter adapter = new AaveV3Adapter(address(router), aavePool);

        router.registerAdapter(LaminarConstants.AAVE_V3_PROTOCOL_ID, address(adapter));

        if (finalOwner != deployer) {
            router.transferOwnership(finalOwner);
        }

        vm.stopBroadcast();

        if (router.protocolAdapters(LaminarConstants.AAVE_V3_PROTOCOL_ID) != address(adapter)) {
            revert AdapterNotRegistered();
        }
        if (!router.allowedAdapters(address(adapter))) {
            revert AdapterNotAllowed();
        }

        console2.log("LaminarRouter:", address(router));
        console2.log("AaveV3Adapter:", address(adapter));
        console2.log("Registered protocolId:");
        console2.logBytes32(LaminarConstants.AAVE_V3_PROTOCOL_ID);
        console2.log("Router owner:", router.owner());
    }
}
