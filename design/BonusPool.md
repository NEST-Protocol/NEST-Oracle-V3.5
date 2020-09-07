# Bonus 分红池合约

本合约维护所有的分红用的 eth，包括用于当周分红的 eth，还包括平准基金储蓄。

任何持有 nest token 或者 ntoken 的用户可以把这些 token 锁仓质押，然后就可以按照比例(token/total) 分得分红池的中 eth。

分红池中的 eth 的来源主要是两个:
1. 矿工报价挖矿的手续费
2. 客户调用预言机接口的服务费

分红池按照 nest/ntoken 分成多个不同的子池子，stake 不同的 nest/ntoken，对应领取不同收益比例。

当分红池中的 eth 数量较多时，会将一部分比例 eth 转入存储账户，当未来分红池中的 eth 不足时，将提取存储账户中的 eth，从而降低分红收益率的波动性。

本合约维护了质押的账本，锁了分红 eth，质押的 nest/ntoken。合约函数绝大多数只能被
[[Staking]] 合约调用。

本合约主要有以下几个主要函数:

- `getBonusEthAmount(ntoken)`
- `getLevelingEthAmount(ntoken)`

- `getNTokenAmount(nestNtoken, address user)`
- `getNTokenBonusAmount(address nestNtoken)`

- `lockNToken(sender, nestNtoken, amount)`
- `unlockNToken(receiver, nestNtoken, amount)`

- `pumpinEth(nestNtoken, amount)`
- `pickupEth(recevier, ntoken, amount)`

- `moveBonusToLeveling(amount)`
- `moveBonusFromLeveling(nestNtoken, amount)`

TODO: 修改函数名，统一函数命名规范

## 数据结构

- `_bonus_ledger_eth: nestNtoken => amount` 记录 nestToken/nToken 对应的分红用 eth 数量

- `_leveling_ledger_eth: nestNtoken => amount` 记录 平准基金账本

- `_staking_ledger: nestNtoken => user => amount` ：记录每一个人 stake 的 token 数量 (<= _baseMapping)

## 关键函数

-----------------------------------------------------

- `pumpinEth(nestNtoken, amount)`

权限：
1. 仅允许 [[Mining]] 合约调用
2. 仅允许 [[PriceOracle]] 合约调用

功能：将 eth 手续费的数额计入 nestNtoken 所对应的分红池账本，但是这时候 eth 并没有真正转账过来。

参数要求:
1. nest/ntoken 应该是合法的 nest/ntoken 地址，在 [[NestPool]] 中存在ntoken 映射
TODO: 这里检查会消耗GAS，需要在 Caller 中保证

副作用:
1. 修改 `_bonus_ledger_eth`

Callsites:
1. NestMining.biteToken()
2. NestMining.biteEth()
3. NestMining.postPriceSheet()
4. NestPrice.queryPrice()
5. NestPrice.renewalClient()

资金流向:  eth | msg.sender ==> this  
TODO: 这里应该去除 amount 参数，直接使用 msg.value

实现:

```js
function pumpinEth(address nestNtoken, uint256 amount) public payable onlyStakingContract {
    require(msg.value >= amount, "");
    _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].add(amount);
}
```

-----------------------------------------------------

- `pickupEth(recevier, nestNtoken, amount)`

权限: 
1. 仅允许 [[Staking]] 合约调用

功能: 将 amount 数量的 eth 转给 recevier，并在 nestNtoken 对应的分红池账本上减去 amount，同时进行 eth 转账操作。

参数要求:
1. nest/ntoken 应该是合法的 nest/ntoken 地址，在 [[NestPool]] 中存在ntoken 映射
TODO: 这里检查会消耗GAS，需要在 Caller 中保证

副作用:
1. 修改 _bonus_ledger_eth

资金流向:
1. eth; amount | BonusPool ==> receiver 

Callsites:
1. Staking.claim()

实现:

```js
function pickupEth(address recevier, address nestNtoken, uint256 amount) public onlyStakingContract {
    _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].sub(amount);
    recevier.transfer(amount);
}
```

-----------------------------------------------------

- `getNTokenBonusAmount(address nestNtoken)` 

权限: 
1. 仅允许 [[Staking]] 合约调用

TODO: 改名 => amountOfBonus

