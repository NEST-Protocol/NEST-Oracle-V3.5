# NestVote 合约

**Author:** Paradox  <paradox@nestprotocol.org>

**Abstract:** 用户投票决定是否更改 nest 合约的相关参数。

&emsp;

## changelog 

- 2021-02-04 初稿


## Variables 变量
```js
uint256 public voteDuration = 7 days;       // 投票有效时限
uint256 public acceptancePercentage = 51;   // 投票 NEST 数量所占比例（51%）
uint256 public proposalStakingAmount = 100_000 * 1e18;  // 发起投票者需要冻结的 NEST 数量,结束投票被冻结的 NEST 会返回给发起者
uint256 public minimalVoteAmount = 1_000 * 1e18;  // 用户投票最少需要冻结的 NEST 数量

uint32 constant PROPOSAL_STATE_PROPOSED = 0;  // 投票发起状态
uint32 constant PROPOSAL_STATE_REVOKED = 1;   // 投票发起者在未执行前便撤回时的状态
uint32 constant PROPOSAL_STATE_ACCEPTED = 2;  // 投票通过状态
uint32 constant PROPOSAL_STATE_REJECTED = 3;  // 投票不通过状态

address public C_NestToken;    // NEST NTOKEN 地址
address public C_NestPool;     // NestPool 合约地址
address public C_NestDAO;      // NestDAO 合约地址
address public C_NestMining;   // NestMining 合约地址
address public governance;     // 管理员地址
```

## 数据结构

```js
struct Proposal {
        uint64 state;              // 0: proposed | 1: revoked | 2: accepted | 3: rejected
        uint64 startTime;          // 投票发起时间
        uint64 endTime;            // 投票截止时间
        uint64 voters;             // 参与投票人数（以不同地址区分）
        uint256 stakedNestAmount;  // 投票发起者冻结的 NEST 数量
        uint256 votedNestAmount;   // 参与投票的用户冻结 NEST 总数量
        address proposer;          // 投票发起者地址
        address executor;          // 投票执行者地址
        address contractAddr;      // 投票修改合约的地址（应提前公示）
        bytes args;                // 投票需要修改后参数的值
        string description;        // 对此投票合约功能的简短描述
    }
```

```js
mapping(uint256 => mapping(address => uint256)) public votedNestLedger;    // mapping 类型，用来记录用户在给定 id 下的投入的 NEST 数量         
```

&emsp;
## NestVote 合约函数

### `loadGovernance()`

**功能：** 设置 NestVote 合约管理员地址。执行此函数前应将 NestPool 合约地址设置为 NestVote 合约地址。

**函数：** `loadGovernance()`

**权限:**

1. 任何 人 / 合约 均可调用

**返回值：**

1. 无返回值


### `loadContracts()`

**功能：** 加载 NEST、NestDAO、NestMining 地址

**函数：** `loadContracts()`

**权限:**

1. 任何 人 / 合约 均可调用

**返回值：**

1. 无返回值


### `releaseGovTo()`

**功能：** 通过投票更改 NestVote 合约管理员地址

**函数：** `releaseGovTo(gov_)`
   + `gov_` 新管理员地址

**权限:**

1. 仅管理员可调用

**返回值：**

1. 无返回值


### `setParam()`

**功能：** 修改 NestVote 合约相关参数

**函数：** `setParam(index, value)`
   + `index` 修改参数索引，以索引区分修改指定参数
   + `value` 想要修改参数的值

**权限:**

1. 仅管理员可调用

**返回值：**

1. 修改成功，返回 bool 值 true


### `propose()`

**功能：** 用户发起投票

**函数：** `propose(contract_, args, description_)`
   + `contract_` 合约部署地址，该合约应提前部署完成
   + `args` 想要修改参数的内容
   + `description_` 对发起投票内容的简单描述

**权限:**

1. 任何 人 / 合约 均可调用

**资金流向：**

1. `NEST(proposalStakingAmount)` | `msg.sender` ==> `NestVote`

**返回值：**

1. 无返回值


### `vote()`

**功能：** 用户进行投票

