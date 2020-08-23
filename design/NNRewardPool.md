# NNToken 守护节点奖励池合约

本合约负责搜集挖矿奖励 nest token，并且维护一个 Checkpoint 列表，保证每一个 NNToken 的持有者都能「按比例」分到自己所应得的 nest token。

*注: 对应 NestV3 中的 NEST_NodeSave.sol NEST_NodeAssignmentData.sol*

## 数据结构

- `_NN_all_reward` ： 全部奖励 nest token 历史总量之和

- `_NN_checkpoint_all: node => allmount`：某个超级节点在上一次领取奖励时的「全部历史奖励总量」

## 参数

## 关键函数

------------------------------------------------

- `addNest(uint128 amount) public onlyNNReward`

权限：只能被 [[NNReward]] 合约调用

功能：增加 nest 总量

Callsites:

1. NNReward.addNNReward()

实现:

```js
function addNest(uint128 amount) public onlyNNReward {
    require (amount > 0, "");
    _NN_all_reward = _NN_all_reward.add(amount);
}
```

------------------------------------------------

- `getAllReward()`

权限：只能被 [[NNReward]] 合约调用

功能：增加 nest 历史奖励总量

Callsites:

1. NNReward.claimNNReward()

```js 
function getAllReward() public onlyNNReward return uint128  {
    return _NN_all_reward;
}
```
------------------------------------------------

- `addCheckpoint(address node, uint128 amount) public onlyNNReward`

权限: 只能被 [[NNReward]] 合约调用

功能: 设置 超级节点 node 的领取奖励时的总量信息

Callsites:

1. NNReward.claimNNReward()

实现: 

```js
function addCheckpoint(address node, uint128 amount) public onlyNNReward {
    _NN_checkpoint_all[node] = amount;
}
```

------------------------------------------------

- `getPrevCheckpoint(address node) public onlyNNReward return uint256`

权限: 只能被 [[NNReward]] 合约调用

功能: 得到 超级节点 node 的上次领取奖励时的 Checkpoint

Callsites:

1. NNReward.claimNNReward()

实现: 

```js
function getPrevCheckpoint(address node) public onlyNNReward return uint256 {
   return _NN_checkpoint_all[node];
}
```
------------------------------------------------

- `transferNest(address to, amount) public onlyNNReward returns(uint256) `

权限：只能被 [[NNReward]] 合约调用

功能：领取超级节点 to 的奖励

1. 得到当前奖励池还剩下的 nest 奖励 leftNum
2. 如果 leftNum >= amount 那么就转账，返回转账数量，否则返回 0

Callsites:

1. NNReward.claimNNReward()

```js
function transferNest(address to, amount) public onlyNNReward returns(uint256) {
    uint256 blncs = _C_NestToken.balanceOf(address(this));
    if (blncs >= amount) {
        _C_NestToken.transfer(to, amount);
        return amount;
    } else {
        return 0;
    }
}
```


<!-- - `transferNest(NNholder, amount) public onlyNNRewardContract`

功能: 给 NN holder 转账 nest token

实现: -->

<!-- ```js
function transferNest(NNholder, amount) public onlyNNRewardContract {
    require(amount > 0, "");
    ERC20(_C_NestToken).transfer(NNholder, amount);
}
``` -->

