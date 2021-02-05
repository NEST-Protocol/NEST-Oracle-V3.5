# 接口函数的gas消耗情况统计

&emsp;

**Author:** Paradox <paradox@nestprotocol.org>

**Abstract:**  本文档统计各合约接口调用 gas 消耗情况 ,包括调用时最小消耗、最大消耗、平均消耗、运行次数。如果仅调用一次，则记为平均消耗。此外，本文档还梳理了合约部署时所消耗 gas 情况。


### Changelog

- 2021-02-04 更新

- 2020-12-19 修改

- 2020-12-18 初稿

  
###  合约部署测试环境

- **Solc version:** 0.6.12
- **Block limit:** 9500000 gas 
- **test:** REPORT_GAS=1 npx hardhat test


### 各合约接口函数 gas 消耗情况

#### NestDAO 合约

| Contract |      Method       |  Min   |  Max   |  Avg   | \# calls |
| :------: | :---------------: | :----: | :----: | :----: | :------: |
| NestDAO  |   addETHReward    | 27713  | 42713  | 30440  |    11    |
| NestDAO  |   addNestReward   |   -    |   -    | 30849  |    2     |
| NestDAO  | collectETHReward  | 46979  | 251848 | 163699 |    3     |
| NestDAO  | collectNestReward | 105250 | 120250 | 112750 |    2     |
| NestDAO  |    initialize     | 105013 | 105037 | 105060 |    15    |
| NestDAO  |   loadContracts   |   -    |   -    | 119645 |    29    |
| NestDAO  |  loadGovernance   |   -    |   -    | 30703  |    1     |
| NestDAO  |     migrateTo     |   -    |   -    | 160247 |    1     |
| NestDAO  |       pause       |   -    |   -    | 30119  |    3     |
| NestDAO  |      redeem       | 156833 | 494518 | 259776 |    10    |
| NestDAO  |      resume       |   -    |   -    | 30098  |    3     |
| NestDAO  |     setParams     | 28948  | 37348  | 32546  |    7     |
| NestDAO  |       start       |   -    |   -    | 50272  |    3     |

#### NestMiningV1 合约

|   Contract   |           Method           |  Min   |  Max   |  Avg   | \# calls |
| :----------: | :------------------------: | :----: | :----: | :----: | :------: |
| NestMiningV1 |          biteEth           | 269192 | 275111 | 272226 |    5     |
| NestMiningV1 |         biteToken          | 207977 | 290167 | 271324 |    24    |
| NestMiningV1 |           close            | 54746  | 247116 | 153001 |    23    |
| NestMiningV1 |      closeAndWithdraw      | 126268 | 362693 | 174688 |    15    |
| NestMiningV1 |         closeList          | 173059 | 411183 | 284428 |    7     |
| NestMiningV1 |         incVersion         |   -    |   -    | 28043  |    1     |
| NestMiningV1 |         initialize         |   -    |   -    | 491398 |    14    |
| NestMiningV1 |       loadContracts        |   -    |   -    | 166586 |    28    |
| NestMiningV1 |       loadGovernance       |   -    |   -    | 30983  |    1     |
| NestMiningV1 |            post            | 257355 | 565314 | 360934 |    62    |
| NestMiningV1 |           post2            | 382716 | 817627 | 524588 |    64    |
| NestMiningV1 |         setParams          |   -    |   -    | 45452  |    2     |
| NestMiningV1 |           setup            |   -    |   -    | 85667  |    28    |
| NestMiningV1 |            stat            | 67895  | 141476 | 104686 |    2     |
| NestMiningV1 |          upgrade           |   -    |   -    | 28814  |    1     |
| NestMiningV1 |        withdrawEth         |   -    |   -    | 43265  |    1     |
| NestMiningV1 |    withdrawEthAndToken     |   -    |   -    | 67004  |    1     |
| NestMiningV1 | withdrawEthAndTokenAndNest |   -    |   -    | 107000 |    1     |
| NestMiningV1 |        withdrawNest        |   -    |   -    | 65523  |    1     |


#### NestNToken 合约

|  Contract  |    Method    |  Min  |  Max  |  Avg  | \# calls |
| :--------: | :----------: | :---: | :---: | :---: | :------: |
| NestNToken |   approve    | 43997 | 44021 | 44015 |    30    |
| NestNToken | setOfferMain |   -   |   -   | 42616 |    10     |
| NestNToken |   transfer   | 50965 | 50977 | 50971 |    14    |

