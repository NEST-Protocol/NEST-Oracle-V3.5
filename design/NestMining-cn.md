# NestMining 报价挖矿合约

本合约实现报价挖矿的逻辑部分，包括：
(1). 竞价表单的提交功能;
(2). 吃单者吃单功能;
(3). 被吃单者清算功能;
(4). 吃单者（被吃单者超时未清算）主动取回冻结资金功能;
(5). 竞价表单关闭功能;
(6). 价格计算功能（不做解释）

## changelog 更新日志



### 2020-11-05


## Variables 设计变量

注：变量涉及 public 和 private 两种类型，其中 public 类型表示其变量可以被外部合约、子合约、合约内部访问; private 类型表示该变量仅供本合约内部使用;

governance：                           public类型，作为本合约的维护者，合约部署时将地址赋值给它
_developer_address：                   private类型，发开者地址，由合约维护者决定开发者地址，共同维护本合约
_NN_address：                          private类型，Nest 协议的守护节点，为 Nest 协议的运行提供支持
_latest_mining_height：                private类型，上一个 nest 已经被结算的区块高度
_mining_nest_yield_per_block_amount：  private类型，是一个长度为 10 的数组，数组中每个元素长度为256位，用来保存某个区块可以产生Nest Token的数量（由区块产生Nest Token的数量会在一定区块数后衰减）
_mining_ntoken_yield_per_block_amount：private类型，是一个长度为 10 的数组，数组中每个元素长度为256位，用来保存某个区块可以产生NToken的数量（由区块产生NToken的数量会在一定区块数后衰减）
ethNumPerChunk：                       private类型，目前设置为 10,表示每个块(chunk)包含的 eth 数量（ether）,此为提交报价单或吃单的最小单位
nestPerChunk：                         private类型，目前设置为 10000,表示每个块(chunk)包含的 nest 数量


## Constants 合约常量设计

！！！以下数据类型均为constant,长度均为256 bit！！！

c_mining_nest_genesis_block_height = 1;              // 测试使用，创世区块高度
c_mining_nest_yield_cutback_period = 2400000;        // 每隔 2 400 000 个区块调整nest产出数量，2 400 000 × 10 个区块后nest产出数量将不再变化
c_mining_nest_yield_cutback_rate = 80;               // 区块产出nest的衰减率（80%）
c_mining_nest_yield_off_period_amount = 40 ether;    // 经2 400 000 × 10 个区块后，最终区块产出的nest数量，将不再变化
c_mining_nest_yield_per_block_base = 400 ether;      // 初始区块产出nest数量

c_mining_ntoken_yield_cutback_rate = 80;             // 竞价时会产生 ntoken,其数量也会随着它位于的区块高度发生变化，衰减率为80%
c_mining_ntoken_yield_off_period_amount = 0.4 ether; // 最终竞价交易产生的 ntkoen 数量，并从此区块后，数量不再变化
c_mining_ntoken_yield_per_block_base = 4 ether;      // 初始竞价交易产生的 ntoken 数量
                                             
c_mining_fee_thousandth = 10;   // post报价单时，需要根据eth数量按比例缴纳的手续费（1%）
c_dev_reward_percentage = 5;    // 开发者获得的奖励比例（5%）
c_NN_reward_percentage = 15;    // NN节点抽成比例（15%）
c_nest_reward_percentage = 80;  // 矿工自己获得的奖励比例（80%）
c_price_duration_block = 25;    // 正常竞价，每隔25个区块进行一次价格确定

c_sheet_duration_block = 1440;  // 用来设定被吃单者清算的时间上限
c_take_amount_factor = 2;       // 吃单者需要冻结资金规模扩大因子
c_take_fee_thousandth = 1;      // 吃单交易手续费，交易资金千分之一


## 数据结构

// 报价单结构体所占存储空间 2 x 256 bit，用于保存报价者的相关信息
struct PriceSheet {    
        uint160 miner;          // 报价者地址
        uint32  height;         // 报价单所在的区块高度
        uint8  chunkNum;        // 报价者开始报价时存入的 eth 块数量
        uint8  chunkSize;       // 每个块的大小（一个块包含多少个eth）
        uint8  remainChunk;     // 还有多少个块可以被吃，只要被吃单，它的值就会减小，至0后，此报价单不能被吃了
        uint8  ethChunk;        // 当前报价单拥有的 eth 块数量
        uint8  tokenChunk;      // 此报价单拥有的 token 块的数量
        
