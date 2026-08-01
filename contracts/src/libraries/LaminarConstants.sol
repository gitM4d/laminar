// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Shared constants for Laminar contracts, scripts, and tests.
library LaminarConstants {
    /// @notice Canonical protocol id for Aave V3 adapter registration.
    bytes32 internal constant AAVE_V3_PROTOCOL_ID = keccak256("AAVE_V3");

    /// @notice Base Sepolia chain id (testnet deploy target).
    uint256 internal constant BASE_SEPOLIA_CHAIN_ID = 84532;
}
