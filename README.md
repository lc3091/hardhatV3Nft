# NFT Auction Demo

一个基于以太坊的 NFT 拍卖智能合约项目，支持多种代币出价、Chainlink 价格预言机集成，以及可升级合约架构。

## 📋 项目概述

本项目实现了一个功能完整的 NFT 拍卖系统，具有以下核心功能：

- **NFT 拍卖管理**：卖家可以发起 NFT 拍卖，设置起拍价和拍卖时长
- **多代币支持**：支持 ETH 和 ERC20 代币出价
- **价格预言机**：集成 Chainlink 价格预言机，实现不同代币之间的价格转换
- **可升级架构**：使用 OpenZeppelin 透明代理模式，支持合约升级
- **自动退款**：非最高出价者的资金会自动退还

## 🛠 技术栈

- **开发框架**: Hardhat v3
- **智能合约**: Solidity 0.8.28
- **合约库**: OpenZeppelin Contracts v5.4.0
- **价格预言机**: Chainlink
- **测试框架**: 
  - Hardhat + Mocha (Solidity 测试)
  - Ethers.js v6
  - Viem v2
- **类型支持**: TypeScript

## 📦 安装

```bash
# 克隆项目
git clone <repository-url>
cd nft-auction-demo

# 安装依赖
npm install
```

## 🔧 配置

创建 `.env` 文件并配置以下环境变量：

```env
# 合约交互脚本配置
AUCTION_ADDRESS=0x你的合约地址
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0x你的私钥
```

## 📄 合约说明

### 核心合约

| 合约 | 说明 |
|------|------|
| `MetaNFTAuction.sol` | 主拍卖合约，实现拍卖逻辑 |
| `MetaNFTAuctionV2.sol` | 升级版拍卖合约，演示升级功能 |
| `MetaNFT.sol` | NFT 合约，用于测试 |
| `MockERC20.sol` | ERC20 测试代币合约 |
| `MockOracle.sol` | Chainlink 价格预言机 Mock 合约 |

### 主要功能

#### MetaNFTAuction

- `initialize(address admin)`: 初始化合约
- `setTokenOracle(address token, address oracle)`: 设置代币价格预言机
- `start(...)`: 发起拍卖
- `bid(uint256 auctionId, uint256 amount)`: 出价（支持 ETH 和 ERC20）
- `end(uint256 auctionId)`: 结束拍卖
- `getPriceInDollar(address token)`: 获取代币美元价格
- `isEnded(uint256 auctionId)`: 查询拍卖是否结束

## 🧪 测试

### 运行所有测试

```bash
# 编译合约
npx hardhat compile

# 运行 Solidity 测试
npx hardhat test

# 运行 Ethers.js 测试
npx hardhat test test/MetaNFTAuction.ethers.ts

# 运行 Viem 测试
npx hardhat test test/MetaNFTAuction.viem.ts

# 运行所有测试
npx hardhat test test/MetaNFTAuction.ethers.ts test/MetaNFTAuction.viem.ts
```

### 测试覆盖

测试用例覆盖以下功能：

- ✅ 合约版本验证
- ✅ 价格查询功能
- ✅ 初始化权限控制
- ✅ 拍卖启动流程
- ✅ 出价验证（时间、金额）
- ✅ 拍卖结束逻辑
- ✅ 合约升级功能
- ✅ 升级后功能验证

## 🚀 部署

项目使用 Hardhat Ignition 进行合约部署，支持透明代理模式。

### 本地部署

```bash
# 启动本地节点
npx hardhat node

# 在新终端部署合约
npx hardhat ignition deploy ignition/modules/MetaNFTAuctionProxyModule.ts --network localhost
```

### 测试网部署

```bash
# 配置 hardhat.config.ts 中的网络信息
npx hardhat ignition deploy ignition/modules/MetaNFTAuctionProxyModule.ts --network sepolia
```

### 部署模块说明

项目提供了多个 Ignition 部署模块：

