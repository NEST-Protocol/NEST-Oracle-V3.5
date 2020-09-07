# NestMining 报价挖矿合约

这个合约实现报价挖矿的逻辑部分。

而所有的 (eth, token) 都存入 [[NestPool]] 中。

注意，并不是每一笔报价调用都要转移 eth。
当有矿工要 withdraw (eth, token) 时，也会触发 「转存 eth」 功能。

当有矿工需要支取 nest/ntoken，会触发 「转存 eth」 功能。

矿工报价调用 `postPriceSheet()`，关闭报价单则调用 `closePriceSheet()`。为了优化 GAS，矿工可以一次性 close 多个报价单。

TODO: 多数的 eth 会暂存在当前合约中，随机抽一名矿工来将合约中的暂存 eth 一次性转入到 [[NestPool]] 中

TODO: 在吃单的时候，如果是 biteTokens, 新报价单规模需要2倍以上，这时候应该用 tokenAmount 来计算，而不是 ethAmount。否则这个地方会有一个奇怪的 case 判断。而在 biteEths 时，新报价单规模应该用 ethAmount 来计算。

TODO: 在 PriceSheetData 中增加一个位，标记这个Sheet 已经被 close 

TODO: _prices_map 是否需要转移到 [[NestPool]] 中？考虑到升级后数据的保留问题

TODO: _mined_nest_at_height 可以和 _eth_fee_at_height 合并为一个 mapping
TODO: _mined_ntoken_at_height 可以和 _eth_fee_ntoken_at_height 合并为一个 mapping

TODO: GAS 优化，缩小函数(事件)参数的位数

TODO: 压缩合约变量的存储空间

TODO: closePriceSheetList 一次关闭多个 PriceSheets

## 数据结构

一个报价单结构体长度为 `5 * 256B` 

```js
struct PriceSheetData {    
    address miner;   //  报价单拥有者
    
    uint128 ethAmount;   //  报价单中的 eth 数量（这个值在被吃单后可能会 增加/减少）（当报价单关闭后，这些 eth 会被取出）
    uint128 tokenAmount; //  报价单中的 token 数量 （这个值在被吃单后可能会 增加/减少）（当报价单关闭后，这些 token 会被取出）
    
    uint128 dealEthAmount;   //  剩余可用来成交的报价对 (eth, token)（这两个值在被吃单后 只能减少，并且价格比例与原始价格比例相等）
    uint128 dealTokenAmount; // 

    uint128 ethFee;        //  用于挖矿的手续费
    uint64  atHeight;      //  报价单所在的区块高度, uint64 足够使用到世界毁灭
    uint8  deviated;    //  价格是否偏离
    uint56 _padding;    // 剩余空间
}
```

当 PriceSheet 中 (ethAmount, tokenAmount, ethFee) = (0,0,0) 说明这个报价单已经被close。

TODO: 再增加一个 uint8 来指示报价单状态: 1 = active, 2 = bitten, 3 = close


- `_prices_map : token => PriceSheetData[]` 

报价单数据结构，从 token address 映射到 PriceSheetData 数组，数组单向增长。
一个区块高度处可能存在多个 PriceSheet

- `_token_allowed_list: token => bool`

TODO: 允许 token 报价的白名单

- `_eth_fee_at_height: block-height => amount` 

记录在当前区块 nest相关联的报价挖矿所消耗的总的 eth 数量

- `_mined_nest_at_height: block-height => amount` 

记录在当前区块报价挖矿所得到的所有 nest 数量

- `_eth_fee_ntoken_at_height: block-height => amount` 

记录在当前区块报价 ntoken 相关联的报价挖矿所得到的所有 eth 数量

- `_mined_ntoken_at_height: block-height => amount`

- `_temp_eth_fee = 0` 临时保存在 Mining 合约中的 eth 手续费，每过一段时间，就会被转到 BonusPool 池

TODO: GAS优化 —— 缓存池

- `_temp_eth_pool = 0` 临时保存在 Mining 合约中的 eth 数量（矿工报价划拨），每过一段时间，就会被转到 NestPool 池

TODO: GAS优化 —— 缓存池

## 事件

- `PostPrice(address miner, address token, uint256 index, uint256 ethAmount, uint256 tokenAmount, uint256 isDeviated)` 

报价事件

- `ClosePrice(address miner, address token, uint256 index)`

关闭报价单事件

- `Deposit(address miner, address token, uint256 amount)`

