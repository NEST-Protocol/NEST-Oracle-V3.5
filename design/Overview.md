
# Nest 3.5 重构设计：

 
## 模块划分

1. 预言机功能
2. 挖矿/激励
3. 分红/收益
4. 治理/分叉 (DAO)

## 模块设计

- 资金池合约 [[NestPool]]: 合并了之前的 NestPool, ABonus, Leveling 三个合约

- 挖矿合约 [[Mining]] : 合并了之前的 OfferMain 合约，与 NToken_Offer 合约

- 质押分红合约 [[Staking]]: 合并了之前的 ABonus，Leveling, Staking

- 服务合约 [[PriceOracle]]: 之前的 off

## old
- 矿池合约 [[NestPool]]
- 报价挖矿合约[[NestMining]]
- 预言机服务合约 [[Oracle]]

- 分红池合约 [[ABonus]]
- 平准基金合约 [[Leveling]] 
- staking 分红 [[Staking]]

- nToken 拍卖 [[Auction]]
- nToken 合约 [[NToken]] 
- nToken 映射合约 [[nTokenMapping]]

- vote 治理合约 [[DAO]]
 

特征：DeFi 无托管

## 注意事项

<1> 权限检查
<2> 事件是否正确归类
<3> 资金流向
<4> 边界条件检查
<5> 算法是否一致
<6> 关键函数的 Call-sites，列出所有的 caller，以及权限传递关系

<7> 功能开关，按场景粒度 / 非接口粒度
1. 拍卖
2. 分红
3. NN Token

<8> 所有的中间

## 半形式化验证的工作

1> 权限传递
2> 金额流向与判断条件

## 功能增加

1. 价格调用激励
2. 新收费模型：按规模收费/按次计费
3. 包月调用（待定）

## 重构的改进点

<1> 冗余代码

<2> 变量名命名统一

1. erc20 <-> token

<3> 合约合并

<4> 函数 inline

<5> NNToken 维持不动

<6> 投票合约重新设计

## 数据结构重构

+ 设置一些合约级别的 cache 变量，保存其它合约的地址，设置一个标志位，needReload

## 合约架构重构

[[NestPool]] 与 [[NestMining]] [[Oracle]] 三个合约合并，降低报价挖矿的GAS

## 高频函数优化

### 超级节点模块

- 超级节点挖矿奖励合约 [[NNReward]]
- 超级节点奖励池合约 [[NNRewardPool]]
- 超级节点 Token 合约 [[NNToken]]

## 问题

- nestToken 挖完后怎么办？这部分业务逻辑在哪？

- 如果预言机服务传入一个非法token，则返回 eth/usd 的报价，但是 usdt/usdc/pax 可能有价差

- 新收费模型中的按规模收费的含义？

- offer 函数中，如果新报价不偏离的话，不要求 _leastEth 吗？

- offer 函数中，判断 coder > 0 ， 感觉应该是 coderAddress 是否为 null   L131

- offer 函数中，` _offerBlockMining[block.number] = other;`  bug?? 一个区块上不会出现两次报价吗？
答：不会，因为每次计算挖矿量的时候，都是重新计算

- 如果报价单数组的优化，需要保留多少报价单。每一个报价单结构体，占据 9 * uint256 存储

- createOffer 都在哪些地方被调用？

- OfferMain 233 行, 这个情况几乎不可能发生。不过重构之后就无需再考虑

- _offerPrice.changePrice() 的最后一个参数 endBlock 的含义？