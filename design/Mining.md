# Nest 报价挖矿合约

这个合约实现报价挖矿的逻辑部分。

而所有的 (eth, token) 都存入 [[NestPool]] 中。

注意，并不是每一笔报价调用都要转移 eth。多数的 eth 会暂存在当前合约中，随机抽一名
矿工来将合约中的暂存 eth 一次性转入到 [[NestPool]] 中。

当有矿工要 withdraw (eth, token) 时，也会触发 「转存 eth」 功能。

当有矿工需要支取 nest/ntoken，会触发 「转存 eth」 功能。

矿工报价调用 `postPriceSheet()`，关闭报价单则调用 `closePriceSheet()`。为了优化 GAS，矿工可以一次性 close 多个报价单。


TODO: 在吃单的时候，如果是 biteTokens, 新报价单规模需要2倍以上，这时候应该用 tokenAmount 来计算，而不是 ethAmount。否则这个地方会有一个奇怪的 case 判断。而在 biteEths 时，新报价单规模应该用 ethAmount 来计算。

TODO: PriceSheetData 中的 OriginalEthAmount, OriginalTokenAmount 似乎不再需要

TODO: 在 PriceSheetData 中增加一个位，标记这个Sheet 已经被 close 

## 数据结构

一个报价单结构体长度为 `5 * 256b` 

```js
struct PriceSheetData {    
    address owner;   //  报价单拥有者
    address token;   // token合约地址
    
    uint128 ethAmount;   //  报价单中的 eth 数量（这个值在被吃单后可能会 增加/减少）（当报价单关闭后，这些 eth 会被取出）
    uint128 tokenAmount; //  报价单中的 token 数量 （这个值在被吃单后可能会 增加/减少）（当报价单关闭后，这些 token 会被取出）
    
    uint128 dealEthAmount;   //  剩余可用来成交的报价对 (eth, token)（这两个值在被吃单后 只能减少，并且价格比例与原始价格比例相等）
    uint128 dealTokenAmount; // 

    uint128 ethFee;        //  用于挖矿的手续费
    uint96  atHeight;      //  报价单所在的区块高度 
    uint32  deviated;    //  价格是否偏离
}
```

一个报价对结构为 `256b`
 
```js
struct PricePair{
    uint128 ethAmount;
    uint128 tokenAmount;
}
```

当 PriceSheet 中 (ethAmount, tokenAmount, ethFee) = (0,0,0) 说明这个报价单已经被close。


- `_prices[] : PriceSheetData` : 报价单数据结构 // TODO: 转移到 [[NestPool]] 中？

- `_token_allowed_list: token => bool`: 允许 token 报价的白名单 // 

- `_eth_at_height: block-height => amount` : 记录在当前区块报价挖矿所消耗的总的 eth 数量

- `_mined_nest_at_height: block-height => amount` : 记录在当前区块报价挖矿所得到的所有 nest 数量

缓存池

- `_temp_eth_fee = 0` 临时保存在 Mining 合约中的 eth 手续费，每过一段时间，就会被转到 BonusPool 池

- `_temp_eth_pool = 0` 临时保存在 Mining 合约中的 eth 数量（矿工报价划拨），每过一段时间，就会被转到 NestPool 池

## 参数

- `c_mining_nest_yield_cutback_period = 2,400,000`：挖矿衰减周期（一年）     `_blockAttenuation = 2 400 000 `

- `_nest_yield_per_block_base = 400` : 每个区块可以挖出的 nest 数量为 400 个  | 无

- `_nest_yield_per_block_amount[10]` : 10年内挖矿量衰减的百分比，  | `_attenuationAmount[10]`

- `_nest_yield_off_period_amount = 40`: 10年以后，挖矿量固定下来 = 40 个  | `_afterMiningAmount` 

- `c_mining_nest_genesis_block_height`: 挖矿的起始区块   `_firstBlockNum = 6236588`

- `_ntoken_yield_per_block_base = 4` : 每个区块可以挖出的 ntoken 数量为 4 个  | 无

- `_ntoken_yield_cutback_period = 2,400,000`：挖矿衰减周期（一年）     `_blockAttenuation = 2 400 000 `

--------------

