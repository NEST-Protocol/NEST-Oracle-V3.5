# 接口函数的gas消耗情况统计

&emsp;

**Author:** Paradox <paradox@nestprotocol.org>

**Abstract:**  本文档统计各合约接口调用 gas 消耗情况 ,包括调用时最小消耗、最大消耗、平均消耗、运行次数。如果仅调用一次，则记为平均消耗。此外，本文档还梳理了合约部署时所消耗 gas 情况。



### Changelog

- 2020-12-18 初稿

  


###  合约部署测试环境

- **Solc version:** 0.6.12
- **Block limit:** 9500000 gas 
- **test:** REPORT_GAS=1 npx hardhat test



### 各合约接口函数 gas 消耗情况

#### NestDAO 合约

| Contract |      Method       |  Min   |  Max   |  Avg   | \# calls |
| :------: | :---------------: | :----: | :----: | :----: | :------: |
| NestDAO  |   addETHReward    |   -    |   -    | 42757  |    2     |
| NestDAO  |   addNestReward   |   -    |   -    | 30862  |    2     |
| NestDAO  | collectETHReward  | 28337  | 204047 | 116192 |    2     |
| NestDAO  | collectNestReward |   -    |   -    | 127896 |    1     |
| NestDAO  |    initialize     | 105013 | 105037 | 105034 |    11    |
| NestDAO  |   loadContracts   |   -    |   -    | 120501 |    21    |
| NestDAO  |  loadGovernance   |   -    |   -    | 30813  |    1     |
| NestDAO  |       pause       |   -    |   -    | 29268  |    2     |
| NestDAO  |      redeem       |   -    |   -    | 145233 |    1     |
| NestDAO  |      resume       |   -    |   -    | 29269  |    2     |
| NestDAO  |     setParams     |   -    |   -    | 37313  |    1     |
| NestDAO  |       start       |   -    |   -    | 75785  |    1     |



#### NestMiningV1 合约

|   Contract   |      Method       |  Min   |  Max   |  Avg   | \# calls |
| :----------: | :---------------: | :----: | :----: | :----: | :------: |
| NestMiningV1 |      biteEth      | 270546 | 274845 | 272764 |    4     |
| NestMiningV1 |     biteToken     | 207583 | 289773 | 272244 |    12    |
| NestMiningV1 |       close       | 52619  | 244118 | 156780 |    20    |
| NestMiningV1 | closeAndWithdraw  | 151184 | 151196 | 151190 |    2     |
| NestMiningV1 |     closeList     | 172827 | 409715 | 286535 |    4     |
| NestMiningV1 |    initialize     | 491409 | 491433 | 491429 |    10    |
| NestMiningV1 |   loadContracts   |   -    |   -    | 166608 |    20    |
| NestMiningV1 |       post        | 263165 | 571133 | 368046 |    44    |
| NestMiningV1 |       post2       | 381549 | 824941 | 531503 |    24    |
| NestMiningV1 | post2Only4Upgrade | 200603 | 287525 | 219201 |    28    |
| NestMiningV1 |       setup       |   -    |   -    | 70673  |    20    |
| NestMiningV1 |       stat        | 67566  | 394613 | 124243 |    8     |



#### NestNToken 合约

|  Contract  |    Method    |  Min  |  Max  |  Avg  | \# calls |
| :--------: | :----------: | :---: | :---: | :---: | :------: |
| NestNToken |   approve    | 44009 | 44021 | 44015 |    20    |
| NestNToken | setOfferMain |   -   |   -   | 42616 |    6     |
| NestNToken |   transfer   | 50965 | 50977 | 50971 |    10    |



#### NestPool 合约

| Contract |       Method        |  Min  |  Max   |  Avg   | \# calls |
| :------: | :-----------------: | :---: | :----: | :----: | :------: |
| NestPool |       addNest       | 43232 | 73232  | 54482  |    4     |
| NestPool |      addNToken      |   -   |   -    | 44380  |    1     |
| NestPool |     depositEth      | 29470 | 44470  | 36970  |    2     |
| NestPool |    depositNToken    |   -   |   -    | 149084 |    1     |
| NestPool |      freezeEth      |   -   |   -    | 49835  |    1     |
| NestPool |  freezeEthAndToken  |   -   |   -    | 71796  |    1     |
| NestPool |     freezeNest      |   -   |   -    | 150795 |    1     |
| NestPool |     freezeToken     | 50504 | 85396  | 73761  |    3     |
| NestPool |   initNestLedger    | 46734 | 46746  | 46742  |    8     |
| NestPool |    setContracts     | 42997 | 192397 | 160378 |    28    |
| NestPool |    setGovernance    |   -   |   -    | 41898  |    1     |
| NestPool |  setNTokenToToken   | 27189 | 65589  | 62938  |    29    |
| NestPool | transferNestInPool  |   -   |   -    | 51009  |    1     |
| NestPool | unfreezeEthAndToken |   -   |   -    | 47785  |    1     |
| NestPool |    unfreezeNest     |   -   |   -    | 35818  |    1     |
| NestPool |    unfreezeToken    | 20581 | 35557  | 30561  |    3     |
| NestPool |     withdrawEth     |   -   |   -    | 36713  |    1     |
| NestPool |    withdrawNest     |   -   |   -    | 59024  |    1     |
| NestPool |    withdrawToken    |   -   |   -    | 23078  |    1     |



