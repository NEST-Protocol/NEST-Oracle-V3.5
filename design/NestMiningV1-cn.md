# NestMining 报价挖矿合约

本合约实现报价挖矿的逻辑部分，包括：
(1). 报价表单的提交功能(仅报一个 TOKEN-ETH 价格对)
(2). 报价表单的提交功能(报两个价格对 USD-ETH、NEST-ETH)
(3). 报价者关闭自己报价单功能
(4). 报价者同时关闭几个(数量有自己选定)自己的报单价功能(为了减小 gas 消耗)
(5). 吃单者吃单功能;
(6). 价格查询功能

## changelog 更新日志

### 2020-11-18


## Variables 设计变量

注：变量涉及 public 和 private 两种类型，其中 public 类型表示其变量可以被外部合约、子合约、合约内部访问; private 类型表示该变量仅供本合约内部使用;

governance                            // public类型，作为本合约的维护者，合约部署时将地址赋值给它
_developer_address                    // private类型，发开者地址，由合约维护者决定开发者地址，共同维护本合约
_NN_address                           // private类型，Nest 协议的守护节点，为 Nest 协议的运行提供支持
_latest_mining_height                 // private类型，上一个 nest 已经被结算的区块高度
_mining_nest_yield_per_block_amount   // private类型，是一个长度为 10 的数组，数组中每个元素长度为256位，用来保存某个区块可以产生Nest Token的数量（由区块产生Nest Token的数量会在一定区块数后衰减）
_mining_ntoken_yield_per_block_amount // private类型，是一个长度为 10 的数组，数组中每个元素长度为256位，用来保存某个区块可以产生NToken的数量（由区块产生NToken的数量会在一定区块数后衰减）


## Constants 合约常量设计

！！！以下数据类型均为 constant,长度均为 256 bit！！！

PRICE_DURATION_BLOCK = 25;                           // 正常竞价，每隔25个区块进行一次价格确定

BITE_AMOUNT_INFLATE_FACTOR  = 2;                     // 吃单者需要冻结资金规模扩大因子

MINING_NEST_YIELD_CUTBACK_PERIOD = 2400000;          // 每隔 2 400 000 个区块调整nest产出数量，2 400 000 × 10 个区块后nest产出数量将不再变化

MINING_NEST_YIELD_CUTBACK_RATE = 80;                 // 区块产出nest的衰减率（80%）

MINING_NEST_YIELD_OFF_PERIOD_AMOUNT = 40 ether;      // 经2 400 000 × 10 个区块后，最终区块产出的nest数量，将不再变化

MINING_NEST_YIELD_PER_BLOCK_BASE = 400 ether;        // 初始区块产出nest数量

MINING_NTOKEN_YIELD_CUTBACK_RATE = 80;               // 竞价时会产生 ntoken,其数量也会随着它位于的区块高度发生变化，衰减率为80%

MINING_NTOKEN_YIELD_OFF_PERIOD_AMOUNT = 0.4 ether;   // 最终竞价交易产生的 ntkoen 数量，并从此区块后，数量不再变化

MINING_NTOKEN_YIELD_PER_BLOCK_BASE = 4 ether;        // 初始竞价交易产生的 ntoken 数量

MINING_NTOKEN_YIELD_BLOCK_LIMIT = 300;               // 每次产生NTOKEN的最大数量

c_mining_eth_unit = 10;                              // 每次报价时，提供的 ethNum 为 10 的整数倍

c_mining_fee_thousandth = 10;                        // post报价单时，需要根据eth数量按比例缴纳的手续费（1%）

DEV_REWARD_PERCENTAGE = 5;                           // 开发者获得的奖励比例（5%）

NN_REWARD_PERCENTAGE = 15;                           // NN节点抽成比例（15%）

MINER_NEST_REWARD_PERCENTAGE = 80;                   // 矿工自己获得的奖励比例（80%）


！！！以下数据类型均为 constant,长度均为 8 bit！！！

PRICESHEET_STATE_CLOSED = 0;          // 报价单处于关闭状态

PRICESHEET_STATE_POSTED = 1;          // 报价单提交，但没有被吃单

PRICESHEET_STATE_BITTEN = 2;          // 报价单被吃单后，报价单的状态

