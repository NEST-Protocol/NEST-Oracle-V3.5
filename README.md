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
| block | 22598957 |
|timestamp| 2020-12-15 16:14:28 |
| USDT |  0xcBf49379fE6708039c2b6cbB435eE1c331dA86d6 | 
| WBTC |  0xB06B26Ff782C824C0579D20aB666F7640Ab92587 | 
|NEST| 0x9039835C77e0D58877608fe17267450d84EdDa59 |
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

- 2020-12-16: update ropsten addresses
- 2020-12-15: update kovan addresses
- 2020-12-03: update kovan addresses
- 2020-11-14: Upgrade framework to MiningV1
- 2020-11-03: Migrate from truffle to hardhat
