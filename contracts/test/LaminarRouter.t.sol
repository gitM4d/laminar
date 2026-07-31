// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

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

    function test_cannotExecuteWithZeroAmount() public {
        SupplyIntent memory intent = _validIntent();
        intent.amount = 0;

        vm.prank(user);
        vm.expectRevert(LaminarErrors.ZeroAmount.selector);
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

        // Victim funds must remain untouched.
        assertEq(usdc.balanceOf(user), 1_000_000e6);
        assertEq(usdc.balanceOf(address(pool)), 0);
    }

    function test_cannotRegisterAdapterWithZeroProtocolId() public {
        AaveV3Adapter nextAdapter = new AaveV3Adapter(address(router), address(pool));

        vm.prank(owner);
        vm.expectRevert(LaminarErrors.InvalidProtocolId.selector);
        router.registerAdapter(bytes32(0), address(nextAdapter));
    }

    function test_cannotExecuteWithZeroProtocolId() public {
        SupplyIntent memory intent = _validIntent();
        intent.protocolId = bytes32(0);

        vm.prank(user);
        vm.expectRevert(LaminarErrors.InvalidProtocolId.selector);
        router.executeSupply(intent);
    }

    function test_cannotExecuteWithDisallowedAdapter() public {
        SupplyIntent memory intent = _validIntent();

        vm.prank(owner);
        router.setAdapterStatus(address(adapter), false);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(LaminarErrors.AdapterNotAllowed.selector, address(adapter))
        );
        router.executeSupply(intent);
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

    function test_executeSupplyTransfersAndCallsPool() public {
        uint256 amount = 1_000e6;
        SupplyIntent memory intent = _validIntent();
        intent.amount = amount;

        uint256 userBefore = usdc.balanceOf(user);

        vm.prank(user);
        router.executeSupply(intent);

        assertEq(usdc.balanceOf(user), userBefore - amount);
        assertEq(usdc.balanceOf(address(router)), 0);
        assertEq(usdc.balanceOf(address(adapter)), 0);
        assertEq(usdc.balanceOf(address(pool)), amount);
        assertEq(pool.lastAsset(), address(usdc));
        assertEq(pool.lastAmount(), amount);
        assertEq(pool.lastOnBehalfOf(), user);
        assertEq(pool.lastReferralCode(), 0);
        assertEq(pool.supplyCount(), 1);
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

    function test_pausedRouterBlocksExecution() public {
        vm.prank(owner);
        router.pause();

        vm.prank(user);
        vm.expectRevert();
        router.executeSupply(_validIntent());
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
