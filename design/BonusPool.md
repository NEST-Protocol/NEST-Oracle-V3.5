# Bonus 分红池合约

本合约维护所有的分红用的 eth，包括用于当周分红的 eth，还包括平准基金储蓄。

任何持有 nest token 或者 ntoken 的用户可以把这些 token 锁仓质押，然后就可以按照比例(token/total) 分得分红池的中 eth。

分红池中的 eth 的来源主要是两个:
1. 矿工报价挖矿的手续费
2. 客户调用预言机接口的服务费

分红池按照 nest/ntoken 分成多个不同的子池子，stake 不同的 nest/ntoken，对应领取不同收益比例。

当分红池中的 eth 数量较多时，会将一部分比例 eth 转入存储账户，当未来分红池中的 eth 不足时，将提取存储账户中的 eth，从而降低分红收益率的波动性。

本合约维护了质押的账本，锁了分红 eth，质押的 nest/ntoken。

本合约主要有以下几个主要函数:

- `getNTokenAmount(nestNtoken, address user)`
- `getNTokenBonusAmount(address nestNtoken)`
- `transferFrom(sender, nestNtoken, amount)`
- `transferTo(receiver, nestNtoken, amount)`

- `ethTransferFrom(nestNtoken, amount)`
- `ethTransferTo(recevier, ntoken, amount)`

- `moveBonusToLeveling(amount)`
- `moveBonusFromLeveling(nestNtoken, amount)`

## 数据结构

- (关键数据)`_bonus_ledger_eth: nestNtoken => amount` 记录 nestToken/nToken 对应的分红用 eth 数量

- (关键数据)`_bonus_leveling_ledger_eth: nestNtoken => amount` 记录 平准基金账本

- (关键数据)`_staking_ledger: nestNtoken => user => amount` ：记录每一个人 stake 的 token 数量 (<= _baseMapping)

## 关键函数

-----------------------------------------------------

- `ethTransferFrom(nestNtoken, amount)`

权限：仅允许 [[Mining]] 合约调用

功能：将 eth 手续费的数额计入 nestNtoken 所对应的分红池账本，但是这时候 eth 并没有真正转账过来。

参数要求:

副作用:

Callsites:
1. Mining.biteToken()
2. Mining.biteEth()

资金流向: none

实现:

```js
function ethTransferFrom(address nestNtoken, uint128 amount) public payable onlyStakingContract {
    require(msg.value >= amount, "");
    _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].add(amount);
}
```

-----------------------------------------------------

- `ethTransferTo(recevier, nestNtoken, amount)`

权限: 仅允许 [[Staking]] 合约调用

功能: 将 amount 数量的 eth 转给 recevier，并在 nestNtoken 对应的分红池账本上减去 amount，同时进行 eth 转账操作。

参数要求:

副作用:

资金流向:
1. eth; amount | BonusPool ==> receiver 

Callsites:
1. Staking.claim()


实现:

```js
function ethTransferTo(address recevier, address nestNtoken, uint128 amount) public onlyStakingContract {
    _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].sub(amount);
    recevier.transfer(amount);
}
```

-----------------------------------------------------

- `getNTokenBonusAmount(address nestNtoken)` 

权限: 仅允许 [[Staking]] 合约调用

功能: 得到 nestNtoken 所对应分红池的 eth 数量

参数要求: none

副作用: none

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

功能: 得到 user 所质押的 nestNtoken 数量

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

- `transferFrom(sender, nest/ntoken, amount) public onlyStakingContract`

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
```

-----------------------------------------------------

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
```

-----------------------------------------------------

- `moveBonusToLeveling(amount)`

权限:

功能：把一部分 eth 计入平准基金储蓄账本

Assumes: `_staking_ledger`

副作用: 增加 `_staking_ledger[nestNtoken][sender]`

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

功能：把一部分 eth 提出平准基金储蓄账本

Assumes: `_staking_ledger`

副作用: 增加 `_staking_ledger[nestNtoken][sender]`

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