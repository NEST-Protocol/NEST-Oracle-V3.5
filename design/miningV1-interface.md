# NestMining 报价挖矿合约

## 提供调用接口函数

### post()
功能： 提交　ETH-TOKEN　报价单

调用时能否携带资金: 能

函数： post(token, ethNum, tokenAmountPerEth)
      + token 报价者提供的地址，只要合法即可，不需要是竞拍者当前交易地址
      + ethNum 报价者提供的 eth 数量
      + tokenAmountPerEth 报价者所报价格，即多少 token 可以兑换 1 ETH

权限：
1. 禁止合约调用 noContract

参数要求：
1. token 不能是零地址
2. ethNum 必须能被 miningEthUnit 整除且 ethNum 不能为 0 ,目前来说,ethNum 必须为 10 的倍数
3. tokenAmountPerEth 必须大于 0

参数边界条件：
1. token 应该为正常的代币地址，否则无法映射到正确的 ntoken 地址,会报错："Nest:Mine:!(ntoken)"
2. ethNum 数量必须大于 0，并且为 miningEthUnit （目前为 10）的整数倍，否则会报错："Nest:Mine:!(ethNum)"
3. tokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 tokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:!(price)"

返回值:
1. 无返回值


### post2()
功能： 同时提交两个报价单,这两个报价单可以是 ETH - token 

调用时能否携带资金: 能

函数： post(token, ethNum, tokenAmountPerEth, ntokenAmountPerEth)
      + token 报价者提供的地址，只要合法即可，不需要是竞拍者当前交易地址
      + ethNum 报价者提供的 eth 数量
      + tokenAmountPerEth 报价者所报价格，即多少 token 可以兑换 1 ETH
      + ntokenAmountPerEth 报价者所报价格，即多少 ntoken 可以兑换 1 ETH

权限：
1. 禁止合约调用 noContract

参数要求：
1. token 地址不能是零
2. ethNum 必须能被 miningEthUnit 整除且 ethNum 不能为 0，目前来说,ethNum 必须为 10 的倍数
3. tokenAmountPerEth 必须大于0
3. ntokenAmountPerEth 必须大于0

参数边界条件：
1. token 应该为正常的代币地址，否则无法映射到正确的 ntoken 地址,会报错："Nest:Mine:!(ntoken)"
2. ethNum 数量必须大于 0，并且为 miningEthUnit （目前为 10）的整数倍，否则会报错："Nest:Mine:!(ethNum)"
3. tokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 tokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:!(price)"
4. ntokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 ntokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:!(price)"

返回值:
1. 无返回值


### close()
功能: 报价者关闭符合条件的任一自己的报价表,解冻自己的资金

调用时能否携带资金: 否

函数: close(token, index)
     + token 报价者提供的地址
     + index 报价表所在位置索引

权限：
1. 禁止合约调用 noContract

参数要求:
1. 报价表必须在价格稳定,无法被吃单后才可以关闭
2. 必须是报价表本人操作

参数边界条件：
1. token 应该为正常的代币地址，否则无法查询到对应表单
2. index 索引值如果提供的是不存在的值，如 -1，则会报错 "Nest:Mine:>(len)"
         如果提供索引对应的表单拥有者非关闭者的地址，则会报错："Nest:Mine:!(miner)"

返回值:
1. 无返回值


### closeList()
功能: 可以选择一次关闭同一个 token 地址下的指定 index 的多个报价表,可以节省 gas 消耗

调用时能否携带资金: 否

函数: closeList(token, indices)
     + token 报价者提供的地址
     + indices 报价者想要关闭的 index 数组,数组中的元素值代表想要关闭报价表的 index 索引

权限: 
1. 禁止合约调用 noContract

参数要求:
1. 报价表必须在价格稳定,无法被吃单后才可以关闭
2. 必须是报价表本人操作

