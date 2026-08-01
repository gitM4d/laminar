// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {LaminarConstants} from "../src/libraries/LaminarConstants.sol";

contract LaminarConstantsTest is Test {
    function test_aaveV3ProtocolIdMatchesKeccak() public pure {
        assertEq(LaminarConstants.AAVE_V3_PROTOCOL_ID, keccak256("AAVE_V3"));
    }

    function test_baseSepoliaChainId() public pure {
        assertEq(LaminarConstants.BASE_SEPOLIA_CHAIN_ID, 84532);
    }
}
