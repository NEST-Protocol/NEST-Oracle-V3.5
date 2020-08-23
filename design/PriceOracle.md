# 价格预言机合约 PriceOracle

价格预言机模块负责对外提供 价格查询服务，主要对外的接口函数：

- `setFee(token)` 设置针对 token 「价格」的预言机服务费用

- `queryPrice(token)`  查询价格，对外 Client 公开
- `addPrice(token)` 增加token的价格信息，仅对[[Mining]] 合约公开
- `checkPrice(token)` 用于链下用户通过 API 查询 token 价格
- `getPrice(address token)`

- `activateClient()` 激活 Client，设置服务生效时间
- `topupClient()`  Client 进行充值，仅对于包月的 Client 生效。

合约负责维护两个重要的数据结构
1. 一个是 token 的价格信息数据
2. 另一个是关于 client 的信息数据

合约支持一个紧急暂停服务的接口，当服务遇到紧急状态时，会返回给下游一个错误值。

当 Client 调用预言机接口，会付出一定的手续费，一部分手续费会奖励给报价的矿工，另一部分手续费进行挖矿，得到 nest token。

合约支持两种收费模式，一种是按单次收费模式，另一种是按 Client 进行区分，进行包月服务。

TODO: 在 queryPrice() 中有多笔 eth 转账，优化方法是把所有的 eth 一次性发给 BonusPool, 后续再结账

## 数据结构

价格预言机合约有两个重要的映射表：

- `_token_prices: token => TokenPrice`

从 token 地址到 TokenInfo 结构体的映射。一个 TokenInfo 记录当前 Token 的价格服务费用还有产生的按区块排列的价格列表。

区块

```js
struct TokenInfo { //  token报价信息
    mapping(blockno => PriceInfo) priceInfoList;  //  区块价格列表,区块号 => 区块价格
    uint128 latestBlock;    //  最新生效区块 
    uint32 priceCostLeast;  //  价格 ETH 最少费用  <= priceCostLeast
    uint32 priceCostMost;   //  价格 ETH 最多费用 
    uint32 priceCostSingle;  //  价格 ETH 单条数据费用
    uint32 priceCostUser;  //  价格 ETH 费用用户比例
}
```

TokenInfo 结构体的第一个变量为 从区块高度到 PriceInfo 的映射，在这个映射上，价格形成了一个单向链表结构。`latestBlock` 为链表头指针。

下面是 PriceInfo 的定义，其长度为 `3 * 256b` 的结构体，包含价格的报价人地址 `priceMiner`（用于服务费分成），价格对，指向上一个价格信息的区块高度 `prevBlock`

```js
struct PriceInfo {//  区块价格
    address priceMiner;  //  报价地址  // 
    uint128 ethAmount;  //  ETH 数量
    uint128 tokenAmount; //  ERC20 数量
    uint128 prevBlock; //  上一个生效区块
    uint128 _padding;
}
```
*注: 这里的 priceInfoList 字段也可以用数组表示，但是否省 GAS 需要讨论*

- `_clients: client => ClientInfo` 

从 Client 地址到 ClientInfo 的映射。在 NestV3 中这个映射结构对应 `_addressEffect` 与 `_blocklist`。

ClientInfo 长度为 `256b` 包含，月服务费 `monthly`，服务生效时间 `startTime`，截止时间 `endTime`。 

客户服务生效时间如果是 (uint256)(-1)， 则表示禁止服务。如果 `endTime` 为 (uint256)(-1)，则表示该 Client 是按次收费，否则是按月收费。

客户通过调用 `TopupClient()` 进行按月续费。

当 Client 调用服务时，会检查 `now > start_time`。

```js
struct ClientInfo {
    uint32 monthly;
    uint96 _padding;
    uint64 startTime;
    uint64 endTime;
}
```

## 参数

- `x_client_oracle_nest_burned_amount = 10000 ether` : nestToken 销毁数量，改名 <= destructionAmount

- `x_client_activation_duration = 1 days` ： 一个 token 报价服务从注册到激活之间的时间间隔 <= effectTime

- `x_nest_burn_address`  nest 的销毁地址，需要管理员重置 (与 [[NestPool]] 中的变量设置一致)

## 关键函数

-----------------------------------------------------
- `setFee(address token) public onlyAuctionContract` 
    + token: 被报价的 token 合约地址

权限：只能被拍卖合约 [[Auction]] 调用

功能：设置 Price Oracle 的价格，在拍卖结束后调用

改名: NestV3 <= addPriceCost 

Assumes: 

副作用: 修改 `_token_prices[token]` 中的服务费信息

Callsites: 
1. NToken.closeAuction()

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