- `x_mining_fee_thousandth = 10`：挖矿手续费千分比例  改名 <= _miningETH

- `x_bite_fee_thousandth = 1`：吃单手续费千分比  改名 <= _tranEth 

- `c_bite_amount_factor = 2`：吃单报价增量因子 改名 <= _tranAddition

- `x_bidder_reward_percentage = 5` nToken 拍卖胜者的挖矿抽成比例 5%  <= _ownerMining; 


- `x_team_reward_percentage = 5`: 开发者的抽成比例 5% 改名 <= _coderAmount

- `x_NN_reward_percentage= 15` : 超级节点的奖励比例 15% 改名 =>  _NNAmount

- `x_mining_eth_minimum = 10 ether`: 一次报价挖矿的最低手续费(eth)  改名 <= _leastEth

- `x_mining_eth_unit = 10 ether`: 报价对中 eth 数量的单位 改名 <= _offerSpan


--------

- `x_price_deviation_rate = 10`: 吃单的价格正常偏离百分比  改名 <= _deviate

- `c_mining_price_deviateion_factor = 10`: 吃单价格偏离后的报价规模放大因子  改名 <= _deviationFromScale

- `x_price_duration = 25` :  价格等待生效时长为 25 个区块，在这 25 个区块内，可以被任意吃单。 改名 <= _blockLimit

## 关键函数 

### 报价操作

- `postPriceSheet(ethAmount, tokenAmount, token) external payable return (uint128 index)`
    + `(ethAmount, tokenAmount)` 报价对
    + value： ether 的数量
    + 返回值：报价单的 index

参数要求 Assumes:

1. ethAmount 必须为 `x_mining_eth_unit` 的整数倍
2. token 必须在系统 token 白名单列表中
3. tokenAmount 必须能被 (ethAmount / x_mining_eth_unit) 整除
4. ethAmount > x_mining_eth_minimum (10 ether)
5. tokenAmount > 0

副作用 Guarantees:

1. 修改 NestPool 中的 `_eth_ledger` 与 `_token_ledger`
2. 增加一项到 _prices 报价单列表中
3. 追加报价到 PriceOracle 中的 `_token_prices[token]` priceInfoList 数组项；`PriceOracle.addPrice()`
//4. 更新当前报价到 `_token_latest_price[token]`，以供后续计算「价格偏离」
5. 把手续费计入分红池 NestPool()
6. 记录当前区块产生的nest 到 `_minedNestAtHeight[block.number]`
7. 增加 eth 手续费到当前区块所有报价的 eth 手续费总和 `_ethFeeAtHeight[block.number]`
8. 如果 msg.sender 被抽中，则负责把 分红池中的 nest 发送到 NN 合约 与 dev 地址，把手续费转到分红池

资金流转

事件:

- `closePriceSheet(uint128 index) public noContract`
    + index: 报价单在报价单数组中的索引
    + 返回值：无

权限：用户调用，禁止智能合约调用

功能：当报价单超时后，关闭报价单，取回 eth 与 token

参数要求（Assumptions): none

副作用 (Guarantees)：

1. 修改 `_prices[index]` 中的一个结构体
2. 修改把 报价单中的 eth 与 token 计入到用户账户  `NestPool._eth_ledger` `NestPool._token_ledger` `NestPool._nest_ledger`
3. 把挖到的 nest 计入到用户账户

资金流向: 
1. eth 被分为三份，msg.value = ethFee + surplus + priceSheet.ethAmount

实现代码

