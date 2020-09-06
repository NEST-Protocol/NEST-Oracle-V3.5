# 价格预言机合约 NestPrice

价格预言机模块负责对外提供 价格查询服务，主要对外的接口函数：

- `setFee(token)` 设置针对 token 「价格」的预言机服务费用

- `queryPrice(token)`  查询价格，对外 Client 公开，提供 **随机红包** 奖励
- `checkPrice(token)` 用于链下用户通过 API 查询 token 价格
- `queryPriceForMonthlyClient(token)` 用于包月 Client 的询价服务，不提供红包奖励

- `activateClient()` 激活 Client，设置服务生效时间
- `renewalClient()` 包月续费 Client，设置服务生效时间

- `AmountOfNestClient()`  查询 Client 账户中的红包总额
- `claimNestClient()` 用于提取全部的红包（Nest）到 Client 地址

合约负责维护两个重要的数据结构
1. 一个是 token 的价格信息数据
2. 另一个是关于 client 的信息数据

合约支持一个紧急暂停服务的接口，当服务遇到紧急状态时，会返回给下游一个错误值。

当 Client 调用预言机接口，会付出一定的手续费，一部分手续费会奖励给报价的矿工，另一部分手续费进行挖矿，得到 nest token。

合约支持两种收费模式，一种是按单次收费模式，另一种是按 Client 进行区分，进行包月服务。

TODO: 在 queryPrice() 中有多笔 eth 转账，优化方法是把所有的 eth 一次性发给 BonusPool, 后续再结账

TODO: 询价手续费会给当初报价的矿工进行分成，请注意，这里是给最新的报价矿工分成

TODO: [20200906] 优化？能否让 client 一次充值，多次查询？

### 询价红包算法

1. 每一次 client 询价的时候，记录这时的 block.number 的最后32位,记录在 last_height 中
2. 当 client 第二次询价的时候，判断这时  block.number - last_height < 256，如果否则退出
3. 这时计算 rand = block.hash(last_height) + last_seed，假设 block.hash 是一个符合要求的随机数
4. 根据 rand 的高位等零来计算概率
4. 如果 最高 10 位 = 0， 概率 < 1/1024, 获得 50% 的 nest 红包
5. 如果 最高 6 位 = 0 概率 < 1/64，获得 10% 的 nest 红包
6. 如果 最高 3 位 = 0 概率 < 1/8，获得 1% 的 nest 红包
7. 设置 last_seed = rand 低 32 位

TODO: 增加一个函数来修改询价红包算法的参数

## 数据结构

NestPrice 合约有两个重要的映射表：

- `_token_prices: token => TokenPrice`

从 token address 到 TokenPrice 结构体的映射。一个 TokenPrice 记录当前 Token 的价格服务费用。

*注: 在 NestV3 中，TokenInfo 除了价格费用之外，还保存了按区块的 token 报价，在 V3.5中，报价信息只保存在 NestMining 合约的报价单列表中。*

```js
    struct TokenPrice {    // 改名 <== TokenInfo
        uint256 priceCostLeast;
        uint256 priceCostMost;
        uint256 priceCostSingle;
        uint256 priceCostUser;
    }
```

TODO: TokenPrice 结构体可以优化存储空间，压缩到一个 256B。

- `_clients: client => ClientInfo` 

第二个映射表是维护 Client 的信息。它是从 Client 地址到 ClientInfo 的映射。在 NestV3 中这个映射结构对应 `_addressEffect` 与 `_blocklist`。

```js
    struct ClientInfo {
        // monthlyFee == 0, the client pays fee per query
        // monthlyFee != 0, the client pays fee monthly
        uint32 monthlyFee;
        uint64 startTime;
        uint64 endTime;  // endTime==0 for non-monthly clients
        uint32 lastHeight;
        uint64 lastSeed;
    }
```

ClientInfo 长度为 `256B`，包含月服务费 `monthlyFee`，服务生效时间 `startTime`，截止时间 `endTime`。 

客户服务生效时间 `startTime` 如果是 0， 则表示禁止服务。如果 `endTime` 为 0，则表示该 Client 是按次收费，否则是按月收费。`monthlyFee` 如果为 0，则表示是包月客户，否则为按次收费客户。

包月客户通过调用 `renewalClient()` 进行按月续费。

