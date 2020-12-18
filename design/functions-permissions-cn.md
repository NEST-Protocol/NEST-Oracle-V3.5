# 合约函数调用权限

1. NestMining 合约函数调用权限
2. NestPool 合约函数调用权限
3. NestQuery 合约函数调用权限
4. NestStaking 合约函数调用权限
5. NNRewardPool 合约函数调用权限
6. NTokenController 合约函数调用权限

## Changelog 更新日志

### 2020-12-10

增加合约函数调用权限分类


### 合约函数调用权限分类

#### NestMining 合约

##### 仅允许管理者调用 （onlyGovernance）函数
   
1. setup()

2. upgrade()

3. init()

4. incVersion()

5. setParams()


##### 任何 用户 / 合约 均可调用
  
1. initialize()

2. addrOfGovernance()  (只读函数 view)

3. parameters()  (只读函数 view)

4. minedNestAmount()  (只读函数 view)

5. latestMinedHeight()  (只读函数 view)

6. withdrawEth()  (防止重入引入互斥锁)

7. withdrawEthAndToken()  (防止重入引入互斥锁)

8. withdrawNest()  (防止重入引入互斥锁)

9. withdrawEthAndTokenAndNest()  (防止重入引入互斥锁)

10. lengthOfPriceSheets()  (只读函数 view)

11. priceSheet()  (只读函数 view)

12. stat()
    
  
##### 不允许合约调用 （noContract）

1. post()  (可携带资金)

2. post2()  (可携带资金)

3. close()

4. closeAndWithdraw() 

5. closeList()

6. biteToken()  (可携带资金)

7. biteEth()  (可携带资金)

8. fullPriceSheet()  (只读函数 view)

9. unVerifiedSheetList()  (只读函数 view)

10. unClosedSheetListOf()  (只读函数 view)

11. sheetListOf() (只读函数 view)

12. post2Only4Upgrade()


##### 只读 (view),允许任意用户直接调用；不允许除 NestQuery 合约外的其他合约调用

1. latestPriceOf()

2. priceOf() 

3. priceAvgAndSigmaOf()

4. priceOfTokenAtHeight() 

5. priceListOfToken() 


##### 其他情况

1. loadContracts()
  
权限：管理者或者 nestpool 合约地址可以调用。


2. _mineNest()

权限：private 函数，仅能被本合约内部函数调用;只读 （view）。


3. _mineNToken()

权限：private 函数，仅能被本合约内部函数调用;只读 （view）。





#### NestPool 合约

##### 仅允许管理者调用 （onlyGovernance）函数
   
1. setGovernance()

2. setContracts()

3. drainEth()

4. drainNest()

5. drainToken()


##### 任何 用户 / 合约 均可调用，只读函数 view
  
1. getNTokenFromToken()  

2. balanceOfNestInPool()  

3. balanceOfEthInPool()  

4. balanceOfTokenInPool()  

5. assetsList()  

6. addrOfNestMining()  

7. addrOfNestToken()  

8. addrOfNTokenController()

9. addrOfNNRewardPool()

10. addrOfNNToken() 

11. addrOfNestStaking()

12. addrOfNestQuery()

13. addrOfNestDAO()

14. getMinerEthAndToken() 


##### 仅获得授权的几个地址可以执行此函数（ NestMining / NTokenController / NestDAO / NestStaking / NNRewardPool / NestQuery）

1. transferNestInPool()

2. transferEthInPool() 

3. withdrawEth()

4. withdrawToken()

5. withdrawNest()


##### 仅 NestMining 合约地址可以执行此函数

1. freezeEth()

2. unfreezeEth()

3. freezeNest()

4. unfreezeNest()

5. freezeToken()

6. unfreezeToken()

7. freezeEthAndToken()

8. unfreezeEthAndToken()

9. addNest()

10. addNToken()

11. depositEth()  (可携带资金)

12. withdrawEthAndToken()

13. withdrawNTokenAndTransfer()


##### 其他情况

1. setNTokenToToken()
  
权限：管理者或 NTokenController 才可调用。




#### NestQuery 合约

##### 仅允许管理者调用 （onlyGovernance）函数
   
1. setParams()

2. remove()

3. pause()

4. resume()


##### 任何 用户 / 合约 均可调用
  
1. initialize()  

2. loadGovernance()

3. params()  (只读函数 view)  

