# Nest 资金池合约

本模块的作用是保存所有的 nest (包括未挖出)，保存所有的矿工报价单中的 (eth, token)。

## 资产

- nest： 所有的 nest 都放在 NestPool 合约中。

- ntoken: 所有挖出的 ntoken 都放在 NestPool中，然后矿工可以提走 ntoken。

- eth：所有参与报价挖矿的都放到这个合约中

如果升级本合约，需要采用管理员接口把剩下的所有 nest 转移到一个另一个安全的合约中。

## 数据结构

- `_latest_mining_height`: 最近的报价挖矿的区块高度

下面是账本：

- `_eth_balance_minging_pool : uint256`  记录矿池所拥有的 ether
- `_eth_ledger: miner => uint256`  记录每个矿工所拥有的 ether
- `_token_ledger : (token, miner) => amount`: 记录每个矿工拥有的 token 
- `_token_balance_minging_pool : token => amount` 记录矿池所拥有的 token

- `_nest_ledger : miner => amount` 记录每个矿工所拥有的 nest 数量
- `_nest_ledger_dev: amount`  记录开发者奖励的 nest 数量
- `_nest_ledger_NN : amount`  记录超级节点奖励的 nest 数量

- `_ntoken_ledger: ntoken => miner => amount` 记录每个矿工所挖到的 ntoken 数量

下面是一个 ntoken 的映射列表: 

- `_token_ntoken_mapping : token => ntoken` 记录一个 (eth, token) 报价所对应的 ntoken。 ntoken 合约 由 [[Auction]] 合约拍卖产生。

- `_developer_address`：开发者地址，不能为空，可由管理员设置

- `_NN_address`: NN 守护者节点

- `_nest_burning_address` 销毁 nest token 的地址，可由管理员设置

## 参数



## 关键函数

### constructor

- `constructor(address DAOContract) public`
    + `DAOContract` : DAO 治理/投票合约的地址（这个地址假设不会改动）

功能：合约构造器

1. 设置 DAO 合约
2. 设置 报价挖矿合约
3. 设置 nestToken 合约地址
4. 设置 `_latest_mining_height` 为当前区块高度
5. 计算 `_nest_yield_per_block_amount` 第一个区块总量为 400，接下来9年逐年减产 80%（近似一年的减产周期按 `_nest_yield_cutback_period` 来确定）

- `mine() private returns (uint256)`
    + 无参数
    + return >= 0

功能：统计从当前区块开始，到上一次挖矿区块(`_latest_mining_height`)，之间总共能挖出的 nest 数量。如果 nest 挖完，那么会返回 `0`

权限：内部函数

<!-- ```js
uint256 period = block.number.sub(_nest_genesis_block_height).div(_nest_yield_cutback_period);
//_latest_mining_height = block.number;  // 这里似乎不应该有副作用
uint256 nestPerBlock;
if (period > 9) {
    nestPerBlock = _nest_yield_off_period_amount;
} else {
    nestPerBlock = _nest_yield_per_block_amount[period];
}
yieldAmount = attenuation.mul(block.number.sub(_latest_mining_height));
return yieldAmount;
``` -->

### 矿工报价单账户操作

功能：检查矿工账户中的 eth 余额是否充足

- `transferEthToMiningPool(address miner, uint256 ethAmount) public onlyMiningContract`
    + miner: 矿工的账户_C_nest_token_address地址
    + ethAmount 
    + 无返回值

### 调用点

+ Mining.postPriceSheet()

### 副作用

### 实现代码

```js
function transferEthToMiningPool(address miner, uint256 ethAmount) public onlyMiningContract {
    require(ethAmount > 0, "");
    blncs = _eth_ledger[miner];
    require(blncs >= ethAmount, "Insufficient ethers");
    _eth_ledger[miner] = blncs - ethAmount;  //safe_math: checked before
    _eth_balance_minging_pool =  _eth_balance_minging_pool.add(ethAmount);
}
```

```js
function transferTokenToMiningPool(address token, address miner, uint128 amount) public onlyMiningContract {
    require(amount > 0, "");  // 是否可以省去？？

    blncs = _token_ledger[token][miner];
    if (blncs < amount) {
        ERC20(token).safeTransferFrom(address(msg.sender), address(this), amount.sub(blncs));
    }
    _token_ledger[token][miner] = blncs.sub(amount); 
    _token_balance_minging_pool[token] =  _token_balance_minging_pool[token].add(amount);
}
```

