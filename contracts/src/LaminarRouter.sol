// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {LaminarErrors} from "./errors/LaminarErrors.sol";
import {ILaminarAdapter} from "./interfaces/ILaminarAdapter.sol";
import {ILaminarRouter} from "./interfaces/ILaminarRouter.sol";
import {SupplyIntent} from "./libraries/LaminarTypes.sol";

/// @title LaminarRouter
/// @notice Non-custodial intent execution router that validates supply intents and
///         delegates protocol-specific execution to registered adapters.
/// @dev Asset flow (v1):
///      1) Pull tokens from `intent.user` to this router via transferFrom.
///      2) Transfer exact amount to the allowed adapter.
///      3) Call adapter.executeSupply(...).
///      The router never holds user balances across transactions and does not mint shares.
contract LaminarRouter is ILaminarRouter, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(bytes32 protocolId => address adapter) public protocolAdapters;
    mapping(address adapter => bool allowed) public allowedAdapters;

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Register an adapter for a protocol id and allowlist it.
    function registerAdapter(bytes32 protocolId, address adapter) external onlyOwner {
        if (adapter == address(0)) revert LaminarErrors.ZeroAddress();
        if (protocolId == bytes32(0)) revert LaminarErrors.InvalidProtocolId();

        protocolAdapters[protocolId] = adapter;
        allowedAdapters[adapter] = true;

        emit AdapterRegistered(protocolId, adapter);
        emit AdapterStatusChanged(adapter, true);
    }

    /// @notice Allow or disallow an adapter address.
    function setAdapterStatus(address adapter, bool allowed) external onlyOwner {
        if (adapter == address(0)) revert LaminarErrors.ZeroAddress();
        allowedAdapters[adapter] = allowed;
        emit AdapterStatusChanged(adapter, allowed);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Validate and execute a supply intent through a registered adapter.
    /// @dev v1 requires `msg.sender == intent.user`. Caller must have approved this
    ///      router for `intent.amount` of `intent.asset`. No signed/delegated intents.
    function executeSupply(SupplyIntent calldata intent)
        external
        whenNotPaused
        nonReentrant
    {
        _validateIntent(intent);

        IERC20 token = IERC20(intent.asset);

        // Pull from user → router → adapter, then delegate execution.
        token.safeTransferFrom(intent.user, address(this), intent.amount);
        token.safeTransfer(intent.adapter, intent.amount);

        ILaminarAdapter(intent.adapter)
            .executeSupply(intent.asset, intent.amount, intent.recipient, intent.protocolId);

        emit SupplyIntentExecuted(
            intent.protocolId,
            intent.user,
            intent.asset,
            intent.adapter,
            intent.recipient,
            intent.amount
        );
    }

    function _validateIntent(SupplyIntent calldata intent) internal view {
        if (intent.user != msg.sender) {
            revert LaminarErrors.UnauthorizedIntentCaller(msg.sender, intent.user);
        }
        if (intent.user == address(0) || intent.asset == address(0) || intent.adapter == address(0))
        {
            revert LaminarErrors.ZeroAddress();
        }
        if (intent.recipient == address(0)) revert LaminarErrors.InvalidRecipient();
        if (intent.amount == 0) revert LaminarErrors.ZeroAmount();
        if (intent.protocolId == bytes32(0)) revert LaminarErrors.InvalidProtocolId();

        address registered = protocolAdapters[intent.protocolId];
        if (registered == address(0)) {
            revert LaminarErrors.ProtocolAdapterNotRegistered(intent.protocolId);
        }
        if (registered != intent.adapter) {
            revert LaminarErrors.ProtocolAdapterMismatch(
                intent.protocolId, registered, intent.adapter
            );
        }
        if (!allowedAdapters[intent.adapter]) {
            revert LaminarErrors.AdapterNotAllowed(intent.adapter);
        }
    }
}