        uint8  state;           // 状态变量设置，=0 表示当前报价单已关闭，报价单所有任务都已完成;=1 表示被吃单者已经清算完毕;
                                // =2 表示竞价者提交了竞价单，还没有被吃; =3 表示已有吃单者吃单; =4 表示清算超时，吃单者已经进行过罚款操作

        uint8  level;           // 吃单嵌套层数
        uint8  _reserved;       // 填充位

        uint128 tokenPrice;     // 1 eth 可兑换 token1 的数量
        uint128 _reserved2;     // 1 eth可兑换 token2 的数量
    }

// 吃单者结构体所占存储空间 256 bit，用于保存被吃单者欠吃单者的资金，用于清算
struct Taker {
        uint160 takerAddress;   // 吃单者地址
        uint8 ethChunk;         // 被吃单者需要偿还吃单者 eth 的块数
        uint8 tokenChunk;       // 被吃单者需要偿还吃单者 token 的块数
        uint80 _reserved;       // 保留位，当前未使用
    }


映射类型（mapping）:

// 提供被吃单者的地址address,及索引: _takers[address][index] 返回相应的吃单者的信息结构体列表
mapping(address => mapping(uint256 => Taker[])) internal _takers;

// 提供区块高度 block.number，返回到这个区块为止，前面所有还未分配的 nest 数量之和（高128位），及相应的 eth 数量（低 128 位）
// _nest[block.number] => nest amount 、eth amount
mapping(uint256 => uint256) private _nest_at_height;


## 提供调用接口函数

### post()
功能：提交报价单，确定各角色（开发者、NN节点、矿工）nest 收益

函数： post(token1, token1Price, token2Price, ethNum)
      + token1 报价者提供的地址，只要合法即可，不需要是竞拍者当前交易地址
      + token1Price 第一个报价，一般是 1eth 对 USDT 的报价
      + token2Price 第二个报价，1 eth对 nest token 的报价
      + ethNum 报价者提供的 eth 数量

权限：
1. 禁止合约调用 noContract

参数要求：
1. token1 不能是零地址
2. ethNum 必须能被 ethNumPerChunk 整除且 ethNum 不能为 0，即 ethNum % ethNumPerChunk == 0 && ethNUm != 0
3. token1Price 必须大于0
4. token2Price 必须大于0

副作用：
1. 产生两个报价表，储存在 _priceSheetList[_token] 中

2. 当前区块产生 nest,需要按比例分配给矿工、NN节点、开发者

3. level 状态被初始化为 0,表示报价单目前没有被吃单过

资金流向：
1. //当吃单者输入的资金（msg.value） < 手续费时，才会执行：
   ETH(msg.value - _ethFee) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[msg.sender] 中

