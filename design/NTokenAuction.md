# nToken 拍卖合约

本合约完成 nToken 的拍卖。ntoken 是报价矿工为 (eth, token) 报价时所挖到的 ntoken 奖励。ntoken 可以通过 staking 来进行收益分红。创建一个新的报价对的矿工需要创建一个「拍卖」，和其它矿工进行竞价得到 ntoken 的「所有权」，赢得 ntoken 的矿工将能从 ntoken 挖矿中获得一定比例的奖励抽成。

拍卖过程中，大家需要用 nest token 来竞价。

主要接口函数

- `startAuction(address token, uint128 bidAmount)`
- `bidAuction(address token, uint128 bidAmount)`
- `closeAuction(address token)`

## 数据结构

- `_token_denied_list: token => bool`  

禁止 nToken 拍卖的 token 黑名单  <= _tokenBlackList

- `_auctions: token => AuctionInfo` 

nToken 拍卖记录 (改名 <= _auctionList) ，长度为 `3 * 256b`

```js
struct AuctionInfo {
    address winner;  //  最高价出价者 改名 <= latestAddress

    uint128 latestBid;  //  拍卖价格，改名 latestBid 改名 <= auctionValue
    uint128 nestBurnedAmount;   //  最后需要销毁的 nest 资产  改名 <= latestAmount 
    uint64 endTime;  //  结束时间，在在第一次报价后就固定下来                                      
    uint192 _padding;
}
```

- `_auction_token_list[]` 记录所有的在拍卖的 token 列表

- `_token_index = 1`：nToken 编号，从 1 开始计数  改名 <= _tokenNum

## 事件

- `AuctionStart(token, bidAmount, bidder)`

- `AuctionBid(token, bidAmount, bidder)`

- `AuctionEnd(token, bidAmount, winner)`

## 参数

- `x_auction_duration  = 5 days`; 拍卖持续时间， 改名 <= _duration

- `x_auction_nest_burning  = 100,000 ether`; 10万 NestToken，改名 <= _minimumNest


- `x_auction_bid_incentive_percentage = 50`：改名 <= _incentiveRatio

- `x_auction_min_bid_increment = 10000 ether` 最小拍卖价格间隔，改名 <= _minimumInterval  


```js
    // 1 * 256b
    uint64 x_auction_nest_burning;
    uint64 x_auction_min_bid_increment;
    uint64 x_auction_duration;
    uint8 x_auction_bid_incentive_percentage;
```

## 系统参数

- `_C_NTokenMapping`  NTokenMapping 合约
- `_C_NestToken`  nest token 合约
- `_C_PriceOracle`
- `_C_NestPool`

## 关键函数

- `startAuction(token, bidAmount) public`

权限：公开，任何人

功能：开始 token 报价对的拍卖，出价为 bidAmount 个 nest token

1. 把拍卖者的 nest 转账到当前合约
2. 测试一次转账，转一个 token ，再把这个 token 转账回去
3. 设置 _auctions, 更新拍卖信息
4. 设置 _auction_token_list， 添加被拍卖的 token

参数要求 Assumes:

1. 要求 `TokenMapping[token]` 为空，表示这个 token 对应的 ntoken 不存在
2. 要求 `_auctions[token].endTime` 为零，表示这个 ntoken 还未开启拍卖
3. 要求 `bidAmount > x_auction_nest_burning`
4. 要求 token 不在黑名单中，// 这个检查应该提前

副作用 Guarantees: 
1. 设置 `_auctions[token]`
2. 添加记录  `_auction_token_list.push(token)`

资金流向:

1. bidder 需要验证一下 token 是否是一个有效的 erc20 token，他至少需要拥有 1 个token，然后需要向本合约转账 1 token，然后再转账回去 1 token
2. 将 bidder 用以拍卖的 nest token 转账到当前合约

事件: AuctionStart(token, bidAmount, bidder)

- `bidAuction(token, bitAmount) public`

权限：公开，任何人，可以是合约调用者?

功能：加价竞拍

1. 要求出价增量大于 `_minimumInterval`
2. 把出价者的nest token 赚到当前合约
3. 把加价部分的 50%(默认) 作为奖励，加上报价一起返给上一个拍卖者
4. 更新 _auctionList，`latestBid` 记为实际的报价增量（实际保存在当前合约，但用于未来销毁）

参数要求 Assumes:
1. 要求拍卖时间没有结束
2. 要求出价数量大于上一轮出价

副作用 Guarantee:
1. 更新 _auctions[token]

资金流向: 
1. 将竞价者的 nest token 转入到当前合约
2. 将加价的50% 部分与上一个报价数量的 nest token 转给上一个报价者