PRICESHEET_TYPE_USD     = 1;          // 所报的 token 类型为 USDT

PRICESHEET_TYPE_NEST    = 2;          // 所报的 token 类型为 NEST

PRICESHEET_TYPE_TOKEN   = 3;          // 所报的 token 类型为其他类型（除了 USDT 和 NEST ）

MAX_BITE_NESTED_LEVEL   = 3;           // 设定此值为了确定吃单所要冻结的 NEST 及 ETH 的数量



## 数据结构

// 报价单结构体，用于保存报价者的相关信息
struct PriceSheet {    
        uint160 miner;             // 报价者地址
        uint32  height;            // 报价单所在的区块高度
        uint32  ethNum;            // 报价者开始报价时存入的 eth 数量（需要为 10 的整数倍，0 除外）
        uint32  remainNum;         // 还有多少 ETH/TOKEN 可以被吃，只要被吃单，它的值就会减小，至 0 后，此报价单不能被吃了

        uint8   level;             // 记录吃单状态，其值为 1-4 时，冻结 2 倍的 ETH,  其值为 5-127 时，冻结 2 倍的 NEST
        uint8   typ;               // 1: USD | 2: NEST | 3: TOKEN 
        uint8   state;             // 0: closed | 1: posted | 2: bitten
        uint8   _reserved;         // 保留值，默认为 0
        uint32  ethNumBal;         // 用来记录报价单 ETH 数量变化情况，在关闭报价单时结算剩余 ETH 资金
        uint32  tokenNumBal;       // 用来记录报价单 token 数量变化情况，在关闭报价单时结算剩余 token 资金
        uint32  nestNum1k;         // 每次报价 1 ETH, 对应需要冻结的 NEST 数量
        uint128 tokenAmountPerEth; // 1 ETH 可兑换 token 的数量
    }
    
// 用于保存价格查询相关信息
struct PriceInfo {
        uint32  index;                // 记录报价单的索引，为下一次从报价单此处继续更新价格信息做准备
        uint32  height;               // 报价单所处区块的高度
        uint32  ethNum;               // ETH 余额
        uint32  _reserved;            // 保留值，默认为 0
        uint128 tokenAmount;          // token 余额
        int128  volatility_sigma_sq;  // 波动率的平方，为下次计算新的波动率准备
        int128  volatility_ut_sq;     // 记录值，计算新波动率的必要参数
        int128  avgTokenAmount;       // 平均 token 的价格（多少 token 可以兑换 1 ETH）
        uint128 _reserved2;           // 保留值，默认为 0
    }


## 提供调用接口函数

### post()
功能： 提交　ETH-TOKEN　报价单

函数： post(token, ethNum, tokenAmountPerEth)
      + token 报价者提供的地址，只要合法即可，不需要是竞拍者当前交易地址
      + ethNum 报价者提供的 eth 数量
      + tokenAmountPerEth 报价者所报价格，即多少 token 可以兑换 1 ETH

权限：
1. 禁止合约调用 noContract

参数要求：
1. token 不能是零地址
2. ethNum 必须能被 miningEthUnit 整除且 ethNum 不能为 0，即 ethNum % miningEthUnit == 0 && ethNUm != 0
3. tokenAmountPerEth 必须大于 0

参数边界条件：
1. token 应该为正常的代币地址，否则无法映射到正确的 ntoken 地址,会报错："Nest:Mine:!(ntoken)"
2. ethNum 数量必须大于 0，并且为 miningEthUnit （目前为 10）的整数倍，否则会报错："Nest:Mine:!(ethNum)"
3. tokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 tokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:!(price)"


副作用：
1. 产生一个报价表，储存在 priceSheetList[token] 中

2. 当前区块产生 NToken

3. level 状态被初始化为 0,表示这是初始报价单

4. typ 状态被初始化为 3,所报的 token 类型为其他类型（除了 USDT 和 NEST ）

5. state 状态被初始化为 1,表示报价单还未被吃单

资金流向：
1. //当吃单者输入的资金（msg.value） > 手续费时，才会执行：
   ETH(msg.value - ethFee) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[msg.sender] 中

