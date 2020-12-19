# NestDAO 合约

**Author:** Paradox  <paradox@nestprotocol.org>

**Abstract:** 任何用户可以向 NestDAO 合约按预言机的报价出售 NEST，换取对应的 ETH。

&emsp;

## changelog 

- 2020-12-19 更新

- 2020-12-17 修订

- 2020-12-15 初稿


## Variables 变量
```js
flag ;                    // uint8, public 类型。flag 标志，用于标记合约状态，其值范围为 0-4
startedBlock;             // uint32, private 类型。初始区块高度。
_reserved;                // uint248, private 类型。保留值。
governance;               // public类型，作为本合约的维护者，合约部署时将地址赋值给它

C_NestPool;               // 以下五个地址均为 private 类型，分别代表 NestPool 合约地址、NestToken 合约地址、Nestmining 合约地址、 
C_NestToken;              //NestStaking 合约地址、NestQuery 合约地址
C_NestMining;
C_NestStaking;
C_NestQuery;

DAO_REPURCHASE_PRICE_DEVIATION = 5;  // 5%，回购约束，当前价格和均价相差超过5%时，不可以回购
```

## 数据结构

```js
struct Ledger {                       // 用于记录 NestDAO 合约资金转移情况
        uint128 rewardedAmount;       // 把储存在 NestPool 中属于 NestDAO 合约的 NEST 资金取回，放入 NestDAO 合约中
        uint128 redeemedAmount;       // 将挖矿产生的 NEST 及 赎回的 NEST 记录在此
        uint128 quotaAmount;          // 当前执行赎回函数之前累计的 NEST 数量
        uint32  lastBlock;            // 执行赎回函数 redeem 所处区块高度
    }
```

```js
mapping(address => Ledger) ntokenLedger; // mapping 类型，由 ntoken 地址获得对应的 Ledger 账本
```

```js
mapping(address => uint256) ethLedger;   // mapping 类型，由 ntoken 地址获得对应的 ETH 奖励
```

&emsp;
## NestDAO 合约函数

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

**函数**：`start()`
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


### `totalETHRewards()`

**功能：** 查询指定 ntoken 地址下的 eth 数量

**函数：** `totalETHRewards(ntoken)`
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

**资金流向：**

1. `ETH(msg.value)` | 手续费  ==> NestDAO 合约中的 `ethLedger[ntoken]`

**返回值：**

1. 无返回值


### `addNestReward()`

**功能：** 在报价 ETH - USDT 时，挖矿产生 NEST,部分 NEST 归 NestDAO 所有

**函数：** `addNestReward(amount)`
   + `amount` 挖矿产生的 NEST 奖励中部分归 NestDAO 所有

**权限：**

1. 任何人均可调用

**资金流向：**

1. `NEST(amount)` | 挖矿奖励的一部分 ==> `redeemedAmount`

**返回值：**

1. 无返回值


### `collectNestReward()`

**功能：** 将存储在 NestPool 合约中的属于 NestDAO 合约的 NEST 取出存入 NestDAO 地址下

**函数：** collectNestReward()
   + 无参数

**权限：**

1. 任何人均可调用

**资金流向：**

1. `NEST(nestAmount)` | `_token_ledger[C_NestToken][C_NestDAO]` ==> `C_NestDAO`

**返回值：**

1. 返回执行本次函数取出的 NEST 数量


### `collectETHReward()`

**功能：** 将 NestDAO 合约地址下的 NToken 存入 NestStaking 中，获得收益

**函数：**`collectETHReward(ntoken)`
   + `ntoken` 指定 ntoken 地址

**权限：**

1. 任何人均可调用

**资金流向：**
1. `NTOKEN(ntokenAmount)` | `NestDAO` 合约地址 ==>  `_staked_balances[ntoken][msg.sender]`


2. `ETH(_rewards)` | `rewardBalances[ntoken][msg.sender]`  ==> `NestDAO` 合约

**返回值：**
1. 返回收益 ETH 值


### `redeem()`

**功能：** 以当前预言机价格向 NestDAO 出售 NEST，换取相应的 ETH

**函数：** `redeem(ntoken, amount)`
   + `ntoken` 指定地址
   + `amount` 需要兑换的 NToken 数量

**权限：**

1. 任何人均可调用
2. 禁止重入
3. 相应功能必须激活

**资金流向：**

1. `ETH(amount.div(price))` | `NestDAO` ==> 外部 `msg.sender`

2. `NToken(amount)` | `msg.sender` ==> `NestDAO` 合约地址下

**返回值：**

1. 无返回值


### `quotaOf()`

**功能：** 查询当前可兑换 NNTOken 的额度

**函数：** `quotaOf(ntoken)`
   + `ntoken` 指定地址

**权限：**

1. 任何人均可调用
2. 只读函数 (view)


**返回值：**

1. 返回当前可兑换 ntoken 额度。