当 Client 调用服务时，会检查 `now > start_time`。


## 合约变量


- `_x_nest_burn_address`  nest 的销毁地址，需要管理员重置 (与 [[NestPool]] 中的变量设置一致)

- `_x_dev_address` nest dev 奖励地址，需要管理员重置，与[[NestPool]] 中的变量设置一致

## 合约参数

- `c_client_oracle_nest_burned_amount = 10000 ether` : nestToken 销毁数量，改名 <= destructionAmount

- `c_client_activation_duration = 1 days` ： 一个 token 报价服务从注册到激活之间的时间间隔 <= effectTime

- `c_1st_prize_thousandth = 500`  一等奖为 dev 奖池的 50%

- `c_2nd_prize_thousandth = 100` 二等奖为 dev 奖池的 10%

- `c_3rd_prize_thousandth = 10` 二等奖为 dev 奖池的 1%

## 关键函数

-----------------------------------------------------
- `setFee(address token) public onlyAuctionContract` 
    + token: 被报价的 token 合约地址

权限：
1. 被拍卖合约 [[Auction]] 调用
2. 被[[DAO]]合约调用

功能：设置 token 询价的服务费用。在拍卖结束后会被调用一次

改名: NestV3 <= addPriceCost 

Assumes: N/A 

副作用: 修改 `_token_prices[token]` 中的服务费信息

Callsites: 
1. Auction.closeAuction()

资金流向: none

实现: 

```js
function setFee(address token) public onlyAuctionContract {
    TokenPrice storage tp = _token_prices[token];
    tp.priceCostLeast = 0.001 ether;
    tp.priceCostMost = 0.01 ether;
    tp.priceCostSingle = 0.0001 ether;
    tp.priceCostUser = 2;
}
```
<!-- 
-----------------------------------------------------
- `addPrice(ethAmount, tokenAmount, atHeight, token, miner) external onlyMiningContract`
    + ethAmount: eth 数量
    + tokenAmount: token 数量
    + atHeight: 价格生效的区块高度   改名 <= endBlock
    + token: token 合约地址
    + miner: 这个价格的报价挖矿者

TODO: [20200831] 这个函数可以被优化掉，直接在 price sheets 里面取价格
 
权限：只能被报价合约[[Mining]] 调用

功能：为某个 token 追加一个有效的报价，

1. 取出 token 所对应的 tokenInfo
2. 取出 endBlock 所对应的 priceInfo
3. 更新 priceInfo，增加 eth 与 token 的数量，修改报价人信息
4. 如果 endBlock != 上一个报价人的报价区块高度，那么更新 endBlock， 更新指针 frontBlock 指向 latestOffer

Assumes: 访问 `_token_prices`

副作用: 更新 PriceInfo 位于 `_token_prices[token].priceInfoList[atHeight]`，从「价格链表」头部添加新价格

Callsites: 

1. 合约[[Mining]] 中的 `post()` 函数

```js
function addPrice(uint128 ethAmount, uint128 tokenAmount,uint128 atHeight, address token, address owner) publiconlyMiningContract{
    // 增加生效区块价格信息
    TokenPrice storage tp = _token_prices[token];
    PriceInfo storage price = tp.priceInfoList[atHeight];
    price.ethAmount = price.ethAmount.add(ethAmount);
    price.erc20Amount = price.erc20Amount.add(tokenAmount);
    price.owner = owner;
    if (atHeight != tp.latestBlock) {
        // 不同区块报价
        price.prevBlock = tp.latestBlock;
        tp.latestBlock = atHeight;
    }
}
```

-----------------------------------------------------
- `cutPrice(ethAmount, tokenAmount, token, atHeight) external onlyMiningContract`

权限：只能被报价合约[[Mining]] 调用

功能：当一个价格所在的报价单被吃单后，减去相应的报价对数量，相当于降低了这个价格的权重。

Assumes: 访问 `_token_prices`

副作用: 更新 PriceInfo 位于 `_token_prices[token].priceInfoList[atHeight]`

调用者: 

1. 合约 [[Mining]] 中吃单的两个函数， `biteToken()` 与 `biteEth()`

