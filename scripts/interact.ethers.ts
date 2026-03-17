import { ethers } from "ethers";
import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const AUCTION_ADDRESS = process.env.AUCTION_ADDRESS || "";
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

async function getAuctionABI() {
  const artifact = await hre.artifacts.readArtifact("MetaNFTAuction");
  return artifact.abi;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const AUCTION_ABI = await getAuctionABI();
  const auction = new ethers.Contract(AUCTION_ADDRESS, AUCTION_ABI, wallet);

  console.log("=== MetaNFTAuction 交互脚本 (Ethers.js) ===\n");
  console.log("连接地址:", AUCTION_ADDRESS);
  console.log("钱包地址:", wallet.address);
  console.log("网络:", (await provider.getNetwork()).name, "\n");

  console.log("=== 查询操作 ===\n");

  const version = await auction.getVersion();
  console.log("1. 合约版本:", version);

  const auctionId = await auction.auctionId();
  console.log("2. 当前拍卖ID:", auctionId.toString());

  if (auctionId > 0n) {
    const auctionData = await auction.auctions(0);
    console.log("\n3. 拍卖 #0 详情:");
    console.log("   - NFT地址:", auctionData[0]);
    console.log("   - NFT ID:", auctionData[1].toString());
    console.log("   - 卖家:", auctionData[2]);
    console.log("   - 开始时间:", new Date(Number(auctionData[3]) * 1000).toISOString());
    console.log("   - 最高出价者:", auctionData[4]);
    console.log("   - 起拍价(美元):", ethers.formatUnits(auctionData[5], 8));
    console.log("   - 持续时间:", auctionData[6].toString(), "秒");
    console.log("   - 支付代币:", auctionData[7]);
    console.log("   - 最高出价:", ethers.formatEther(auctionData[8]), "ETH");
    console.log("   - 最高出价(美元):", ethers.formatUnits(auctionData[9], 8));
    console.log("   - 最高出价代币:", auctionData[10]);

    const ended = await auction.isEnded(0);
    console.log("\n4. 拍卖 #0 是否已结束:", ended);

    const ethPrice = await auction.getPriceInDollar(ethers.ZeroAddress);
    console.log("5. ETH 价格(美元):", ethers.formatUnits(ethPrice, 8));

    const oracle = await auction.tokenToOracle(ethers.ZeroAddress);
    console.log("6. ETH Oracle 地址:", oracle);
  }

  console.log("\n=== 交易操作示例 ===\n");

  console.log("注意: 以下代码展示了如何调用合约函数，实际使用时需要取消注释\n");

  // 示例 1: 设置 Oracle
  // console.log("1. 设置 ETH Oracle...");
  // const oracleAddress = "0x1234567890123456789012345678901234567890";
  // const tx1 = await auction.setTokenOracle(ethers.ZeroAddress, oracleAddress);
  // console.log("交易哈希:", tx1.hash);
  // await tx1.wait();
  // console.log("Oracle 设置成功\n");

  // 示例 2: 启动拍卖
  // console.log("2. 启动新拍卖...");
  // const sellerAddress = "0x1234567890123456789012345678901234567890";
  // const nftAddress = "0x1234567890123456789012345678901234567890";
  // const nftId = 1;
  // const startingPrice = 1000;
  // const duration = 3600;
  // const paymentToken = "0x1234567890123456789012345678901234567890";
  // const tx2 = await auction.start(sellerAddress, nftId, nftAddress, startingPrice, duration, paymentToken);
  // console.log("交易哈希:", tx2.hash);
  // await tx2.wait();
  // console.log("拍卖启动成功\n");

  // 示例 3: 出价
  // console.log("3. 出价...");
  // const bidAuctionId = 0;
  // const bidAmount = ethers.parseEther("1.0");
  // const tx3 = await auction.bid(bidAuctionId, bidAmount, { value: bidAmount });
  // console.log("交易哈希:", tx3.hash);
  // await tx3.wait();
  // console.log("出价成功\n");

  // 示例 4: 结束拍卖
  // console.log("4. 结束拍卖...");
  // const endAuctionId = 0;
  // const tx4 = await auction.end(endAuctionId);
  // console.log("交易哈希:", tx4.hash);
  // await tx4.wait();
  // console.log("拍卖结束成功\n");

  console.log("=== 监听事件示例 ===\n");

  // 监听所有事件
  // auction.on("StartBid", (auctionId, event) => {
  //   console.log("新拍卖启动:", auctionId.toString());
  // });
  
  // auction.on("Bid", (sender, amount, event) => {
  //   console.log("新出价:", sender, ethers.formatEther(amount), "ETH");
  // });
  
  // auction.on("EndBid", (auctionId, event) => {
  //   console.log("拍卖结束:", auctionId.toString());
  // });

  console.log("脚本执行完成!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
