// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SupplyIntent} from "../libraries/LaminarTypes.sol";

/// @title ILaminarRouter
/// @notice Non-custodial intent execution router for protocol supply flows.
/// @dev Does not mint shares, hold user balances, or support arbitrary external calls.
interface ILaminarRouter {
    event AdapterRegistered(bytes32 indexed protocolId, address indexed adapter);
    event AdapterStatusChanged(address indexed adapter, bool allowed);
    event SupplyIntentExecuted(
        bytes32 indexed protocolId,
        address indexed user,
        address indexed asset,
        address adapter,
        address recipient,
        uint256 amount
    );

    /// @notice Register `adapter` for `protocolId` and allowlist it. Owner only.
    function registerAdapter(bytes32 protocolId, address adapter) external;

    /// @notice Allow or disallow an adapter address. Owner only.
    function setAdapterStatus(address adapter, bool allowed) external;

    /// @notice Execute a supply intent.
    /// @dev Caller must be `intent.user` and must have approved this router for
    ///      `intent.amount` of `intent.asset`. Tokens are pulled and forwarded to the
    ///      adapter; the router must not retain a residual balance on success.
    function executeSupply(SupplyIntent calldata intent) external;

    /// @notice Adapter registered for a protocol id, or address(0) if none.
    function protocolAdapters(bytes32 protocolId) external view returns (address);

    /// @notice Whether an adapter address is currently allowed to execute.
    function allowedAdapters(address adapter) external view returns (bool);
}