```js
function cutPrice(uint128 ethAmount, uint128 tokenAmount, address token, uint128 atHeight) public onlyMiningContract {
    TokenPrice storage tokenPrice = _token_price[token];
    PriceInfo storage price = tokenPrice.priceInfoList[atHeight];
    priceInfo.ethAmount = price.ethAmount.sub(ethAmount);
    priceInfo.tokenAmount = price.erc20Amount.sub(tokenAmount);
}
``` -->

-----------------------------------------------------
- `queryPrice(token) external payable returns(ethAmount, tokenAmount, atHeight)`
    + token: 取得 token 的预言机价格（经过计算）
    + return: 报价对以及区块生效高度

优化: **高频接口**，需要 GAS 优化

改名: Nestv3 <= updateAndCheckPriceNow()

权限: 公开任何人

功能: 预言机主服务接口

TODO: 如果 token 是一个无效值，则返回 (eth, usd) 的报价 

1. 检查 client 的资质
2. 获得 token 对应的 TokenPrice
3. 寻找第一个不为零的低于当前区块高度的生效价格的区块号，checkBlock // 改名 => priceHeight
4. 得到 nToken 地址，把服务费 eth 的 80% 加入到 nToken 分红池中
5. 付给报价挖矿者的预言机服务费的 20%
6. 把剩余的 eth 打回 client
7. 领取随机红包
8. 产生一个事件，`PriceOracle`
9. 返回 (eth, token, 价格所在区块高度)

Assumes: 
1. token 地址正确
2. NestPool 中 dev 账户有一定数量的 nest token
3. 当前 client 已经被激活

副作用:
1. 修改 _clients[msg.sender] 中的 lastSeed 与 lastHeight 的值

资金流向:

1. 服务费 eth 的 80% 转给 [[BonusPool]]
2. 服务费 eth 的 20% 转给 priceMiner
3. 返还 Client 多余的 eth
4. 领取的随机红包 nest，在 [[NestPool]] 中完成转账 dev => client

事件: PriceQuery(token, ethAmount, tokenAmount, height, msg.sender)

实现:

```js
    function queryPrice(address token) public payable returns (uint256, uint256, uint64) 
    {
        // check
        ClientInfo memory c = _clients[address(msg.sender)];
        require(c.monthlyFee == 0, "No monthly client");
        uint256 startTime = uint256(c.startTime);
        uint256 endTime = uint256(c.endTime);
        require(!startTime && startTime < block.timestamp && endTime == 0, "Client not activated");
    
        // lookup the latest effective price
        (uint256 ethAmount, uint256 tokenAmount, uint256 bn, address miner) = _C_NestMining.lookupTokenPrice(token);
        TokenPrice memory tp = _token_prices[token];  

        address nToken = _C_NestPool.getNTokenFromToken(token); 
        uint256 ethFee = tp.priceCostLeast.sub(tp.priceCostLeast.mul(tp.priceCostUser).div(10));
        // fee * 80% => bonus pool
        _C_BonusPool.pumpinEth{value:ethFee}(address(nToken), ethFee);
        // fee * 20% => miner who posted the price
        TransferHelper.safeTransferETH(miner, tp.priceCostLeast.mul(tp.priceCostUser).div(10));
        // pay back the surplus
        TransferHelper.safeTransferETH(address(msg.sender), msg.value.sub(tp.priceCostLeast));
        
        // randomized mining
        uint32 lh = uint32(block.number - uint256(c.lastHeight)); //safe math
        uint256 pool = _C_NestPool.balanceOfNestInPool(_x_dev_address);
        if (lh < uint32(256) && pool > 0) {
            uint64 hash = uint64(blockhash(block.number - uint256(lh))) + c.lastSeed; //safe math
            uint256 prize = 0;
            if (hash >> 54 == uint64(0)) {
                prize = pool.mul(c_1st_prize_thousandth).div(1000);
            } else if (hash >> 58 == uint64(0)){
                prize = pool.mul(c_2nd_prize_thousandth).div(1000);
            } else if (hash >> 61 == uint64(0)) {
                prize = pool.mul(c_3rd_prize_thousandth).div(1000);
            }
            if (prize > 0) {
                _C_NestPool.transferNestInPool(_x_dev_address, address(msg.sender), prize);
            }
            c.lastSeed = hash;
        } 
        c.lastHeight = uint32(block.number);
        _clients[address(msg.sender)] = c;
        
        emit PriceOracle(token, ethAmount, tokenAmount, bn);
        return (ethAmount, tokenAmount, bn);
    }
```

