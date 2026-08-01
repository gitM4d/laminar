// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {AaveV3Adapter} from "../src/adapters/AaveV3Adapter.sol";
import {LaminarErrors} from "../src/errors/LaminarErrors.sol";
import {LaminarRouter} from "../src/LaminarRouter.sol";
import {SupplyIntent} from "../src/libraries/LaminarTypes.sol";
import {MockAavePool} from "./mocks/MockAavePool.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract LaminarRouterTest is Test {
    event AdapterRegistered(bytes32 indexed protocolId, address indexed adapter);
    event SupplyIntentExecuted(
        bytes32 indexed protocolId,
        address indexed user,
        address indexed asset,
        address adapter,
        address recipient,
        uint256 amount
    );

    bytes32 internal constant PROTOCOL_AAVE = keccak256("aave");

    LaminarRouter internal router;
    AaveV3Adapter internal adapter;
    MockAavePool internal pool;
    MockERC20 internal usdc;

    address internal owner = makeAddr("owner");
    address internal user = makeAddr("user");
    address internal stranger = makeAddr("stranger");
    address internal recipient = makeAddr("recipient");

    function setUp() public {
        router = new LaminarRouter(owner);
        pool = new MockAavePool();
        adapter = new AaveV3Adapter(address(router), address(pool));
        usdc = new MockERC20("USD Coin", "USDC", 6);

        vm.prank(owner);
        router.registerAdapter(PROTOCOL_AAVE, address(adapter));

        usdc.mint(user, 1_000_000e6);
        vm.prank(user);
        usdc.approve(address(router), type(uint256).max);
    }

    // -------------------------------------------------------------------------
    // Owner controls
    // -------------------------------------------------------------------------

    function test_ownerCanRegisterAdapter() public {
        AaveV3Adapter nextAdapter = new AaveV3Adapter(address(router), address(pool));
        bytes32 protocolId = keccak256("aave-v2");

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit AdapterRegistered(protocolId, address(nextAdapter));
        router.registerAdapter(protocolId, address(nextAdapter));

        assertEq(router.protocolAdapters(protocolId), address(nextAdapter));
        assertTrue(router.allowedAdapters(address(nextAdapter)));
    }

    function test_nonOwnerCannotRegisterAdapter() public {
        AaveV3Adapter nextAdapter = new AaveV3Adapter(address(router), address(pool));

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger)
        );
        router.registerAdapter(keccak256("other"), address(nextAdapter));
    }

    function test_ownerCanDisableAdapter() public {
        vm.prank(owner);
        router.setAdapterStatus(address(adapter), false);
        assertFalse(router.allowedAdapters(address(adapter)));
    }

    function test_disabledAdapterBlocksExecution() public {
        SupplyIntent memory intent = _validIntent();

        vm.prank(owner);
        router.setAdapterStatus(address(adapter), false);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(LaminarErrors.AdapterNotAllowed.selector, address(adapter))
        );
        router.executeSupply(intent);
    }

    function test_nonOwnerCannotPause() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger)
        );
        router.pause();
    }

    function test_nonOwnerCannotUnpause() public {
        vm.prank(owner);
        router.pause();

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger)
        );
        router.unpause();
    }

    function test_cannotRegisterEoaAsAdapter() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(LaminarErrors.AdapterNotContract.selector, stranger)
        );
        router.registerAdapter(keccak256("eoa"), stranger);
    }

    function test_cannotRegisterAdapterWithZeroProtocolId() public {
        AaveV3Adapter nextAdapter = new AaveV3Adapter(address(router), address(pool));

        vm.prank(owner);
        vm.expectRevert(LaminarErrors.InvalidProtocolId.selector);
        router.registerAdapter(bytes32(0), address(nextAdapter));
    }

    // -------------------------------------------------------------------------
    // Failure paths
    // -------------------------------------------------------------------------

    function test_cannotExecuteWithZeroUser() public {
        SupplyIntent memory intent = _validIntent();
        intent.user = address(0);

        vm.prank(user);
        vm.expectRevert(LaminarErrors.ZeroAddress.selector);
        router.executeSupply(intent);
    }

    function test_cannotExecuteWithZeroAsset() public {
        SupplyIntent memory intent = _validIntent();
        intent.asset = address(0);

        vm.prank(user);
        vm.expectRevert(LaminarErrors.ZeroAddress.selector);
        router.executeSupply(intent);
    }

    function test_cannotExecuteWithZeroAdapter() public {
        SupplyIntent memory intent = _validIntent();
        intent.adapter = address(0);

        vm.prank(user);
        vm.expectRevert(LaminarErrors.ZeroAddress.selector);
        router.executeSupply(intent);
    }

    function test_cannotExecuteWithZeroRecipient() public {
        SupplyIntent memory intent = _validIntent();
        intent.recipient = address(0);

        vm.prank(user);
        vm.expectRevert(LaminarErrors.InvalidRecipient.selector);
        router.executeSupply(intent);
    }

    function test_cannotExecuteWithZeroAmount() public {
        SupplyIntent memory intent = _validIntent();
        intent.amount = 0;

        vm.prank(user);
        vm.expectRevert(LaminarErrors.ZeroAmount.selector);
        router.executeSupply(intent);
    }

    function test_cannotExecuteWithZeroProtocolId() public {
        SupplyIntent memory intent = _validIntent();
        intent.protocolId = bytes32(0);

        vm.prank(user);
        vm.expectRevert(LaminarErrors.InvalidProtocolId.selector);
        router.executeSupply(intent);
    }

    function test_cannotExecuteWhenCallerIsNotIntentUser() public {
        SupplyIntent memory intent = _validIntent();

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                LaminarErrors.UnauthorizedIntentCaller.selector, stranger, user
            )
        );
        router.executeSupply(intent);

        assertEq(usdc.balanceOf(user), 1_000_000e6);
        assertEq(usdc.balanceOf(address(pool)), 0);
    }

    function test_cannotExecuteWithUnregisteredProtocol() public {
        SupplyIntent memory intent = _validIntent();
        intent.protocolId = keccak256("unknown");

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                LaminarErrors.ProtocolAdapterNotRegistered.selector, intent.protocolId
            )
        );
        router.executeSupply(intent);
    }

    function test_cannotExecuteWithProtocolAdapterMismatch() public {
        AaveV3Adapter otherAdapter = new AaveV3Adapter(address(router), address(pool));
        SupplyIntent memory intent = _validIntent();
        intent.adapter = address(otherAdapter);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                LaminarErrors.ProtocolAdapterMismatch.selector,
                PROTOCOL_AAVE,
                address(adapter),
                address(otherAdapter)
            )
        );
        router.executeSupply(intent);
    }

    function test_pausedRouterBlocksExecution() public {
        vm.prank(owner);
        router.pause();

        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        router.executeSupply(_validIntent());
    }

    // -------------------------------------------------------------------------
    // Success + invariants
    // -------------------------------------------------------------------------

    function test_executeSupplyTransfersAndCallsPool() public {
        uint256 amount = 1_000e6;
        SupplyIntent memory intent = _validIntent();
        intent.amount = amount;
        intent.recipient = recipient;

        uint256 userBefore = usdc.balanceOf(user);

        vm.prank(user);
        router.executeSupply(intent);

        assertEq(usdc.balanceOf(user), userBefore - amount);
        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(usdc.balanceOf(address(adapter)), 0);
        assertEq(usdc.balanceOf(address(pool)), amount);
        assertEq(pool.lastAsset(), address(usdc));
        assertEq(pool.lastAmount(), amount);
        assertEq(pool.lastOnBehalfOf(), recipient);
        assertEq(pool.lastReferralCode(), 0);
        assertEq(pool.supplyCount(), 1);
        assertEq(pool.totalSuppliedByAsset(address(usdc)), amount);
        assertEq(pool.suppliedBalance(recipient, address(usdc)), amount);
        assertEq(usdc.allowance(address(adapter), address(pool)), 0);
    }

    function test_successfulExecutionLeavesRouterBalanceZero() public {
        vm.prank(user);
        router.executeSupply(_validIntent());
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    function test_successfulExecutionLeavesAdapterBalanceZero() public {
        vm.prank(user);
        router.executeSupply(_validIntent());
        assertEq(usdc.balanceOf(address(adapter)), 0);
    }

    function test_successfulExecutionLeavesAdapterPoolAllowanceZero() public {
        vm.prank(user);
        router.executeSupply(_validIntent());
        assertEq(usdc.allowance(address(adapter), address(pool)), 0);
    }

    function test_executeSupplyEmitsEvent() public {
        SupplyIntent memory intent = _validIntent();

        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit SupplyIntentExecuted(
            PROTOCOL_AAVE, user, address(usdc), address(adapter), user, intent.amount
        );
        router.executeSupply(intent);
    }

    // -------------------------------------------------------------------------
    // Fuzz
    // -------------------------------------------------------------------------

    function testFuzz_executeSupplyConservesNoRouterOrAdapterBalance(uint256 amount) public {
        amount = bound(amount, 1, 1e30);
        usdc.mint(user, amount);

        SupplyIntent memory intent = _validIntent();
        intent.amount = amount;
        intent.recipient = recipient;

        vm.prank(user);
        router.executeSupply(intent);

        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(usdc.balanceOf(address(adapter)), 0);
        assertEq(usdc.allowance(address(adapter), address(pool)), 0);
        assertEq(pool.lastAmount(), amount);
        assertEq(pool.lastOnBehalfOf(), recipient);
        assertEq(pool.lastAsset(), address(usdc));
        assertEq(pool.suppliedBalance(recipient, address(usdc)), amount);
    }

    function testFuzz_onlyIntentUserCanExecute(address caller) public {
        vm.assume(caller != user);
        vm.assume(caller != address(0));

        SupplyIntent memory intent = _validIntent();

        vm.prank(caller);
        vm.expectRevert(
            abi.encodeWithSelector(
                LaminarErrors.UnauthorizedIntentCaller.selector, caller, user
            )
        );
        router.executeSupply(intent);

        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(usdc.balanceOf(address(pool)), 0);
    }

    function testFuzz_zeroAmountRevertsPositiveSucceeds(uint256 amount) public {
        amount = bound(amount, 0, 1e30);

        SupplyIntent memory intent = _validIntent();
        intent.amount = amount;

        if (amount == 0) {
            vm.prank(user);
            vm.expectRevert(LaminarErrors.ZeroAmount.selector);
            router.executeSupply(intent);
            return;
        }

        usdc.mint(user, amount);
        vm.prank(user);
        router.executeSupply(intent);

        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(usdc.balanceOf(address(adapter)), 0);
        assertEq(pool.lastAmount(), amount);
    }

    function _validIntent() internal view returns (SupplyIntent memory) {
        return SupplyIntent({
            user: user,
            asset: address(usdc),
            amount: 100e6,
            adapter: address(adapter),
            recipient: user,
            protocolId: PROTOCOL_AAVE
        });
    }
}