2. //当吃单者输入的资金（msg.value） < 手续费时，才会执行：
   ETH(_ethFee) | this ==> [[NestStaking] 合约的 rewardsTotal[ntoken] 中

3. ETH(ethNum x 2 ether) | _eth_ledger[msg.sender] ==>  [[NestPool]] 合约的 _eth_ledger[address(this)]

4. [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] 的资金充足的情况下：
   Nest(ethNum x 2 / ethNumPerChunk x nestPerChunk x (1e18)) | _nest_ledger[miner]  ==> [[NestPool]] 合约的 _nest_ledger[address(this)]

   [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] 的资金不充足的情况下：
   Nest(ethNum x 2 / ethNumPerChunk x nestPerChunk x (1e18) - _nest_ledger[吃单者本人地址]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]
   Nest(_nest_ledger[吃单者本人地址]) | [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]

5. Nest(nestAmount x c_dev_reward_percentage / 100)  | 区块产生奖励  ==>  [[NestPool]] 合约的 _eth_ledger[address(_developer_address)]

6. Nest(nestAmount x c_NN_reward_percentage / 100)  | 区块产生奖励  ==>  [[NestPool]] 合约的 _eth_ledger[address(_C_NNRewardPool)]


事件：
1. [[NestPool]] 合约的 _eth_ledger[吃单者本人地址] 的资金不充足会直接报错 "Nest:Pool:BAL(eth)<0"

2. [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] 的资金不充足（nest 数量小于要冻结 nest 的数量）的情况下，如果冻结 Nest 成功，_nest_ledger[吃单者本人地址] = 0




### close()
功能： 在吃单者得到被吃单者所欠的资金后，被吃单者可以执行此函数，解冻被吃单者的冻结资金。

函数： close(token, index)
      + token 被吃单者提供的地址
      + index 报价单位置索引

权限：
1. 禁止合约调用 noContract

参数要求：
1. 需要报价单本人（被吃单者）才可以操作
2. 如果当前被吃单者已经完全清算完毕 （_state == 1） 或者根本没有被吃单（_state == 2），需要满足 (报价单所在区块高度 + 25 < 当前区块高度),此时已经不能被吃单，价格稳定
3. 如果当前报价单处于被吃单状态（_state == 3）或者吃单者已经进行过惩罚操作（_state == 4），需要满足超时要求（报价单所在区块高度 + 1440 < 当前区块高度），被吃单者才可以将额外的罚金和吃单者本该得到的资金转给吃单者，后取回冻结资金，关闭报价单

副作用：
1. 报价单状态更新为 0,表示当前报价单已经被关闭，不能再进行操作。

2. 在报价单处于被吃单状态（_state == 3）且 被吃单者 超时未执行清算，而且此时 吃单者 也未执行惩罚操作，那么此时关闭报价单会将属于吃单者的 taker 列表记录的资金和被吃单者要交的罚金转给吃单者，清空  _takers[被吃单者提供的地址] 下所有记录

3. 在报价单处于被吃单状态（_state == 3）且 被吃单者 超时未执行清算，而且此时 吃单者 也未执行惩罚操作，那么此时会从 被吃单者 的报价单上减去 吃单者 的吃单资金

资金流向：
1. Nest(reward) | 区块产生奖励 ==> [[NestPool]] 合约的  _nest_ledger[报价者本人地址]

2. Nest(_nestAmount) | _nest_ledger[nestpool合约地址]  ==> [[NestPool]] 合约的  _nest_ledger[报价者本人地址]

3. ETH(_ethAmount) | _eth_ledger[nestpool合约地址] ==> [[NestPool]] 合约的  _eth_ledger[报价者本人地址]

4. Token(_tokenAmount) |  _token_ledger[token][nestpool合约地址] ==> [[NestPool]] 合约的   _token_ledger[token][报价者本人地址]

5. // 在报价单处于被吃单状态（_state == 3）且 被吃单者 超时未执行清算，而且此时 吃单者 也未执行惩罚操作，那么此时关闭报价单，针对偿还吃单者eth才会执行:
   
   ETH(_ethChunkAmount x ethChunk)  | [[NestPool]] 合约的 _eth_ledger[报价者本人地址] ==> [[NestPool]] 合约的  _eth_ledger[nestpool合约地址]

   ETH(_ethChunkAmount x 2 x ethChunk) | _[[NestPool]] 合约的 eth_ledger[nestpool合约地址] ==> [[NestPool]] 合约的  _eth_ledger[吃单者合约地址]

6. // 在报价单处于被吃单状态（_state == 3）且 被吃单者 超时未执行清算，而且此时 吃单者 也未执行惩罚操作，那么此时关闭报价单，针对偿还吃单者token才会执行:
   Token(_tokenChunkAmount x tokenChunk) | [[NestPool]] 合约的 _token_ledger[token][报价者本人地址] ==> [[NestPool]] 合约的 _token_ledger[token][nestpool合约地址]

   Token(_tokenChunkAmount x tokenChunk) | [[NestPool]] 合约的 _token_ledger[token][nestpool合约地址] ==> [[NestPool]] 合约的 _token_ledger[token][吃单者地址]

   ETH(_ethChunkAmount x _t.tokenChunk) | [[NestPool]] 合约的  _eth_ledger[nestpool合约地址] ==> [[NestPool]] 合约的  _eth_ledger[吃单者合约地址]

事件：
1. 被吃单者执行清算退还吃单者资金及交付罚款时，如果需要退还 eth,[[NestPool]] 合约的 _eth_ledger[被吃单者地址] 的资金不充足会直接报错 "Nest:Pool:BAL(eth)<0"

2. 被吃单者执行清算退还吃单者资金及交付罚款时，如果需要退还 token,[[NestPool]] 合约的 _nest_ledger[被吃单者地址] 的资金不充足（nest 数量小于要冻结 nest 的数量）的情况下，如果冻结 Nest 成功，_nest_ledger[被吃单者地址] = 0

3. 在被吃单者执行清算退还吃单者资金及交付罚款时：
   level < 4 :
   newNestPerChunk = _nestPerChunk

   4 < level < 128 :
   newNestPerChunk = nestPerChunk x 2 ^(level - 4)

   level >= 128 :
   newNestPerChunk = nestPerChunk x (2 ^ 128)



### buyToken()
功能：吃单者吃单时付出 eth，换取对应的 Token,但并没有立即转给吃单者，而是用 Taker 结构体存储吃单者应该获得的Token

函数：buyToken(token, index, takeChunkNum, newTokenPrice)
     + token 吃单者提供的地址
     + index 索引，通过它能查到对应被吃的报价表
     + takeChunkNum 吃单块数量
     + newTokenPrice 新报价格

权限： 
1. 禁止合约调用 noContract

参数要求：
1. token 地址不能为 0

2. 新报价格 > 0 

3. 报价块数量 > 0

4. 由 token 地址生成的 nToken 不能为 0

5. （当前区块高度 - 被吃报价单所在区块高度 < 25 ）表示吃单者想要吃的那个报价单还可以吃，价格还未确定

6. 被吃报价单的状态要为 2 （还未被吃过） 或者 3 （已经被吃过），确保可以报价单可以被吃

7. 想要吃的报价单的剩余块（remainChunk）数量必须大于吃单块数量，为了确保被吃报价单还有足够的块被吃


副作用：
1. 当 level < 128 时（原始提交的报价单的 level 的值为 0）,每次吃这个报价单，报价单的 level 就会加 1

2. 吃单操作会更新被吃报价单的状态 state 更新为 3，表示该报价单已被吃过

3. 吃单会产生一个新的报价单，并且这个报价单的状态 state 设置为 2（未被吃过），level 值根据被吃的那个报价单以前被吃过几次来确定

4. 吃单操作会更新原报价单的 ethChunk （增加）及 remainChunk （减小）

资金流向：
1. [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] 的资金充足的情况下：
   Nest(_nestDeposited x 1e18) | [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]

   [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] 的资金不充足的情况下：
   Nest(_nestDeposited x 1e18 - _nest_ledger[吃单者本人地址]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]
   Nest(_nest_ledger[吃单者本人地址]) | [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]


2. // [[NestPool]] 合约的 _eth_ledger[吃单者本人地址] 的资金充足的情况下：
   ETH((_ethChunkNum + takeChunkNum) x _chunkSize) | [[NestPool]] 合约的 _eth_ledger[吃单者本人地址] ==> [[NestPool]] 合约的 _eth_ledger[nestpool合约地址]


3. // 当吃单者输入的资金（msg.value） < 手续费时，才会执行：  // TODO 需要考虑是否存在问题
   ETH(msg.value - _ethFee) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[msg.sender] 中

   ETH(_ethFee) | this ==> [[NestStaking] 合约的 rewardsTotal[ntoken] 中


事件：
1. 如果 level <= 4 , 
   _ethChunkNum = takeChunkNum x 2   
   
   nestDeposited = nestPerChunk x ethChunkNum

2. 如果 level > 4 , 
   ethChunkNum = takeChunkNum

   nestDeposited = newNestPerChunk x ethChunkNum

3. [[NestPool]] 合约的 _eth_ledger[吃单者本人地址] 的资金不充足会直接报错 "Nest:Pool:BAL(eth)<0"

4. [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] 的资金不充足（nest 数量小于要冻结 nest 的数量）的情况下，如果冻结 Nest 成功，_nest_ledger[吃单者本人地址] = 0




### sellToken()
功能：吃单者吃单时付出 token，换取对应的 eth,但没有立即转给吃单者，而是用 Taker 结构体存储吃单者应该获得的 eth

函数：sellToken(token, index, takeChunkNum, newTokenPrice)
     + token 吃单者提供的地址
     + index 索引，通过它能查到对应被吃的报价表
     + takeChunkNum 吃单块数量
     + newTokenPrice 新报价格

权限：
1. 禁止合约调用 noContract

参数要求：
1. token 地址不能为 0

2. 新报价格 > 0 

3. 报价块数量 > 0

4. 由 token 地址生成的 nToken 不能为 0

5. （当前区块高度 - 被吃报价单所在区块高度 < 25 ）表示吃单者想要吃的那个报价单还可以吃，价格还未确定

6. 被吃报价单的状态要为 2 （还未被吃过） 或者 3 （已经被吃过），确保可以报价单可以被吃

7. 想要吃的报价单的剩余块（remainChunk）数量必须大于吃单块数量，为了确保被吃报价单还有足够的块被吃

副作用：
1. 当 level < 128 时（原始提交的报价单的 level 的值为 0）,每次吃这个报价单，报价单的 level 就会加 1

2. 吃单操作会更新被吃报价单的状态 state 更新为 3，表示该报价单已被吃过

3. 吃单会产生一个新的报价单，并且这个报价单的状态 state 设置为 2（未被吃过），level 值根据被吃的那个报价单以前被吃过几次来确定

4. 吃单操作会更新原报价单的 ethChunk （增加）及 remainChunk （减小）

资金流向：
1. [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] 的资金充足的情况下：
   Nest(_nestDeposited x 1e18) | [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]

   [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] 的资金不充足的情况下：
   Nest(_nestDeposited x 1e18 - _nest_ledger[吃单者本人地址]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]
   Nest(_nest_ledger[吃单者本人地址]) | [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] ==> [[NestPool]] 合约的 _nest_ledger[nestpool合约地址]


2. // [[NestPool]] 合约的 _eth_ledger[吃单者本人地址] 的资金充足的情况下：
   ETH(_ethChunkNum x _chunkSize) | [[NestPool]] 合约的 _eth_ledger[吃单者本人地址] ==> [[NestPool]] 合约的 _eth_ledger[nestpool合约地址]

3. [NestPool]] 合约的 _token_ledger[token][吃单者本人地址] 的资金充足的情况下：
   Token(ethNum x tokenPrice) | [[NestPool]] 合约的 _token_ledger[token][吃单者本人地址] ==> [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]

   [[NestPool]] 合约的 _token_ledger[token][吃单者本人地址] 的资金不充足的情况下：
   Token(ethNum x tokenPrice - _token_ledger[token][吃单者本人地址]) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]
   Token(_token_ledger[token][吃单者本人地址]) | [[NestPool]] 合约的 _nest_ledger[token][吃单者本人地址] ==> [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]