4. deactivate()  (价格查询功能必须处于激活状态)


##### 不允许合约调用 (noContract)

1. activate() (价格查询功能必须处于激活状态)


##### 禁止重入 (nonReentrant), 价格查询功能必须开启

1. query()  

2. queryPriceAvgVola() 

3. updateAndCheckPriceNow()  

4. queryPriceList() 


##### 其他情况

1. loadContracts()
  
权限：管理者 或者 NestPool 合约地址才可以调用。





#### NestStaking 合约

##### 仅允许管理者调用 （onlyGovernance）函数
   
1. pause()

2. resume()

3. withdrawSavingByGov  (禁止重入)


##### 任何 用户 / 合约 均可调用
  
1. initialize() 

2. loadGovernance()

3. totalSaving()  (只读函数 view)  

4. totalRewards() (只读函数 view)

5. totalStaked()  (只读函数 view)

6. stakedBalanceOf()  (只读函数 view)

7. rewardPerToken()  (只读函数 view) 

8. accrued()  (只读函数 view)

9. earned() (只读函数 view)

10. stake()  (禁止重入、存入功能激活、收益更新) 

11. stakeFromNestPool()  (禁止重入、存入功能激活、收益更新) 

12. unstake()  (禁止重入、存入功能激活、收益更新) 

13. claim()  (禁止重入、存入功能激活、收益更新)

14. addETHReward()


##### 其他情况

1. loadContracts()
  
权限：仅允许 管理者 或者 NestPool 合约地址调用


2. _rewardPerTokenAndAccrued()

权限： 仅允许本合约内部函数调用，只读函数。




#### NNRewardPool 合约

##### 仅允许管理者调用 （onlyGovernance）函数
   
1. shutdown()
 

##### 任何 用户 / 合约 均可调用
  
1. loadGovernance() 

2. unclaimedNNReward()


##### 不允许合约调用 (noContract)

1. claimNNReward()


##### 其他情况

1. loadContracts()
  
权限：仅允许 管理者 或者 NestPool 合约调用


2. addNNReward()

权限：仅 NestNMining 合约地址可以调用


3. settleNNReward()

权限：仅可以被本合约内部函数调用 


4. nodeCount()

权限：仅允许 NNToken 地址调用





#### NTokenController 合约

##### 仅允许管理者调用 （onlyGovernance）函数
   
1. setCounter()

2. shutdown()

3. disable()

4. enable()


##### 任何 用户 / 合约 均可调用
  
1. loadGovernance()   

2. NTokenTagOf()   (只读函数 view)  

3. strConcat()       

4. getAddressStr()


##### 不允许合约调用 (noContract)

1. open()  (当前合约激活)


##### 其他情况

1. loadContracts()
  
权限：允许 管理者额 或者 NestPool 合约调用




//======================================  NestMining  ================================//
//====================================================================================//

### 本部分说明 NestMining 合约内函数调用权限

#### initialize()
功能：构造函数，初始化使用。用于确定每个区块挖矿产生的 ntoken 数量。

权限：允许外部调用。


#### setup()
功能：构造函数，用于确定初始化参数。

权限：仅管理者可调用(仅可调用一次)。


#### upgrade()
功能：用于合约升级。

权限：仅管理者可调用。


#### init()
功能：用于初始化参数。

权限：仅管理者可调用。


#### incVersion()
功能：版本号更新（使用当前区块高度记录）。

权限：仅管理者可调用。


#### loadContracts()
功能：初始化链接各合约。

权限：管理者或者 nestpool 合约地址可以调用。


#### setParam()
功能：用于初始化参数调整修改。

权限：仅管理者可调用。


#### addrOfGovernance()
功能：查询管理者地址。

权限：任何人均可调用。（只读函数 view）


#### parameters()
功能：查询初始化参数设置。

权限：任何人均可调用。（只读函数 view）


#### post()
功能：提交一对 ETH-TOKEN (除 ETH-USDT 外)报价。

权限：任何人均可调用，可携带资金。


#### post2()
功能：提交两对报价 ETH-TOKEN、ETH-NTOKEN 报价。

权限：任何人均可调用，可携带资金。


#### close()
功能：满足条件后关闭报价单。

权限：不允许合约调用。


#### closeAndWithdraw() 
功能：满足条件后关闭报价单并取回资产。

权限：不允许合约调用。