```js
function postPriceSheet(uint128 ethAmount, uint128 tokenAmount, address token, bool isNToken) public payable returns (uint128 index) noContract{
    // 参数检查
    require(token != address(0x0)); 
    // 增加剩下的参数检查

    uint256 nest_nToken;

    if (!isNToken) {
        require(_token_allowed_list[token], "token is not listed");
        nest_nToken = _C_nest_token_address;
    } else {
        nest_nToken = NestPool.getNToken(token);  
    }

    // 判断价格是否偏离
    bool isDeviated = isPriceDeviated(ethAmount, tokenAmount, token, x_price_deviation_rate);
    // 计算手续费 ethFee
    if (isDeviated) {
        require(ethAmount >= x_mining_eth_minimum.mul(x_price_deviateion_mining_factor), "ethAmount should > 10 * x_mining_eth_minimum");
        ethFee = x_mining_eth_minimum.mul(x_mining_fee_thousandth).div(1000);
    } else {
        ethFee = ethAmount.mul(x_mining_fee_thousandth).div(1000);
    }
    uint128 v = ethAmount.add(ethFee);

    // 将矿工支付的多余 eth 计入矿工账户
    uint128 surplus = msg.value.sub(v);
    if (surplus > 0) {
        NestPool.addEth(address(msg.sender), surplus);
    }

    // eth 充值到矿池
    NestPool.transferEthToMiningPool(msg.sender, ethAmount);
    // token 充值到矿池，如果 token 足够，则不发生转账，否则 NestPool 会调用 transferFrom，把不足的 token 转移到 NestPool，并记录新的余额 
    NestPool.transferTokenToMiningPool(token, msg.sender, tokenAmount);


    // 产生事件
    // 产生一个报价单 (10 万 GAS)
    _prices.push(priceSheet{msg.sender, token, ethAmount, tokenAmount, ethAmount, tokenAmount, ethFee, block.number, isDeviated});

    // 产生一条价格记录 （1.5 万 GAS）
    _C_PriceOracle.addPrice(ethAmount, tokenAmount, block.number.add(x_price_duration), token, address(msg.sender));


    emit PostPrice(msg.sender, token, ethAmount,tokenAmount, isDeviated); 

    // 把手续费计入分红/收益池
    _temp_eth_fee = _temp_eth_fee + ethFee;
    _temp_eth_pool = _temp_eth_pool + msg.value - ethFee;

    // 挖矿 (4.5 万 GAS)
    if (!isNToken) { // 挖 nest 矿
        if (_mined_nest_at_height[block.number] == 0) {
            uint128 nestAmount = mineNest();  
            uint128 dev = nestAmount.mul(x_team_reward_percentage).div(100);
            uint128 NN = nestAmount.mul(x_NN_reward_percentage).div(100);
            uint128 remain = nestAmount.sub(dev).sub(NN);
            _C_NestPool.addNest(_developer_address, dev);
            _C_NestPool.addNest(_NN_address, NN);
            _mined_nest_at_height[block.number] = remain; 
        }
        _eth_fee_at_height[block.number] = _eth_fee_at_height[block.number].add(ethFee);
    } else { // 挖 nToken 矿
        if (_mined_ntoken_at_height[nToken][block.number] == 0) {
            uint128 ntokenAmount = mineNToken(nToken);  
            uint128 bidderCake = ntokenAmount.mul(x_bidder_reward_percentage).div(100);
            _C_NestPool.addNToken(nToken.checkBidder(), nToken, bidderCake)
            _C_NestPool.addNToken(msg.sender, nToken, ntokenAmount.sub(bidderCake));
            _mined_ntoken_at_height[nToken][block.number] = ntokenAmount.sub(bidderCake);
        }
        _eth_fee_ntoken_at_height[nToken][block.number] = _eth_fee_ntoken_at_height[nToken][block.number].add(ethFee);

    }

    // 
    if (block.number % 50 == 0) {  // 被选中
        repayEth(_C_NestPool, _temp_eth_pool);
        repayEth(_C_BonusPool, _temp_eth_fee);
        _temp_eth_fee = 0;
        _temp_eth_pool = 0;
        _C_NestPool.clearNest(_developer_address);
        _C_NestPool.clearNest(_NN_address);
    }

    return (_prices.length - 1);   //safe_math: all are untainted values
}
```

#### GAS 分析：正常情况下，有 7 个 NestPool call



#### 实现代码

```js
function closePriceSheet(uint256 index) public noContract {
    PriceSheetData storage price = _prices[index];
    require(price.atHeight + x_price_duration < block.number, "Price sheet isn't in effect");  // safe_math: untainted values
    
    uint256 ethAmount = price.ethAmount;
    uint256 tokenA = price.tokenAmount;
    uint256 fee = price.ethFee

    if (ethAmount > 0) {
        price.ethAmount = 0;
        NestPool.transferEthFromMiningPool(msg.sender, ethAmount);
    }

    if (tokenA > 0) {
        price.tokenAmount = 0;
        NestPool.transferTokenFromMiningPool(price.token, msg.sender, tokenA);
    }

    if (fee > 0) {
        uint256 h = price.atHeight;
        NestPool.addNest(price.owner, fee.mul(_minedNestAtHeight[h]).div(_ethFeeAtHeight[h]));
        price.ethFee = 0;
    }
}

```