4. // 当吃单者输入的资金（msg.value） < 手续费时，才会执行：  // TODO 需要考虑是否存在问题
   ETH(msg.value - _ethFee) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[msg.sender] 中

   ETH(_ethFee) | this ==> [[NestStaking] 合约的 rewardsTotal[ntoken] 中

事件：
1. 如果 level <= 4 , 
   _ethChunkNum = takeChunkNum x 2   
   
   nestDeposited = takeChunkNum x nestPerChunk   

2. 如果 level > 4 , 
   ethChunkNum = takeChunkNum

   nestDeposited = newNestPerChunk x ethChunkNum 

3. [[NestPool]] 合约的 _eth_ledger[吃单者本人地址] 的资金不充足会直接报错 "Nest:Pool:BAL(eth)<0"

4. [[NestPool]] 合约的 _nest_ledger[吃单者本人地址] 的资金不充足（nest 数量小于要冻结 nest 的数量）的情况下，如果冻结 Nest 成功，_nest_ledger[吃单者本人地址] = 0


TODO 优化计算需要冻结 nest 代码(已修改)

### clear()
功能：被吃单者在25个区块后且没有超时前可以自主选择一次清算偿还几笔（num）债务

函数：clear(token, index, num)
      + token 被吃单者提供的地址
      + index 被吃单者报价单所在位置的索引
      + num 被吃单者主动选择一次偿还的债务数量（主要是考虑如果吃单者数量太多，一次性偿还所有，可能gas消耗量达到上限，造成无法成功清算的情况。）

权限：
1. 所有人都可以调用

参数要求：
1. 需要 token 的地址不为 0 
2. 需要调用此函数的用户是被吃单者本人
3. 需要 25 个区块后，等价格稳定后才可以执行清算函数
4. 不能超时，即不能超过 1440 个区块，想要调用此函数必须在超时前调用

副作用：
1. 如果被吃单者（假想被吃单）的报价单的状态为 2 （就是并没有被吃单，同时也没超时），需要进一步判断是否对应的 taker 列表的长度是否为 0 。如果是，
   会将被吃单者所在的报价表的状态置为 1 ，表示已经清算完毕。

2. 如果被吃单者（假想被吃单）的报价单的状态为 3，表示此报价单已经有人吃过了。此时，对 num 个吃单者进行债务偿还。同时，将已经偿还过的 taker 列表出栈

3. 如果被吃单者所有的债务都清偿完毕，则将报价单的状态置为 1

资金流向：
1. // 如果函数调用者调用函数时携带 msg.value > 0 :
   ETH(msg.value) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[msg.value合约地址]

2. // 如果此单已经被吃过了（state == 3），且 taker 列表中 ethChunk > 0 :
   ETH(报价单的块大小  x eth 块数量) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[nestpool合约地址]

   ETH(报价单的块大小  x eth 块数量) | [[NestPool]] 合约的 _eth_ledger[nestpool合约地址] ==> [[NestPool]] 合约的 _eth_ledger[nestpool合约地址]

3. // 如果此单已经被吃过了（state == 3），且 taker 列表中 tokenChunk > 0 :
      [NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金充足的情况下：
   Token(报价单的 tokenPrice x 报价单 eth 块大小 x token 块数量) | msg.sender ==> [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]

   [[NestPool]] 合约的 _token_ledger[token][吃单者本人地址] 的资金不充足的情况下：
   Token(报价单的 tokenPrice x 报价单 eth 块大小 x token 块数量) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]
   Token(报价单的 tokenPrice x 报价单 eth 块大小 x token 块数量) | msg.sender] ==> [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]
   
   Token(报价单的 tokenPrice x 报价单 eth 块大小 x token 块数量) | [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址] 
       ==> [[NestPool]] 合约的 _nest_ledger[token][takeAddress合约地址]


