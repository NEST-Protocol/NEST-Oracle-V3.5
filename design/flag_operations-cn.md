#  所有合约中与 flag 相关功能
1. NestMining 合约函数
2. NestQuery 合约函数
3. NestStaking 合约函
4. NNRewardPool 合约函数
5. NTokenController 合约函数
6. NestDAO.sol 合约函数


## Changelog 更新日志

### 2020-12-10


### 本部分说明 NestMining 合约 flag 值变化情况

1. flag: 0 ==> 1
执行函数顺序： initialize()
说明： NestMining 初始化时 flag 默认值为 0，即 MINING_FLAG_UNINITIALIZED 状态（此值为 0），调用 initialize() 函数， flag 值变成 MINING_FLAG_SETUP_NEEDED (此值为 1)。

2. flag：0 ==> 1 ==> 2
执行函数顺序： initialize()  ==> setup()
说明： 执行 inintialize() 后，调用 setup() 函数，初始化参数。flag 的值变为 MINING_FLAG_UPGRADE_NEEDED (此值为 2)。

3. flag：0 ==> 1 ==> 2  ==> 3
执行函数顺序： initialize()  ==> setup() ==> upgrade()
说明： 执行 setup() 后，调用 upgrade() 函数，准备更新 NestMining 合约。flag 的值变为 MINING_FLAG_ACTIVE (此值为 3)。


注： 以上 flag 参数值变化均需按顺序执行，不可省略中间步骤，且变化值不可逆。即上述函数仅可执行一次。



### 本部分说明 NestQuery 合约 flag 值变化情况

1. flag: 0 ==> 1
执行函数顺序： initialize() 
说明： NestQuery 初始化时 flag 默认值为 0，即 QUERY_FLAG_UNINITIALIZED 状态（此值为 0），调用 initialize() 函数， flag 值变成 QUERY_FLAG_ACTIVE (此值为 1)。

2. flag：1 / 2 ==> 2
执行函数：pause()
说明： 执行 pause() 后，,flag 的值变为 QUERY_FLAG_PAUSED (此值为 2)。

3. flag： 1 / 2 ==> 1  
执行函数顺序： resume()
说明： 执行 resume() 后，，flag 的值变为 QUERY_FLAG_ACTIVE (此值为 1)。


注： flag 参数值经初始化后，由 0 变为 1。此后，可以在 1 和 2 之间互相转化。



### 本部分说明 NestStaking 合约 flag 值变化情况

1. flag: 0 ==> 1
执行函数顺序： initialize()
说明： NestStaking 初始化时 flag 默认值为 0，即 STAKING_FLAG_UNINITIALIZED 状态（此值为 0），调用 initialize() 函数， flag 值变成 STAKING_FLAG_ACTIVE (此值为 1)。

2. flag：1 / 3 ==> 3
执行函数：pause()
说明： 执行 pause() 后，,flag 的值变为 STAKING_FLAG_PAUSED (此值为 3)。

3. flag： 1 / 3 ==> 1  
执行函数顺序： resume()
说明： 执行 resume() 后，，flag 的值变为 STAKING_FLAG_ACTIVE (此值为 1)。


注： flag 参数值经初始化后，由 0 变为 1。此后，可以在 1 和 3 之间互相转化，但不可为 0。



### 本部分说明 NNRewardPool 合约 flag 值变化情况

1. flag: 0
执行函数： 构造函数 constructor()
说明： NNRewardPool 初始化时 flag 默认值为 0，调用构造函数后将 flag 设置为 NNREWARD_FLAG_UNINITIALIZED 状态（此值为 0）

2. flag：0 ==> 1
执行函数：构造函数 constructor() ==> loadContracts()
说明： 执行 loadContracts() 后，,flag 的值变为 NNREWARD_FLAG_ACTIVE (此值为 1)。

3. flag： 0 / 1 ==> -1  
执行函数顺序： 构造函数 constructor() ==> (loadContracts() ==>)shutdown()
说明： 执行 shutdown() 后，，flag 的值变为 NNREWARD_FLAG_SHUTDOWN (此值为 -1)。


注： flag 参数值经初始化构造函数后，flag 为 0。此后,变化值不可逆.



### 本部分说明 NTokenController 合约 flag 值变化情况
1. flag: 1
执行函数： 构造函数 constructor()
说明： NNRewardPool 初始化时 flag 默认值为 0，调用构造函数后将 flag 设置为 1

2. flag：1 ==> 2
执行函数：构造函数 constructor() ==> shutdown()
说明： 执行 shutdown() 后，,flag 的值变为 2.


注： flag 参数值经初始化构造函数后，flag 为 0。此后,变化值不可逆.



### 本部分说明 NestDAO 合约 flag 值变化情况
1. : 0 ==> 1
执行函数：初始化函数 initialize()
说明： NestDAO 初始化时 flag 默认值为 0，调用 initialize() 函数后将 flag 设置为 DAO_FLAG_INITIALIZED 状态（此值为 1）

2. flag：1 ==> 2
执行函数：初始化函数 initialize() ==> start()
说明： 执行 start() 后，,flag 的值变为 NNREWARD_FLAG_DAO_FLAG_ACTIVEACTIVE (此值为 2)。


3. flag：2 / 4 ==> 4
执行函数：pause()
说明： 执行 pause() 后，,flag 的值变为 DAO_FLAG_PAUSED (此值为 4)。

4. flag： 2 / 4 ==> 2  
执行函数顺序： resume()
说明： 执行 resume() 后，，flag 的值变为 DAO_FLAG_ACTIVE (此值为 2)。


注： flag 参数值经初始化，由 0 变为 1。再经 start() 函数对 NestStaking 合约授权转移代币，flag 值变为 2。此后，可以在 2 和 4 之间互相转化，但不可为 0 和 1。
