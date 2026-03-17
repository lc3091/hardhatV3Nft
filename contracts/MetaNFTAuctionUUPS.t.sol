// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "../contracts/MetaNFTAuctionUUPS.sol";
import "../contracts/MetaNFTAuctionUUPS_V2.sol";
import "../contracts/MetaNFT.sol";
import "../contracts/MockERC20.sol";
import "../contracts/MockOracle.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MetaNFTAuctionUUPSTest is Test {
    MetaNFTAuctionUUPS public auction;
    MetaNFTAuctionUUPS_V2 public auctionV2;
    MetaNFT public nft;
    MockERC20 public usdc;
    MockOracle public ethOracle;
    MockOracle public usdcOracle;
    
    address public admin = address(0x1);
    address public seller = address(0x2);
    address public bidder1 = address(0x3);
    address public bidder2 = address(0x4);
    
    function setUp() public {
        MetaNFTAuctionUUPS implementation = new MetaNFTAuctionUUPS();
        
        bytes memory initData = abi.encodeCall(MetaNFTAuctionUUPS.initialize, (admin));
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        auction = MetaNFTAuctionUUPS(address(proxy));
        
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
        
        vm.deal(seller, 10 ether);
        vm.deal(bidder1, 10 ether);
        vm.deal(bidder2, 10 ether);
    }

    function test_initialize() public {
        assertEq(auction.owner(), admin);
        assertEq(auction.getVersion(), "MetaNFTAuctionUUPS V1");
    }

    function test_initializeCannotBeCalledTwice() public {
        vm.expectRevert(abi.encodeWithSelector(Initializable.InvalidInitialization.selector));
        auction.initialize(admin);
    }

    function test_setTokenOracle() public {
        vm.startPrank(admin);
        address newOracle = address(0x123);
        auction.setTokenOracle(address(0), newOracle);
        assertEq(auction.tokenToOracle(address(0)), newOracle);
        vm.stopPrank();
    }

    function test_setTokenOracleOnlyOwner() public {
        vm.startPrank(seller);
        vm.expectRevert(abi.encodeWithSelector(MetaNFTAuctionUUPS.OwnableUnauthorizedAccount.selector, seller));
        auction.setTokenOracle(address(0), address(0x123));
        vm.stopPrank();
    }

    function test_startAuction() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        assertEq(auction.auctionId(), 1);
        
        (
            IERC721 nftContract,
            uint256 nftId,
            address sellerAddr,
            uint256 startingTime,
            address highestBidder,
            uint256 startingPriceInDollar,
            uint256 duration,
            IERC20 paymentTokenContract,
            uint256 highestBid,
            uint256 highestBidInDollar,
            address highestBidToken
        ) = auction.auctions(0);
        
        assertEq(address(nftContract), address(nft));
        assertEq(nftId, 1);
        assertEq(sellerAddr, seller);
        assertGt(startingTime, 0);
        assertEq(highestBidder, address(0));
        assertEq(startingPriceInDollar, 1000e8);
        assertEq(duration, 3600);
        assertEq(address(paymentTokenContract), address(usdc));
        assertEq(highestBid, 0);
        assertEq(highestBidInDollar, 0);
        assertEq(highestBidToken, address(0));
        vm.stopPrank();
    }

    function test_startAuctionOnlyOwner() public {
        vm.startPrank(seller);
        vm.expectRevert(abi.encodeWithSelector(MetaNFTAuctionUUPS.OwnableUnauthorizedAccount.selector, seller));
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        vm.stopPrank();
    }

    function test_bidWithETH() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        vm.stopPrank();
        
        uint256 auctionId_ = auction.auctionId() - 1;
        
        vm.startPrank(bidder1);
        auction.bid{value: 2 ether}(auctionId_, 2 ether);
        
        (,,,, address highestBidder,,,, uint256 highestBid,,) = auction.auctions(auctionId_);
        assertEq(highestBidder, bidder1);
        assertEq(highestBid, 2 ether);
        vm.stopPrank();
    }

    function test_bidWithERC20() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        vm.stopPrank();
        
        uint256 auctionId_ = auction.auctionId() - 1;
        
        vm.startPrank(bidder1);
        usdc.mint(bidder1, 100000e18);
        usdc.approve(address(auction), 100000e18);
        auction.bid(auctionId_, 100000e18);
        
        (,,,, address highestBidder,,,, uint256 highestBid,,) = auction.auctions(auctionId_);
        assertEq(highestBidder, bidder1);
        assertEq(highestBid, 100000e18);
        vm.stopPrank();
    }

    function test_bidEnded() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 30, address(usdc));
        uint256 auctionId_ = auction.auctionId() - 1;
        vm.stopPrank();
        
        vm.warp(block.timestamp + 50);
        
        vm.startPrank(bidder1);
        vm.expectRevert("ended");
        auction.bid{value: 1 ether}(auctionId_, 1 ether);
        vm.stopPrank();
    }

    function test_bidLowerThanHighestBid() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        uint256 auctionId_ = auction.auctionId() - 1;
        vm.stopPrank();
        
        vm.startPrank(bidder1);
        auction.bid{value: 2 ether}(auctionId_, 2 ether);
        vm.stopPrank();
        
        vm.startPrank(bidder2);
        vm.expectRevert("invalid highestBid");
        auction.bid{value: 1 ether}(auctionId_, 1 ether);
        vm.stopPrank();
    }

    function test_endAuction() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 30, address(usdc));
        uint256 auctionId_ = auction.auctionId() - 1;
        vm.stopPrank();
        
        vm.startPrank(bidder1);
        auction.bid{value: 2 ether}(auctionId_, 2 ether);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 50);
        
        uint256 sellerBalanceBefore = seller.balance;
        
        auction.end(auctionId_);
        
        assertEq(nft.ownerOf(1), bidder1);
        assertGt(seller.balance, sellerBalanceBefore);
    }

    function test_upgradeToV2() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        uint256 oldAuctionId = auction.auctionId();
        vm.stopPrank();
        
        MetaNFTAuctionUUPS_V2 newImplementation = new MetaNFTAuctionUUPS_V2();
        
        vm.startPrank(admin);
        auction.upgradeToAndCall(address(newImplementation), "");
        vm.stopPrank();
        
        auctionV2 = MetaNFTAuctionUUPS_V2(address(auction));
        
        assertEq(auctionV2.auctionId(), oldAuctionId);
        assertEq(auctionV2.getVersion(), "MetaNFTAuctionUUPS V2");
        assertEq(auctionV2.newFeature(), "This is a new feature in UUPS V2");
    }

    function test_upgradeOnlyOwner() public {
        MetaNFTAuctionUUPS_V2 newImplementation = new MetaNFTAuctionUUPS_V2();
        
        vm.startPrank(seller);
        vm.expectRevert(abi.encodeWithSelector(MetaNFTAuctionUUPS.OwnableUnauthorizedAccount.selector, seller));
        auction.upgradeToAndCall(address(newImplementation), "");
        vm.stopPrank();
    }

    function test_upgradeAndSetNewOracle() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 3600, address(usdc));
        vm.stopPrank();
        
        MetaNFTAuctionUUPS_V2 newImplementation = new MetaNFTAuctionUUPS_V2();
        
        vm.startPrank(admin);
        auction.upgradeToAndCall(address(newImplementation), "");
        
        auctionV2 = MetaNFTAuctionUUPS_V2(address(auction));
        
        MockOracle newEthOracle = new MockOracle(4000e8);
        auctionV2.setTokenOracle(address(0), address(newEthOracle));
        
        uint256 price = auctionV2.getPriceInDollar(address(0));
        assertEq(price, 4000e8);
        vm.stopPrank();
    }

    function test_getPriceInDollar() public view {
        uint256 price = auction.getPriceInDollar(address(0));
        assertEq(price, 3000e8);
        
        uint256 usdcPrice = auction.getPriceInDollar(address(usdc));
        assertEq(usdcPrice, 1e8);
    }

    function test_isEnded() public {
        vm.startPrank(admin);
        auction.start(seller, 1, address(nft), 1000, 30, address(usdc));
        uint256 auctionId_ = auction.auctionId() - 1;
        vm.stopPrank();
        
        assertFalse(auction.isEnded(auctionId_));
        
        vm.warp(block.timestamp + 50);
        
        assertTrue(auction.isEnded(auctionId_));
    }

    function test_ownershipTransfer() public {
        address newOwner = address(0x5);
        
        vm.startPrank(admin);
        auction.transferOwnership(newOwner);
        assertEq(auction.owner(), newOwner);
        vm.stopPrank();
    }
}
