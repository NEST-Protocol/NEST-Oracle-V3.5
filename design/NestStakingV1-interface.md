NestStaking 模块接口函数

### totalStaked()
功能: 查询指定 ntoken 地址下资金的余额

调用时能否携带资金: 否

函数: totalStaked(ntoken)
     + ntoken 地址

权限: 
1. 任何人均可调用

参数要求:
1. 无

返回值:
1. 返回指定 ntoken 地址下资金的余额



### stakedBalanceOf()
功能: 返回指定用户地址下的资金总额

调用时能否携带资金: 否

函数: stakedBalanceOf(ntoken, account)
    + ntoken 给定地址,一般是某种代币地址
    + account 给定地址,一般是某个用户地址

权限: 
1. 任何人均可调用

参数要求:
1. 无要求

返回值:
1. 返回指定用户地址下的资金总额



### earned()
功能: 查询用户收益

调用时能否携带资金: 否

函数: earned(ntoken, account)
     + ntoken 给定地址,一般是某种代币地址
     + account 给定地址,一般是某个用户地址

权限:
1. 任何人都可以调用

参数要求:
1. 无

返回值:
1. 返回用户收益



### stake()
功能: 向 nestStaking 合约存入指定数量的 NToken

调用时能否携带资金: 否

函数: stake(ntoken, amount)
     + ntoken 指定 ntoken 地址
     + amount 存入资金数量

权限:
1. 必须要在奖励更新完成后才可以调用

参数要求:
1. 当输入的数量为负数时,会返回错误: "Nest:Stake:!amount"

返回值:
1. 无



### unstake()
功能: 取出合约中的指定数量的资金

调用时能否携带资金: 否

函数: unstake(ntoken, amount)
    + ntoken 指定 ntoken 地址e
    + amount 存入资金数量

权限:
1. 必须要在奖励更新完成后才可以调用

参数要求:
1. 当输入的数量为负数时,会返回错误: "Nest:Stake:!amount"

返回值:
1. 无



### claim() 
功能: 提取用户地址下的所有奖励

调用时能否携带资金: 否

函数: claim(ntoken)
     + ntoken 地址,一般是某种代币的地址

权限:
1. 必须在奖励更新后才可以调用函数

参数要求:
1. 无

返回值:
1. 无