#### NestQuery  合约

| Contract  |      Method       |  Min   |  Max   |  Avg   | \# calls |
| :-------: | :---------------: | :----: | :----: | :----: | :------: |
| NestQuery |     activate      | 105627 | 173415 | 119185 |    5     |
| NestQuery |    deactivate     |   -    |   -    | 17314  |    5     |
| NestQuery |    initialize     | 105252 | 105276 | 105273 |    22    |
| NestQuery |   loadContracts   | 48582  | 121182 | 114582 |    22    |
| NestQuery |       pause       |   -    |   -    | 30145  |    1     |
| NestQuery |       query       |   -    |   -    | 82140  |    2     |
| NestQuery | queryPriceAvgVola |   -    |   -    | 77698  |    2     |
| NestQuery |  queryPriceList   |   -    |   -    | 71777  |    2     |
| NestQuery |      remove       |   -    |   -    | 25356  |    1     |
| NestQuery |      resume       |   -    |   -    | 30137  |    1     |



####  NestStaking 合约

|  Contract   |       Method        |  Min   |  Max   |  Avg   | \# calls |
| :---------: | :-----------------: | :----: | :----: | :----: | :------: |
| NestStaking |    addETHReward     | 27757  | 42757  | 32757  |    3     |
| NestStaking |        claim        | 68541  | 136941 | 89841  |    8     |
| NestStaking |     initialize      | 85044  | 85068  | 85065  |    11    |
| NestStaking |    loadContracts    |   -    |   -    | 47443  |    20    |
| NestStaking |        pause        |   -    |   -    | 29312  |    1     |
| NestStaking |       resume        |   -    |   -    | 29238  |    1     |
| NestStaking |        stake        | 91564  | 182392 | 122839 |    4     |
| NestStaking |  stakeFromNestPool  | 104726 | 115183 | 109955 |    2     |
| NestStaking |       unstake       | 84159  | 84171  | 84165  |    2     |
| NestStaking | withdrawSavingByGov |   -    |   -    | 53220  |    1     |



####  NNRewardPool 合约

|   Contract   |    Method     |  Min  |  Max  |  Avg   | \# calls |
| :----------: | :-----------: | :---: | :---: | :----: | :------: |
| NNRewardPool |  addNNReward  | 29700 | 44700 | 34700  |    3     |
| NNRewardPool | claimNNReward |   -   |   -   | 226039 |    1     |
| NNRewardPool | loadContracts | 44391 | 97791 | 92936  |    22    |



#### NNToken 合约

| Contract |    Method    |  Min  |  Max   |  Avg  | \# calls |
| :------: | :----------: | :---: | :----: | :---: | :------: |
| NNToken  |   approve    | 43915 | 43927  | 43920 |    16    |
| NNToken  | setContracts |   -   |   -    | 42528 |    5     |
| NNToken  |   transfer   | 53425 | 169069 | 82950 |    12    |



#### NTokenController 合约

|     Contract     |    Method     |  Min   |  Max   |  Avg   | \# calls |
| :--------------: | :-----------: | :----: | :----: | :----: | :------: |
| NTokenController |    disable    |   -    |   -    | 44693  |    2     |
| NTokenController |    enable     |   -    |   -    | 14819  |    1     |
| NTokenController | loadContracts |   -    |   -    | 47552  |    20    |
| NTokenController |     open      | 974856 | 974878 | 974862 |    4     |
| NTokenController |     pause     |   -    |   -    | 30200  |    1     |
| NTokenController |     start     |   -    |   -    | 45480  |    2     |





### 合约部署时消耗 gas 情况

|   Deployments    |   Min   |   Max   |   Avg   | % of limit |
| :--------------: | :-----: | :-----: | :-----: | :--------: |
|   MiningV1Calc   |    -    |    -    | 2300171 |   24.2 %   |
|    MiningV1Op    |    -    |    -    | 3017577 |   31.8 %   |
|     NestDAO      |         |         | 1712586 |    18 %    |
|   NestMiningV1   | 5269871 | 5270051 | 5269998 |   55.5 %   |
|    NestNToken    |    -    |    -    | 797297  |   8.4 %    |
|     NestPool     |    -    |    -    | 2867985 |   30.2 %   |
|    NestQuery     |    -    |    -    | 1922400 |   20.2 %   |
|   NestStaking    |    -    |    -    | 1930891 |   20.3 %   |
|   NNRewardPool   | 1236002 | 1236026 | 1236023 |    13 %    |
|     NNToken      |    -    |    -    | 702440  |   7.4 %    |
| NTokenController | 2225486 | 2225510 | 2225508 |   23.4 %   |