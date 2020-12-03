# Nest Protocol Version 3.5

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
| block | null |
|timestamp|2020-12-3 10:29:40|
| USDT |  0x353d1072d364d039cb4240C27E8aC7e9f8c29fcF | 
| WBTC |  0x7ea91E575bc2452922c8732E36D9AB69a1Af629a | 
|NEST|0x2948e1Bc9dF602046e334A6Be9B6aF0f26d42265|
| NN |  0x899d44e1b5716084be7674a1da3DeD731fBda3c4 | 
| IterableMapping |  0xf153d2d20AF647D6b47259fd6557Af318151fba9 |  
| NestPool |  0x4034645552A9bf1e453D9b658733E1965526E398 | 
| MiningV1Calc |  0x532253f0Ab671A26a659c93a29dAf48ea27CFf60 | 
| MiningV1Op |  0xcABCc7bDC525749C75A801c748e8E71b5644Ae3e | 
| NestMining |  0xe0E4d947Fc48459110C5C86264ee469752065b86 | 
| NestStaking |  0xe5684Db2654fa11c5c3D9f55D6fdd62b74bcfCAd | 
| NNRewardPool |  0x015Ea0EFD9612706B10a024EdFA6349ecC953685 | 
| NTokenController | 0x8f25c64872eb5f713f3E365596a0EDBd163A7D65 |
| NestQuery | 0x0Ee4Fbf902073c7213155d48A6e0C213B7D3C139 |
| NestDAO | 0xB8Ec9706aEe308152FA785144D209C36096d113d |

#### Ropsten testnet



##### Initialized parameters

| Parameter | Value |
| ------------ | ------------|
| genesisBlockNumber | 6236588 |
| latestMiningHeight | 22397738 |
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

- 2020-12-03: update kovan addresses
- 2020-11-14: Upgrade framework to MiningV1
- 2020-11-03: Migrate from truffle to hardhat
