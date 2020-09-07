# NNToken 守护节点奖励池合约

本合约负责搜集挖矿奖励 nest token，并且维护一个 Checkpoint 列表，保证每一个 NNToken 的持有者都能「按比例」分到自己所应得的 nest token。

*注: 对应 NestV3 中的 NEST_NodeSave.sol NEST_NodeAssignmentData.sol*

## 数据结构

- `_NN_reward_sum`  全部奖励 nest token 历史总量之和

- `_NN_total_supply = 1500`: NNToken 的总量

- `_NN_reward_sum_checkpoint: node => allmount`

某个超级节点 node 在上一次领取 nest 奖励时的「全部历史奖励总量」，用于计算当前未领取的 nest 奖励

## 合约参数

- `ERC20 _C_NNToken`
    
- `ERC20 _C_NestToken`

## 关键函数

------------------------------------------------

- `addNest(uint128 amount) public onlyNNReward`

权限：只能被 [[NestPool]] 合约调用

功能：增加 nest 总量

TODO: 这个函数不能直接调用 NestToken.balanceOf 来得到，因为未来 NestToken 的转账是一个 lazy 异步操作

Callsites:

1. ----

实现:

```js
    function addNNReward(uint256 amount) override external
    {
        _NN_reward_sum = uint128(uint256(_NN_reward_sum).add(amount));
        return;
    }
```

------------------------------------------------

- `claimNNReward() returns (uint256)`

权限：禁止合约调用

功能：node 领取奖励

副作用:
1. 修改 `_NN_reward_sum_checkpoint[node]`
2. nest 转账

资金流向: 
1. NEST | this ==> node


```js 
    function claimNNReward() override external returns (uint256) {
        uint256 blnc =  _C_NNToken.balanceOf(address(msg.sender));
        require(blnc > 0, "Insufficient NNToken");
        uint256 total = _NN_total_supply;
        uint256 sum = _NN_reward_sum;
        uint256 reward = sum.sub(_NN_reward_sum_checkpoint[address(msg.sender)]);
        uint256 share = reward.mul(blnc).div(total);

        require(_C_NestToken.balanceOf(address(this)) >= uint256(share), "Insufficient NestTokens"); 
        _C_NestToken.transfer(address(msg.sender), share);
        _NN_reward_sum_checkpoint[address(msg.sender)] = sum;
        return share;
    }
```
------------------------------------------------

- `settleNNReward(address from, address to)`

权限: 
1. 只能被 [[NNToken]] 合约调用

功能: 在 NNToken 转账时，对转账双方应该领取的奖励进行清算

Callsites:

1. NNToken.transfer()
2. NNToken.transferFrom()

实现: 

```js
    function settleNNReward(address from, address to) internal 
        // onlyNNToken
    {
        uint256 fromBlnc = _C_NNToken.balanceOf(address(from));
        require (fromBlnc > 0, "No NNToken to transfer");
        uint256 sum = _NN_reward_sum;
        uint256 total = _NN_total_supply;
        uint256 fromReward = sum.sub(_NN_reward_sum_checkpoint[from]).mul(fromBlnc).div(total);
        _C_NestToken.transfer(from, fromReward);
        _NN_reward_sum_checkpoint[from] = _NN_reward_sum_checkpoint[from].add(sum);

        uint256 toBlnc = _C_NNToken.balanceOf(address(to));
        uint256 toReward = sum.sub(_NN_reward_sum_checkpoint[to]).mul(toBlnc).div(total);
        _C_NestToken.transfer(to, toReward);
        _NN_reward_sum_checkpoint[to] = _NN_reward_sum_checkpoint[to].add(sum);
        return;
    }
```
