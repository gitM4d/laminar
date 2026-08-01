// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ILaminarAdapter
/// @notice Protocol adapter invoked by LaminarRouter after tokens are delivered.
/// @dev Must be callable only by the trusted router. No share accounting.
interface ILaminarAdapter {
    /// @notice Supply `amount` of `asset` into the underlying protocol for `recipient`.
    /// @dev Tokens must already be held by the adapter. On success the adapter must not
    ///      retain residual token balance or residual allowance to the external pool.
    /// @param asset ERC20 asset to supply.
    /// @param amount Exact token amount.
    /// @param recipient Protocol credit recipient / onBehalfOf.
    /// @param protocolId Opaque protocol identifier for events.
    function executeSupply(address asset, uint256 amount, address recipient, bytes32 protocolId)
        external;
}