矿工存入报价用 token 事件

- `Withdraw(address miner, address token, uint256 amount)`

矿工提取报价用 token 事件

- `BiteEth(address miner, uint256 biteEthAmount, uint256 biteTokenAmount, address token, uint256 index)` 

吃单事件

- `BiteToken(address miner, uint256 biteEthAmount, uint256 biteTokenAmount, address token, uint256 index)` 

吃单事件


## 合约变量

- `_latest_mining_height` 上一次挖矿的区块高度，用来计算两次挖矿之间所产生的 nest 产出量

- `_mining_nest_yield_per_block_amount[10]` 提前预算好的 10个(年)周期内挖矿量（逐周期衰减）  

改名 <= `_attenuationAmount[10]`

## 算法参数

- `c_mining_nest_genesis_block_height = 6236588` nest 协议的创世区块高度

改名 <=  `_firstBlockNum`

- `c_mining_nest_yield_cutback_period = 2,400,000` 挖矿衰减周期（约一年）   

改名 <=  `_blockAttenuation = 2 400 000 `

- `c_mining_nest_yield_cutback_rate = 80` 每一个周期减产 20%

- `c_mining_nest_yield_off_period_amount = 40 ether`: 10个周期以后，挖矿量固定下来 = 40 个 

改名 <= `_afterMiningAmount` 

- `c_mining_nest_yield_per_block_base = 400 ether` 第一个周期的单区块挖矿产出

- `_ntoken_yield_per_block_base = 4` : 每个区块可以挖出的 ntoken 数量为 4 个  | 无

- `_ntoken_yield_cutback_period = 2,400,000`：挖矿衰减周期（一年）    

改名 <= `_blockAttenuation = 2 400 000 `

- `c_mining_fee_thousandth = 10`：挖矿手续费千分比例  

改名 <= _miningETH

- `c_bite_fee_thousandth = 1`：吃单手续费千分比  

改名 <= _tranEth 

- `c_bite_amount_factor = 2`：吃单报价增量因子

改名 <= _tranAddition

- `c_bidder_reward_percentage = 5` nToken 拍卖胜者的挖矿抽成比例 5% 

改名 <= _ownerMining; 

- `c_team_reward_percentage = 5`: 开发者的抽成比例 5% 

改名 <= _coderAmount

- `c_NN_reward_percentage= 15` : 超级节点的奖励比例 15% 

改名 <=  _NNAmount

- `c_mining_eth_minimum = 10 ether`: 一次报价挖矿的最低手续费(eth)  

改名 <= _leastEth

TODO: 按 GAS price 自动进行调节，
TODO: 初始值提高到 50 ether

- `c_mining_eth_unit = 10 ether`: 报价对中 eth 数量的单位 

改名 <= _offerSpan

TODO: 按 GAS Price 进行调节

- `c_price_deviation_rate = 10`: 吃单的价格正常偏离百分比  

改名 <= _deviate

- `c_mining_price_deviateion_factor = 10`: 吃单价格偏离后的报价规模放大因子  

改名 <= _deviationFromScale

- `c_price_duration_block = 25` :  价格等待生效时长为 25 个区块，在这 25 个区块内，可以被任意吃单。 

改名 <= _blockLimit

## 关键函数 

- `postPriceSheet(ethAmount, tokenAmount, token, isNToken) external payable return (uint256 index)`
    + `(ethAmount, tokenAmount)` 报价对
    + `isNToken` 是否是 ntoken 报价，如果 false，则为 nest 报价
    + value： ether 的数量
    + 返回值：报价单的 index

权限:
1. 禁止合约调用

参数要求 Assumes:

1. ethAmount 必须为 `c_mining_eth_unit` 的整数倍
2. tokenAmount 必须能被 (ethAmount / c_mining_eth_unit) 整除
3. tokenAmount > 0
4. ethAmount > c_mining_eth_minimum (10 ether)

TODO: token 必须在系统 token 白名单列表中

副作用 Guarantees:

1. 修改 NestPool 中的 `_eth_ledger` 与 `_token_ledger`
2. 增加一项到 `_prices_map` 报价单列表中
3. 把手续费计入分红池 NestPool()
4. 冻结 miner 报价中等值的 (eth, token)
4. 记录当前区块产生的nest 到 `_mined_nest_at_height[block.number]`
5. 增加 eth 手续费到当前区块所有报价的 eth 手续费总和 `_eth_fee_at_height[block.number]`