#### closeList()
功能：关闭同一用户的指定 index 索引的报价单（需满足关闭条件）。

权限：不允许合约调用。


#### biteToken()
功能：吃单，吃 TOKEN。

权限：不允许合约调用，可携带资金。


#### biteEth()
功能：吃单，吃 ETH。

权限：不允许合约调用，可携带资金。


#### latestPriceOf()
功能：查询最近的一个稳定价格的区块中所有报价表的信息，包括：表单剩余 ethNum 总量；剩余 token 总量；区块价格生效所在区块高度。

权限：
1. 只读 (view)。
2. 允许任意用户直接调用；不允许除 NestQuery 合约外的其他合约调用。


#### priceOf()
功能：查询最近的一个稳定价格的区块中所有报价表的信息，包括：表单剩余 ethNum 总量；剩余 token 总量；表单所在区块高度。

权限：
1. 只读 (view)。
2. 允许任意用户直接调用；不允许除 NestQuery 合约外的其他合约调用。


#### priceAvgAndSigmaOf()
功能：返回四个参数，分别为：最近稳定价格区块高度 token 兑换比率（多少 token 兑换 1 ETH）;平均价格；波动率；所在区块高度

权限：
1. 只读 (view)。
2. 允许任意用户直接调用；不允许除 NestQuery 合约外的其他合约调用。


#### priceOfTokenAtHeight()
功能：返回指定区块高度前稳定价格的区块中所有报价表的信息，包括：表单剩余 ethNum 总量；剩余 token 总量；表单所在区块高度。

权限：
1. 只读 (view)。
2. 允许任意用户直接调用；不允许除 NestQuery 合约外的其他合约调用。


#### priceListOfToken()
功能：从最新的价格稳定的区块高度开始，向区块高度减小的方向读取指定 num 个区块（这些区块中必须含有报价表，否则不计算）的数据，同时返回最新的价格稳定的区块高度。

权限：
1. 只读 (view)。
2. 允许任意用户直接调用；不允许除 NestQuery 合约外的其他合约调用。


#### _mineNest()
功能：确定当前区块所产出的 nest(ntoken 的一种) 数量。

权限：
1. private 函数，仅能被本合约内部函数调用。
2. 只读 （view）。


#### minedNestAmount()
功能: 返回到最新报价区块的总 ntoken 产出量。

权限：
1. 只读（view）。
2. 所有用户/合约均可调用。
 

#### latestMinedHeight()
功能：返回最新的报价区块高度。

权限：
1. 只读（view）。
2. 所有用户/合约均可调用。


#### _mineNToken()
功能：确定当前区块所产出的 ntoken (除 nest 外) 数量。

权限：
1. private 函数，仅能被本合约内部函数调用。
2. 只读 （view）。


#### withdrawEth()
功能：取回 NestPool 合约中，对应用户地址下的指定数量的 ETH，转移到用户外部地址。

权限：
1. 任何人/合约均可调用。
2. 防止重入（引入互斥锁）。


#### withdrawEthAndToken()
功能：取回 NestPool 合约中，对应用户地址下的指定数量的 ETH 和 token，转移到用户外部地址。

权限：
1. 任何人均可调用。
2. 防止重入（引入互斥锁）。


#### withdrawNest()
功能：取回 NestPool 合约中，对应用户地址下的指定数量的 Nest，转移到用户外部地址。

权限：
1. 任何人均可调用。
2. 防止重入（引入互斥锁）。


#### withdrawEthAndTokenAndNest()
功能：取回 NestPool 合约中，对应用户地址下的指定数量的 ETH、Token、Nest，转移到用户外部地址。

权限：
1. 任何人均可调用。
2. 防止重入（引入互斥锁）。


#### lengthOfPriceSheets()
功能：返回给定 token 地址下所包含的报价单的个数(长度)。

权限：
1. 只读（view）。
2. 任何用户/合约均可调用。 


#### priceSheet()
功能: 返回指定报价表的部分信息

权限：
1. 只读（view）。
2. 任何用户/合约均可调用。 


#### fullPriceSheet()
功能：返回指定报价表的所有信息。

权限：
1. 只读（view）。
2. 不允许合约调用。


#### unVerifiedSheetList()
功能：从最新包含报价表的区块开始,向区块高度减小的方向查找价格还未确定的报价单,并记录。

权限：
1. 只读（view）。
2. 不允许合约调用。


