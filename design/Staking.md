# Staking 分红/收益模块 

dividend/bonus

本模块的主要功能是讲 预言机服务与报价挖矿所产生的 eth 放入到一个总的分红池中。所有的 NestToken 持有者通过 Staking 的方式，来平分 eth。平均每周领一次分红。

当分红池中的 eth 数量较多时，将一定比例的 eth 放入平准基金作为储蓄。当未来分红池不足的情况下，平准基金通过释放储蓄基金来提高 Staking 的收益率。

分红池单独用一个合约来保存 [[BonusPool]]

主要接口函数为

- `stake(token, amount) external`   质押 nest/ntoken
- `unstake(token, amount) external` 取消质押
- `claim(token) external`   领取分红 eth

管理员接口:

- `pause() onlyOwner`
- `resume() onlyOwner`

## 数据结构

- `_next_bonus_time = 1594958400` = 1594958400：下一次分红期的开始时间 (<= _nextTime ）

- (关键数据)`_next_bonus_counter` 记录现在已经发生了多少次分红 ( <= _times ) 

- (关键数据)`_user_bonus_claimed: token => user => bool` 记录每一个人是否已经领取 nestToken/nToken 所对应的分红 ( <= _getMapping) // TODO: 不必要

- (关键数据)`_user_bonus_claim_hist : token => index => user => amount` 记录每个用户领取分红的历史，记录用户在某轮所质押的 token 数量 (<= _tokenSelfHistory)

- (关键数据) `_token_snapshot_total: (token, int) => amount`  记录第 i 次分红时，所有的 nestToken/nToken 的流通量( <= _tokenAllValueHistory)


- `_staking_state` = 0 | 1 | 2, staking 功能是否处于暂停状态 
    + 0: 正常状态
    + 1: 停止 claim，停止 staking，允许 unstaking
    + 2: 停止 staking/unstaking，停止 claim


## 合约变量

- `x_bonus_time_cycle` = 168 hours : 分红周期，一周  <= _timeLimit

- `x_bonus_duration` = 60 hours : 分红持续时间 <= _getAbonusTimeLimit

## 系统参数

- `x_bonus_nest_life_span` = 1,000,000,000 ether ：按 10亿 进行划分，把 nest 流通量划分为 10 个阶段  <= _expectedSpanForNest

- `x_bonus_ntoken_life_span`  = 1,000,000 ether ：按 一百万 进行划分，把 nToken 流通量划分为 若干个阶段 <= _expectedSpanForNToken

- `x_bonus_minimum` = 100 ether：期望最小的分红量  <= _expectedMinimum

- `x_bonus_life_inc_percentage = 3`  预期分红增量百分比  <= _expectedIncrement 

- `c_saving_level_one` = 10 ： 一级平准储蓄比例， 10%  <= _savingLevelOne

- `c_saving_level_two`= 20;   ：二级平准储蓄比例，20%  <= _savingLevelTwo

- `c_saving_level_three` = 30；: 三级平准储蓄比例，30% <= _savingLevelThree

- `c_saving_level_two_threshold` = 100 ether;  二级阈值，改名 <=   _savingLevelTwoSub

- `c_saving_level_three_threshold`  = 600 ether;  三级阈值，改名 <= _savingLevelThreeSub

## 关键函数

### 质押与分红函数

-----------------------------------------------------

- `stake(nestNtoken, amount) external`
    + nestNtoken: 需要 stake 的 nestNtoken 合约地址
    + amount: 质押的数量

改名:  <= depositIn(amount, token)

权限: 公开，任何人 (TODO: 是否应该禁止合约调用)

功能: 判断是否满足分红时间要求，锁仓 nestToken/nToken，

0. 判断功能是否开启
1. 判断当前时间和 **下次分红时间** `_next_bonus_time` 比较
2. 如果 now < _next_bonus_time
    - 要求 now 在区间 [_next_bonus_time - x_bonus_time_cycle,  _next_bonus_time - x_bonus_time_cycle + x_bonus_duration] 之外
3. 如果 now > _next_bonus_time
    - 计算从 now 开始到 _next_bonus_time 之间存在着几个周期，得到次数 times
    - 计算分红应该的开始时间和结束时间
    - 要求 now 在区间 [startTime, endTime] 之外
4. 存入到 [[BonusPool]] 合约

参数要求 Assumes:

副作用: 
1. 不修改合约变量
2. 调用 [[BonusPool]] 的 `transferFrom()` 函数

资金流向: (nest/ntoken, amount) |  user ==>  [[BonusPool]] 合约

事件: none

```js
function stake(address ntoken, uint256 amount) public {
    // staking 功能打开
        require(_staking_state == 0, "Staking contract is paused");

        uint256 nowTime = block.timestamp;
        uint256 nextTime = uint256(_next_bonus_time);
        uint256 cycle = uint256(x_bonus_time_cycle_hour) * (1 hours);
        uint256 duration = uint256(x_bonus_duration_hour) * (1 hours);

        if (nowTime < nextTime) {
        //  上一个周期有人领取分红
            uint256 startTime = nextTime.sub(cycle);
            uint256 endTime = startTime.add(duration);
            require(!(nowTime >= startTime && nowTime <= endTime), "Bonus-claiming was started ");
        } else {
        //  上一个周期内无人领取分红，导致 _next_bonus_timestamp 未被及时更新
            uint256 times = (nowTime.sub(nextTime)).div(cycle);
            uint256 startNext = nextTime.add((times).mul(cycle));  
            uint256 endNext = startNext.add(duration);             
        }
        // // 转入到 staking 合约，并录入 staking 账本
        _C_BonusPool.lockNToken(msg.sender, ntoken, amount);
}
```

-----------------------------------------------------

- `unstake(nest/ntoken, uint256 amount) external`
    + nest/ntoken: 需要 unstake 的 nest/ntoken
    + amount: 解除质押的数量

改名: <= takeOut

权限: 公开任何人

功能: 解除锁仓 nest/ntoken

Assumes: 
1. 检查 DAO 是否处于投票未结束状态
2. amount > 0

副作用: 
1. 调用 [[BonusPool]] 的 `transferTo()` 函数

事件: none


```js
function unstake(address ntoken, uint256 amount) public {
    // staking 功能打开
    require (_staking_state < 2, "");
    require(amount <= _C_BonusPool.getNTokenAmount(ntoken, address(msg.sender)),  "Insufficient storage balance");
    require(amount > 0, "E: amount should be greater than 0");  
    address sender = address(msg.sender);
    _C_BonusPool.unlockNToken(sender, ntoken, amount);
} 
```

-----------------------------------------------------

- `claim(nest/ntoken) public`
    + nest/ntoken: 领取和 nest/ntoken 相关联的 eth

改名: <= getAbonus()
权限: 任何人

功能: 领取分红收益。每轮第一个领取分红的人承担额外的义务：快照、计算平准储蓄

Assumes:

副作用:
1. 调整 `_next_bonus_time` 与 `_next_bonus_counter`
2. 快照 nest/ntoken 的流通量 `_token_snapshot_total[nest/ntoken][_curr_bonus_index]`
3. 调整平准存储账本 `_bonus_leveling_ledger_eth[nest/ntoken]`
4. 调整分红账本 `_bonus_ledger_eth[nest/ntoken]` 
5. 更新 `_user_bonus_claim_hist` 用户领取记录

资金流转: 
1. 向 msg.sender 发送分红所得 eth
2. 调整 [[BonusPool]] 合约中的分红账本、平准储蓄账本

事件: none

```js
    function claim(address nestNtoken) external 
    {
        // staking 功能打开
        require (_staking_state == 0, "");

        address sender = address(msg.sender);          
        uint256 tokenAmount = _C_BonusPool.getNTokenAmount(nestNtoken, sender);
        require(tokenAmount > 0, "E: insufficient storage balance");
    
        // 计算分红时间
        uint256 startTime;
        uint256 endTime;
        uint256 currIndex;
        uint256 nowTime = block.timestamp;

        (startTime, endTime, currIndex) = calcAndUpdateNextBonusTime(nowTime);
        require(nowTime >= startTime && nowTime <= endTime,
            "E: bonus-claiming not started yet");

        // 快照
        uint256 tokenSnapshot = _token_snapshot_total[nestNtoken][currIndex]; 
        uint256 ethSnapshot = _eth_snapshot_total[nestNtoken][currIndex];
        
            if (tokenSnapshot == 0) {  // `claim` was first invoked in this round
            tokenSnapshot = getNTokenTotalAmount(nestNtoken);
            emit LogUint("tokenTotal", tokenSnapshot/(10**18));
            require(tokenSnapshot > 0, "E: token total flux should not be zero");
            _token_snapshot_total[nestNtoken][currIndex] = tokenSnapshot;
            ethSnapshot = _C_BonusPool.getEthAmount(nestNtoken); 
            require(ethSnapshot > 0, "No bonus in the pool");
            _eth_snapshot_total[nestNtoken][currIndex] = ethSnapshot;

            uint256 minBonusEth = calcMinBonusEth(nestNtoken, tokenSnapshot);
            if (ethSnapshot > minBonusEth) { // deposit saving when bonus is abundant
                uint256 levelEth = calcLeveling(ethSnapshot);
                if (ethSnapshot.sub(levelEth) < minBonusEth) { 
                    _C_BonusPool.moveBonusToLeveling(nestNtoken, ethSnapshot.sub(minBonusEth));
                } else {
                    _C_BonusPool.moveBonusToLeveling(nestNtoken, levelEth);
                }
            } else {  // use saving when bonus is deficient 
                uint256 ethUse = minBonusEth.sub(ethSnapshot);
                if (_C_BonusPool.getLevelingAmount(nestNtoken) >= ethUse) {
                    _C_BonusPool.moveBonusFromLeveling(nestNtoken, ethUse);
                }
            }
        } 
        // 分红计算
        _user_bonus_claim_hist[nestNtoken][currIndex][sender] = tokenAmount;    
    
        uint256 ethBonus = tokenAmount.mul(ethSnapshot).div(tokenSnapshot);
        // pickup ethers to my own account 
        _C_BonusPool.pickupEth(msg.sender, nestNtoken, ethBonus);
    }
```
-----------------------------------------------------

## 管理员函数

- `pause() onlyOwner`

TODO:

暂停服务

-----------------------------------------------------

- `resume() onlyOwner`

重启服务

TODO:

副作用 

+ 更新 `_bonus_cycle_no`, ``

## 辅助内部函数

```js
function calcLeveling(uint128 ethBonus) private return (uint128 ethLeveling) {
    if (ethBonus > 5000 ether) {
        levelEth = ethBonus.mul(x_saving_level_three).div(100).sub(x_saving_level_three_threshold);
    } else if (ethBonus > 1000 ether) {
        levelEth = ethBonus.mul(x_saving_level_two).div(100).sub(x_saving_level_two_threshold);
    } else {
        levelEth = ethBonus.mul(x_saving_level_one).div(100);
    }

}

function calcMinBonusEth(address nestNtoken) private return (uint128 minBonusEth){
    uint256 century;
    if (nestNtoken == address(y_nest_contract_address)) {
        century = tokenTotal.div(x_nest_bonus_life_span);
    } else {
        century = tokenTotal.div(x_ntoken_bonus_life_span);
    }
    uint256 minBonusEth = x_bonus_minimum;
    for (uint256 i = 0; i < century; i++) {
        minBonusEth = minBonusEth.add(minBonusEth.mul(x_bonus_life_inc_percentage).div(100));
    }
    return minBonusEth;
}

function calcAndUpdateNextBonusTime() private return (uint64 startTime, uint64 endTime, uint128, currIndex) {
    uint128 nextTime = _next_bonus_time;
    uint cycle = x_bonus_time_cycle;

    uint64 startTime;
    uint64 endTime;
    uint currIndex;

    if (nowTime >= nextTime) {
        uint64 c = (nowTime.sub(nextTime)).div(cycle);
        startTime = _next_bonus_timestamp.add((c).mul(cycle));
        endTime = startTime.add(x_bonus_duration);

        // 如果当前函数能正常执行完毕，那么下面两个关键变量会被修改
        // _next_bonus_counter 表示第几次快照，_next_bonus_timestamp 每次更新， _next_bonus_counter++
        _next_bonus_time = startTime.add(cycle);
        _next_bonus_counter = _next_bonus_counter.add(1);
    } else {
        startTime = nextTime.sub(cycle);
        endTime = startTime.add(x_bonus_duration);

    }
    currIndex = _next_bonus_counter.sub(1);
    return (startTime, endTime, currIndex);
}
```


