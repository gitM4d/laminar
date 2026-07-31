// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Shared custom errors for Laminar contracts.
library LaminarErrors {
    error ZeroAddress();
    error ZeroAmount();
    error InvalidProtocolId();
    error InvalidRecipient();
    error UnauthorizedIntentCaller(address caller, address user);
    error AdapterNotAllowed(address adapter);
    error ProtocolAdapterMismatch(bytes32 protocolId, address expected, address provided);
    error ProtocolAdapterNotRegistered(bytes32 protocolId);
    error OnlyRouter();
    error TransferFailed();
}