事件：
1. [[NestPool]] 合约的 _eth_ledger[被吃单者地址] 的资金不充足会直接报错 "Nest:Pool:BAL(eth)<0"

2. 如果被吃单者的状态不为 2 或者 3，那么会报错 "Nest:Mine:!BITTEN(sheet)"


### clearAll()
功能：一次性清偿当前报价单所有所欠的债务。如果所欠单数太多，gas 消耗超过上限，则需要使用 clear() 函数。

函数：clearAll(token, index)
     + token 被吃单者提供的地址
     + index 被吃单者报价单所在位置的索引

权限：
1. 所有人都可以调用

参数要求：
1. 需要 token 的地址不为 0 
2. 需要调用此函数的用户是被吃单者本人
3. 需要 25 个区块后，等价格稳定后才可以执行清算函数
4. 不能超时，即不能超过 1440 个区块，想要调用此函数必须在超时前调用

副作用：
1. 如果被吃单者（假想被吃单）的报价单的状态为 2 （就是并没有被吃单，同时也没超时），需要进一步判断是否对应的 taker 列表的长度是否为 0 。如果是，
   会将被吃单者所在的报价表的状态置为 1 ，表示已经清算完毕。

2. 如果被吃单者（假想被吃单）的报价单的状态为 3，表示此报价单已经有人吃过了。此时，对 num 个吃单者进行债务偿还。同时，将已经偿还过的 taker 列表出栈

