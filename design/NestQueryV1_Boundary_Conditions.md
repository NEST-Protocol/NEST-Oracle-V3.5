# NestQueryV1 boundary conditions

## 本文档主要考虑外部输入为极端情况下的 NestQuery 合约运行情况

### activate()
功能: 激活查询功能,需要支付一定数量的 NEST

函数: activate(address) 
     + address 查询者提供的 defi 地址

能否携带资金: 否

边界条件:
1. 当 defi 地址为 0 时,会默认将调用此函数的地址(msg.sender)设置为 defi 地址

2. 地址由十六进制数字组成,且不能为小数,否则会报错


### deactivate()
功能: 关闭价格查询功能

函数: deactivate(address)
     + address 查询者提供的 defi 地址

能否携带资金: 否

边界条件:
1. 当 defi 地址为 0 时,会默认将调用此函数的地址(msg.sender)设置为 defi 地址

2. 地址由十六进制数字组成,且不能为小数,否则会报错

### remove()
功能: 关闭查询功能

函数: deactivate(address)
     + address 查询者提供的 defi 地址

能否携带资金: 否

边界条件:
1. 当 defi 地址为 0 时,会默认将调用此函数的地址(msg.sender)设置为 defi 地址

2. 地址由十六进制数字组成,且不能为小数,否则会报错


### query()
功能: 提供价格查询功能,查询最新确定价格的区块的报价表信息

函数: query(token, payback)
     + token 需要查询的那种代币 token 的地址
     + payback 发送金额扣除 ethFee (手续费)后多余资金退回的地址

能否携带资金: 能

边界条件:
1. token 填写任意值均可,因为不存在的地址将会报错: "Nest:Qury:=!(client.typ)"

2. 由于此函数可以携带资金,如果携带的资金小于需要缴纳的查询费,则合约部署失败,状态回滚

3. 涉及到的数值均需为正整数,否则会报错


### queryAvgAndVola()
功能: 查询最新波动率,平均价格等相关信息

函数: queryAvgAndVola(token, payback)
     + token 提供 token 地址,用于定位报价表
     + payback 发送金额扣除 ethFee (手续费)后多余资金退回的地址

能否携带资金: 能

边界条件:
1. token 地址可以填写任意规范的地址,如果不存在就会返回 0

2. 由于此函数可以携带资金,如果携带的资金小于需要缴纳的查询费,则合约部署失败,状态回滚

3. 涉及到的数值均需为正整数,否则会报错



### updateAndCheckPriceNow()
功能: 查询当前价格

函数: updateAndCheckPriceNow(tokenAddress) 
     + tokenAddress 想要查询的 token 地址

能否携带资金: 能

边界条件:
1. tokenAddress 填写任意值均可,因为不存在的地址将会报错: "Nest:Qury:=!(client.typ)"

2. 由于此函数可以携带资金,如果携带的资金小于需要缴纳的查询费,则合约部署失败,状态回滚

3. 涉及到的数值均需为正整数,否则会报错