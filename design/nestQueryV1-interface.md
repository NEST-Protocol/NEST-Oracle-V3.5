NestQuery 模块接口函数

### activate()
功能: 激活查询功能,需要支付一定数量的 NEST

调用时是否需要携带资金: 否

函数: activate(address) 
     + address 查询者提供的 defi 地址

权限:
1. 禁止合约调用
2. 当管理者允许打开客户端激活功能时才可调用

参数要求:
1. 无参数要求

返回值:
1. 无返回值


### deactivate()
功能: 关闭价格查询功能

调用时是否需要携带资金: 否

函数: deactivate(address)
     + address 查询者提供的 defi 地址

权限:
1. 当管理者允许打开客户端激活功能时才可调用

参数要求:
1. 无

返回值:
1. 无


### query()
功能: 提供价格查询功能,查询最新确定价格的区块的报价表信息

调用时是否需要携带资金: 是

函数: query(token, payback)
     + token 需要查询的那种代币 token 的地址
     + payback 发送金额扣除 ethFee (手续费)后多余资金退回的地址

权限:
1. 当价格查询功能开启时才可以调用

参数要求:
1. 无

返回值:
1. 返回三个参数: 表单剩余 ethNum 总量；剩余 token 总量；表单所在区块高度



### queryAvgAndVola()
功能: 查询最新波动率,平均价格等相关信息

调用时是否需要携带资金: 是

函数: queryAvgAndVola(token, payback)
     + token 提供 token 地址,用于定位报价表
     + payback 发送金额扣除 ethFee (手续费)后多余资金退回的地址

权限:
1. 当价格查询功能开启时才可以调用

参数要求:
1. 无

返回值:
1. 返回五个值: 表单剩余 ethNum 总量；剩余 token 总量; 平均价格；波动率；所在区块高度


### updateAndCheckPriceNow()
功能: 查询当前价格

调用时是否需要携带资金: 是

函数: updateAndCheckPriceNow(tokenAddress) 
     + tokenAddress 想要查询的 token 地址

权限:
1. 当价格查询功能开启时才可以调用

参数要求:
1. 无

返回值:
1. 返回三个参数:表单剩余 ethNum 总量；剩余 token 总量；表单所在区块高度
