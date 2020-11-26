# NestMiningV1 boundary conditions

## 本文档主要考虑外部输入为极端情况下的  NestMining 合约运行情况

### post()
功能： 提交　ETH-TOKEN　报价单

函数： post(token, ethNum, tokenAmountPerEth)
      + token 报价者提供的地址，只要合法即可，不需要是竞拍者当前交易地址
      + ethNum 报价者提供的 eth 数量
      + tokenAmountPerEth 报价者所报价格，即多少 token 可以兑换 1 ETH

能否携带资金: 能

边界条件:
1. 当 token 为 0 时,为非法的 token 地址,无法正常映射到合法的 ntoken 地址,输入将会报错,合约终止

2. 当 ethNum 为 0 时,不满足条件: 最小报价单元(目前为 10)的正整数倍(0 除外),此时将会报错: "Nest:Mine:!(ethNum)",合约中止

3. 由于 ethNum 为 256 位无符号整数,当 ethNum 为负数时同样不满足条件:最小报价单元(目前为 10)的正整数倍(0 除外),将会报错,合约终止

4. 由于 ethNum 为 256 位无符号整数,考虑上溢情况需要花费巨额资金(2 的 256 次方个 eth),一般不现实,这种情况不做考虑

5. tokenAmountPerEth 为报价者的所报价格,当报价为小于等于 0 的数时,合约报错: "Nest:Mine:!(price)",合约终止

6. 由于本函数可以接受外部转账,还存在资金设置问题. 每次报价必须同时携带足够的 eth, 当携带的 eth 数量不足以支付 ethFee 时,交易将会终止,状态回滚.

7. 调用本函数需要冻结一部分资金,当 nestPool 合约中报价者相应地址的资金不够时,将会从报价者外部地址转账,并同时将 NestPool 合约相应账户余额设置为 0, 如果外部账户的
   余额也不足以支付缺少的金额,将会报错, 同时状态回滚

8. 所有涉及到的数值都应为整数. 如果为小数,将直接报错,合约终止


### post2()
功能： 提交两个报价单： ETH-USD、ETH-NEST

函数： post(token, ethNum, tokenAmountPerEth, ntokenAmountPerEth)
      + token 报价者提供的地址，只要合法即可，不需要是竞拍者当前交易地址
      + ethNum 报价者提供的 eth 数量
      + tokenAmountPerEth 报价者所报价格，即多少 USD 可以兑换 1 ETH
      + ntokenAmountPerEth 报价者所报价格，即多少 NEST 可以兑换 1 ETH

能否携带资金: 能

边界条件:
1. 当 token 为 0 时,为非法的 token 地址,无法正常映射到合法的 ntoken 地址,输入将会报错,合约终止

2. 当 ethNum 为 0 时,不满足条件: 最小报价单元(目前为 10)的正整数倍(0 除外),此时将会报错: "Nest:Mine:!(ethNum)",合约中止

3. 由于 ethNum 为 256 位无符号整数,当 ethNum 为负数时同样不满足条件:最小报价单元(目前为 10)的正整数倍(0 除外),将会报错,合约终止

4. 由于 ethNum 为 256 位无符号整数,考虑上溢情况需要花费巨额资金(2 的 256 次方个 eth),一般不现实,这种情况不做考虑

5. tokenAmountPerEth 及 ntokenAmountPerEth 为报价者的所报价格,当报价为小于等于 0 的数时,合约报错: "Nest:Mine:!(price)",合约终止

6. 由于本函数可以接受外部转账,还存在资金设置问题. 每次报价必须同时携带足够的 eth, 当携带的 eth 数量不足以支付 ethFee 时,交易将会终止,状态回滚.

7. 调用本函数需要冻结一部分资金,当 nestPool 合约中报价者相应地址的资金不够时,将会从报价者外部地址转账,并同时将 NestPool 合约相应账户余额设置为 0, 如果外部账户的
   余额也不足以支付缺少的金额,将会报错. 同时状态回滚

8. 所有涉及到的数值都应为整数. 如果为小数,将直接报错,合约终止,状态回滚


### close()
功能: 报价者关闭符合条件的任一自己的报价表,解冻自己的资金

函数: close(token, index)
     + token 报价者提供的地址
     + index 报价表所在位置索引

能否携带资金: 否

边界条件:
1. 当 token 为 0 时,为非法的 token 地址,无法正常映射到合法的 ntoken 地址,输入将会报错,合约终止

