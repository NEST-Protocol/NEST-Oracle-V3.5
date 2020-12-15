# NEST Protocol Version 3.5

## Introduction

## Development

### Install dependencies

```
npm install
npm install hardhat
npm install @nomiclabs/hardhat-waffle ethereum-waffle chai @nomiclabs/hardhat-ethers ethers
npm install hardhat-contract-sizer hardhat-gas-reporter @openzeppelin/test-helpers
```

### Build

```shell
npx hardhat compile
```

### Test

```shell
npx hardhat accounts
npx hardhat test
```

### Deploy

#### Local development

```shell
npx hardhat scripts/deploy_testnet.js --network localhost
npx hardhat scripts/setup_testnet.js --network localhost
```

#### Kovan testnet

```shell
npx hardhat scripts/deploy_testnet.js --network kovan
npx hardhat scripts/setup_testnet.js --network kovan
```

| Contract | Address |
| ------------ | ------------|
| network | kovan |
| block | 22598957 |
|timestamp|2020-12-15 16:14:28|
| USDT |  0xcBf49379fE6708039c2b6cbB435eE1c331dA86d6 | 
| WBTC |  0xB06B26Ff782C824C0579D20aB666F7640Ab92587 | 
|NEST|0x9039835C77e0D58877608fe17267450d84EdDa59|
| NN |  0xA604637bE34bad76168E62b93ccF2f06EEeCdcE7 | 
| IterableMapping |  0xcbc1726D1d322D0aba92911C04a13400219c2648 |  
| NestPool |  0x61eb0043ae08e80157742f78e0AeA2D216c5125e | 
| MiningV1Calc |  0x8FBc707dfD7eEcF9e08d0C834C92824db6C48a16 | 
| MiningV1Op |  0x994A6b43Ed9bea2a026b3aa19DFfDF6b7A50bfca | 
| NestMining |  0x15810601D74fC81147f10b1BEff6Cf3e949a7add | 
| NestStaking |  0x2F184A26bb92df4fAa596a71a048f5976075f23e | 
| NNRewardPool |  0x84Fccb596731997603218fe998671B593c593ffb | 
| NTokenController | 0x9c16960223ee83ab0398169F336BBe95B0c2F1aB |
| NestQuery | 0xF984b908F27FC845dAC13b841e64e98195eDe884 |
| NestDAO | 0x36b7e0cFEf206bE9E70d1Cd08F15dF067c6F6F32 |

#### Ropsten testnet

Coming soon

##### Initialized parameters


| Parameter | Value |
| network | kovan |
| ------------ | ------------|
| genesisBlockNumber | 6236588 |
| latestMiningHeight | 22598957 |
| minedNestTotalAmount | NEST(1000) |
| miningEthUnit | 1 |
| nestStakedNum1k |1 |
| biteFeeRate | 1 |
| miningFeeRate | 1 |
| priceDurationBlock | 20 |
| maxBiteNestedLevel | 3 |
| biteInflateFactor | 2 |
| biteNestInflateFactor | 2 |
   


## Changelog

- 2020-12-15: update kovan addresses
- 2020-12-03: update kovan addresses
- 2020-11-14: Upgrade framework to MiningV1
- 2020-11-03: Migrate from truffle to hardhat