#### unClosedSheetListOf()
功能: 读取指定索引前,属于指定用户地址的,指定数量的,状态为 post(提交) 或者 bitting(吃单)的报价单,并不意味着还可以被吃单。

权限：
1. 只读（view）。
2. 不允许合约调用。


#### sheetListOf()
功能: 读取指定索引前,属于指定用户地址的,指定数量的,所有报价单(向区块高度减小方向读取)。

权限：
1. 只读（view）。
2. 不允许合约调用。


#### stat()
功能: 生成最新的 priceInfo 表,更新波动率等信息

权限：
1. 任何 用户/合约 均可调用。

#### post2Only4Upgrade()
功能：用于过渡 nest v3.0 与 nest v3.5, 报价计算波动率等信息使用。

权限：
1. 不允许合约调用。



//======================================  NestPool  ==================================//
//====================================================================================//

### 本部分说明 NestPool 合约内函数调用权限

#### setGovernance()
功能：设置管理者地址。

权限：仅管理者可以调用。


#### setContracts()
功能：初始化时用于链接各合约地址。

权限：仅管理者可以调用。


#### getNTokenFromToken()
功能：获得 token 对应的 ntoken 地址。

权限：
1. 只读（view）。
2. 任何人均可调用。


#### setNTokenToToken()
功能：关联 token-ntoken 

权限：
1. 管理者或 NTokenController 才可调用。


#### drainEth()
功能：紧急情况下转移合约中 ETH 到指定外部账户。

权限：
1. 仅管理者才可调用。


#### drainNest()
功能：紧急情况下转移合约中 NEST 到指定外部账户。

权限：
1. 仅管理者才可调用。


#### drainToken()
功能：紧急情况下转移合约中 NEST 到指定外部账户。

权限：
1. 仅管理者才可调用。


#### transferNestInPool()
功能：用户在 NestPool 合约中的 nest 资金可以相互转账。

权限：
1. 仅获得授权的几个地址可以执行此函数（ NestMining /NTokenController / NestDAO / NestStaking / NNRewardPool /NestQuery）。


#### transferTokenInPool()
功能：用户在 NestPool 合约中的 token/ntoken 资金可以相互转账。

权限：
1. 仅获得授权的几个地址可以执行此函数（ NestMining /NTokenController / NestDAO / NestStaking / NNRewardPool /NestQuery）。


#### transferEthInPool()
功能：用户在 NestPool 合约中的 ETH 资金可以相互转账。

权限：
1. 仅获得授权的几个地址可以执行此函数（ NestMining /NTokenController / NestDAO / NestStaking / NNRewardPool /NestQuery）。


#### freezeEth()
功能：报价/吃单 时冻结 ETH。

权限：
1. 仅 NestMining 合约地址可以执行此函数。


#### unfreezeEth()
功能：关闭报价单时解冻 ETH。

权限：
1. 仅 NestMining 合约地址可以执行此函数。


#### freezeNest()
功能：报价/吃单 时冻结 NEST。

权限：
1. 仅 NestMining 合约地址可以执行此函数。


#### unfreezeNest()
功能：关闭报价单时解冻 NEST。

权限：
1. 仅 NestMining 合约地址可以执行此函数。


#### freezeToken()
功能：报价/吃单 时冻结 Token / nToken。

权限：
1. 仅 NestMining 合约地址可以执行此函数。


#### unfreezeToken()
功能：关闭报价单时解冻 Token / nToken。

权限：
1. 仅 NestMining 合约地址可以执行此函数。


#### freezeEthAndToken()
功能：报价/吃单 时同时冻结 ETH 和 Token / nToken。

权限：
1. 仅 NestMining 合约地址可以执行此函数。
 

#### unfreezeEthAndToken()
功能：关闭报价单时同时解冻 ETH 和 Token / nToken。

权限：
1. 仅 NestMining 合约地址可以执行此函数。


#### balanceOfNestInPool()
功能: 查询 NestPool 合约中指定用户地址上 nest 余额。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### balanceOfEthInPool()
功能：查询 NestPool 合约中指定用户地址上 ETH 余额。

权限：
1. 任何人均可调用。
2. 只读（view）。 


#### balanceOfTokenInPool()
功能：查询 NestPool 合约中指定用户地址上 Token 余额。注意：使用此函数查询 Nest 时，仅为 Nest 作为 Ntoken 被冻结后解冻剩余的 Nest, 并不是全部 Nest。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### addNest()
功能：挖矿产生的 Nest 奖励，通过此函数转入 NestPool 对应的地址下。

