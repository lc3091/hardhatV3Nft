# 合约交互脚本使用指南

本目录包含两个交互脚本示例，分别使用 Ethers.js 和 Viem 库与 MetaNFTAuction 合约进行交互。

## 环境配置

在运行脚本之前，请确保：

1. 安装依赖：
```bash
npm install
```

2. 创建 `.env` 文件并配置以下环境变量：
```env
AUCTION_ADDRESS=0x你的合约地址
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0x你的私钥
```

## 脚本说明

### 1. Ethers.js 交互脚本 (`interact.ethers.ts`)

**特点：**
- 使用 ethers v6 语法
- 简洁的 ABI 定义
- 直观的合约调用方式

**运行方式：**
```bash
npx hardhat run scripts/interact.ethers.ts
```

**主要功能：**
- 查询合约版本、拍卖ID、管理员地址
- 查询拍卖详情（NFT信息、卖家、时间、价格等）
- 查询拍卖状态和价格信息
- 交易操作示例（设置Oracle、启动拍卖、出价、结束拍卖）
- 事件监听示例

### 2. Viem 交互脚本 (`interact.viem.ts`)

**特点：**
- 使用 Viem 库
- 完整的 ABI 类型定义
- 类型安全的合约交互
- 更现代的 API 设计

**运行方式：**
```bash
npx hardhat run scripts/interact.viem.ts
```

**主要功能：**
- 与 Ethers.js 脚本功能相同
- 使用 Viem 的 `readContract` 和 `writeContract` 方法
- 支持事件监听

## 代码示例对比

### 查询操作

**Ethers.js:**
```typescript
const auction = new ethers.Contract(AUCTION_ADDRESS, AUCTION_ABI, wallet);
const auctionId = await auction.auctionId();
const auctionData = await auction.auctions(0);
```

**Viem:**
```typescript
const auctionId = await publicClient.readContract({
  address: AUCTION_ADDRESS,
  abi: AUCTION_ABI,
  functionName: "auctionId"
});

const auctionData = await publicClient.readContract({
  address: AUCTION_ADDRESS,
  abi: AUCTION_ABI,
  functionName: "auctions",
  args: [0n]
});
```

### 交易操作

**Ethers.js:**
```typescript
const tx = await auction.bid(auctionId, bidAmount, { value: bidAmount });
await tx.wait();
```

**Viem:**
```typescript
const tx = await walletClient.writeContract({
  address: AUCTION_ADDRESS,
  abi: AUCTION_ABI,
  functionName: "bid",
  args: [auctionId, bidAmount],
  value: bidAmount
});
await publicClient.waitForTransactionReceipt({ hash: tx });
```

### 事件监听

**Ethers.js:**
```typescript
auction.on("Bid", (sender, amount, event) => {
  console.log("新出价:", sender, ethers.formatEther(amount), "ETH");
});
```

**Viem:**
```typescript
const unwatch = publicClient.watchContractEvent({
  address: AUCTION_ADDRESS,
  abi: AUCTION_ABI,
  eventName: "Bid",
  onLogs: (logs) => {
    logs.forEach((log) => {
      console.log("新出价:", log.args.sender, formatEther(log.args.amount || 0n), "ETH");
    });
  }
});
```

## 注意事项

1. **安全性：** 请勿将私钥提交到版本控制系统
2. **网络：** 确保连接到正确的网络（本地开发网络或测试网）
3. **Gas：** 交易操作需要足够的 ETH 支付 gas 费用
4. **权限：** 某些操作（如启动拍卖、设置Oracle）需要管理员权限
5. **NFT授权：** 启动拍卖前，卖家需要先授权合约操作其 NFT

## 完整示例流程

1. 部署合约和相关依赖（NFT、Oracle、ERC20）
2. 配置环境变量
3. 运行查询脚本查看合约状态
4. 根据需要取消注释交易操作代码
5. 执行交易操作

## 故障排查

- **连接失败：** 检查 RPC_URL 是否正确
- **交易失败：** 检查账户余额和权限
- **ABI错误：** 确保 ABI 与合约匹配
- **地址错误：** 检查 AUCTION_ADDRESS 是否正确