-----------------------------------------------------


-----------------------------------------------------
<!-- - `getPrice(address token)`

权限: 仅能被 viewonlyMiningContract 调用

功能: 得到 token 的最新的生效价格

参数要求:

副作用:

资金流向: none

实现: 

```js
function getPrice(address token) public viewonlyMiningContract returns(uint128 ethAmount, uint128erc20Amount) {
    TokenPrice storage tp = _token_prices[token];
    uint256 bn = tp.latestBlock;
    while(bn > 0 && (bn >= block.number || tp.priceInfoList[bn].ethAmount == 0)) {
        bn = tp.priceInfoList[bn].prevBlock;
    }
    if (bn == 0) {
        return (0,0);
    }
    PriceInfo memory price = tp.priceInfoList[bn];
    return (price.ethAmount, price.erc20Amount);
}
``` -->

-----------------------------------------------------
- `activateClient(monthlyFee) external`

权限：
1. 由 client 调用，任何人

功能：注册激活一个 client 的地址，设置激活时间，销毁 c_client_oracle_nest_burned_amount = 10,000 个 nest

TODO: 
1. 销毁 nest 的操作应该交给 [[NestPool]] 合约
2. 一个已经被激活的client能否被再次激活?

改名: <= activation

Assumes: 
1. 参数 `_x_nest_burn_address` 被正确设置
2. 当前用户还未被激活 

副作用: 
1. 修改 _clients，设置 startTime, endTime, lastSeed, lastHeight
2. 设置 client 服务的起始时间为当前时间 + `c_client_activation_duration`

资金流转: 从 client 账户中销毁若干 nest 

事件: `ClientActivation()`

```js
    function activateClient(uint32 monthlyFee) public {
        ClientInfo memory client;
        client.monthlyFee = monthlyFee;
        client.startTime = now.add(c_client_activation_duration);
        client.endTime = 0;
        client.lastSeed = uint64(keccak256(abi.encodePacked(msg.sender, block.number)));
        client.lastHeight = uint32(block.number);
        _clients[address(msg.sender)] = client;
        emit ClientActivation(address(msg.sender), client.startTime, client.endTime);
        _C_NestToken.transferFrom(address(msg.sender), _x_nest_burn_address, c_client_oracle_nest_burned_amount);
    }
```

-----------------------------------------------------
- `renewalClient(uint8 months) external return (uint64)`
    + months: Client 要续费的月数
    + return: 返回服务截止时间的时间戳

权限：Client 调用，任何人

功能：为包月 Client 续费

Assumes: 
1. months 至少为 1 个月
2. `_clients[msg.sender]` 已经被正确设置，特别是 c.MonthlyFee
3. _C_NestToken 被正确设置
4. _C_BonusPool 被正确设置

副作用: 
1. 更新 `_clients[client].endTime`
2. 调用 [[BonusPool]] 合约，打入 eth，并更改 nest 分红账本

资金流向:
1. ethFee (=months * monthlyFee) | client ==>  [[BonusPool]] 合约
2. 零钱 eth | this ==> client

事件: 客户续费事件 `ClientSubscribe(msg.sender, start_time, end_time, months)`

```js
    function renewalClient(uint8 months) external return (uint64) {
        require(months > 0, "At least one month");
        ClientInfo memory c = _clients[address(msg.sender)];
        uint256 monthlyFee = uint256(c.monthlyFee);
        require(monthlyFee > 0, "only for monthly client");
        ethFee = monthlyFee.mul(1 ether).mul(months);
        require(msg.value >= ethFee, "Insufficient monthly fee");

        if (c.endTime != 0) {
            c.endTime = uint64(uint256(c.endTime).add(uint256(months).mul(1 months))); 
        } else {
            c.endTime = uint64(uint256(c.startTime).add(uint256(months).mul(1 months))); 
        }
        _clients[address(msg.sender)] = c;
        
        emit ClientSubscribe(msg.sender, start_time, end_time, months);
        _C_BonusPool.pumpinEth{value:ethFee}(_C_NestToken, ethFee);
        TransferHelper.safeTransferETH(address(msg.sender), msg.value - ethFee); // safe math;
        return c.endTime;
    }
```

-----------------------------------------------------
- `claimNestClient() return (uint256)` 
    + 返回领取的 nest 数量

