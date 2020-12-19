# 合约中管理员可以设置的参数

**Author:** Paradox  <paradox@nestprotocol.org>

**Abstract:** 本文档梳理合约中管理员能够设置的参数。

&emsp;
## 涉及合约列表

1. NestMining 合约函数
2. NestPool 合约函数
3. NestQuery 合约函数
4. NestStaking 合约函
5. NNRewardPool 合约函数
6. NTokenController 合约函数


## Changelog 

- 2020-12-17 修订
- 2020-12-10 初稿

&emsp;
&emsp;
### NestMining 合约内管理员可以设置的参数列表

1. `setup()` 函数，初始化参数设置（本函数仅可以运行一次）

    `state.miningEthUnit`           // 最小报价单元(目前最初报价 EthNum 只允许等于最小报价单元)
    `state.nestStakedNum1k`         // 冻结 nest 数量有关因子，初始设置为 1。可根据吃单次数变化
    `state.biteFeeRate`             // 吃单手续费百分比
    `state.miningFeeRate`           // 挖矿抽成百分比
    `state.priceDurationBlock`      // 价格稳定区块数
    `state.maxBiteNestedLevel`      // 此参数用来划分吃单时需要冻结的资金规模
    `state.biteInflateFactor`       // 吃单冻结 eth 因子
    `state.biteNestInflateFactor`   // 吃单冻结 Nest 规模因子
    `state.latestMiningHeight`      // 最新报价区块高度
    `state.minedNestAmount`         // 挖矿产生 nest 数量
    `state.genesisBlock`            // 创始区块高度
    `flag`                          // 标志符，用来限制函数调用
    `version`                       // 版本号，用当前区块号标志


2. `upgrade()` 函数，合约需要更新时调用
   
   `flag`    // 标识符，用来限制函数调用


3. `incVersion()` 版本号更新函数
   
   `version`   // 设置当前版本号（当前区块高度）


4. `loadContracts()` 加载各合约地址使用，链接个合约地址，初始化时调用一次


5. `setParameters()` 函数，初始化后调整基本参数使用

    `state.miningEthUnit`           // 最小报价单元(目前最初报价 EthNum 只允许等于最小报价单元)
    `state.nestStakedNum1k`         // 冻结 nest 数量有关因子，初始设置为 1。可根据吃单次数变化
    `state.biteFeeRate`             // 吃单手续费百分比
    `state.miningFeeRate`           // 挖矿抽成百分比
    `state.priceDurationBlock`      // 价格稳定区块数
    `state.maxBiteNestedLevel`      // 此参数用来划分吃单时需要冻结的资金规模
    `state.biteInflateFactor`       // 吃单冻结 eth 因子
    `state.biteNestInflateFactor`   // 吃单冻结 Nest 规模因子

&emsp;
&emsp;
### NestPool 合约内管理员设置函数（参数）列表

1. `setGovernance()` 函数，修改管理员地址
   `governance`    // 管理员地址设置


2. `setNTokenToToken()` 设置 token-ntoken 间的映射


3. `drainEth()` 函数，紧急情况转移 eth 到指定地址


4. `drainNest()` 函数，紧急情况转移 Nest 到指定地址


5. `drainToken()` 函数，紧急情况转移 token / ntoken 到指定地址


&emsp;
&emsp;
###  NestQuery 合约管理员设置函数（参数）列表

1. `setParams()` 函数，设置初始化参数（）
  
   `singleFee`   // 设置单次查询价格
   `time`        // 时间戳设置
   `actFee`      // 激活预言机费用


2. `remove()` 函数，移除 defi (发生错误情况下)


3. `pause()` 函数，停止价格查询服务
   
   `flag`    // 标识符，设置价格查询服务相关信息


4. `resume()` 函数，重新启动价格查询功能

   `flag`    // 标识符，设置价格查询服务相关信息

&emsp;
&emsp;

### NestStaking 合约管理员设置函数（参数）列表

1. `loadContracts()` 函数，读取合约地址


2. `pause()` 函数，停止价格查询服务
   
   `flag`    // 标识符，设置价格查询服务相关信息


4. `resume()` 函数，重新启动价格查询功能

   `flag`    // 标识符，设置价格查询服务相关信息


5. `withdrawSavingByGov()` 函数，管理员提取指定数目资金。


&emsp;
&emsp;
### NNRewardPool 合约管理员设置函数（参数）列表

1. `loadContracts()` 函数， 链接合约地址，设置 `flag`


2. `shutdown()` 函数，关闭本合约
   `flag`    // 标识符，设置价格查询服务相关信息
        

&emsp;
###  NTokenController 合约管理员设置函数（参数）列表

1. `shutdown()` 函数，关闭本合约
   `flag`    // 标识符，设置价格查询服务相关信息


2. `disable()` 函数，处理废弃的 token 
   
   `state`  // 标识符


3. `enable()` 函数，重新恢复 token
   `state`    // 标识符