```js
function transferEthFromMiningPool(address miner, uint128 ethAmount) public onlyMiningContract {
    require(ethAmount > 0, "");
    blncs = _eth_balance_minging_pool;
    require(blncs >= ethAmount, "Insufficient ethers for mining pool");
    _eth_ledger[miner] = _eth_ledger[miner].add(ethAmount);  
    _eth_balance_minging_pool =  blncs - ethAmount; //safe_math: checked before
}
```

```js
function transferTokenFromMiningPool(address token, address miner, uint128 amount) public onlyMiningContract {
    require(amount > 0, "");  // 是否可以省去？？

    blncs = _token_balance_minging_pool[token];
    require(blncs >= amount, "Insufficient tokens for mining pool");
    _token_ledger[token][miner] = _token_ledger[token][miner].add(amount); 
    _token_balance_minging_pool[token] =  blncs.sub(amount);
}
```

### Nest 转账

功能：将 NestPool 中的 nest token 打给 miner

- `addNest(address miner, uint128 amount) public onlyMiningContract ` 

- `clearNest(address miner) public onlyMingingContract`

功能: 清算 _nest_ledger 中的 nest，把 nest token 转给 miner

实现代码

```js
function addNest(address miner, uint128 amount) public onlyMiningContract {
    require (amount > 0, "");
    _nest_ledger[miner] = _nest_ledger[miner].add(amount);
}
```

-----------------------------------------------------

Callsites:
1. NNReward.claimNNReward()
2. Mining.postPriceSheet()

```js
function clearNest(address miner) public onlyMiningOrNNRewardContract {
    uint128 amount = _nest_ledger[miner];
    require(amount > 0, "");
    if (miner = _NN_address) {
        _C_NNReward.addNNReward(amount);
    } else {
        ERC20(_C_NestToken).transfer(miner, uint256(amount);
    }
}
```

```js
function addNToken(address miner, address ntoken, uint128 amount) public onlyMiningContract {
    require(amount > 0, "");
    require(!ntoken, "");
    _ntoken_ledger[ntoken][miner] = _nest_ledger[ntoken][miner].add(uint256(amount));
}
```

### addEth,  subEth

#### 实现代码

```js
function addEth(address miner, uint128 amount) public onlyMiningContract {
    require (amount > 0, "");
    _eth_ledger[miner] = _eth_ledger[miner].add(amount);
}
```

```js
function subEth(address miner, uint256 amount) public onlyMiningContract {
    require(amount > 0, "");
    blncs = _eth_ledger[miner]; 
    require(blncs >= amount, "");
    _eth_ledger[miner] = blncs - amount;
}
```

```js
function clearEth(address miner) public onlyMiningContract return (uint256 amount) {
    blncs = _eth_ledger[miner]; 
    if (blncs > 0) {
        _eth_ledger[miner] = 0;
    }
    return blncs;
}
```

### withdrawToken()

功能：矿工从矿池中取回某一 token 的全部数量

```js
function withdrawToken(address token, address miner) public onlyMiningContract {
    blncs = _token_ledger[token][miner];
    if (blncs > 0) {
        ERC20(token).safeTransfer(miner, blncs);
        _token_ledger[token][miner] = 0;
    }
    return blncs;
}
```

## ntoken 管理操作

- `getNToken(token) public return (address ntoken)` 

功能: 返回 token 所对应的 ntoken。如果 token 等于 0x0，则返回 nest token

实现:

```js
function getNToken(address token) public return (address notken) {
    if (token == (address)0x0) {
        return _C_nest_token;
    } 
    address ntoken =  _token_ntoken_mapping[token];
    require (ntoken != 0, "");
    return ntoken;
}
```

## 辅助函数

- `getNestBurnAddress() return address`

功能: 返回烧掉 nest token 的地址。

实现:

```js
function getNestBurnAddress() return address {
    return _nest_burning_address;
}
```

## 管理员函数

- `transferNestEmergency(address to) public onlyOwner`
    + to: 把所有的 nest 都转到 `to` 地址上
    + no return

权限：仅管理员调用

功能：在紧急情况下，将所有的 nest token 转移到一个新地址



    