参数边界条件：
1. token 应该为正常的代币地址，否则无法查询到对应表单
2. indices 索引值数组，如果提供的索引对应的报价表的拥有者并非执行此函数的人，或者报价表价格还未确定，则不会对该报价表做出处理，直接忽略此报价表

返回值:
1. 无返回值


### biteToken()
功能: 吃单者进行吃单操作，提供 ethNum 兑换 token 

调用时能否携带资金: 能

函数: biteToken(token, index, biteNum, newTokenAmountPerEth)
     + token 吃单者提供报价者的地址
     + index 吃单者提供报价者的索引
     + biteNum 吃单者吃单的 ETH 数量
     + newTokenAmountPerEth 吃单者新报价格，即 1 ETH 可以兑换多少 token

权限: 
1. 禁止合约调用 noContract

参数要求:
1. token 地址不能为 0
2. 新报价格 newTokenAmountPerEth 大于 0 
3. biteNum 必须能被 miningEthUnit (目前为 10) 整除
4. 被吃报价表价格必须确定（最新 25 个区块高度内）

参数边界条件：
1. token 应该为正常的代币地址，当 token 地址为 0 时，会报错："Nest:Mine:(token)=0"，当 token 地址对应的报价表不存在时，会报错："Nest:Mine:!(remain)" 或者 "Nest:Mine:!EFF(sheet)"
2. index 索引值如果提供的是不存在的值，如 -1，则会报错 "Nest:Mine:>(len)"
3. biteNum 吃单者想要吃单的 ETH　数量，必须为 miningEthUnit 的整数倍(0 除外),否则报错: "Nest:Mine:!(bite)"
           如果 biteNum 的数量大于报价单中剩余资金数量,则会报错:"Nest:Mine:!(remain)"
4. newTokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 ntokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:(price)=0"

返回值:
1. 无返回值


### biteEth()
功能: 吃单者进行吃单操作，提供 token 兑换 ethNum

调用时能否携带资金: 能

函数: biteEth(token, index, biteNum,  newTokenAmountPerEth)
     + token 吃单者提供报价者的地址
     + index 吃单者提供报价者的索引
     + biteNum 吃单者吃单的 token 数量
     + newTokenAmountPerEth 吃单者新报价格，即 1 ETH 可以兑换多少 token

权限: 
1. 禁止合约调用 noContract

参数要求:
1. token 地址不能为 0
2. 新报价格 newTokenAmountPerEth 大于 0 
3. biteNum 必须能被 miningEthUnit (目前为 10)整除


参数边界条件：
1. token 应该为正常的代币地址，当 token 地址为 0 时，会报错："Nest:Mine:(token)=0"，当 token 地址对应的报价表不存在时，会报错："Nest:Mine:!(remain)" 或者 "Nest:Mine:!EFF(sheet)"
2. index 索引值如果提供的是不存在的值，如 -1，则会报错 "Nest:Mine:>(len)"
3. biteNum 吃单者想要吃单的 ETH　数量，必须为 miningEthUnit 的整数倍(0 除外),否则报错: "Nest:Mine:!(bite)"
           如果 biteNum 的数量大于报价单中剩余资金数量,则会报错:"Nest:Mine:!(remain)"
4. newTokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 ntokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:(price)=0"

返回值:
1. 无返回值



============================价格查询部分===================================

### latestPriceOf()
功能：查询最近的一个稳定价格的区块中所有报价表的信息，包括：该区块中所有表单剩余 ethNum 总量；该区块中所有表单剩余 token 总量；表单所在区块高度

调用时能否携带资金: 否

函数：latestPriceOf( token)
     + token 查询者提供的 token 地址

参数说明: 
1. 无任何限制,不存在的地址就会返回 (0，0，0)

权限: 
1. 禁止合约调用 noContract

返回值:
1. returns(ethAmount, tokenAmount, blockNum) 
         + ethAmount 该区块中所有表单剩余 ethNum 总量
         + tokenAmount 该区块中所有表单剩余 token 总量
         + blockNum 表单所在区块高度
     