2. //当吃单者输入的资金（msg.value） > 手续费时，才会执行：
   ETH(ethFee) | this ==> [[NestStaking] 合约的 rewardsTotal[ntoken] 中

3. ETH(freezeEthAmount) | _eth_ledger[msg.sender] ==>  [[NestPool]] 合约的 _eth_ledger[address(this)]

4. [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金充足的情况下：
   Token(freezeTokenAmount) | _token_ledger[token][msg.sender] ==>  [[NestPool]] 合约的 _token_ledger[token][address(this)]

   [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金不充足的情况下：
   Token(freezeTokenAmount - _token_ledger[token][msg.sender]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _token_ledger[token][address(this)]
   
   Token(_token_ledger[token][msg.sender]) | _token_ledger[token][msg.sender] ==> [[NestPool]] 合约的 _token_ledger[token][address(this)]

5. [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金充足的情况下：
   Nest(freezeNestAmount) | _nest_ledger[miner]  ==> [[NestPool]] 合约的 _nest_ledger[address(this)]

   [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金不充足的情况下：
   Nest(freezeNestAmount - _nest_ledger[msg.sender]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]

   Nest(_nest_ledger[msg.sender]) | [[NestPool]] 合约的 _nest_ledger[msg.sender] ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]


事件：
1. [[NestPool]] 合约的 _eth_ledger[msg.sender] 的资金不充足会直接报错 ""Insufficient ethers in the pool""

2. [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金不充足（nest 数量小于要冻结 nest 的数量）的情况下，如果冻结 Nest 成功，_nest_ledger[msg.sender] = 0

3. [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金不充足的情况下，如果冻结成功，_token_ledger[token][msg.sender] = 0

4. NToken 总量会增加并被记入总发行量中


### post2()
功能： 提交两个报价单： ETH-USD、ETH-NEST

函数： post(token, ethNum, tokenAmountPerEth, ntokenAmountPerEth)
      + token 报价者提供的地址，只要合法即可，不需要是竞拍者当前交易地址
      + ethNum 报价者提供的 eth 数量
      + tokenAmountPerEth 报价者所报价格，即多少 USD 可以兑换 1 ETH
      + ntokenAmountPerEth 报价者所报价格，即多少 NEST 可以兑换 1 ETH

权限：
1. 禁止合约调用 noContract

参数要求：
1. NToken 地址不能是零
2. ethNum 必须能被 miningEthUnit 整除且 ethNum 不能为 0，即 ethNum % miningEthUnit == 0 && ethNUm != 0
3. tokenAmountPerEth 必须大于0
3. ntokenAmountPerEth 必须大于0

参数边界条件：
1. token 应该为正常的代币地址，否则无法映射到正确的 ntoken 地址,会报错："Nest:Mine:!(ntoken)"
2. ethNum 数量必须大于 0，并且为 miningEthUnit （目前为 10）的整数倍，否则会报错："Nest:Mine:!(ethNum)"
3. tokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 tokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:!(price)"
4. ntokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 ntokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:!(price)"

副作用：
1. 产生一个报价表，储存在 priceSheetList[token] 中
   产生一个报价表，储存在 priceSheetList[NToken] 中

2. 当前区块产生 NEST

3. level 状态被初始化为 0,表示这是初始报价单

4. typ 状态被初始化为 1,所报的 token 类型为 USD 
   typ 状态被初始化为 2,所报的 token 类型为 NEST

5. state 状态被初始化为 1,表示报价单还未被吃单

资金流向：
1. //当吃单者输入的资金（msg.value） > 手续费时，才会执行：
   ETH(msg.value - ethFee) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[msg.sender] 中

2. //当吃单者输入的资金（msg.value） > 手续费时，才会执行：
   ETH(ethFee) | this ==> [[NestStaking] 合约的 rewardsTotal[ntoken] 中

3. ETH(freezeEthAmount) | _eth_ledger[msg.sender] ==>  [[NestPool]] 合约的 _eth_ledger[address(this)]

4. [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金充足的情况下：
   Token(freezeTokenAmount) | _token_ledger[token][msg.sender] ==>  [[NestPool]] 合约的 _token_ledger[token][address(this)]

   [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金不充足的情况下：
   Token(freezeTokenAmount - _token_ledger[token][msg.sender]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _token_ledger[token][address(this)]
   
   Token(_token_ledger[token][msg.sender]) | _token_ledger[token][msg.sender] ==> [[NestPool]] 合约的 _token_ledger[token][address(this)]

5. [[NestPool]] 合约的 _ntoken_ledger[ntoken][msg.sender] 的资金充足的情况下：
   NToken(freezeNTokenAmount) | _ntoken_ledger[ntoken][msg.sender] ==>  [[NestPool]] 合约的 _ntoken_ledger[ntoken][address(this)]

   [[NestPool]] 合约的 _ntoken_ledger[ntoken][msg.sender] 的资金不充足的情况下：
   NToken(freezeNTokenAmount - _ntoken_ledger[ntoken][msg.sender]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _ntoken_ledger[ntoken][address(this)]
   
   NToken(_ntoken_ledger[ntoken][msg.sender]) | _ntoken_ledger[ntoken][msg.sender] ==> [[NestPool]] 合约的 _ntoken_ledger[ntoken][address(this)]

6. [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金充足的情况下：
   Nest(freezeNestAmount) | _nest_ledger[miner]  ==> [[NestPool]] 合约的 _nest_ledger[address(this)]

   [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金不充足的情况下：
   Nest(freezeNestAmount - _nest_ledger[msg.sender]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]

   Nest(_nest_ledger[msg.sender]) | [[NestPool]] 合约的 _nest_ledger[msg.sender] ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]


事件：
1. [[NestPool]] 合约的 _eth_ledger[msg.sender] 的资金不充足会直接报错 ""Insufficient ethers in the pool""

2. [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金不充足（nest 数量小于要冻结 nest 的数量）的情况下，如果冻结 Nest 成功，_nest_ledger[msg.sender] = 0

3. [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金不充足的情况下，如果冻结 USD 成功，_token_ledger[token][msg.sender] = 0

4. [[NestPool]] 合约的 _token_ledger[ntoken][msg.sender] 的资金不充足的情况下，如果冻结 Nest 成功，_token_ledger[ntoken][msg.sender] = 0

5. 区块将产生 NEST,数量被暂时存储,在 close 时进行转移


### close()
功能: 报价者关闭符合条件的任一自己的报价表,解冻自己的资金

函数: close(token, index)
     + token 报价者提供的地址
     + index 报价表所在位置索引

权限: 
1. 禁止合约调用 noContract

参数要求:
1. 报价表必须在价格稳定,无法被吃单后才可以关闭
2. 必须是报价表本人操作

参数边界条件：
1. token 应该为正常的代币地址，否则无法查询到对应表单
2. index 索引值如果提供的是不存在的值，如 -1，则会报错 "Nest:Mine:>(len)"
         如果提供索引对应的表单拥有者非关闭者的地址，则会报错："Nest:Mine:!(miner)"

副作用: 
1. 报价表状态会改变
2. 仅当关闭最初的报价单(而不是吃单产生的报价单)时,才会获得 NToken / NEST 奖励

资金流向:
1. // 当关闭的报价表是原始报价表(非吃单产生),且报价类型为 ETH - USD 时,获得 NEST 奖励
   NEST(reward) | 区块奖励 ==> [[NestPool]] 合约的 _nest_ledger[msg.sender]

2. // 当关闭的报价表是原始报价表(非吃单产生),且报价类型为 ETH - TOKEN 时(非 ETH - NEST 及 ETH - USD),获得 NTOKEN 奖励
   NToken(reward) | 区块奖励 ==> [[NestPool]] 合约的 _token_ledger[ntoken][msg.sender]

3. ETH(unfreezeEthAmount) | [[NestPool]] 合约的 _eth_ledger[address(this)] ==> [[NestPool]] 合约的 _eth_ledger[msg.sender]

4. // 解冻 Token 或者 NToken 均可以用此表示
   Token(unfreezeTokenAmount) | [[NestPool]] 合约的 _token_ledger[token][address(this)] ==> [[NestPool]] 合约的 _token_ledger[token][msg.sender]

5. NEST(unfreezeNestAmount) | [[NestPool]] 合约的 _nest_ledger[address(this)] ==> [[NestPool]] 合约的 _nest_ledger[msg.sender]


事件
1. 关闭报价表会改变报价表的状态


### closeList()
功能: 可以选择一次关闭同一个 token 地址下的指定 index 的多个报价表,可以节省 gas 消耗

函数: closeList(token, indices)
     + token 报价者提供的地址
     + indices 报价者想要关闭的 index 数组,数组中的元素代表想要关闭报价表的 index 索引

权限: 
1. 禁止合约调用 noContract

参数要求:
1. 报价表必须在价格稳定,无法被吃单后才可以关闭
2. 必须是报价表本人操作

参数边界条件：
1. token 应该为正常的代币地址，否则无法查询到对应表单
2. indices 索引值数组，如果提供的索引对应的报价表的拥有者并非执行此函数的人，或者报价表价格还未确定，则不会对该报价表做出处理，直接忽略此报价表

副作用:
1. 报价表状态会改变
2. 仅当关闭最初的报价单(而不是吃单产生的报价单)时,才会获得 NToken / NEST 奖励

资金流向:
1. // 当关闭的报价表是原始报价表(非吃单产生),且报价类型为 ETH - USD 时,获得 NEST 奖励
   NEST(reward) | 区块奖励 ==> [[NestPool]] 合约的 _nest_ledger[msg.sender]

2. // 当关闭的报价表是原始报价表(非吃单产生),且报价类型为 ETH - TOKEN 时(非 ETH - NEST 及 ETH - USD),获得 NTOKEN 奖励
   NToken(reward) | 区块奖励 ==> [[NestPool]] 合约的 _token_ledger[ntoken][msg.sender]

3. ETH(unfreezeEthAmount) | [[NestPool]] 合约的 _eth_ledger[address(this)] ==> [[NestPool]] 合约的 _eth_ledger[msg.sender]

4. // 解冻 Token 或者 NToken 均可以用此表示
   Token(unfreezeTokenAmount) | [[NestPool]] 合约的 _token_ledger[token][address(this)] ==> [[NestPool]] 合约的 _token_ledger[token][msg.sender]

5. NEST(unfreezeNestAmount) | [[NestPool]] 合约的 _nest_ledger[address(this)] ==> [[NestPool]] 合约的 _nest_ledger[msg.sender]
 

事件:
1. 同时关闭的多个报价单中如果存在某个报价单的所有者并非调用 closeList() 函数的人，或者该报价单的价格没有确定下来，此时均会忽略这样的报价单，不作处理

2. 关闭报价单会改变报价单状态，并累加需要解冻的金额，一次解冻返还


### biteToken()
功能: 吃单者进行吃单操作，提供 ethNum 兑换 token 

函数: biteToken(token, index, biteNum, newTokenAmountPerEth)
     + token 吃单者提供报价者的地址
     + index 吃单者提供报价者的索引
     + biteNum 吃单者吃单的 ETH 数量
     + newTokenAmountPerEth 吃单者新报价格，即 1 ETH 可以兑换多少 token

权限:
1. 不能被合约调用 noContract

参数要求:
1. token 地址不能为 0
2. 新报价格大于 0 
3. biteNum 必须能被 miningEthUnit 整除
4. 被吃报价表价格必须稳定（最新 25 个区块高度内）
5. 被吃报价表的剩余 remainNum 数量必须大于 biteNum 数量
6. 需要被吃报价表的状态为 post 或 bitting 状态
7. ntoken 地址不能为 0

参数边界条件：
1. token 应该为正常的代币地址，当 token 地址为 0 时，会报错："Nest:Mine:(token)=0"，当 token 地址对应的报价表不存在时，会报错："Nest:Mine:!(remain)" 或者 "Nest:Mine:!EFF(sheet)"
2. index 索引值如果提供的是不存在的值，如 -1，则会报错 "Nest:Mine:>(len)"
3. biteNum 吃单者想要吃单的 ETH　数量，必须为 miningEthUnit 的整数倍(0 除外),否则报错: "Nest:Mine:!(bite)"
           如果 biteNum 的数量大于报价单中剩余资金数量,则会报错:"Nest:Mine:!(remain)"
4. newTokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 ntokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:(price)=0"

副作用:
1. 产生新的报价表
2. 旧报价表的存储数据发生更新（remainNum 总是减小，至 0 为止）

资金流向:
1. //当吃单者输入的资金（msg.value） > 手续费时，才会执行：
   ETH(msg.value - ethFee) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[msg.sender] 中

2. //当吃单者输入的资金（msg.value） > 手续费时，才会执行：
   ETH(ethFee) | this ==> [[NestStaking] 合约的 rewardsTotal[ntoken] 中

3. ETH(freezeEthAmount) | _eth_ledger[msg.sender] ==>  [[NestPool]] 合约的 _eth_ledger[address(this)]

4. [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金充足的情况下：
   Token(freezeTokenAmount) | _token_ledger[token][msg.sender] ==>  [[NestPool]] 合约的 _token_ledger[token][address(this)]

   [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金不充足的情况下：
   Token(freezeTokenAmount - _token_ledger[token][msg.sender]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _token_ledger[token][address(this)]
   
   Token(_token_ledger[token][msg.sender]) | _token_ledger[token][msg.sender] ==> [[NestPool]] 合约的 _token_ledger[token][address(this)]

5. [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金充足的情况下：
   Nest(freezeNestAmount) | _nest_ledger[miner]  ==> [[NestPool]] 合约的 _nest_ledger[address(this)]

   [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金不充足的情况下：
   Nest(freezeNestAmount - _nest_ledger[msg.sender]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]

   Nest(_nest_ledger[msg.sender]) | [[NestPool]] 合约的 _nest_ledger[msg.sender] ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]
 

事件:
1. 由吃单产生的新报价表的 level 状态会在被吃报价表的 level 值基础上加 1 （127 为最大值，后不再变化）

2. 旧报价表会更新，更新四个数据：报价表的状态（更新为吃单状态：2）；报价表当前存储的 ethNum 数量；报价表当前存储的 tokenNum 数量；报价表还可以被吃的资金数量（这个值一直在减小）


### biteEth()
功能: 吃单者进行吃单操作，提供 token 兑换 ethNum

函数: biteEth(token, index, biteNum,  newTokenAmountPerEth)
     + token 吃单者提供报价者的地址
     + index 吃单者提供报价者的索引
     + biteNum 吃单者吃单的 token 数量
     + newTokenAmountPerEth 吃单者新报价格，即 1 ETH 可以兑换多少 token

权限: 
1. 不允许合约调用 noContract

参数要求:
1. token 地址不能为 0
2. 新报价格大于 0 
3. biteNum 必须能被 miningEthUnit 整除
4. 被吃报价表价格必须稳定（最新 25 个区块高度内）
5. 被吃报价表的剩余 remainNum 数量必须大于 biteNum 数量
6. 需要被吃报价表的状态为 post 或 bitting 状态 
7. ntoken地址不能为 0

参数边界条件：
1. token 应该为正常的代币地址，当 token 地址为 0 时，会报错："Nest:Mine:(token)=0"，当 token 地址对应的报价表不存在时，会报错："Nest:Mine:!(remain)" 或者 "Nest:Mine:!EFF(sheet)"
2. index 索引值如果提供的是不存在的值，如 -1，则会报错 "Nest:Mine:>(len)"
3. biteNum 吃单者想要吃单的 ETH　数量，必须为 miningEthUnit 的整数倍(0 除外),否则报错: "Nest:Mine:!(bite)"
           如果 biteNum 的数量大于报价单中剩余资金数量,则会报错:"Nest:Mine:!(remain)"
4. newTokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 ntokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:(price)=0"


副作用:
1. 产生新的报价表
2. 旧报价表的存储数据发生更新（remainNum 总是减小，至 0 为止）

资金流向:
1. //当吃单者输入的资金（msg.value） > 手续费时，才会执行：
   ETH(msg.value - ethFee) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[msg.sender] 中

2. //当吃单者输入的资金（msg.value） > 手续费时，才会执行：
   ETH(ethFee) | this ==> [[NestStaking] 合约的 rewardsTotal[ntoken] 中

3. ETH(freezeEthAmount) | _eth_ledger[msg.sender] ==>  [[NestPool]] 合约的 _eth_ledger[address(this)]

4. [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金充足的情况下：
   Token(freezeTokenAmount) | _token_ledger[token][msg.sender] ==>  [[NestPool]] 合约的 _token_ledger[token][address(this)]

   [[NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金不充足的情况下：
   Token(freezeTokenAmount - _token_ledger[token][msg.sender]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _token_ledger[token][address(this)]
   
   Token(_token_ledger[token][msg.sender]) | _token_ledger[token][msg.sender] ==> [[NestPool]] 合约的 _token_ledger[token][address(this)]

5. [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金充足的情况下：
   Nest(freezeNestAmount) | _nest_ledger[miner]  ==> [[NestPool]] 合约的 _nest_ledger[address(this)]

   [[NestPool]] 合约的 _nest_ledger[msg.sender] 的资金不充足的情况下：
   Nest(freezeNestAmount - _nest_ledger[msg.sender]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]

   Nest(_nest_ledger[msg.sender]) | [[NestPool]] 合约的 _nest_ledger[msg.sender] ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址] 

事件:
1. 由吃单产生的新报价表的 level 状态会在被吃报价表的 level 值基础上加 1 （127 为最大值，后不再变化）

2. 旧报价表会更新，更新四个数据：报价表的状态（更新为吃单状态：2）；报价表当前存储的 ethNum 数量；报价表当前存储的 tokenNum 数量；报价表还可以被吃的资金数量（这个值一直在减小）


### latestPriceOf()
功能：查询最近的一个稳定价格的区块中所有报价表的信息，包括：表单剩余 ethNum 总量；剩余 token 总量；表单所在区块高度

函数：latestPriceOf( token)
     + token 查询者提供的 token 地址

参数说明: 
1. 无任何限制,不存在的地址就会返回 (0，0，0)

权限：
1. 不允许合约调用 noContract

事件：
1. 如果查询的 token 地址下的表单的个数为 0，则返回 (0，0，0)


### priceOf()
功能：查询最近的一个稳定价格的区块中所有报价表的信息，包括：表单剩余 ethNum 总量；剩余 token 总量；表单所在区块高度

函数：priceOf( token)
     + token 查询者提供的 token 地址

参数说明: 
1. 当 token 地址对应的结构体 priceInfo 的 height 参数值为 0 时,报错: "Nest:Mine:NO(price)"      

权限：
1. 仅允许 governance 和 C_NestQuery 调用本合约

事件：
1. 如果查询的 priceInfo 中 height 参数为 0，即未初始化，此时报错 "Nest:Mine:NO(price)"


### priceAvgAndSigmaOf()
功能：返回四个参数，分别为：最近稳定价格区块高度 token 兑换比率（多少 token 兑换 1 ETH）;平均价格；波动率；所在区块高度

函数：priceAvgAndSigmaOf( token)
     + token 查询者提供的 token 地址

参数说明: 
1. 当 token 地址对应的结构体 priceInfo 的 height 参数值为 0 时,报错: "Nest:Mine:NO(price)"     

权限：
1. 仅允许 governance 和 C_NestQuery 调用本合约

事件：
1. 如果查询的 priceInfo 中 height 参数为 0，即未初始化，此时报错 "Nest:Mine:NO(price)"


### priceOfTokenAtHeight()
功能：返回指定区块高度前稳定价格的区块中所有报价表的信息，包括：表单剩余 ethNum 总量；剩余 token 总量；表单所在区块高度

函数：priceOfTokenAtHeight( token, atHeight)
     + token 查询者提供的 token 地址
     + atHeight 查询者提供的指定区块高度

权限：
1. 任何人/合约均可调用

参数说明: 
1. token 无任何限制,不存在的地址就会返回 (0，0，0)
2. atHeight 可以为任何值,不会报错

事件：
1. 如果查询的指定区块高度前 token 地址下的表单的个数为 0，则返回 (0，0，0)


### priceListOfToken()
功能：从最新的价格稳定的区块高度开始，向区块高度减小的方向读取指定 num 个区块（这些区块中必须含有报价表，否则不计算）的数据，同时返回最新的价格稳定的区块高度

函数：priceListOfToken(token, num)
     + token 查询者提供的 token 地址
     + num 查询者指定查询几个区块（这些区块中必须包含报价表）

参数说明: 
1. token 无任何限制,不存在的地址就会返回 (0，0，0)
2. num 可以为任何值,不会报错,num 取的太大,后面的数组元素内容就是 0


权限：
1. 任何人/合约均可调用读取，但不可修改

事件：
1. 如果查询的指定区块高度前 token 地址下的表单的个数为 0，则返回 (0，0，0)