3. 在被吃单者所有的债务都清偿完毕后，将报价单的状态置为 1

资金流向：
1. // 如果函数调用者调用函数时携带 msg.value > 0 :
   ETH(msg.value) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[msg.value合约地址]

2. // 如果此单已经被吃过了（state == 3），且 taker 列表中 ethChunk > 0 :
   ETH(报价单的块大小  x eth 块数量) | msg.sender ==> [[NestPool]] 合约的 _eth_ledger[nestpool合约地址]

   ETH(报价单的块大小  x eth 块数量) | [[NestPool]] 合约的 _eth_ledger[nestpool合约地址] ==> [[NestPool]] 合约的 _eth_ledger[msg.sender]

3. // 如果此单已经被吃过了（state == 3），且 taker 列表中 tokenChunk > 0 :
      [NestPool]] 合约的 _token_ledger[token][msg.sender] 的资金充足的情况下：
   Token(报价单的 tokenPrice x 报价单 eth 块大小 x token 块数量) | msg.sender ==> [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]

   [[NestPool]] 合约的 _token_ledger[token][吃单者本人地址] 的资金不充足的情况下：
   Token(报价单的 tokenPrice x 报价单 eth 块大小 x token 块数量) | 外部账户吃单者地址 ==> [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]
   Token(报价单的 tokenPrice x 报价单 eth 块大小 x token 块数量) | msg.sender] ==> [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]
   
   Token(报价单的 tokenPrice x 报价单 eth 块大小 x token 块数量) | [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址] 
       ==> [[NestPool]] 合约的 _nest_ledger[token][takeAddress合约地址]