### withdrawEth

#### 参数要求：

#### 副作用

1. 修改账本， `_eth_ledger[msg.sender]` 与 `_token_ledger[msg.sender]` 
2. 发送 eth, token, nest 到 msg.sender

```js
function withdraw() public noContract {
    uint256 ethAmount = NestPool.clearEth();
    address payable sender = msg.sender.make_payable();
    sender.transfer(ethAmount);
}

function withdrawToken(address token) public noContract {
    NestPool.withdrawToken(token, msg.sender);
}
```

```js
function withdrawNest() public noContract {
    uint256 ethAmount = NestPool.clearEth();
    address payable sender = msg.sender.make_payable();
    sender.transfer(ethAmount);
}
```

偏离逻辑：

+ 如果原报价单是「偏离」的，那么吃单也会变成「偏离」，这个偏离属性会被吃单继承下去
+ 如果一个新的报价单和之前的一个报价单差别在 10% 以内，则不再被认为是偏离
+ 吃单也会产生一个报价单
+ 在吃单的逻辑中，如果原报价单「偏离」，则吃单的规模 x2；如果原报价单不偏离，但当前报价「偏离」，则吃单的规模 x10
+ 如果原报价单和当前报价都不偏离，则吃单的规模 x2；

### 吃单函数 biteToken

函数原型

- `biteToken(ethAmount, tokenAmount, biteEthAmount, biteTokenAmount, index, token) public payable noContract`
    + (ethAmount, tokenAmount) 新报价对
    + (biteEthAmount, biteTokenAmount) 吃单的价格对，吃单的价格比要等于原始报价单
    + index 报价单在 _prices 中的索引
    + token 合约地址

#### 参数要求

#### 副作用

```js
function biteToken(uint128 ethAmount, uint128 tokenAmount, uint128 biteEthAmount, uint128 biteTokenAmount, uint128 index, address token)public payable noContract {
    // 参数检查
    uint256 ethFee = biteEthAmount.mul(x_bite_fee_thousandth).div(1000);
    require(msg.value >= ethAmount.add(biteEthAmount).add(ethFee), "Insufficient msg.value");
    require(biteEthAmount % x_mining_eth_unit == 0, "Transaction size does not meet asset span");
    require(biteEthAmount > 0, "");
    //TODO: (ethAmount, tokenAmount) 的参数检查 ...

    // 检查吃单条件是否满足
    PriceSheetData memory price = _prices[index]; 
    require(price.token == token, "Wrong token address");
    require(block.number.sub(offerPriceData.blockNum) > x_price_duration, "Offer status error");
    require(price.dealEthAmount >= biteEthAmount, "Insufficient trading eth");
    require(price.dealTokenAmount >= biteTokenAmount, "Insufficient trading token");
    // 检查吃单的报价对与原报价对 比例吻合
    require(biteTokenAmount == price.dealTokenAmount * biteEthAmount / price.dealEthAmount, "Wrong token amount");
  
    // 确认新报价对的价格偏离度
    bool thisDeviated = false;
    if (price.deviated == true) {
        require(ethAmount >= biteEthAmount.mul(x_bite_mining_factor), "EthAmount needs to be no less than 2 times of transaction scale");
    } else {
        thisDeviated = isPriceDeviated(ethAmount,tokenAmount,token, x_price_deviation_rate);
        if (thisDeviated) {
            require(ethAmount >= biteEthAmount.mul(x_price_deviateion_mining_factor), "EthAmount needs to be no less than 10 times of transaction scale");
        } else {
            require(ethAmount >= biteEthAmount.mul(x_bite_mining_factor), "EthAmount needs to be no less than 2 times of transaction scale");

        }
    }

    // 更新报价单信息
    price.ethAmount = price.ethAmount.add(biteEthAmount);
    price.tokenAmount = price.tokenAmount.sub(biteTokenAmount);
    price.dealEthAmount = price.dealEthAmount.sub(biteEthAmount);
    price.dealTokenAmount = price.dealTokenAmount.sub(biteTokenAmount);
    _prices[index] = price;
    
    // createOffer(ethAmount, tokenAmount, token, 0, thisDeviated);
    _prices.push(priceSheet{msg.sender, token, ethAmount, tokenAmount, ethAmount, tokenAmount, ethFee, block.number, thisDeviated});
    PriceOracle.addPrice(ethAmount, tokenAmount, block.number.add(x_price_duration), token, address(msg.sender));
    PricePair storage p = _token_latest_price[token];
    p.ethAmount = ethAmount;
    p.tokenAmount = tokenAmount;

    // TODO: 转入报价资产erc20-交易资产到当前合约
    if (tokenAmount > tranTokenAmount) {
        ERC20(token).safeTransferFrom(address(msg.sender), address(this), tokenAmount.sub(biteTokenAmount));
    } else { // 很少情况发生
        ERC20(token).safeTransfer(address(msg.sender), biteTokenAmount.sub(tokenAmount));
    }
    
    // 修正价格
    PriceOracle.cutPrice(biteEthAmount, biteTokenAmount, token, price.blockNum.add(x_price_duration));

    // 产生吃单买 Token 事件
    emit BiteToken(address(msg.sender), address(0x0), biteEthAmount, address(token), biteTokenAmount, contractAddress, price.owner);
    
    // TODO: 支持 ntoken 吃单
    if (ethFee > 0) {
        _C_BonusPool.value(ethFee).ethTransferFrom(_nestToken, ethFee);
    }
    
```
----------