2. token 地址应该为报价者 post() 或者 post2() 时所提供的 token 地址,否则将会因为调用者和报价单所有者不同而报错

3. index 为报价表所在位置索引,索引值如果提供的是不存在的值，如 -1，则会报错 "Nest:Mine:>(len)"
         如果提供索引对应的表单拥有者非关闭者的地址，则会报错："Nest:Mine:!(miner)"

4. 所有涉及到的数值都应为整数. 如果为小数,将直接报错,合约终止,状态回滚


### closeList()
功能: 可以选择一次关闭同一个 token 地址下的指定 index 的多个报价表,可以节省 gas 消耗

函数: closeList(token, indices)
     + token 报价者提供的地址
     + indices 报价者想要关闭的 index 数组,数组中的元素代表想要关闭报价表的 index 索引

能否携带资金: 否

边界条件：
1. token 地址应该为报价者 post() 或者 post2() 时所提供的 token 地址,否则将会因为调用者和报价单所有者不同而报错

2. indices 索引值数组，如果提供的索引对应的报价表的拥有者并非执行此函数的人，或者报价表价格还未确定，则不会对该报价表做出处理，直接忽略此报价表

3. 所有涉及到的数值都应为整数. 如果为小数,将直接报错,合约终止,状态回滚


### biteToken()
功能: 吃单者进行吃单操作，提供 ethNum 兑换 token 

函数: biteToken(token, index, biteNum, newTokenAmountPerEth)
     + token 吃单者提供报价者的地址
     + index 吃单者提供报价者的索引
     + biteNum 吃单者吃单的 ETH 数量
     + newTokenAmountPerEth 吃单者新报价格，即 1 ETH 可以兑换多少 token

能否携带资金: 能

边界条件：
1. token 应该为正常的代币地址，当 token 地址为 0 时，会报错："Nest:Mine:(token)=0"，当 token 地址对应的报价表不存在时，会报错："Nest:Mine:!(remain)" 或者 "Nest:Mine:!EFF(sheet)"

2. index 索引值如果提供的是不存在的值，如 -1，则会报错 "Nest:Mine:>(len)"; 如果提供的 index 数值索引目前不存在,同样报错,非法操作

3. biteNum 吃单者想要吃单的 ETH　数量，必须为 miningEthUnit 的正整数倍(0 除外),否则报错: "Nest:Mine:!(bite)"
           如果 biteNum 的数量大于报价单中剩余资金数量,则会报错:"Nest:Mine:!(remain)"

4. newTokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 ntokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:(price)=0"

5. 由于本函数可以接受外部转账,还存在资金设置问题. 每次报价必须同时携带足够的 eth, 当携带的 eth 数量不足以支付 ethFee 时,交易将会终止,状态回滚.

6. 所有涉及到的数值都应为整数. 如果为小数,将直接报错,合约终止,状态回滚


### biteEth()
功能: 吃单者进行吃单操作，提供 token 兑换 ethNum

函数: biteEth(token, index, biteNum,  newTokenAmountPerEth)
     + token 吃单者提供报价者的地址
     + index 吃单者提供报价者的索引
     + biteNum 吃单者吃单的 token 数量
     + newTokenAmountPerEth 吃单者新报价格，即 1 ETH 可以兑换多少 token

能否携带资金: 能

边界条件：
1. token 应该为正常的代币地址，当 token 地址为 0 时，会报错："Nest:Mine:(token)=0"，当 token 地址对应的报价表不存在时，会报错："Nest:Mine:!(remain)" 或者 "Nest:Mine:!EFF(sheet)"

2. index 索引值如果提供的是不存在的值，如 -1，则会报错 "Nest:Mine:>(len)"

3. biteNum 吃单者想要吃单的 ETH　数量，必须为 miningEthUnit 的正整数倍(0 除外),否则报错: "Nest:Mine:!(bite)"
           如果 biteNum 的数量大于报价单中剩余资金数量,则会报错:"Nest:Mine:!(remain)"

4. newTokenAmountPerEth 的值必须大于 0，一般不存在上溢情况（需要支付的 token 太大）。当 ntokenAmountPerEth 小于等于 0 时，会报错 "Nest:Mine:(price)=0"

5. 由于本函数可以接受外部转账,还存在资金设置问题. 每次报价必须同时携带足够的 eth, 当携带的 eth 数量不足以支付 ethFee 时,交易将会终止,状态回滚.

6. 所有涉及到的数值都应为整数. 如果为小数,将直接报错,合约终止,状态回滚