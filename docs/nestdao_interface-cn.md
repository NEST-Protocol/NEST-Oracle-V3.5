# NestDAO 合约

**Author:**  Paradox  <paradox@nestprotocol.org>

**Abstract:**  任何用户可以向 NestDAO 合约按预言机的报价出售 NEST，换取对应的 ETH。本文档描述了 NestDAO 合约的调用接口。

&emsp;
## changelog 

- 2020-12-17 修订
- 2020-12-15 初稿

&emsp;
## NestDAO 合约接口函数

### `initialize()`

**功能：** 初始化参数设置。

**函数：** `initialize(NestPool)`
   + `NestPool` address 合约地址，用来链接 nestpool 合约

**权限:**

1. 外部合约可调用，仅执行一次

**参数要求：**

1. NestPool 为合约地址

**返回值：**

1. 无返回值


### `start()`

**功能：** NestToken 地址授权 NestStaking 合约可以使用 NestToken 下的代币

**函数：** `start()`
   + 无参数

**权限：**

1. 仅 管理者 可以调用

**参数要求：**
1. 无

**返回值：**

1. 无返回值


### `pause()`

**功能：** 紧急情况下暂停合约使用

**函数：**`pause()`
   + 无

**权限：**

1. 仅 管理者 可以调用

**返回值：**

1. 无返回值


### `resume()`

**功能：** 恢复合约使用

**函数：** `resume()`
   + 无

**权限：**
1. 仅 管理者 可以调用

**返回值：**
1. 无返回值


### `totalRewards()`

**功能：** 查询指定 ntoken 地址下的 eth 数量

**函数：** `totalRewards(ntoken)`
    + `ntoken` 指定代币地址

**权限：**

1. 任何人均可调用
2. 只读函数，view

**返回值：**

1. 返回查询金额


### `addETHReward()`

**功能：** 向 NestDAO 合约地址转入奖励

**函数：** `addETHReward(ntoken)`
   + `ntoken` 指定 ntoken 地址

**权限：**

1. 任何人均可调用
2. 可携带资金

**返回值：**
1. 无返回值


### `addNestReward()`

**功能：** 在报价 ETH - USDT 时，挖矿产生 NEST,部分 NEST 归 NestDAO 所有

**函数：** `addNestReward(amount)`
   + `amount` 挖矿产生的 NEST 奖励中部分归 NestDAO 所有

**权限：**
1. 任何人均可调用


**返回值：**
1. 无返回值


### `collectNestReward()`

**功能：** 将存储在 NestPool 合约中的属于 NestDAO 合约的 NEST 取出存入 NestDAO 地址下

**函数：** `collectNestReward()`
   + 无参数

**权限：**

1. 任何人均可调用

**返回值：**

1. 返回执行本次函数取出的 NEST 数量


### `collectETHReward()`

**功能：** 将 NestDAO 合约地址下的 NToken 存入 NestStaking 中，获得收益

**函数：** `collectETHReward(ntoken)`
   + `ntoken` 指定 `ntoken` 地址

**权限：**

1. 任何人均可调用

**返回值：**

1. 返回收益 ETH 值


### `redeem()`

**功能：** 以当前预言机价格向 `NestDAO` 出售 NEST，换取相应的 ETH

**函数：** `redeem(ntoken, amount)`
   + `ntoken` 指定地址
   + `amount` 需要兑换的 NToken 数量

**权限：**

1. 任何人均可调用
2. 禁止重入
3. 相应功能必须激活

**返回值：**

1. 无返回值