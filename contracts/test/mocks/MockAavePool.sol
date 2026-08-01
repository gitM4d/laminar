// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IAaveLikePool} from "../../src/interfaces/IAaveLikePool.sol";

/// @notice Minimal Aave-like pool that pulls approved tokens on supply.
contract MockAavePool is IAaveLikePool {
    using SafeERC20 for IERC20;

    event MockSupply(
        address indexed asset, uint256 amount, address indexed onBehalfOf, uint16 referralCode
    );

    address public lastAsset;
    uint256 public lastAmount;
    address public lastOnBehalfOf;
    uint16 public lastReferralCode;
    uint256 public supplyCount;

    mapping(address asset => uint256 amount) public totalSuppliedByAsset;
    mapping(address recipient => mapping(address asset => uint256 amount)) public suppliedBalance;

    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)
        external
        override
    {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        lastAsset = asset;
        lastAmount = amount;
        lastOnBehalfOf = onBehalfOf;
        lastReferralCode = referralCode;
        supplyCount += 1;

        totalSuppliedByAsset[asset] += amount;
        suppliedBalance[onBehalfOf][asset] += amount;

        emit MockSupply(asset, amount, onBehalfOf, referralCode);
    }
}
