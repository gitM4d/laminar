// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Protocol adapter invoked by LaminarRouter after tokens are delivered.
/// @dev Adapters must only be callable by the trusted router.
interface ILaminarAdapter {
    /// @notice Supply `amount` of `asset` into the underlying protocol for `recipient`.
    /// @dev Tokens must already be held by the adapter before this call.
    function executeSupply(address asset, uint256 amount, address recipient, bytes32 protocolId)
        external;
}
