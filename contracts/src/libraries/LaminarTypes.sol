// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Compact non-custodial supply intent passed to LaminarRouter.
/// @dev Tokens are pulled from `user` (must equal msg.sender in v1), supplied via
///      `adapter`, and credited to `recipient`. No vault shares are minted.
struct SupplyIntent {
    address user;
    address asset;
    uint256 amount;
    address adapter;
    address recipient;
    bytes32 protocolId;
}
