import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("MetaNFTAuction", function () {
  let auction: any;
  let auctionV2: any;
  let nft: any;
  let usdc: any;
  let ethOracle: any;
  let usdcOracle: any;
  let proxyAdmin: any;
  let proxy: any;

  let admin: any;
  let proxyAdminSigner: any;
  let seller: any;
  let bidder1: any;
  let bidder2: any;
  let networkConnection: any;

  beforeEach(async function () {
    networkConnection = await hre.network.connect();
    [admin, proxyAdminSigner, seller, bidder1, bidder2] = await networkConnection.ethers.getSigners();

    const MetaNFTAuctionFactory = await networkConnection.ethers.getContractFactory("MetaNFTAuction");
    const impl = await MetaNFTAuctionFactory.deploy();

    const initData = impl.interface.encodeFunctionData("initialize", [admin.address]);

    const TransparentUpgradeableProxyFactory = await networkConnection.ethers.getContractFactory("TransparentUpgradeableProxy");
    proxy = await TransparentUpgradeableProxyFactory.deploy(
      await impl.getAddress(),
      proxyAdminSigner.address,
      initData
    );

    auction = MetaNFTAuctionFactory.attach(await proxy.getAddress());

    const adminSlot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
    const proxyAdminAddressRaw = await networkConnection.ethers.provider.getStorage(
      await proxy.getAddress(),
      adminSlot
    );
    const proxyAdminAddress = ethers.getAddress("0x" + proxyAdminAddressRaw.slice(-40));
    
    const ProxyAdminFactory = await networkConnection.ethers.getContractFactory("ProxyAdmin");
    proxyAdmin = ProxyAdminFactory.attach(proxyAdminAddress);

    const MetaNFTFactory = await networkConnection.ethers.getContractFactory("MetaNFT");
    nft = await MetaNFTFactory.deploy();

    const MockERC20Factory = await networkConnection.ethers.getContractFactory("MockERC20");
    usdc = await MockERC20Factory.deploy("USDC", "USDC", 6, ethers.parseUnits("1000000", 6));

    const MockOracleFactory = await networkConnection.ethers.getContractFactory("MockOracle");
    ethOracle = await MockOracleFactory.deploy(ethers.parseUnits("3000", 8));
    usdcOracle = await MockOracleFactory.deploy(ethers.parseUnits("1", 8));

    await auction.connect(admin).setTokenOracle(ethers.ZeroAddress, await ethOracle.getAddress());
    await auction.connect(admin).setTokenOracle(await usdc.getAddress(), await usdcOracle.getAddress());

    await nft.mint(seller.address, 1);
    await nft.mint(seller.address, 2);
    await nft.mint(seller.address, 10);
    await nft.connect(seller).setApprovalForAll(await auction.getAddress(), true);
  });

  describe("getVersion", function () {
    it("should return MetaNFTAuctionV1", async function () {
      expect(await auction.getVersion()).to.equal("MetaNFTAuctionV1");
    });
  });

  describe("getPriceInDollar", function () {
    it("should return correct prices", async function () {
      const ethPrice = await auction.getPriceInDollar(ethers.ZeroAddress);
      const usdcPrice = await auction.getPriceInDollar(await usdc.getAddress());

      expect(ethPrice).to.be.gt(0);
      expect(usdcPrice).to.be.gt(0);
    });
  });

  describe("initialize", function () {
    it("should fail when initialized twice", async function () {
      await expect(auction.connect(admin).initialize(admin.address))
        .to.be.revertedWithCustomError(auction, "InvalidInitialization");
    });
  });

  describe("start", function () {
    it("should fail when not called by admin", async function () {
      await expect(
        auction.connect(seller).start(seller.address, 1, await nft.getAddress(), 1000, 3600, await usdc.getAddress())
      ).to.be.revertedWith("not admin");
    });

    it("should increment auctionId", async function () {
      await auction.connect(admin).start(seller.address, 1, await nft.getAddress(), 1000, 3600, await usdc.getAddress());
      expect(await auction.auctionId()).to.equal(1n);

      await auction.connect(admin).start(seller.address, 2, await nft.getAddress(), 1000, 3600, await usdc.getAddress());
      expect(await auction.auctionId()).to.equal(2n);
    });
  });

  describe("bid", function () {
    it("should fail when auction has ended", async function () {
      await auction.connect(admin).start(seller.address, 1, await nft.getAddress(), 1000, 30, await usdc.getAddress());
      const currentAuctionId = (await auction.auctionId()) - 1n;
      const auc = await auction.auctions(currentAuctionId);
      const auctionEndTime = Number(auc[3]) + Number(auc[6]);

      // 整个测试用例需要使用相同的networkConnection,否则时间戳会有问题
      await networkConnection.ethers.provider.send("evm_setNextBlockTimestamp", [auctionEndTime]);
      await networkConnection.ethers.provider.send("evm_mine");

      await expect(
        auction.connect(seller).bid(currentAuctionId, ethers.parseEther("1"), { value: ethers.parseEther("1") })
      ).to.be.revertedWith("ended");
    });

    it("should fail when bid is lower than highest bid", async function () {
      await auction.connect(admin).start(seller.address, 1, await nft.getAddress(), 1000, 30, await usdc.getAddress());
      const currentAuctionId = (await auction.auctionId()) - 1n;

      await auction.connect(seller).bid(currentAuctionId, ethers.parseEther("2"), { value: ethers.parseEther("2") });

      await expect(
        auction.connect(bidder1).bid(currentAuctionId, ethers.parseEther("1.2"), { value: ethers.parseEther("1.2") })
      ).to.be.revertedWith("invalid highestBid");
    });

    it("should correctly track bidding result", async function () {
      await auction.connect(admin).start(seller.address, 1, await nft.getAddress(), 1000, 3600, await usdc.getAddress());
      const currentAuctionId = (await auction.auctionId()) - 1n;

      await auction.connect(bidder1).bid(currentAuctionId, ethers.parseEther("2"), { value: ethers.parseEther("2") });
      await auction.connect(bidder2).bid(currentAuctionId, ethers.parseEther("3"), { value: ethers.parseEther("3") });
      await auction.connect(bidder1).bid(currentAuctionId, ethers.parseEther("4"), { value: ethers.parseEther("4") });

      const auctionData = await auction.auctions(currentAuctionId);
      expect(auctionData[4]).to.equal(bidder1.address);
      expect(auctionData[8]).to.equal(ethers.parseEther("4"));
    });
  });

  describe("upgrade", function () {
    it("should upgrade contract successfully", async function () {
      await auction.connect(admin).start(seller.address, 10, await nft.getAddress(), 1000, 3600, await usdc.getAddress());
      const oldAuctionId = await auction.auctionId();

      const MetaNFTAuctionV2Factory = await networkConnection.ethers.getContractFactory("MetaNFTAuctionV2");
      const newImpl = await MetaNFTAuctionV2Factory.deploy();

      await proxyAdmin.connect(proxyAdminSigner).upgradeAndCall(
        await proxy.getAddress(),
        await newImpl.getAddress(),
        "0x"
      );

      auctionV2 = MetaNFTAuctionV2Factory.attach(await proxy.getAddress());

      expect(await auctionV2.auctionId()).to.equal(oldAuctionId);
      expect(await auctionV2.getVersion()).to.equal("MetaNFTAuctionV2");
      expect(await auctionV2.newFeature()).to.equal("This is a new feature in V2");
    });

    it("should fail when non-admin tries to upgrade", async function () {
      await auction.connect(admin).start(seller.address, 10, await nft.getAddress(), 1000, 3600, await usdc.getAddress());

      const MetaNFTAuctionV2Factory = await networkConnection.ethers.getContractFactory("MetaNFTAuctionV2");
      const newImpl = await MetaNFTAuctionV2Factory.deploy();

      await expect(
        proxyAdmin.connect(seller).upgradeAndCall(
          await proxy.getAddress(),
          await newImpl.getAddress(),
          "0x"
        )
      ).to.be.revertedWithCustomError(proxyAdmin, "OwnableUnauthorizedAccount");
    });

    it("should change oracle after upgrade", async function () {
      await auction.connect(admin).start(seller.address, 10, await nft.getAddress(), 1000, 3600, await usdc.getAddress());

      const MockOracleFactory = await networkConnection.ethers.getContractFactory("MockOracle");
      const newEthOracle = await MockOracleFactory.deploy(ethers.parseUnits("3000", 8));

      const MetaNFTAuctionV2Factory = await networkConnection.ethers.getContractFactory("MetaNFTAuctionV2");
      const newImpl = await MetaNFTAuctionV2Factory.deploy();

      await proxyAdmin.connect(proxyAdminSigner).upgradeAndCall(
        await proxy.getAddress(),
        await newImpl.getAddress(),
        "0x"
      );

      auctionV2 = MetaNFTAuctionV2Factory.attach(await proxy.getAddress());

      await auctionV2.connect(admin).setTokenOracle(ethers.ZeroAddress, await newEthOracle.getAddress());

      const newPrice = await auctionV2.getPriceInDollar(ethers.ZeroAddress);
      expect(newPrice).to.equal(ethers.parseUnits("3000", 8));
    });
  });
});