### priceOf()
功能：查询最近的一个稳定价格的区块中所有报价表的信息，包括：表单剩余 ethNum 总量；剩余 token 总量；表单所在区块高度

调用时能否携带资金: 否

函数：priceOf( token)
     + token 查询者提供的 token 地址

权限：
1. 仅允许 governance 和 C_NestQuery 调用本合约

参数说明: 
1. 当 token 地址对应的结构体 priceInfo 的 height 参数值为 0 时,报错: "Nest:Mine:NO(price)"     

返回值:
1. returns(ethAmount, tokenAmount, blockNum)
         + ethAmount 该区块中所有表单剩余 ethNum 总量
         + tokenAmount 该区块中所有表单剩余 token 总量
         + blockNum 表单所在区块高度


### priceAvgAndSigmaOf()
功能：返回四个参数，分别为：最近稳定价格区块高度 token 兑换比率（多少 token 兑换 1 ETH）;平均价格；波动率；所在区块高度

调用时能否携带资金: 否

函数：priceAvgAndSigmaOf( token)
     + token 查询者提供的 token 地址

参数说明: 
1. 当 token 地址对应的结构体 priceInfo 的 height 参数值为 0 时,报错: "Nest:Mine:NO(price)"

权限：
1. 仅允许 governance 和 C_NestQuery 调用本合约

返回值:
1. 返回四个参数依次为: 
           + 最近稳定价格区块高度 token 兑换比率（多少 token 兑换 1 ETH）
           + 平均价格
           + 波动率
           + 所在区块高度
   

### priceOfTokenAtHeight()
功能：返回指定区块高度前稳定价格的区块中所有报价表的信息，包括：表单剩余 ethNum 总量；剩余 token 总量；表单所在区块高度

调用时能否携带资金: 否

函数：priceOfTokenAtHeight( token, atHeight)
     + token 查询者提供的 token 地址
     + atHeight 查询者提供的指定区块高度

权限：
1. 任何人/合约均可调用

参数说明: 
1. token 无任何限制,不存在的地址就会返回 (0，0，0)
2. atHeight 可以为任何值,不会报错

返回值:
 1. returns(ethAmount, tokenAmount, height) 
          + ethAmount 该区块中所有表单剩余 ethNum 总量
          + tokenAmount 该区块中所有表单剩余 token 总量
          + height 表单所在区块高度


### priceListOfToken()
功能：从最新的价格稳定的区块高度开始，向区块高度减小的方向读取指定 num 个区块（这些区块中必须含有报价表，否则不计算）的数据，同时返回最新的价格稳定的区块高度

调用时能否携带资金: 否

函数：priceListOfToken(token, num)
     + token 查询者提供的 token 地址
     + num 查询者指定查询几个区块（这些区块中必须包含报价表）

参数说明: 
1. token 无任何限制,不存在的地址就会返回 (0，0，0)
2. num 可以为任何值,不会报错,num 取的太大,后面的数组元素内容就是 0

权限：
1. 任何人/合约均可调用读取，但不可修改

返回值:
1. returns (data, atHeight)
          + data 为数组,数组大小 num x 3,数组中依次保存的是 ( 区块高度1, ethNumAmount1, tokenAmount1,区块高度2, ethNumAmount2,...)
          + atHeight 保存最新的价格稳定的区块高度


### latestMinedHeight()
功能: 返回最新的报价表所在的区块高度

调用时能否携带资金: 否

函数: latestMinedHeight()

参数说明: 无参数

权限: 只读 view

返回值: 返回最新的报价表所在的区块高度


### withdrawEthAndToken()
功能: 将 nestpool 地址下属于调用者的 ETH 和 Token 发送到外部调用者的地址下

调用时能否携带资金: 否

函数: withdrawEthAndToken(ethAmount, token, tokenAmount)
     + ethAmount 需要提取的 eth 数量
     + token 调用函数者提供的地址
     + tokenAmount 需要提取的 token 数量