事件：
1. [[NestPool]] 合约的 _eth_ledger[被吃单者地址] 的资金不充足会直接报错 "Nest:Pool:BAL(eth)<0"

2. 如果被吃单者的状态不为 2 或者 3，那么会报错 "Nest:Mine:!BITTEN(sheet)"


### refute()
// TODO 对 state 为 4 存疑
功能：在被吃单者未进行清偿，且已经超时后，吃单者执行此函数可以收回自己冻结资金，同时惩罚被吃单者，收取他的罚金。

函数：refute(token,index,takeIndex)
     + token 吃单者提供的被吃单者的 token 地址
     + index 被吃报价单所在索引
     + takeIndex taker 列表索引，用于查找 taker 表位置

权限：
1. 任何合约都可以调用

参数要求：
1. 需要查询的那个被吃报价单状态为 3，表示此报价单已经有人吃过

2. 需要被吃报价单对应的 taker 的吃单者地址为调用此函数的吃单者

3. 需要确保报价单已经超时

副作用：
1. 执行 refute 函数成功后，taker 列表的地址会被设置为 0

2. 被吃报价单的状态会被设置为 4，吃单者已经进行过罚款操作

资金流向：
1. // 在 taker.ethChunk > 0 时：
   Token(sheet.tokenPrice x taker.ethChunk x sheet.chunkSize) | [[NestPool]] 合约的 _nest_ledger[token][nestpool合约地址]
       ==> [[NestPool]] 合约的 _nest_ledger[token][msg.sender]

   ETH(报价单的块大小  x eth 块数量) | [[NestPool]] 合约的 _eth_ledger[nestpool合约地址] ==> [[NestPool]] 合约的 _eth_ledger[msg.sender]

2. // 在 taker.tokenChunk > 0 时：
   ETH(taker.ethChunk x 2 x eth 块数量) | [[NestPool]] 合约的 _eth_ledger[nestpool合约地址] ==> [[NestPool]] 合约的 _eth_ledger[msg.sender]


事件：
1. 吃单者在执行完罚款操作后，会将对应的 taker.ethChunk 或者 taker.tokenChunk 置为 0

2. 吃单者在执行完罚款操作后，会将吃单者列表的地址置为 0

3. 吃单者成功执行此函数，会将报价单的状态修改为 4       // TODO ： 这里存在疑问,可能这个条件需要修改