**函数：** `vote(id, amount)`
   + `id` 想要进行投票的 id 
   + `amount` 想要投票的 NEST 数量

**权限:**

1. 任何 人 / 合约 均可调用

**资金流向：**

1. `NEST(amount)` | `msg.sender` ==> `NestVote`

**返回值：**

1. 无返回值


### `withdraw()`

**功能：** 用户进行投票。当投票通过 或 拒绝 或 失败 或 未投票前发起投票者撤回投票，才能执行此函数。

**函数：** `withdraw(id)`
   + `id` 想要取回投票时冻结 NEST 的 id 

**权限:**

1. 任何 人 / 合约 均可调用

**资金流向：**

1. `NEST(_amount)` | `address(this)` ==> `msg.sender`

**返回值：**

1. 无返回值


### `unvote()`

**功能：** 在投票有效期内撤回投票资金。

**函数：** `unvote(id)`
   + `id` 想要取回投票时冻结 NEST 的 id 

**权限:**

1. 任何 人 / 合约 均可调用

**资金流向：**

1. `NEST(_amount)` | `address(this)` ==> `msg.sender`

**返回值：**

1. 无返回值


### `execute()`

**功能：** 投票停止后(超过截止日期),任何用户均可执行此函数，确定是否投票成功。

**函数：** `execute(id)`
   + `id` 想要进行表决的 id

**权限:**

1. 任何 人 / 合约 均可调用

**资金流向：**

1. `NEST(_staked)` | `address(this)` ==> `proposer`

**返回值：**

1. 无返回值


### `revoke()`

**功能：** 在投票有效期间内，投票发起者撤回投票。

**函数：** `revoke(id, reason)`
   + `id` 投票发起者想要撤回投票的 id
   + `reason` 撤回投票的原因

**权限:**

1. 任何人均可调用

**资金流向：**

1. `NEST(_staked)` | `address(this)` ==> `msg.sender`

**返回值：**

1. 无返回值


### `propsalNextId()`

**功能：** 查询最新投票列表的长度

**函数：** `propsalNextId() `

**权限:**

1. 任何人均可调用
2. 只读

**返回值：**

1. 返回当前投票列表长度


### `proposalById()`

**功能：** 通过 id 查询投票表单内容

**函数：** `proposalById() `

**权限:**

1. 任何人均可调用
2. 只读

**返回值：**

1. 返回指定 id 表单内容


### `proposalListById()`

**功能：** 通过 id 数组同时查询几个投票表单内容

**函数：** `proposalListById(idList) `
   + `idList` 想要查询投票列表的 id 数组

**权限:**

1. 任何人均可调用
2. 只读

**返回值：**

1. 返回指定 id 组数的几个投票表单


### `votedNestAmountOf()`

**功能：** 查询指定 id 指定 投票者地址 所投 NEST 数量

**函数：** `votedNestAmountOf(voter, id) `
   + `voter` 投票者地址
   + `id` 投票表单 id

**权限:**

1. 任何人均可调用
2. 只读

**返回值：**

1. 返回指定 id 指定 投票者地址 所投 NEST 数量


### `stakedNestAmountById()`

**功能：** 查询指定 id 表单，投票发起者所冻结的 NEST 数量

**函数：** `stakedNestAmountById(id)  `
   + `id` 投票表单 id

**权限:**

1. 任何人均可调用
2. 只读

**返回值：**

1. 返回指定 id 表单，投票发起者所冻结的 NEST 数量


### `votedNestAmountById()`

**功能：** 查询指定 id 表单，投票用户冻结 NEST 总量

**函数：** `votedNestAmountById(id)  `
   + `id` 投票表单 id

**权限:**

1. 任何人均可调用
2. 只读

**返回值：**

1. 返回指定 id 表单，投票用户冻结 NEST 总量


### `numberOfVotersById()`

**功能：** 查询指定 id 表单，参与投票用户数量

**函数：** `numberOfVotersById(id)  `
   + `id` 投票表单 id

**权限:**

1. 任何人均可调用
2. 只读

**返回值：**

1. 返回指定 id 表单，参与投票用户数量