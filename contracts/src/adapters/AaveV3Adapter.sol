// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {LaminarErrors} from "../errors/LaminarErrors.sol";
import {IAaveLikePool} from "../interfaces/IAaveLikePool.sol";
import {ILaminarAdapter} from "../interfaces/ILaminarAdapter.sol";

/// @title AaveV3Adapter
/// @notice Supplies ERC20 assets into an Aave V3-like pool on behalf of a recipient.
/// @dev Asset flow: Router transfers tokens to this adapter, then calls executeSupply.
///      The adapter approves the pool for the exact amount, supplies, then clears approval.
///      No share accounting and no residual custody after success.
contract AaveV3Adapter is ILaminarAdapter {
    using SafeERC20 for IERC20;

    address public immutable ROUTER;
    address public immutable POOL;

    event AaveSupplyExecuted(
        address indexed asset, address indexed recipient, uint256 amount, bytes32 protocolId
    );

    modifier onlyRouter() {
        _onlyRouter();
        _;
    }

    constructor(address router_, address pool_) {
        if (router_ == address(0) || pool_ == address(0)) revert LaminarErrors.ZeroAddress();
        ROUTER = router_;
        POOL = pool_;
    }

    function _onlyRouter() internal view {
        if (msg.sender != ROUTER) revert LaminarErrors.OnlyRouter();
    }

    /// @inheritdoc ILaminarAdapter
    /// @dev Only callable by ROUTER. Uses exact approval (never MaxUint256) and resets
    ///      allowance to zero after the pool call.
    function executeSupply(address asset, uint256 amount, address recipient, bytes32 protocolId)
        external
        onlyRouter
    {
        if (asset == address(0)) revert LaminarErrors.ZeroAddress();
        if (recipient == address(0)) revert LaminarErrors.InvalidRecipient();
        if (amount == 0) revert LaminarErrors.ZeroAmount();

        IERC20 token = IERC20(asset);

        // Exact allowance only — never MaxUint256.
        token.forceApprove(POOL, amount);
        IAaveLikePool(POOL).supply(asset, amount, recipient, 0);
        token.forceApprove(POOL, 0);

        emit AaveSupplyExecuted(asset, recipient, amount, protocolId);
    }
}