-----------------------------------------------------
- `addPrice(ethAmount, tokenAmount, atHeight, token, miner) external onlyMiningContract`
    + ethAmount: eth 数量
    + tokenAmount: token 数量
    + atHeight: 价格生效的区块高度   改名 <= endBlock
    + token: token 合约地址
    + miner: 这个价格的报价挖矿者

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
```

-----------------------------------------------------
- `queryPrice(token) external payable returns(ethAmount, erc20Amount, atHeight)`
    + token: 取得 token 的预言机价格（经过计算）
    + 返回报价对加上区块生效高度

**高频接口**，需要 GAS 优化

改名: Nestv3 <= updateAndCheckPriceNow()

权限: 公开任何人

功能: Oracle 主服务接口。如果 token 是一个无效值，则返回 (eth, usd) 的报价 

1. 检查 client 的资质（黑名单？是否注册？地址是否生效？）
2. 获得 token 信息 tokenInfo
3. 寻找第一个不为零的低于当前区块高度的生效价格的区块号，checkBlock // 改名 => priceHeight
4. priceHeight 不能为零 // 似乎可以优化掉
5. 获得 priceHeight 处的报价信息 priceInfo
6. 得到 nTokenMapping 的 nToken 地址，如果 nToken == 0，则把服务费 eth 的 80% 加入到 nestToken 分红池中，否则将 服务费 eth 的 80% 放入 nToken 所对应的分红池中
7. 付给报价挖矿者的预言机服务费的 20%
8. 把剩余的 eth 打回给 client
9. 产生一个事件，`NowTokenPrice`
10. 返回 (eth, token, 价格所在区块高度)

Assumes: `_clients`, `_token_prices`

副作用: none

资金流向:

1. 服务费 eth 的 __% 转给 [[BonusPool]]
2. 服务费 eth 的 20% 转给 priceMiner
3. 返还 Client 多余的 eth
4. 挖矿所得 nest/ntoken，在 [[NestPool]] 中记账

事件: PriceQuery(token, ethAmount, tokenAmount, height, msg.sender)

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
```

-----------------------------------------------------

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
```

-----------------------------------------------------
- `getPrice(address token)`

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
```

-----------------------------------------------------
- `activateClient() external`

权限：由 client 调用，任何人

功能：注册激活一个 client 的地址，设置激活时间，销毁 x_token_price_oracle_nest_burned_amount = 10,000 个 nest

改名 <= activation

Assumes: 
1. 从参数 `x_nest_burn_address` 得到销毁得知
2. Client 要委托 [[PriceOracle]] 合约转账 nest，实现 burn nest 

副作用: 设置 client 服务的起始时间， `x_client_activation_duration`

资金流转: 从 client 账户中销毁若干 nest 

事件: none

```js
function activateClient() public {
    uint256 burningAddr = _C_NestPool.getNestBurnAddress();
    uint64 burned = x_client_oracle_nest_burned_amount;
    uint64 period  = x_client_activation_duration;
    _nest_token_contract.safeTransferFrom(address(msg.sender), burningAddr, burned);
    _client_service_start_time[address(msg.sender)] = now.add(period);  // gy: effectTime 默认是一天，
}
```

-----------------------------------------------------
- `topupClient(uint8 months) external return (uint64)`
    + months: Client 要续费的月数
    + 返回服务截止时间的时间戳

权限：Client 调用，任何人

功能：为 Client 续费

Assumes: `_clients`

副作用: 
1. 更新 `_clients[client].endTime`
2. 调用 [[BonusPool]] 合约，更改 nest 分红账本

资金流转: (eth, months * monthly) | client ==>  [[BonusPool]] 合约

事件: 客户续费事件 ClientSubscribe(msg.sender, start_time, end_time)

```js
function topupClient(uint8 months) external return (uint64) {
    require(months > 0, "");
    ClientInfo storage c = _clients[address(msg.sender)];
    ethFee = c.monthly.mul(months);
    require(msg.value > ethFee, "");

    emit ClientSubscribe(msg.sender, start_time, end_time);
    _clients[address(msg.sender)] = c.endTime.add(months.mul(1 months)); 
    _C_BonusPool.ethTransferFrom(_C_NestToken, ethFee);
    repayEth(address(_C_BonusPool), ethFee);
}
```

-----------------------------------------------------
- `claimNestClient() return (uint128)` 
    + 返回领取的 nest 数量

权限: Client 调用，任何人

功能: 领取 Client 询价后挖到的 nest

Assumes: [[NestPool]] 合约的 `_nest_ledger`

副作用: 更改 [[NestPool]] 合约状态

资金流转: 把 nest 转出 [[NestPool]]，转入到 Client 地址

事件: none

```js

```

-----------------------------------------------------
- `checkPriceNow(tokenAddress) public view returns (ethAmount, erc20Amount, blockNum)`

权限：任何用户公开查看，禁止合约调用

功能：得到当前有效的价格，无需服务费