#### NestPool 合约

| Contract |       Method        |  Min  |  Max   |  Avg   | \# calls |
| :------: | :-----------------: | :---: | :----: | :----: | :------: |
| NestPool |       addNest       | 43255 | 73255  | 52255  |    5     |
| NestPool |      addNToken      |   -   |   -    | 44336  |    1     |
| NestPool |     depositEth      | 29470 | 44470  | 36970  |    2     |
| NestPool |    depositNToken    |   -   |   -    | 149084 |    1     |
| NestPool |      freezeEth      | 34835 | 49835  | 42335  |    2     |
| NestPool |  freezeEthAndToken  |   -   |   -    | 71796  |    1     |
| NestPool |     freezeNest      |   -   |   -    | 83007  |    1     |
| NestPool |     freezeToken     | 50504 | 85396  | 73761  |    3     |
| NestPool |   initNestLedger    | 46779 | 46803  | 46791  |    11    |
| NestPool |    setContracts     | 42985 | 192397 | 168798 |    38    |
| NestPool |    setGovernance    | 33498 | 41898  | 39798  |    8     |
| NestPool |  setNTokenToToken   | 27212 | 65612  | 63824  |    43    |
| NestPool | transferEthInPool   |   -   |   -    | 50369  |    1     |
| NestPool | transferNestInPool  |   -   |   -    | 51357  |    1     |
| NestPool | transferTokenInPool |   -   |   -    | 51009  |    1     |
| NestPool |    unfreezeEth      |   -   |   -    | 34849  |    1     |
| NestPool | unfreezeEthAndToken |   -   |   -    | 47785  |    1     |
| NestPool |    unfreezeNest     |   -   |   -    | 35818  |    1     |
| NestPool |    unfreezeToken    | 20581 | 35557  | 30561  |    3     |
| NestPool |     withdrawEth     |   -   |   -    | 36713  |    1     |
| NestPool |    withdrawNest     |   -   |   -    | 59024  |    1     |
| NestPool |    withdrawToken    |   -   |   -    | 23078  |    1     |


#### NestQuery  合约

| Contract  |         Method         |  Min   |  Max   |  Avg   | \# calls |
| :-------: | :--------------------: | :----: | :----: | :----: | :------: |
| NestQuery |        activate        | 68194  | 173443 | 85736  |    6     |
| NestQuery |       deactivate       |   -    |   -    | 17918  |    5     |
| NestQuery |       initialize       | 105264 | 105276 | 105232 |    32    |
| NestQuery |     loadContracts      | 48671  | 121271 | 116431 |    30    |
| NestQuery |         pause          |   -    |   -    | 30145  |    1     |
| NestQuery |         query          |   -    |   -    | 82140  |    2     |
| NestQuery |   queryPriceAvgVola    |   -    |   -    | 77698  |    2     |
| NestQuery |     queryPriceList     |   -    |   -    | 71777  |    2     |
| NestQuery |         remove         |   -    |   -    | 25356  |    1     |
| NestQuery |         resume         |   -    |   -    | 30137  |    1     |
| NestQuery |       setParams        | 27125  | 31335  | 29230  |    2     |
| NestQuery | updateAndCheckPriceNow |   -    |   -    | 67698  |    1     |


####  NestStaking 合约

|  Contract   |       Method        |  Min   |  Max   |  Avg   | \# calls |
| :---------: | :-----------------: | :----: | :----: | :----: | :------: |
| NestStaking |    addETHReward     | 27757  | 42757  | 32757  |    3     |
| NestStaking |        claim        | 51965  | 84730  | 69698  |    8     |
| NestStaking |     initialize      | 85044  | 85068  | 85065  |    11    |
| NestStaking |    loadContracts    |   -    |   -    | 47443  |    20    |
| NestStaking |   loadGovernance    |   -    |   -    | 30747  |    1     |
| NestStaking |        pause        |   -    |   -    | 29312  |    1     |
| NestStaking |       resume        |   -    |   -    | 29238  |    1     |
| NestStaking |      setParams      |   -    |   -    | 28228  |    1     |
| NestStaking |        stake        | 91564  | 182392 | 122839 |    4     |
| NestStaking |  stakeFromNestPool  | 104726 | 115183 | 109955 |    2     |
| NestStaking |       unstake       | 105724 | 105736 | 105730 |    2     |


