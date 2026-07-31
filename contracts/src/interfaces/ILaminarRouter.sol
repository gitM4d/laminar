// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {SupplyIntent} from "../libraries/LaminarTypes.sol";

/// @notice Non-custodial intent execution router.
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

    function registerAdapter(bytes32 protocolId, address adapter) external;

    function setAdapterStatus(address adapter, bool allowed) external;

    function executeSupply(SupplyIntent calldata intent) external;

    function protocolAdapters(bytes32 protocolId) external view returns (address);

    function allowedAdapters(address adapter) external view returns (bool);
}