权限：
1. 仅 NestMining 合约地址可以调用。


#### addNToken()
功能：挖矿产生的 NToken 奖励(除 Nest 外)，通过此函数转入 NestPool 对应的地址下。

权限：
1. 仅 NestMining 合约地址可以调用。


#### depositEth()
功能：NestMing 合约中相关函数携带资金（post,post2,biteToken,biteEth），通过此函数转入 NestPool 合约对应地址下。

权限：
1. 仅 NestMining 合约地址可以调用。
2. 可携带资金。


#### withdrawEth()
功能：将 NestPool 中指定用户的 ETH 资金提取到其用户的外部地址。

权限：
1. 仅获得授权的几个地址可以执行此函数（ NestMining /NTokenController / NestDAO / NestStaking / NNRewardPool /NestQuery）。



#### withdrawToken()
功能：将 NestPool 中指定用户的 Token 资金提取到其用户的外部地址。

权限：
1. 仅获得授权的几个地址可以执行此函数（ NestMining /NTokenController / NestDAO / NestStaking / NNRewardPool /NestQuery）。


#### withdrawNest()
功能：将 NestPool 中指定用户的 Nest 资金提取到其用户的外部地址。

权限：
1. 仅获得授权的几个地址可以执行此函数（ NestMining /NTokenController / NestDAO / NestStaking / NNRewardPool /NestQuery）。


#### withdrawEthAndToken()
功能：将 NestPool 中指定用户的 Eth/Token 资金提取到其用户的外部地址。

权限：
1. 仅 NestMining 合约地址可以调用。


#### withdrawNTokenAndTransfer()
功能：将存在 NestPool 中属于 NestStaking 合约的 nToken 资金提取至外部指定账户。

权限：
1. 仅 Neststaking 合约地址可以调用。


#### assetsList()
功能：查询 Nestpool 中用户本人指定数目代币种类，每种代币的余额。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### addrOfNestMining()
功能：返回 NestMining 合约地址。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### addrOfNestToken()
功能：返回 NestToken 合约地址。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### addrOfNTokenController()
功能：返回 NTokenController 合约地址。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### addrOfNNRewardPool()
功能：返回 NNRewardPool 合约地址。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### addrOfNNToken()
功能：返回 NNToken 合约地址。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### addrOfNestStaking()
功能：返回 NestStaking 合约地址。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### addrOfNestQuery()
功能：返回 NestQuery 合约地址。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### addrOfNestDAO()
功能：返回 NestDAO 合约地址。

权限：
1. 任何人均可调用。
2. 只读（view）。


#### getMinerEthAndToken()
功能：读取指定用户在 NestPool 中 ETH 及 Token 的余额。

权限：
1. 任何人均可调用。
2. 只读（view）。



//======================================  NestQuery  =================================//
//====================================================================================//

### 本部分说明 NestQuery 合约内函数调用权限

#### initialize()
功能：初始化参数。

权限：
1. 初始化时调用，仅可调用一次。


#### loadGovernance()
功能：用于链接各管理者地址，初始化时使用。

权限：
1. 任何 用户 / 合约 均可调用。


#### setParams()
功能：重新设置参数。

权限：
1. 仅管理者可调用。


#### params()
功能：读取设置的参数。

权限：
1. 所有 用户/ 合约 均可调用。
2. 只读（view）。


#### loadContracts()
功能：链接各合约地址。

权限：
1. 管理员 或 NestPool 地址可调用。 

#### pause()
功能：紧急情况下暂停查询功能。

权限：
1. 仅管理者可以调用。

#### resume()
功能：重新开启查询功能。

权限：
1. 仅管理者可以调用。


#### activate()
功能：激活价格查询功能。

权限：
1. 不允许合约调用。
2. 价格查询功能必须处于激活状态


#### deactivate()
功能：关闭价格查询功能。

权限：
1. 价格查询功能必须处于激活状态


#### query()
功能：查询最新的价格稳定区块高度上相关信息（EthAmount、tokenAmount、blockNumber）。

权限：
1. 价格查询功能必须开启。
2. 禁止重入。
3. 可携带资金。


#### queryPriceAvgVola()
功能：查询价格波动率、平均价格等相关信息。