功能: 得到 nestNtoken 所对应分红池的 eth 数量

参数要求:
1. nest/ntoken 应该是合法的 nest/ntoken 地址，在 [[NestPool]] 中存在ntoken 映射
TODO: 这里检查会消耗GAS，需要在 Caller 中保证

副作用:  none

资金流向: none

Callsites:
1. Staking.claim()

实现:

```js
function getNTokenBonusAmount(address nestNtoken) onlyStakingContract return (uint128 amount) {
    uint128 ethTotal = _bonus_ledger_eth[nestNtoken];
    return ethTotal;
}
```

-----------------------------------------------------

- `getNTokenAmount(nestNtoken, user)` 

权限: 允许任何人调用

TODO: 改名 => amountOfStakedNToken

功能: 得到 nest/ntoken holder 锁仓的 nestNtoken 数量

参数要求: none

副作用: none

资金流向: none

Callsites:
1. Staking.claim()

实现:

```js
function getNTokenAmount(address nestNtoken, address user) public return (uint128 amount) {
    uint256 ntokenAmount = _staking_ledger(senuserder, nestNtoken);
    return ntokenAmount;
} 
```

-----------------------------------------------------

<!-- - `transferFrom(sender, nest/ntoken, amount) public onlyStakingContract`

权限: 只能被 [[Staking]] 合约调用

功能: 把 sender 的 nest/ntoken 转账到当前合约

Assumes: `_staking_ledger`

副作用: 增加 `_staking_ledger[nestNtoken][sender]`

Callsites:
1. Staking.stake()

实现:

```js
function transferFrom(address sender, address nestNtoken, uint128 amount) public onlyStakingContract {
    require (amount > 0, "");
    require(ERC20(nestNtoken).transferFrom(sender, address(this), amount), "Authorized transfer failed");  
    _staking_ledger[nestNtoken][sender] = _staking_ledger[nestNtoken][sender].add(amount);
}
``` -->

-----------------------------------------------------
<!-- 
- `transferTo(receiver, nestNtoken, amount) public onlyStakingContract` 

权限: 只能被 [[Staking]] 合约调用

功能: 把 receiver 的 nest/ntoken 转账到当前合约

Assumes: `_staking_ledger`

副作用: 增加 `_staking_ledger[nestNtoken][sender]`

Callsites:
1. Staking.unstake()

实现:

```js
function transferTo(receiver, nestNtoken, amount) public onlyStakingContract {
    uint256 blncs = _staking_ledger[nestNtoken][receiver];
    require(amount <= blncs, "E: insufficient staked balance");
    _staking_ledger[nestNtoken][sender] = blncs.sub(amount);
    ERC20(nestNtoken).transfer(sender, amount);
}
``` -->

-----------------------------------------------------

- `moveBonusToLeveling(amount)`

权限: 
1. 内部函数，仅能被 [[Staking]] 合约调用

功能：把一部分 eth 计入平准基金储蓄账本

Assumes: 
1. nest/ntoken 合法（不检测）
2. `_bonus_ledger_eth` 中的余额大于 amount

副作用: 
1. 修改 `_bonus_ledger_eth[nestNtoken]`
2. 修改 `_leveling_ledger_eth[nestNtoken]`

Callsites:
1. Staking.claim()

实现:

```js
function moveBonusToLeveling(address nestNtoken, uint128 amount) {
    _bonus_leveling_ledger_eth[nestNtoken] = _bonus_leveling_ledger_eth[nestNtoken].add(amount);
    _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].sub(amount);
}
```

-----------------------------------------------------

- `moveBonusFromLeveling(nestNtoken, amount)`

权限:
1. 内部函数，仅能被 [[Staking]] 合约调用

功能：把一部分 eth 提出平准基金储蓄账本

Assumes: 
1. nest/ntoken 合法
2. `_staking_ledger`

副作用: 
1. 修改 `_bonus_ledger_eth[nestNtoken]`
2. 修改 `_leveling_ledger_eth[nestNtoken]`

Callsites:
1. Staking.claim()

实现:

```js
function moveBonusFromLeveling(address nestNtoken, uint128 amount) {
    _bonus_leveling_ledger_eth[nestNtoken] = _bonus_leveling_ledger_eth[nestNtoken].sub(amount);
    _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].add(amount);
};
}
```