TODO: 如果 msg.sender 被随机抽中，则负责把 分红池中的 nest 发送到 NN 合约 与 dev 地址，把手续费转到分红池

资金流向:
1. ETH(msg.value - ethFee) | this ==> [[NestPool]] 合约
2. ETH(ethFee)  | this => [[BonusPool]] 
3. NEST(dev_rewards) | [[NestPool]] => _developer_address
4. NEST(dev_rewards) | [[NestPool]] => _NN_address
5. TOKEN  | miner ==> [[NestPool]]    如果池中矿工事先预存的 token 不足

*注: miner 的 surplus 会一并计入 nestpool 账户，减少一次 eth 转账(9k GAS)*

事件:
1. PostPrice(...)

实现:

```js
    function postPriceSheet(uint256 ethAmount, uint256 tokenAmount, address token, bool isNToken) 
        public payable returns (uint256) // noContract
    {
        // check parameters 
        require(token != address(0x0)); 
        // TODO: more checking

        // load ntoken
        address nestNToken;
        if (!isNToken) {
            // require(_token_allowed_list[token], "token is not listed");
            nestNToken = address(_C_NestToken);
        } else {
            nestNToken = _C_NestPool.getNTokenFromToken(token);  
        }

        uint256 ethFee;

        // 判断价格是否偏离
        // If the price is too far off from the latest effective price

        uint256 isDeviated = isPriceDeviated(ethAmount, tokenAmount, token, c_price_deviation_rate);
        // calculate mining fee (eth)
        if (isDeviated == 0x1) {
            require(ethAmount >= c_mining_eth_minimum * c_mining_price_deviateion_factor, "ethAmount should > 10 * x_mining_eth_minimum");
            ethFee = (c_mining_eth_minimum * c_mining_fee_thousandth / 1000);
        } else {
            ethFee = ethAmount.mul(c_mining_fee_thousandth).div(1000);
        }
    
        // save the changes into miner's virtual account
        // 将矿工支付的多余 eth 计入矿工账户
        // if (msg.value.sub(ethAmount.add(ethFee)) > 0) {
        _C_NestPool.depositEthMiner(address(msg.sender), msg.value.sub(ethFee));
        // }
        emit LogUint("postPriceSheet> msg.value", msg.value);
        emit LogUint("postPriceSheet> ethFee", ethFee);
        emit LogUint("postPriceSheet> this.balance", address(this).balance);
        // TODO: un-optimized version 
        TransferHelper.safeTransferETH(address(_C_NestPool), msg.value.sub(ethFee));
        _C_BonusPool.pumpinEth{value:ethFee}(address(_C_NestToken), ethFee);
    
        // Bookkeep eth and token onto the nest pool
        _C_NestPool.freezeEthAndToken(msg.sender, ethAmount, token, tokenAmount);
        // token 充值到矿池，如果 token 足够，则不发生转账，否则 NestPool 会调用 transferFrom，把不足的 token 转移到 NestPool，并记录新的余额 
        // append a new price sheet (100,000 GAS, est.)
        _prices_map[token].push(PriceSheetData(msg.sender, 
            uint128(ethAmount), uint128(tokenAmount), 
            uint128(ethAmount), uint128(tokenAmount), 
            // uint128(ethAmount), uint128(tokenAmount), 
            uint128(ethFee), uint64(block.number), uint8(isDeviated), uint56(0)));
    
        if (!isNToken) { // 挖 nest 矿
            if (_mined_nest_at_height[block.number] == 0) {
                uint256 nestAmount = mineNest();  
                emit LogUint("mineNest()", nestAmount);
                uint256 dev = nestAmount.mul(c_team_reward_percentage).div(100);
                uint256 NN = nestAmount.mul(c_NN_reward_percentage).div(100);
                uint256 remain = nestAmount.sub(dev).sub(NN);
                emit LogUint("postPriceSheet> nestAmount", nestAmount);
                emit LogUint("postPriceSheet> dev", dev);
                emit LogUint("postPriceSheet> NN", NN);
                emit LogUint("postPriceSheet> remain", remain);
                _C_NestPool.increaseNestReward(_developer_address, dev);
                _C_NestPool.increaseNestReward(_NN_address, NN);
                _mined_nest_at_height[block.number] = remain; 
            }
            _eth_fee_at_height[block.number] = _eth_fee_at_height[block.number].add(ethFee);
        } else { // 挖 nToken 矿
            if (_mined_ntoken_at_height[nestNToken][block.number] == 0) {
                uint256 ntokenAmount = mineNToken(nestNToken);  
                uint256 bidderCake = ntokenAmount.mul(c_bidder_reward_percentage).div(100);
                _C_NestPool.increaseNTokenReward(INToken(nestNToken).checkBidder(), nestNToken, bidderCake);
                _C_NestPool.increaseNTokenReward(msg.sender, nestNToken, ntokenAmount.sub(bidderCake));
                _mined_ntoken_at_height[nestNToken][block.number] = ntokenAmount.sub(bidderCake);
            }
            _eth_fee_ntoken_at_height[nestNToken][block.number] = _eth_fee_ntoken_at_height[nestNToken][block.number].add(ethFee);
    
        }
        // choose
        // if (block.number % 50 == 0) {  // 被选中
            // TransferHelper.safeTransferETH(_C_NestPool, _temp_eth_pool);
            // TransferHelper.safeTransferETH(_C_BonusPool, _temp_eth_fee);
            // _temp_eth_fee = 0;
            // _temp_eth_pool = 0;
        _C_NestPool.distributeRewards(_developer_address);
        _C_NestPool.distributeRewards(_NN_address);
        // }
        // 160 token-address + 96bit index
        uint256 index = PriceSheetData[](_prices_map[token]).length - 1;
        // uint256 priceIndex = (uint256(token) >> 96) << 96 + uint256(index);
        emit PostPrice(msg.sender, token, index, ethAmount, tokenAmount, isDeviated); 
        return index; 

    }
```

