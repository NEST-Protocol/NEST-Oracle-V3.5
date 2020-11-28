# NestStaking boundary conditions

## 本文档主要考虑外部输入为极端情况下的 NestStaking 合约运行情况

### stake()
功能: 向 nestStaking 合约存入指定数量的 NToken

函数: stake(ntoken, amount)
     + ntoken 指定 ntoken 地址
     + amount 存入资金数量

能否携带资金: 否

边界条件:
1. ntoken 地址由调用者提供,只要合法即可,否则会报错

2. amount 数量必须大于 0, 且为整数,否则会报错 "Nest:Stak:!amount"(零) 或者 "underflow"(小数) 或 "value out-of-bounds"(负数)
   注：这里的整数指的是 nest 的 decimal 的整数倍，以 10 的 18 次方为准，即 0.5 Nest 也是允许的


### unstake()
功能: 向 nestStaking 合约存入指定数量的 NToken

函数: unstake(ntoken, amount)
     + ntoken 指定 ntoken 地址
     + amount 存入资金数量

能否携带资金: 否

边界条件:
1. ntoken 地址由调用者提供,只要合法即可,否则会报错

2. amount 数量必须大于 0, 且为整数,否则会报错 "Nest:Stak:!amount"


### claim() 
功能: 提取用户地址下的所有奖励

函数: claim(ntoken)
     + ntoken 地址,一般是某种代币的地址

调用时能否携带资金: 否

边界条件:
1. 无任何要求,如果地址不对,只是无法提取资金