####  NestVote 合约

|   Contract   |     Method     |  Min   |   Max   |  Avg   | \# calls |
| :----------: | :------------: | :---:  |  :---:  | :----: | :------: |
|   NestVote   |    execute     | 126397 |  152889 | 136742 |    4     |
|   NestVote   | loadContracts  | 37441  |  95041  | 56641  |    3     |
|   NestVote   | loadGovernance |   -    |    -    | 30916  |    2     |
|   NestVote   |    propose     | 222606 |  366042 | 283870 |    4     |
|   NestVote   | releaseGovTo   |   -    |    -    | 28505  |    1     |
|   NestVote   |     revoke     |   -    |    -    | 85487  |    1     |
|   NestVote   |    setParam    | 30385  |  30523  | 30457  |    4     |
|   NestVote   |     unvote     |   -    |    -    | 86082  |    1     |
|   NestVote   |      vote      | 124476 |  139476 | 134012 |    4     |
|   NestVote   |    withdraw    |   -    |    -    | 79928  |    1     |


####  NNRewardPool 合约

|   Contract   |     Method     |  Min  |  Max  |  Avg   | \# calls |
| :----------: | :------------: | :---: | :---: | :----: | :------: |
| NNRewardPool |  addNNReward   | 29700 | 44700 | 33450  |    4     |
| NNRewardPool | claimNNReward  |   -   |   -   | 226039 |    1     |
| NNRewardPool | loadContracts  | 42767 | 122415| 76227  |    31    |
| NNRewardPool | loadGovernance | 30747 | 33473 | 32110  |    2     |
| NNRewardPool |     pause      |   -   |   -   | 30074  |    1     |
| NNRewardPool |     resume     |   -   |   -   | 30076  |    1     |
| NNRewardPool |     start      |   -   |   -   | 43786  |    8     |


#### NNToken 合约

| Contract |    Method    |  Min  |  Max   |  Avg  | \# calls |
| :------: | :----------: | :---: | :----: | :---: | :------: |
| NNToken  |   approve    | 43915 | 43927  | 43920 |    20    |
| NNToken  | setContracts |   -   |   -    | 42528 |    6     |
| NNToken  |   transfer   | 53425 | 169069 | 82950 |    14    |


#### NTokenController 合约

|     Contract     |    Method      |  Min   |  Max   |  Avg   | \# calls |
| :--------------: | :-----------:  | :----: | :----: | :----: | :------: |
| NTokenController |    disable     |   -    |   -    | 44693  |    2     |
| NTokenController |    enable      |   -    |   -    | 14819  |    1     |
| NTokenController | loadContracts  |   -    |   -    | 47552  |    20    |
| NTokenController | loadGovernance |   -    |   -    | 30895  |    1     |
| NTokenController |     open       | 974856 | 974878 | 974862 |    4     |
| NTokenController |     pause      |   -    |   -    | 30200  |    1     |
| NTokenController |     resume     |   -    |   -    | 30138  |    1     |
| NTokenController |     setParams  |   -    |   -    | 29887  |    1     |
| NTokenController |     start      |   -    |   -    | 45480  |    2     |


### 合约部署时消耗 gas 情况

|   Deployments    |   Min   |   Max   |   Avg   | % of limit |
| :--------------: | :-----: | :-----: | :-----: | :--------: |
|   MiningV1Calc   |    -    |    -    | 2607011 |   27.4 %   |
|    MiningV1Op    |    -    |    -    | 2945185 |   31 %     |
|     NestDAO      |    -    |    -    | 2234854 |   23.5 %   |
|   NestMiningV1   | 4917291 | 4917435 | 4917433 |   51.8 %   |
|    NestNToken    |    -    |    -    | 797297  |   8.4 %    |
|     NestPool     |    -    |    -    | 2973099 |   31.3 %   |
|    NestQuery     |    -    |    -    | 2092294 |   22 %     |
|   NestStaking    |    -    |    -    | 1892972 |   19.9 %   |
|   NNRewardPool   | 1233206 | 1233218 | 1233217 |    13 %    |
|     NNToken      |    -    |    -    | 702452  |   7.4 %    |
|     NToken       |    -    |    -    | 895239  |   9.4 %    |
| NTokenController |    -    |    -    | 2371744 |   25 %     |