- `closePriceSheet(address token, uint256 index) public noContract`
    + token: 地址
    + index: 报价单在报价单数组中的索引
    + 返回值：无

TODO: 报价单号将 token 地址与 index 合并？

权限：用户调用，禁止智能合约调用

功能：当报价单超时后，关闭报价单，取回 eth 与 token

Assumes:
1. token 合法
2. miner 之前被冻结了(eth, token)

参数要求: 
1. 检查报价单是否已经过期

副作用 (Guarantees)：

1. 修改 `_prices_map[index]` 中的一个结构体
2. 解冻报价单上的资金
3. 把挖到的 nest 计入到 miner 账户
4. 把报价单设置为 `已关闭`

TODO: 在 PriceSheetData 中增加一个 status 变量，标记是否 closed

```js
    function closePriceSheet(address token, uint256 index) public 
    {
        PriceSheetData storage price = _prices_map[token][index];
        require(price.atHeight + c_price_duration_block < block.number, "Price sheet isn't in effect");  // safe_math: untainted values
    
        uint256 ethAmount = uint256(price.ethAmount);
        uint256 tokenAmount = uint256(price.tokenAmount);
        uint256 fee = uint256(price.ethFee);
        price.ethAmount = 0;
        price.tokenAmount = 0;

        _C_NestPool.unfreezeEthAndToken(address(msg.sender), ethAmount, token, tokenAmount);

        if (fee > 0) {
            uint256 h = price.atHeight;
            uint256 reward = fee.mul(_mined_nest_at_height[h]).div(_eth_fee_at_height[h]);
            _C_NestPool.increaseNestReward(price.miner, reward);
            price.ethFee = 0;
        }
    }
```

- `biteTokens(ethAmount, tokenAmount, biteEthAmount, biteTokenAmount, token, index) public payable returns (uint256)`

权限: 
1. 禁止合约调用

功能: 吃掉报价单中的 token，并且提交一个新的报价单。新报价单的报价额度需要是被吃单的两倍以上

参数要求:
1. msg.value 充足
2. biteEthAmount 必须是 c_mining_eth_unit 的整数倍
3. biteEthAmount 必须 > 0
4. ethAmount 必须 > 0
5. (ethAmount : tokenAmount) == (biteEthAmount : biteTokenAmount) 
6. token 对应到合法 nToken


偏离逻辑：

+ 如果原报价单是「偏离」的，那么吃单也会变成「偏离」，这个偏离属性会被吃单继承下去
+ 如果一个新的报价单和之前的一个报价单差别在 10% 以内，则不再被认为是偏离
+ 吃单也会产生一个报价单
+ 在吃单的逻辑中，如果原报价单「偏离」，则吃单的规模 x2；如果原报价单不偏离，但当前报价「偏离」，则吃单的规模 x10
+ 如果原报价单和当前报价都不偏离，则吃单的规模 x2；

