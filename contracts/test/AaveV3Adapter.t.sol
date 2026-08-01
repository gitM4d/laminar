// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {LaminarErrors} from "../src/errors/LaminarErrors.sol";
import {MockAavePool} from "./mocks/MockAavePool.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract AaveV3AdapterTest is Test {
    event AaveSupplyExecuted(
        address indexed asset, address indexed recipient, uint256 amount, bytes32 protocolId
    );

    bytes32 internal constant PROTOCOL_AAVE = keccak256("aave");

    AaveV3Adapter internal adapter;
    MockAavePool internal pool;
    MockERC20 internal usdc;

    address internal router = makeAddr("router");
    address internal recipient = makeAddr("recipient");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        pool = new MockAavePool();
        adapter = new AaveV3Adapter(router, address(pool));
        usdc = new MockERC20("USD Coin", "USDC", 6);
    }

    function test_constructorRejectsZeroPool() public {
        vm.expectRevert(LaminarErrors.ZeroAddress.selector);
        new AaveV3Adapter(router, address(0));
    }

    function test_constructorRejectsZeroRouter() public {
        vm.expectRevert(LaminarErrors.ZeroAddress.selector);
        new AaveV3Adapter(address(0), address(pool));
    }

    function test_nonRouterCannotExecute() public {
        usdc.mint(address(adapter), 100e6);

        vm.prank(stranger);
        vm.expectRevert(LaminarErrors.OnlyRouter.selector);
        adapter.executeSupply(address(usdc), 100e6, recipient, PROTOCOL_AAVE);
    }

    function test_rejectsZeroAsset() public {
        vm.prank(router);
        vm.expectRevert(LaminarErrors.ZeroAddress.selector);
        adapter.executeSupply(address(0), 100e6, recipient, PROTOCOL_AAVE);
    }

    function test_rejectsZeroRecipient() public {
        usdc.mint(address(adapter), 100e6);

        vm.prank(router);
        vm.expectRevert(LaminarErrors.InvalidRecipient.selector);
        adapter.executeSupply(address(usdc), 100e6, address(0), PROTOCOL_AAVE);
    }

    function test_rejectsZeroAmount() public {
        vm.prank(router);
        vm.expectRevert(LaminarErrors.ZeroAmount.selector);
        adapter.executeSupply(address(usdc), 0, recipient, PROTOCOL_AAVE);
    }

    function test_executeSupplyCallsPoolWithExpectedArgs() public {
        uint256 amount = 250e6;
        usdc.mint(address(adapter), amount);

        vm.prank(router);
        vm.expectEmit(true, true, false, true);
        emit AaveSupplyExecuted(address(usdc), recipient, amount, PROTOCOL_AAVE);
        adapter.executeSupply(address(usdc), amount, recipient, PROTOCOL_AAVE);

        assertEq(pool.lastAsset(), address(usdc));
        assertEq(pool.lastAmount(), amount);
        assertEq(pool.lastOnBehalfOf(), recipient);
        assertEq(pool.lastReferralCode(), 0);
        assertEq(usdc.balanceOf(address(pool)), amount);
        assertEq(pool.suppliedBalance(recipient, address(usdc)), amount);
        assertEq(pool.totalSuppliedByAsset(address(usdc)), amount);
    }

    function test_successfulSupplyClearsAllowance() public {
        uint256 amount = 75e6;
        usdc.mint(address(adapter), amount);

        vm.prank(router);
        adapter.executeSupply(address(usdc), amount, recipient, PROTOCOL_AAVE);

        assertEq(usdc.allowance(address(adapter), address(pool)), 0);
    }

    function test_successfulSupplyLeavesAdapterBalanceZero() public {
        uint256 amount = 90e6;
        usdc.mint(address(adapter), amount);

        vm.prank(router);
        adapter.executeSupply(address(usdc), amount, recipient, PROTOCOL_AAVE);

        assertEq(usdc.balanceOf(address(adapter)), 0);
    }

    function testFuzz_successfulSupplyLeavesNoResidualFunds(uint256 amount) public {
        amount = bound(amount, 1, 1e30);
        usdc.mint(address(adapter), amount);

        vm.prank(router);
        adapter.executeSupply(address(usdc), amount, recipient, PROTOCOL_AAVE);

        assertEq(usdc.balanceOf(address(adapter)), 0);
        assertEq(usdc.allowance(address(adapter), address(pool)), 0);
        assertEq(pool.lastAmount(), amount);
        assertEq(pool.suppliedBalance(recipient, address(usdc)), amount);
    }
}