```js // TODO: 需要修改，从 PriceOracle 合约拿「生效价格」
function isPriceDeviated(uint128 ethAmount, uint128 tokenAmount, address token, uint8 deviateRate) private view returns(bool) {
    PricePair memory p = _token_latest_price[token];
    uint128 oldEthAmount = p.ethAmount;
    uint128 oldTokenAmount = p.tokenAmount;
        
    uint128 maxTokenAmount = ethAmount.mul(oldTokenAmount).mul(uint128(100).add(deviateRate)).div(oldEthAmount.mul(100));
    if (tokenAmount <= maxTokenAmount) {
        uint128 minTokenAmount = ethAmount.mul(oldTokenAmount).mul(uint128(100).sub(deviateRate)).div(oldEthAmount.mul(100));
        if (tokenAmount >= minTokenAmount) {
            return false;
        }
    }
    return true;
}
```

```js
function mineNest() private returns (uint128) {
    uint256 period = block.number.sub(_nest_genesis_block_height).div(_nest_yield_cutback_period);
    //_latest_mining_height = block.number;  // 这里似乎不应该有副作用
    uint256 nestPerBlock;
    if (period > 9) {
        nestPerBlock = _nest_yield_off_period_amount;
    } else {
        nestPerBlock = _nest_yield_per_block_amount[period];
    }
    yieldAmount = nestPerBlock.mul(block.number.sub(_latest_mining_height));
    return yieldAmount;
}
```

```js
function mineNToken(address ntoken) private returns (uint128) {
    Nest_NToken miningToken = Nest_NToken(ntoken);
    (uint256 genesis, uint256 latest) = miningToken.checkBlockInfo();
    uint256 period = block.number.sub(genesis).div(_ntoken_yield_cutback_period);  //gy: _blockAttenuation = 240万  衰减时间
    uint256 ntokenPerBlock;
    if (period > 9) {  
        ntokenPerBlock = _ntoken_yield_off_period_amount; //gy: afterMiningAmount   区块平稳期出矿量，默认为 0.4eth; 
    } else {
        ntokenPerBlock = _ntoken_yield_per_block_amount[period]; // gy: 计算 单位区块的出矿量
    }
    yieldAmount = ntokenPerBlock.mul(block.number.sub(latest));
    miningToken.increaseTotal(yieldAmount);  //minting
    emit MiningNToken(block.number, yieldAmount, ntoken); 
    return yieldAmount; 
}

```