Assumes:
1. 

副作用:
1. 产生一个新的报价单
2. 修改原报价单

资金流向:
1. ETH(msg.value - ethFee) | miner => [[NestPool]]
2. ETH(ethFee) | miner => [[BonusPool]]

事件:
1. `BiteToken`


实现:

```js   
function biteTokens(uint256 ethAmount, uint256 tokenAmount, uint256 biteEthAmount, uint256 biteTokenAmount, address token, uint256 index)
        public payable returns (uint256) //noContract
    {
        // check parameters 
        uint256 ethFee = biteEthAmount.mul(c_bite_fee_thousandth).div(1000);
        require(msg.value >= ethAmount.add(biteEthAmount).add(ethFee), "Insufficient msg.value");
        require(biteEthAmount % c_mining_eth_unit == 0, "biteEthAmount should be k*10");
        require(biteEthAmount > 0, "biteEthAmount should >0");
        //TODO: checking (ethAmount, tokenAmount)

        address nToken = _C_NestPool.getNTokenFromToken(token);
        require (nToken != address(0x0), "No such token-ntoken");
        // check bitting conditions
        PriceSheetData memory price = _prices_map[token][index]; 
        require(block.number.sub(price.atHeight) < c_price_duration_block, "Price sheet is expired");
        require(price.dealEthAmount >= biteEthAmount, "Insufficient trading eth");
        require(price.dealTokenAmount >= biteTokenAmount, "Insufficient trading token");
        // check if the (bitEthAmount:biteTokenAmount) ?= (ethAmount:tokenAmount)
        require(biteTokenAmount == price.dealTokenAmount * biteEthAmount / price.dealEthAmount, "Wrong token amount");

        // check if the old/new price is deviated  
        uint256 thisDeviated = 0;
        if (uint256(price.deviated) == 0x1) {
            require(ethAmount >= biteEthAmount.mul(c_bite_amount_factor), "EthAmount needs to be no less than 2 times of transaction scale");
        } else {
            thisDeviated = isPriceDeviated(ethAmount, tokenAmount,token, c_price_deviation_rate);
            if (thisDeviated == 0x1) {
                require(ethAmount >= biteEthAmount.mul(c_mining_price_deviateion_factor), "EthAmount needs to be no less than 10 times of transaction scale");
            } else {
                require(ethAmount >= biteEthAmount.mul(c_bite_amount_factor), "EthAmount needs to be no less than 2 times of transaction scale");
            }
        }
        emit LogUint("biteTokens> thisDeviated", thisDeviated);

        // update price sheet
        price.ethAmount = uint128(uint256(price.ethAmount).add(biteEthAmount));
        price.tokenAmount = uint128(uint256(price.tokenAmount).sub(biteTokenAmount));
        price.dealEthAmount = uint128(uint256(price.dealEthAmount).sub(biteEthAmount));
        price.dealTokenAmount = uint128(uint256(price.dealTokenAmount).sub(biteTokenAmount));
        _prices_map[token][index] = price;
    
        // create a new price sheet (ethAmount, tokenAmount, token, 0, thisDeviated);
        _prices_map[token].push(PriceSheetData(
            msg.sender, uint128(ethAmount), uint128(tokenAmount), uint128(ethAmount), uint128(tokenAmount), 
            // uint128(ethAmount), uint128(tokenAmount), 
            uint128(ethFee), uint64(block.number), uint8(thisDeviated), uint56(0x0)));

        { // scope for NestPool calls, avoids `stack too deep` errors
            _C_NestPool.depositEthMiner(address(msg.sender), msg.value.sub(ethFee));

            TransferHelper.safeTransferETH(address(_C_NestPool), msg.value.sub(ethFee));
        
            // freeze ethers and tokens (note that nestpool only freezes the difference)
            if (tokenAmount > biteTokenAmount) {
                _C_NestPool.freezeEthAndToken(address(msg.sender), ethAmount.add(biteEthAmount), token, tokenAmount.sub(biteTokenAmount));
                //TODO: TransferHelper.
            } else { 
                // for the case rather rare
                _C_NestPool.freezeEthAndToken(address(msg.sender), ethAmount.add(biteEthAmount), token, 0);
                _C_NestPool.unfreezeEthAndToken(address(msg.sender), 0, token, biteTokenAmount.sub(tokenAmount));
            }
        }
        emit BiteToken(address(msg.sender), biteEthAmount, biteTokenAmount, address(token), index);
        _C_BonusPool.pumpinEth{value:ethFee}(nToken, ethFee);

        return (PriceSheetData[](_prices_map[token]).length - 1); 
    }
```