参数说明:
1. 如果提取的资金数量大于 nestpool 合约中调用者拥有的资金数量,那么调用行为无效,资金不会发生转移

权限: 
1. 不允许合约调用 noContract

返回值:
1. 无返回值


### lengthOfPriceSheets()
功能: 返回给定 token 地址下所包含的报价单的个数(长度)

调用时能否携带资金: 否

函数: lengthOfPriceSheets(token)
     + token 给定 token 地址

参数说明:
1. 参数无要求

权限:
1. 只读 view

返回值:
1. 返回给定 token 地址下所包含的报价单的个数(长度)


### priceSheet()
功能: 返回指定报价表的部分信息

调用时能否携带资金: 否

函数: priceSheet(token, index)
     + token 给定 token 地址
     + index 给定 索引

参数说明:
1. 参数无要求,如果查询的表单不存在,会默认返回 0

权限:
1. 只读 view

返回值:
1. 返回报价表的部分信息,包括: 报价表所有者地址;报价表所在区块高度;报价表初始提供的 eth 数量;报价代币 token 类型;
                            报价表当前状态;报价表当前剩余 ethNum 数量;报价表当前剩余 ethNum 数量;


### fullPriceSheet()
功能: 返回完整报价表的部分信息

调用时能否携带资金: 否

函数: priceSheet(token, index)
     + token 给定 token 地址
     + index 给定索引

参数说明:
1. 参数无要求,如果查询的表单不存在,则会报错: "Nest:Mine:>(len)"

权限:
1. 不允许合约调用

返回值:
1. 返回报价表的完整信息


### unVerifiedSheetList()
功能: 从最新包含报价表的区块开始,向区块高度减小的方向查找价格还未确定的报价单,并记录

调用时能否携带资金: 否

函数: unVerifiedSheetList(token)
     + token 给定 token 地址


参数说明:
1. 参数无要求,如果查询的表单不存在,则返回空表

权限:
1. 不允许合约调用

返回值:
1. 返回该 token 下所有未确定价格的报价表(也就是最新 25 个区块内包含的报价表)


### unClosedSheetListOf()
功能: 读取指定索引前,属于指定用户地址的,指定数量的,状态为 post(提交) 或者 bitting(吃单)的报价单,并不意味着还可以被吃单

调用时能否携带资金: 否

函数: unClosedSheetListOf(miner, token, fromIndex, num) 
     + miner 给定 miner 地址,可以查询别人的地址
     + token 给定 token 地址,用户存放 token 的地址
     + fromIndex 整数,查询的表单索引要小于该值
     + num 保存的最多表单数量


参数说明:
1. 参数无要求,如果查询的表单不存在,则返回空表
2. 如果 fromIndex 的值小于 num 的值,则最多返回 fromIndex 个表单数据,不符合条件的部分以 0 填充

权限:
1. 不允许合约调用

返回值:
1. 返回符合条件的所有报价单数组


### sheetListOf()
功能: 读取指定索引前,属于指定用户地址的,指定数量的,所有报价单(向区块高度减小方向读取)

调用时能否携带资金: 否

函数: sheetListOf(miner, token, fromIndex, num) 
     + miner 给定 miner 地址,可以查询别人的地址
     + token 给定 token 地址,用户存放 token 的地址
     + fromIndex 整数,查询的表单索引要小于该值
     + num 整数,想要最多查询几个指定用户地址的表单


参数说明:
1. 参数无要求,如果查询的表单不存在,则返回空表
2. 如果 fromIndex 的值小于 num 的值,则最多返回 fromIndex 个表单,不符合条件的以 0 填充

权限:
1. 不允许合约调用

返回值:
1. 返回符合条件的所有报价单数组


### stat()
功能: 生成最新的 priceInfo 表,更新波动率等信息

调用时能否携带资金: 否

函数: stat(token) 
     + token 查询者指定的地址


参数说明:
1. 无参数输入要求

权限:
1. 均可调用

返回值:
1. 无返回值