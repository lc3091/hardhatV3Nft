import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, parseEther, formatEther, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import hre from "hardhat";

const AUCTION_ADDRESS = process.env.AUCTION_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000";
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = (process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`;

async function getAuctionABI() {
  const artifact = await hre.artifacts.readArtifact("MetaNFTAuction");
  return artifact.abi;
}

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const AUCTION_ABI = await getAuctionABI();
  
  const hardhatChain = {
    id: 31337,
    name: "hardhat",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } }
  } as const;

  const publicClient = createPublicClient({
    chain: hardhatChain,
    transport: http(RPC_URL)
  });

  const walletClient = createWalletClient({
    account,
    chain: hardhatChain,
    transport: http(RPC_URL)
  });

  console.log("=== MetaNFTAuction 交互脚本 ===\n");
  console.log("连接地址:", AUCTION_ADDRESS);
  console.log("钱包地址:", account.address);
  console.log("网络 ID:", await publicClient.getChainId(), "\n");

  console.log("=== 查询操作 ===\n");

  const version = await publicClient.readContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "getVersion"
  });
  console.log("1. 合约版本:", version);

  const auctionId = await publicClient.readContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: "auctionId"
  });
  console.log("2. 当前拍卖ID:", auctionId.toString());

  if (auctionId > 0n) {
    const auctionData = await publicClient.readContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "auctions",
      args: [0n]
    });
    
    console.log("\n3. 拍卖 #0 详情:");
    console.log("   - NFT地址:", auctionData[0]);
    console.log("   - NFT ID:", auctionData[1].toString());
    console.log("   - 卖家:", auctionData[2]);
    console.log("   - 开始时间:", new Date(Number(auctionData[3]) * 1000).toISOString());
    console.log("   - 最高出价者:", auctionData[4]);
    console.log("   - 起拍价(美元):", formatUnits(auctionData[5], 8));
    console.log("   - 持续时间:", auctionData[6].toString(), "秒");
    console.log("   - 支付代币:", auctionData[7]);
    console.log("   - 最高出价:", formatEther(auctionData[8]), "ETH");
    console.log("   - 最高出价(美元):", formatUnits(auctionData[9], 8));
    console.log("   - 最高出价代币:", auctionData[10]);

    const ended = await publicClient.readContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "isEnded",
      args: [0n]
    });
    console.log("\n4. 拍卖 #0 是否已结束:", ended);

    const ethPrice = await publicClient.readContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "getPriceInDollar",
      args: [zeroAddress]
    });
    console.log("5. ETH 价格(美元):", formatUnits(ethPrice, 8));

    const oracle = await publicClient.readContract({
      address: AUCTION_ADDRESS,
      abi: AUCTION_ABI,
      functionName: "tokenToOracle",
      args: [zeroAddress]
    });
    console.log("6. ETH Oracle 地址:", oracle);
  }

  console.log("\n=== 交易操作示例 ===\n");

  console.log("注意: 以下代码展示了如何调用合约函数，实际使用时需要取消注释\n");

  // 示例 1: 设置 Oracle
  // console.log("1. 设置 ETH Oracle...");
  // const oracleAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;
  // const tx1 = await walletClient.writeContract({
  //   address: AUCTION_ADDRESS,
  //   abi: AUCTION_ABI,
  //   functionName: "setTokenOracle",
  //   args: [zeroAddress, oracleAddress]
  // });
  // console.log("交易哈希:", tx1);
  // await publicClient.waitForTransactionReceipt({ hash: tx1 });
  // console.log("Oracle 设置成功\n");

  // 示例 2: 启动拍卖
  // console.log("2. 启动新拍卖...");
  // const sellerAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;
  // const nftAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;
  // const nftId = 1n;
  // const startingPrice = 1000n;
  // const duration = 3600n;
  // const paymentToken = "0x1234567890123456789012345678901234567890" as `0x${string}`;
  // const tx2 = await walletClient.writeContract({
  //   address: AUCTION_ADDRESS,
  //   abi: AUCTION_ABI,
  //   functionName: "start",
  //   args: [sellerAddress, nftId, nftAddress, startingPrice, duration, paymentToken]
  // });
  // console.log("交易哈希:", tx2);
  // await publicClient.waitForTransactionReceipt({ hash: tx2 });
  // console.log("拍卖启动成功\n");

  // 示例 3: 出价
  // console.log("3. 出价...");
  // const bidAuctionId = 0n;
  // const bidAmount = parseEther("1.0");
  // const tx3 = await walletClient.writeContract({
  //   address: AUCTION_ADDRESS,
  //   abi: AUCTION_ABI,
  //   functionName: "bid",
  //   args: [bidAuctionId, bidAmount],
  //   value: bidAmount
  // });
  // console.log("交易哈希:", tx3);
  // await publicClient.waitForTransactionReceipt({ hash: tx3 });
  // console.log("出价成功\n");

  // 示例 4: 结束拍卖
  // console.log("4. 结束拍卖...");
  // const endAuctionId = 0n;
  // const tx4 = await walletClient.writeContract({
  //   address: AUCTION_ADDRESS,
  //   abi: AUCTION_ABI,
  //   functionName: "end",
  //   args: [endAuctionId]
  // });
  // console.log("交易哈希:", tx4);
  // await publicClient.waitForTransactionReceipt({ hash: tx4 });
  // console.log("拍卖结束成功\n");

  console.log("=== 监听事件示例 ===\n");

  // 监听事件
  // const unwatch = publicClient.watchContractEvent({
  //   address: AUCTION_ADDRESS,
  //   abi: AUCTION_ABI,
  //   eventName: "StartBid",
  //   onLogs: (logs) => {
  //     logs.forEach((log) => {
  //       console.log("新拍卖启动:", log.args.auctionId?.toString());
  //     });
  //   }
  // });

  // const unwatchBid = publicClient.watchContractEvent({
  //   address: AUCTION_ADDRESS,
  //   abi: AUCTION_ABI,
  //   eventName: "Bid",
  //   onLogs: (logs) => {
  //     logs.forEach((log) => {
  //       console.log("新出价:", log.args.sender, formatEther(log.args.amount || 0n), "ETH");
  //     });
  //   }
  // });

  console.log("脚本执行完成!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
