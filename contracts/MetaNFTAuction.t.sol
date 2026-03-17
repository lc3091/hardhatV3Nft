// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {TransparentUpgradeableProxy, ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {IERC1967} from "@openzeppelin/contracts/interfaces/IERC1967.sol";

import {MetaNFTAuction} from "./MetaNFTAuction.sol";
import {MetaNFTAuctionV2} from "./MetaNFTAuctionV2.sol";
import {MetaNFT} from "./MetaNFT.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {MockOracle} from "./MockOracle.sol";
import {MockERC20} from "./MockERC20.sol";

contract MetaNFTAuctionTest is Test {
    MetaNFTAuction private auction;
    MetaNFT private nft;
    MockERC20 private usdc;
    MockOracle private ethOracle;
    MockOracle private usdcOracle;
    ProxyAdmin private proxyAdminInstance;

    address private admin = address(0xA11CE);
    address private proxyAdmin = address(0xBEEF);
    address private seller = address(0xB0B);
    address private bidder1 = address(0xB0123);
    address private bidder2 = address(0xB0124);

    function setUp() public {
        MetaNFTAuction impl = new MetaNFTAuction();
        bytes memory initData = abi.encodeCall(MetaNFTAuction.initialize, (admin));
        
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(impl), proxyAdmin, initData);

        auction = MetaNFTAuction(address(proxy));
        
        bytes32 adminSlot = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
        address proxyAdminAddress = address(uint160(uint256(vm.load(address(proxy), adminSlot))));
        proxyAdminInstance = ProxyAdmin(proxyAdminAddress);
        
        nft = new MetaNFT();
        usdc = new MockERC20("USDC", "USDC", 6, 1000000e6);
        
        ethOracle = new MockOracle(3000e8);
        usdcOracle = new MockOracle(1e8);
        
        vm.startPrank(admin);
        auction.setTokenOracle(address(0), address(ethOracle));
        auction.setTokenOracle(address(usdc), address(usdcOracle));
        vm.stopPrank();
        
        nft.mint(seller, 1);
        nft.mint(seller, 2);
        nft.mint(seller, 10);
        vm.startPrank(seller);
        nft.setApprovalForAll(address(auction), true);
        vm.stopPrank();
    }

    function test_getVersion() public {
        assertEq(auction.getVersion(), "MetaNFTAuctionV1");
    }

    function test_getPriceInDollar() public {
        uint256 ethPrice = auction.getPriceInDollar(address(0));
        uint256 usdcPrice = auction.getPriceInDollar(address(usdc));
        console2.log("ETH/USD price", ethPrice);
        console2.log("USDC/USD price", usdcPrice);
        assertGt(ethPrice, 0);
        assertGt(usdcPrice, 0);
    }

    function test_initializeOnlyOnce() public {
        vm.startPrank(admin);
        vm.expectRevert();
        auction.initialize(admin);
        vm.stopPrank();
    }

    function test_startOnlyAdmin() public {
        vm.startPrank(seller);
        vm.expectRevert("not admin");
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        vm.stopPrank();
    }

    function test_startIncrementsAuctionId() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        assertEq(auction.auctionId(), 1);
        auction.start(seller, 2, address(nft), 1000, 3600, address(usdc));
        assertEq(auction.auctionId(), 2);
        vm.stopPrank();
    }

    function test_startAuctionGtDuration() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 30, address(usdc));
        uint256 currentAuctionId = auction.auctionId() - 1;

        vm.deal(seller, 1 ether);
        vm.warp(block.timestamp + 50);
        console2.log("current time", block.timestamp);
        vm.expectRevert("ended");
        vm.startPrank(seller);
        auction.bid{value: 1 ether}(currentAuctionId, 1 ether);
        vm.stopPrank();
    }

    function test_bidLowerThanHighestBid() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 30, address(usdc));
        uint256 currentAuctionId = auction.auctionId() - 1;
        
        vm.deal(seller, 2 ether);
        vm.deal(bidder1, 2 ether);
        
        vm.startPrank(seller);
        auction.bid{value: 2 ether}(currentAuctionId, 2 ether);
        
        vm.startPrank(bidder1);
        vm.expectRevert("invalid highestBid");
        auction.bid{value: 1.2 ether}(currentAuctionId, 1.2 ether);
        vm.stopPrank();
    }

    function test_bidResult() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        uint256 currentAuctionId = auction.auctionId() - 1;
        
        vm.deal(seller, 20 ether);
        vm.deal(bidder1, 20 ether);
        vm.deal(bidder2, 20 ether);

        vm.startPrank(bidder1);
        auction.bid{value: 2 ether}(currentAuctionId, 2 ether);
        vm.startPrank(bidder2);
        auction.bid{value: 3 ether}(currentAuctionId, 3 ether);
        vm.startPrank(bidder1);
        auction.bid{value: 4 ether}(currentAuctionId, 4 ether);

        (, , , , address highestBidder, , , , uint256 highestBid, , ) = auction.auctions(currentAuctionId);

        assertEq(highestBidder, bidder1);
        assertEq(highestBid, 4 ether);
        vm.stopPrank();
    }

    function test_upgrade() public {
        vm.startPrank(admin);
        auction.start(seller, 10, address(nft), 1000, 3600, address(usdc));
        uint256 oldAuctionId = auction.auctionId();
        vm.stopPrank();
        
        MetaNFTAuctionV2 newImpl = new MetaNFTAuctionV2();
        
        vm.prank(proxyAdmin);
        proxyAdminInstance.upgradeAndCall(ITransparentUpgradeableProxy(payable(address(auction))), address(newImpl), "");
        
        MetaNFTAuctionV2 upgradedAuction = MetaNFTAuctionV2(payable(address(auction)));
        
        assertEq(upgradedAuction.auctionId(), oldAuctionId);
        assertEq(keccak256(abi.encodePacked(upgradedAuction.getVersion())), keccak256(abi.encodePacked("MetaNFTAuctionV2")));
        
        string memory newFeature = upgradedAuction.newFeature();
        assertEq(keccak256(abi.encodePacked(newFeature)), keccak256(abi.encodePacked("This is a new feature in V2")));
    }

    function test_upgradeByNonAdmin() public {
        vm.startPrank(admin);
        auction.start(seller, 10, address(nft), 1000, 3600, address(usdc));
        vm.stopPrank();
        
        MetaNFTAuctionV2 newImpl = new MetaNFTAuctionV2();
        
        vm.startPrank(seller);
        vm.expectRevert();
        proxyAdminInstance.upgradeAndCall(ITransparentUpgradeableProxy(payable(address(auction))), address(newImpl), "");
        vm.stopPrank();
    }

    function test_changeOracleAfterUpgrade() public {
        vm.startPrank(admin);
        auction.start(seller, 10, address(nft), 1000, 3600, address(usdc));
        vm.stopPrank();
        
        MockOracle newEthOracle = new MockOracle(3000e8);
        
        MetaNFTAuctionV2 newImpl = new MetaNFTAuctionV2();
        
        vm.prank(proxyAdmin);
        proxyAdminInstance.upgradeAndCall(ITransparentUpgradeableProxy(payable(address(auction))), address(newImpl), "");
        
        MetaNFTAuctionV2 upgradedAuction = MetaNFTAuctionV2(payable(address(auction)));
        
        vm.startPrank(admin);
        upgradedAuction.setTokenOracle(address(0), address(newEthOracle));
        
        uint256 newPrice = upgradedAuction.getPriceInDollar(address(0));
        assertEq(newPrice, 3000e8);
        
        vm.stopPrank();
    }
}
