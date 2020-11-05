# NestMining

NestMining is the main contract where miners can post price sheets and get NEST tokens as rewards. 

## Changelog

#### 2020-11-05

## Variables

### nestPerChunk

### ethNumPerChunk

### _priceSheetList

### _priceInEffect

### _takers

### _nest_at_height

## Interface

### post()

Prototype: `function close(address token, uint256 index) public noContract`

Auth: `noContract`

Assumes:

Guarantee:

1. reset fields of `priceSheet[token][index]`
2. 

Transfers:

1. NEST(reward)         | `NestPool.pool` ==> `NestPool.miner`  | rewards clearance
2. ETH(ethAmount)       | `NestPool.pool` ==> `NestPool.miner`  | eth unfreezing
3. TOKEN(tokenAmount)   | `NestPool.pool` ==> `NestPool.miner`  | token unfreezing

*NOTE*: 

- `ethAmount` equals to `ethChunk * chunkSize * (1 ether)`
- `tokenAmount` equals to `tokenChunk * chunkSize * tokenPrice`
- `reward` equals to `chunkNum * chunkSize * (all_mined_nest/all_posted_eth)`

Events:

### close()


### withdraw()

Prototype: `function withdrawEth(uint256 ethAmount) public noContract`

Auth: `noContract`

Assumes:

Guarantees: None

Transfers:

1. ETH(ethAmount)       | `NestPool.miner` ==> `miner`  | eth withdrawing

### claim()

Prototype: `function claimAllNest() public noContract`

Auth: `noContract`

Assumes: 

Guarantees: 

Transfers:

1. NEST(all)            | `NestPool.miner` ==> `miner` | nest claiming all

### buyToken

Prototype: `function buyToken(address token, uint256 index, uint256 takeChunkNum, uint256 newTokenPrice, uint256 ethChunkNum) public payable noContract`

Auth: `noContract`

Assumes: 

Guarantees: 

1. _priceSheetList.push()
2. _takers[token][index].push()
3.

Transfers:

1. ETH(value - fee)     | `msg.value` ==> `NestPool.miner`      | eth depositing
2. ETH(fee)             | `msg.value` ==> `NestStaking.pool`    | eth dividends
3. ETH(ethAmount)       | `NestPool.miner` ==> `NestPool.pool`  | eth freezing

*NOTE:*
- `ethAmount = newEthAmount + buyEthAmount`

Events

1. `PricePosted(miner, token, index, ethAmount, tokenAmount)`
2. `TokenBought(miner, token, index, biteEthAmount, biteTokenAmount)`
