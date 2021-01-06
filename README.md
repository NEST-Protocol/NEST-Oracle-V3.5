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
| block | 22741430 |
|timestamp| 2020-12-24 23:41:40 |
| USDT |  0x9aB348f15Bf3CAd27542c4cF07891C5DfCf80bbD | 
| WBTC |  0x8987FFafed5DB95Df695cD81419f51754E5c2D03 | 
|NEST| 0xE9Bb75DECa4Cf70Acd3d1ec2aFD840f760E31B07 |
| NN |  0x7CbE1918bA3bC0d30dD0cAC2391F6f7434c1929F | 
| IterableMapping |  0x21A183fbdbb0bBf303cDB0E3f205Db092A38BFB3 |  
| NestPool |  0x4A3D5D1c95aC73C6b02Bd3b4252EF54EF47170A4 | 
| MiningV1Calc |  0x9Be21a958A27AA67105Ba7dbebbE082C311e4234 | 
| MiningV1Op |  0x0Bb79bfc11e5e6d6857ab8c82a60242Caa1Ca490 | 
| NestMining |  0x66faAF2f2F052602823766085555448306556763 | 
| NestStaking |  0x57669663fd38a0bD5383132BbFC27E156158b9b1 | 
| NNRewardPool |  0x069b4E4F3806AE8A51ca505035F764C6C30cDf1d | 
| NTokenController | 0xA55D2203aAa0758BcA319af27C730BAf7eCB05E6 |
| NestQuery | 0x9e7f2f096F9A1c3630b017d4C06DD54231DF420a |
| NestDAO | 0xE9EDb48cc2bc9f3Ed09d4c082D4e75FbEaD35A70 |

#### Ropsten testnet

```shell
npx hardhat scripts/deploy_testnet.js --network ropsten
npx hardhat scripts/setup_testnet.js --network ropsten
```

| Contract | Address |
| ------------ | ------------|
| block | 9269298 |
|timestamp| 2020-12-16 11:42:53 |
| USDT |  0xb8094cfE8e7e1F86cE701B90732974bf7f445685 | 
| WBTC |  0x0A55aB5c97660d5481c4befC164dAB9384DAe98d | 
|NEST| 0x83A14BEbA0e93FfEd9dEdCFB2fFB41AD26BD11eC |
| NN |  0x4D2B05366Bb2c57C8648311745358a0edE1392f2 | 
| IterableMapping |  0xbaFB9df826550199ee97e77583F4723305BCe48a |  
| NestPool |  0x4D7c1D2c332f3E7520D270aED5181E9296d8C722 | 
| MiningV1Calc |  0x7648cB2e24cB3D53d065b78F087F014Af3FF4595 | 
| MiningV1Op |  0x030290AC062E51B141E1eBD713a76585b92abaA0 | 
| NestMining |  0x597a107db06Ca9A9fcd1f193B9f39743f926dc53 | 
| NestStaking |  0xade85E22e757c19D87a88653011cEfec8ec2C45f | 
| NNRewardPool |  0xE5D5B94F1054e87aB5F9Ad376af1cBB2B6c16c7D | 
| NTokenController | 0x1eb958658c752510FC25C9c03eA6d5281fB64a32 |
| NestQuery | 0xc726A3ae2c9bB2A904b4B62Cf59f5092ba8B6126 |
| NestDAO | 0xfcDCE6D28498Cc8078db1D9Aa7B5a39390f689f1 |



##### Initialized parameters


| Parameter | Value |
| ------------ | ------------|
| network | kovan |
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
   

| Parameter | Value |
| ------------ | ------------|
| network | ropsten |
| genesisBlockNumber | 6236588 |
| latestMiningHeight | 9269160 |
| minedNestTotalAmount | NEST(1000) |
| miningEthUnit | 1 |
| nestStakedNum1k |1 |
| biteFeeRate | 1 |
| miningFeeRate | 1 |
| priceDurationBlock | 5 |
| maxBiteNestedLevel | 3 |
| biteInflateFactor | 2 |
| biteNestInflateFactor | 2 |

## Changelog

- 2021-01-06: upgrade kovan addresses
- 2020-12-25: upgrade kovan addresses
- 2020-12-24: upgrade kovan addresses about MiningV1Calc and MiningV1Op
- 2020-12-16: update ropsten addresses
- 2020-12-15: update kovan addresses
- 2020-12-03: update kovan addresses
- 2020-11-14: Upgrade framework to MiningV1
- 2020-11-03: Migrate from truffle to hardhat
