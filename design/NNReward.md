# 超级节点奖励合约 

NN 表示 Nest Node，为 Nest 协议的守护节点，拥有 NNToken。为 Nest 协议的运行提供支持。

本合约实现 NNToken 参与挖矿抽成的逻辑。数据保存在 [[NNRewardPool]] 合约中

*注: 对应 NestV3 中的 NEST_NodeAssignment.sol 合约*

## TODO

优化：NN-奖励池中 **不可能** 会发生 nest 不够分配的情况，所以所有验证 nest 合约中是否余额足够的条件可能可以被删除

## 数据结构

无

## 参数

- `_C_NestToken` 

- `_C_NNRewardPool`

- `_C_NNToken`

## 关键函数

------------------------------------------------

- `addNNReward(amount) external`

权限：任何人

功能：将 nestToken 打入到奖励池。奖励池位于 [[NNRewardPool]] 合约

Callsites:
1. NestPool.clearNest()

------------------------------------------------

- `claimNNReward() external noContract` 

权限：任何用户调用，禁止合约调用

功能：NN 超级节点领取 nest 奖励

改名 <= nodeGet

参数要求 Assumes: 

1. 禁止合约调用
2. 要求 当前用户的 NNToken 余额 > 0
3. 要求 奖励池中的 nest 数量应该大于 要领取的量
4. 调用 nodeSave 合约 turnOut 函数，转给 msg.sender
5. 修改 当前用户的此刻历史总量

副作用 Guarantees:

Callsites:

------------------------------------------------

- `settleNNReward(fromAddr, toAddr) public`

权限：只能被 NNToken 合约调用。 这是因为 NNToken 在发生转账时，需要回调这个函数进行 NNToken 奖励的清结算。

功能：对 NNToken 在发生转账的时候，进行清结算

改名 <= nodeCount

1. 要求，只能被 NNToken 合约调用
2. 要求 NNtoken 合约的from 地址余额 > 0 //TODO： 似乎多余
3. 得到当前的 「nest奖励总和」
4. 得到 from 用户上一次领取奖励时的 「nest奖励总和」
5. 计算 from 用户还有多少 nest 未领取
6. 如果 奖励池中的 nestToken 数量 > from用户未领取量，那么进行领取操作，
7. 得到 to 用户上一次领取奖励时的 「nest奖励总和」
8. 计算 to 用户还有多少 nest 未领取
9. 如果 奖励池中的nestToken 数量 > to 用户未领取量，那么进行领取操作

副作用 Guarantees:

Callsites: 

1. NNToken.transfer()

------------------------------------------------

- `checkNNReward() public view returns (uint256)`

权限：公开查看

功能：得到 msg.sender 未领取的 nest 数量


## 实现

```js 
function addNNReward(amount) external {
    require(amount > 0);
    require(_C_NestToken.transferFrom(address(msg.sender), address(_C_NNRewardPool), amount)); //gy: 问题：为何不记录？
    _C_NNRewardPool.addNest(amount);
}
```

```js
function claimNNReward() external noContract {
    require(_C_NNToken.balanceOf(address(msg.sender)) > 0);
    uint128 all = _C_NNRewardPool.getAllAmount();
    uint128 amount = all.sub(uint128(_C_NNRewardPool.getPrevCheckpoint(address(msg.sender))));
    uint128 share = amount.mul(_C_NNToken.balanceOf(address(msg.sender))).div(1500);
    _C_NestPool.clearNest(_developer_address);
    _C_NestPool.clearNest(_NN_address);

    require(_C_NestToken.balanceOf(address(_C_NNRewardPool)) >= uint256(share)); 
    _C_NNRewardPool.transferNest(address(msg.sender), share);
    _C_NNRewardPool.addCheckpoint(address(msg.sender), all);
}
```