| 模块 | 说明 |
|------|------|
| `MetaNFTAuctionProxyModule.ts` | 部署拍卖合约（透明代理模式） |
| `MetaNFTAuctionUpgradeModule.ts` | 升级拍卖合约到 V2 版本 |
| `MetaNFT.ts` | 部署 NFT 合约 |
| `MetaNFTAuction.ts` | 部署拍卖合约（无代理） |
| `MetaNFTAuctionV2.ts` | 部署升级版拍卖合约 |

### 部署流程

**首次部署（透明代理模式）：**

```bash
npx hardhat ignition deploy ignition/modules/MetaNFTAuctionProxyModule.ts --network <network-name>
```

这将部署：
1. MetaNFTAuction 实现合约
2. TransparentUpgradeableProxy 代理合约
3. ProxyAdmin 管理合约

**合约升级：**

```bash
npx hardhat ignition deploy ignition/modules/MetaNFTAuctionUpgradeModule.ts --network <network-name>
```

这将：
1. 部署新的 MetaNFTAuctionV2 实现合约
2. 通过 ProxyAdmin 升级代理指向新实现

### 查看部署信息

部署完成后，可以在 `ignition/deployments/` 目录下查看：
- `deployed_addresses.json` - 已部署合约地址
- `artifacts/` - 合约 artifacts
- `journal.jsonl` - 部署日志

## 💻 交互脚本

项目提供了两个交互脚本示例，分别使用 Ethers.js 和 Viem：

### Ethers.js 版本

```bash
npx hardhat run scripts/interact.ethers.ts
```

### Viem 版本

```bash
npx hardhat run scripts/interact.viem.ts
```

### 功能特性

- 查询合约状态（版本、拍卖ID、拍卖详情等）
- 发送交易（设置Oracle、启动拍卖、出价、结束拍卖）
- 事件监听示例
- 完整的错误处理

详细使用说明请参考 [scripts/README.md](scripts/README.md)

## 🔄 合约升级

项目使用 OpenZeppelin 的透明代理模式实现可升级性：

1. **部署流程**：
   - 部署实现合约（Logic Contract）
   - 部署代理合约（Proxy Contract）
   - 通过代理合约调用初始化函数

2. **升级流程**：
   - 部署新的实现合约
   - 通过 ProxyAdmin 升级代理指向新的实现

3. **测试验证**：
   - 升级后状态保持
   - 新功能可用
   - 权限控制正确

## 📁 项目结构

```
nft-auction-demo/
├── contracts/              # 智能合约
│   ├── MetaNFTAuction.sol
│   ├── MetaNFTAuctionV2.sol
│   ├── MetaNFT.sol
│   ├── MockERC20.sol
│   └── MockOracle.sol
├── test/                   # 测试文件
│   ├── MetaNFTAuction.t.sol      # Solidity 测试
│   ├── MetaNFTAuction.ethers.ts  # Ethers.js 测试
│   └── MetaNFTAuction.viem.ts    # Viem 测试
├── scripts/                # 脚本
│   ├── interact.ethers.ts  # Ethers.js 交互脚本
│   ├── interact.viem.ts    # Viem 交互脚本
│   └── README.md           # 脚本使用说明
├── hardhat.config.ts       # Hardhat 配置
├── package.json
└── README.md
```

## 🔐 安全注意事项

1. **私钥管理**：永远不要将私钥提交到版本控制系统
2. **权限控制**：管理员权限需要妥善保管
3. **Oracle 配置**：生产环境需要使用真实的 Chainlink 价格预言机
4. **NFT 授权**：启动拍卖前，卖家需要先授权合约操作其 NFT
5. **Gas 费用**：确保账户有足够的 ETH 支付 gas 费用

## 📚 相关文档

- [Hardhat 文档](https://hardhat.org/docs)
- [OpenZeppelin 文档](https://docs.openzeppelin.com/)
- [Chainlink 文档](https://docs.chain.link/)
- [Ethers.js 文档](https://docs.ethers.org/v6/)
- [Viem 文档](https://viem.sh/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