- `withdrawEthAndToken(uint256 ethAmount, address token, uint256 tokenAmount) public`

权限: 任何人都可以调用

功能: miner 提取报价所预存的 eth 与 token

1. 修改账本， `_eth_ledger[msg.sender]` 与 `_token_ledger[msg.sender]` 
2. 发送 eth, token, nest 到 msg.sender

资金流向:
1. ETH | [[NestPool]] ==> miner
2. TOKEN | [[NestPool]] ==> miner 

```js
    function withdrawEthAndToken(uint256 ethAmount, address token, uint256 tokenAmount) 
        public 
    {
        _C_NestPool.withdrawEthAndToken(address(msg.sender), ethAmount, token, tokenAmount); 
    }
```

------------

- `isPriceDeviated(ethAmount, tokenAmount, token, deviateRate) returns (uint256) `

权限：private 

功能：计算当前报价是否偏离最新的有效价格

```js
    function isPriceDeviated(uint256 ethAmount, uint256 tokenAmount, 
        address token, uint256 deviateRate) private view returns (uint256) 
    {
        (uint256 ethAmount0, uint256 tokenAmount0, address miner) = lookupTokenPrice(token);
        if (ethAmount0 == 0) {
            return 0x0;
        }
        uint256 maxTokenAmount = ethAmount.mul(tokenAmount0).mul(100 + deviateRate).div(ethAmount0.mul(100));
        if (tokenAmount <= maxTokenAmount) {
            uint256 minTokenAmount = ethAmount.mul(tokenAmount0).mul(100 - deviateRate).div(ethAmount0.mul(100));
            if (tokenAmount >= minTokenAmount) {
                return 0x0;
            }
        }
        return 0x1;
    }
```

------------ 

- `claimAllNToken(address ntoken) public`

权限: 禁止合约调用

功能: miner 领取挖到的 nest/ntoken

Assumes:
1. _C_NestToken _C_NestPool 被正确设置

Garantees:

资金流向:
1. NEST/NTOKEN | [[NestPool]] ==> miner

TODO: 合并 [[NestPool]] 中的这两个函数，distributeRewards 与 withdrawNToken

```js
    function claimAllNToken(address ntoken) public {
        if (ntoken == address(0x0) || ntoken == address(_C_NestToken)){
            _C_NestPool.distributeRewards(address(msg.sender)); 
        } else {
            uint256 amount = _C_NestPool.withdrawNToken(address(msg.sender), ntoken);
        }
    }
```
----------

- `mineNest() private returns (uint256)`

权限：private 

功能：计算从上一次挖矿到当前区块高度的 nest 产量

```js
    function mineNest() private returns (uint256) {
        uint256 period = block.number.sub(c_mining_nest_genesis_block_height).div(c_mining_nest_yield_cutback_period);
        uint256 nestPerBlock;
        if (period > 9) {
            nestPerBlock = c_mining_nest_yield_off_period_amount;
        } else {
            nestPerBlock = _mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = nestPerBlock.mul(block.number.sub(_latest_mining_height));
        _latest_mining_height = block.number; 
        return yieldAmount;
    }
```
------------
- `mineNToken(address ntoken) private returns (uint128)`

TODO: 未实现

```js
function mineNToken(address ntoken) private returns (uint128) {
    // Nest_NToken miningToken = Nest_NToken(ntoken);
    // (uint256 genesis, uint256 latest) = miningToken.checkBlockInfo();
    // uint256 period = block.number.sub(genesis).div(_ntoken_yield_cutback_period);  //gy: _blockAttenuation = 240万  衰减时间
    // uint256 ntokenPerBlock;
    // if (period > 9) {  
    //     ntokenPerBlock = _ntoken_yield_off_period_amount; //gy: afterMiningAmount   区块平稳期出矿量，默认为 0.4eth; 
    // } else {
    //     ntokenPerBlock = _ntoken_yield_per_block_amount[period]; // gy: 计算 单位区块的出矿量
    // }
    // yieldAmount = ntokenPerBlock.mul(block.number.sub(latest));
    // miningToken.increaseTotal(yieldAmount);  //minting
    // emit MiningNToken(block.number, yieldAmount, ntoken); 
    // return yieldAmount; 
}
```