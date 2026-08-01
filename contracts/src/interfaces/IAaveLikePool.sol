// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAaveLikePool
/// @notice Minimal Aave V3-like Pool surface used by AaveV3Adapter.
interface IAaveLikePool {
    /// @notice Supply `amount` of `asset`, crediting `onBehalfOf`.
    /// @dev Caller must have approved this pool for at least `amount`.
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)
        external;
}