权限：
1. 价格查询功能必须开启。
2. 禁止重入。 
3. 可携带资金。


#### updateAndCheckPriceNow()
功能: 更新最新的价格稳定区块高度上相关信息。

权限：
1. 价格查询功能必须开启。
2. 可携带资金。


#### queryPriceList()
功能：从最新的价格稳定的区块高度开始，向区块高度减小的方向读取指定 num 个区块（这些区块中必须含有报价表，否则不计算）的数据，同时返回最新的价格稳定的区块高度。

权限：
1. 价格查询功能必须开启。
2. 可携带资金。




//======================================  NestStaking  ===============================//
//====================================================================================//

#### initialize()
功能：初始化设置参数。

权限：
1. 仅允许执行一次。


#### loadContracts()
功能：链接 NestToken 合约地址。

权限:
1. 允许管理者 或者 NestPool 合约地址调用。


#### loadGovernance()
功能：用于链接 NestPool 合约的管理者地址，初始化时使用。

权限：
1. 仅管理者可以调用。


#### pause()
功能：紧急情况下暂停 Staking 服务。

权限：
1. 仅管理者可以调用。


#### resume()
功能：恢复 Staking 服务。

权限：
1. 仅管理者可以调用。


#### withdrawSavingByGov()
功能：管理者提取指定数额收益(ETH)。

权限：
1. 禁止重入。
2. 仅允许管理者调用。


#### totalSaving()
功能：读取指定 ntoken 地址上资金余额。

权限：
1. 任何 用户/合约 均可调用。
2. 只读（view）。


#### totalRewards()
功能：ntoken 地址下总奖励。

权限：
1. 任何 用户/合约 均可调用。
2. 只读（view）。


#### totalStaked()
功能：读取已支付的奖励总额。

权限：
1. 任何 用户/合约 均可调用。
2. 只读（view）。 


#### stakedBalanceOf()
功能: 返回指定用户地址下的资金总额。

权限：
1. 任何 用户/合约 均可调用。
2. 只读（view）。 


#### rewardPerToken()
功能：返回 ntoken 地址下总收益。

权限：
1. 任何 用户/合约 均可调用。
2. 只读（view）。 


#### accrued()
功能：读取新增总收益。

权限：
1. 任何 用户/合约 均可调用。
2. 只读（view）。 


#### earned()
功能：查询用户收益.

权限：
1. 任何 用户/合约 均可调用。
2. 只读（view）。 


#### stake()
功能：向 nestStaking 合约存入指定数量的 NToken。

权限：
1. 禁止重入。
2. staking 激活状态。
3. 最新收益更新。


#### stakeFromNestPool()
功能：直接将 NestPool 合约地址下的 nToken 资金转移到 NestStaking 合约中。 

权限：
1. 禁止重入。
2. staking 激活状态。
3. 最新收益更新。


#### unstake()
功能：取出合约中的指定数量的资金。

权限：
1.  禁止重入。
2. staking 激活状态。
3. 最新收益更新。


#### claim()
功能：提取用户地址下的所有奖励到外部地址。

权限：
1.  禁止重入。
2. staking 激活状态。
3. 最新收益更新。


#### addETHReward()
功能：增加 ETH 奖励。

权限：
1. 可携带资金。
2. 任何 用户/合约 可调用。



//========================================  NNRewardPool  ================================//
//========================================================================================//

#### shutdown()
功能：紧急停止本合约功能。

权限：
1. 仅管理者可调用。


#### addNNReward()
功能：增加 NN 奖励。

权限：
1. 仅 NestMining 合约可以调用。


#### claimNNReward()
功能：提取 reward 奖励。

权限：
1. 禁止重入。


#### settleNNReward()
功能：两个 NN holder 之间的转账（实际为调整两者的在 NNreward 中的比例）。

权限：
1. internal 仅能被内部合约调用。


#### nodeCount()
功能：两个 NN holder 之间的转账（实际为调整两者的在 NNreward 中的比例）。

权限：
1. 仅 NNtoken 地址可以调用。


#### unclaimedNNReward()
功能：查询用户自己还未提取的奖励。

权限：
1. 只读 （view）。
2. 任何 合约/用户 均可调用。



//====================================  NTokenController  ==========================================//
//==================================================================================================//

#### open()
功能：创建新的 ntoken 地址。

权限：
1. 禁止重入。
2. 本合约处于激活状态。
