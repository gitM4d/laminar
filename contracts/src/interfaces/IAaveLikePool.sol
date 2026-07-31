// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Aave V3-like Pool surface used by AaveV3Adapter.
interface IAaveLikePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)
        external;
}