权限: Client 调用，任何人

功能: 领取 Client 询价后所领取的随机红包 nest token

Assumes: 
1. _C_NestPool 被正确设置

副作用: 
1. 更改 [[NestPool]] 合约状态

资金流转: 
1. 把 nest 转出 [[NestPool]]，转入到 Client 地址

事件: none

```js
    function claimNestClient() external returns (uint256) {
        return (_C_NestPool.distributeRewards(address(msg.sender)));
    }    
```

-----------------------------------------------------
- `checkPriceNow(tokenAddress) public view returns (ethAmount, erc20Amount, blockNum)`

权限：任何用户公开查看，禁止合约调用

功能：得到当前有效的价格，无需服务费


<!-- 
```js
function queryPrice(address token) public payable return(uint128 ethAmount, uint128 tokenAmount, uint128 blockNum) {
    // 资格检查
    uint256 startTime = _client_service_start_time[target];
    require(!startTime && startTime < now);
    
    // 在价格列表中找到第一个有效的价格
    TokenPrice storage tp = _token_prices[token];  
    uint128 bn = tp.latestBlock;
    while(bn > 0 && (bn >= block.number || tp.priceInfoList[bn].ethAmount == 0)) {
        bn = tp.priceInfoList[bn].prevBlock;
    }
    require(bn != 0);
    // 拿到
    PriceInfo memory price = tp.priceInfoList[bn];
    // 交手续费
    address nToken = _C_NTokenMapping.getNToken(token); 
    uint128 ethFee = tp.priceCostLeast.sub(tp.priceCostLeast.mul(tp.priceCostUser).div(10));
    if (nToken == address(0x0)) { // 默认报价是 nest 还是 usdt
        _C_BonusPool.ethTransferFrom(address(_nestToken), ethFee);
    } else {
        _C_BonusPool.ethTransferFrom(address(nToken), ethFee);
    }
    repayEth(_C_BonusPool, ethFee); 

    // 交服务费分成
    repayEth(tp.owner, tp.priceCostLeast.mul(tp.priceCostUser).div(10));
    // 返还多余的费用
    repayEth(address(msg.sender), msg.value.sub(tp.priceCostLeast));
    emit GetTokenOraclePrice(token, price.ethAmount, price.erc20Amount);
    return (price.ethAmount, price.erc20Amount, bn);
}
``` -->
<!-- 
```js 
function getPriceListOracle(address token, uint8 num) public payable returns (uint128[] memory) {
    // 资格检查
    uint256 startTime = _client_service_start_time[target];
    require(!startTime && startTime < now);
    
    TokenPrice storage tp = _token_prices[token];
    // 收费
    uint32 ethFee = tp.priceCostSingle.mul(num);
    if (ethFee < tp.priceCostLeast) {
        ethFee = tp.priceCostLeast;
    } else if (ethFee > tp.priceCostMost) {
        ethFee = tp.priceCostMost;
    }
    
    // 提取数据
    uint32 length = num.mul(3);
    uint256 index = 0;
    uint128[] memory data = new uint128[](length);
    address priceOwner = address(0x0);
    uint256 bn = tp.latestBlock;
    while(index < length && bn > 0){
        if (bn < block.number && tp.priceInfoList[bn].ethAmount != 0) {
            // 增加返回数据
            data[index++] = tp.priceInfoList[bn].ethAmount;
            data[index++] = tp.priceInfoList[bn].tokenAmount;
            data[index++] = bn;
            if (priceOwner == address(0x0)) {
                priceOwner = tp.priceInfoList[bn].owner;
            }
        }
        bn = tp.priceInfoList[bn].prevBlock;
    }
    require(priceOwner != address(0x0));
    require(length == data.length);
    // 手续费分配
    address nToken = NestPool.getNToken(token);
    if (nToken == address(0x0)) {
        _abonus.switchToEth.value(ethFee.sub(ethFee.mul(tp.priceCostUser).div(10)))(address(_nestToken));
    } else {
        _abonus.switchToEth.value(ethFee.sub(ethFee.mul(tp.priceCostUser).div(10)))(address(nToken));
    }
    repayEth(priceOwner, ethFee.mul(tp.priceCostUser).div(10));
    repayEth(address(msg.sender), msg.value.sub(ethFee));
    return data;
}
``` -->