事件: 
`AuctionBid(token, bidAmount, bidder)`

- `closeAuction(token) public`

权限：公开，所有人

功能：完成拍卖，产生对应的 ntoken，同时设置预言机费用

1. 得到 下一次分红期区间
2. 要求: 当前时间不能在分红区间以内，拍卖完成事件必须和分红事件在时间上隔离开 
3. 要求: 当前时间超出拍卖区间
4. 创建 nToken 合约
5. 销毁 拍卖过程中的 nestToken
6. 调用 [[NTokenMapping]] 合约，增加 nToken 映射
7. 初始化并开通预言机合约 [[PriceOracle]] 中的关于 nToken 的预言机服务功能
8. 增加 `_token_index` 编号

参数要求 Assumes: 
1. token 不能为空
2. _auctions[token] 不为空

副作用 Guarantees:
1. 产生新的 nToken
2. 调用 [[NTokenMapping]], 增加一个 token=>ntoken 映射
3. 调用 [[PriceOracle]], 设置 token 价格预言机服务的费用信息
4. 自增 `_token_index`

事件:
1. `AuctionEnd(token, nToken, auction.winner)`

## 实现

```js
    function startAuction(address token, uint128 bidAmount) external {
        require(_C_NTokenMapping.checkTokenMapping(token) == address(0x0), "Token already exists");
        require(_auctions[token].endTime == 0, "Token is on sale");
        require(bidAmount >= x_auction_nest_burning.mul(1 ether), "AuctionAmount less than the minimum auction amount");
        require(!_token_denied_list[token]);

        // 转账 nest
        require(_C_NestToken.transferFrom(address(msg.sender), address(this), bidAmount), "Authorization failed");

        // 验证 token 是否是一个合法的 erc20， 同时 bidder 要拥有至少 1 枚 token
        ERC20 tokenERC20 = ERC20(token);
        tokenERC20.safeTransferFrom(address(msg.sender), address(this), 1);
        require(tokenERC20.balanceOf(address(this)) >= 1);
        tokenERC20.safeTransfer(address(msg.sender), 1);
        AuctionInfo memory auction = AuctionInfo(
            address(msg.sender),
            bidAmount,
            bidAmount,
            now.add(x_auction_duration), 
            0);

        // 记录拍卖信息
        _auctions[token] = auction;

        // 记入拍卖 token 列表
        _auction_token_list.push(token);

        emit AuctionStart(token, bidAmount, msg.sender)
    }
```

```js
    function bidAuction(address token, uint128 bidAmount) external {
        AuctionInfo storage auction = _auctions[token];

        require(now <= auction.endTime && auction.endTime != 0, "Auction closed");
        require(bidAmount > auction.latestBid, "Insufficient auction amount");
        uint128 inc = bidAmount.sub(auction.latestBid);
        require(inc >= x_auction_min_bid_increment);

        uint128 cashback = inc.mul(x_auction_bid_incentive_percentage).div(100);
        // 更新拍卖信息
        auction.winner = address(msg.sender);
        auction.latestBid = bidAmount;
        auction.nestBurnedAmount = auction.nestBurnedAmount.add(inc.sub(cashback));

        emit AuctionBid(token, bidAmount, msg.sender);

        // 完成转账
        require(_C_NestToken.transferFrom(address(msg.sender), address(this), bidAmount), "Authorization failed");
        require(_C_NestToken.transfer(auction.winner, auction.latestBid.add(cashback)), "Transfer failure");

    }
```

```js
    function closeAuction(address token) external {
        uint64 nowTime = now;
        uint64 startTime;
        uint64 endTime;
        (startTime, endTime, ) = _C_Staking.calcNextBonusTime();

        // 要求不能和分红期冲突
        require(!(nowTime >= startTime && nowTime <= endTime), "conflict with bonus claiming");

        AuctionInfo storage auction = _auctions[token];

        // 需要超出拍卖期
        require(nowTime > auction.endTime && auction.endTime != 0, "Token is on sale");

        //  初始化 NToken
        Nest_NToken nToken = new Nest_NToken(strConcat("NToken", getAddressStr(x_token_index)), strConcat("N", getAddressStr(x_token_index)), address(_C_DAO), address(auction.latestAddress));
        //  销毁剩下的 nest token
        address burnAddr = _C_NestPool.getNestBurnAddress();
        require(_C_NestToken.transfer(burnAddr, auction.nestBurnedAmount), "Transfer failure");
        //  加入 NToken 映射
        _C_NTokenMapping.addTokenMapping(token, address(nToken));
        //  初始化收费参数
        _C_PriceOracle.setFee(token);
        _token_index = _token_index.add(1);
        emit AuctionEnd(token, nToken, auction.winner);
    }
    ```