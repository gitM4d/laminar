// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Compact non-custodial supply intent passed to LaminarRouter.
/// @dev Tokens are pulled from `user`, supplied via `adapter`, and credited to `recipient`.
struct SupplyIntent {
    address user;
    address asset;
    uint256 amount;
    address adapter;
    address recipient;
    bytes32 protocolId;
}
