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
| block | 22980753 |
|timestamp| 2021-1-12 16:37:0 |
| USDT |  0xbe5b2A10733b85D84D25Cb75385B76DB925305e5 | 
| WBTC |  0x59fE94363880C02Fe2E3F1f70a2c9E76e7b9C3dA | 
|NEST| 0xAF90951414154C3dea695096216FE0aef9222E21 |
| NN |  0x9B8e35a6dB2A2F3B530Ee42Ae430a15349529C99 | 
| IterableMapping |  0xf792e22886b28Ed5AC361573caBc957Dc7309dA5 |  
| NestPool |  0x612d00e32C8b99F6f25Eb6ba7f65f74936674826 | 
| MiningV1Calc |  0x83e81094f876EAB567Ff56A5376949742e055D66 | 
| MiningV1Op |  0x49692FB96aB98bAB073A11933B1827b83d6A9D25 | 
| NestMining |  0x260aB8BdE75697cAd7c20e56F325c6981A646c58 | 
| NestStaking |  0xB79BdCeb7b3B82B64DD4A210CcB9A14b373311CF | 
| NNRewardPool |  0x2B32c2FA5A9474001Cf3a63FDc00AEE0a20D6Af0 | 
| NTokenController | 0xA55D2203aAa0758BcA319af27C730BAf7eCB05E6 |
| NestQuery | 0x7d20754f15e32B821B4308B39a0321FceBf1D379 |
| NestDAO | 0x6f99158bBABF8b0FCb06cE655E799500B509E008 |


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
| latestMiningHeight | 22980700 |
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

- 2021-01-12: update kovan addresses
- 2021-01-06: upgrade kovan addresses
- 2020-12-25: upgrade kovan addresses
- 2020-12-24: upgrade kovan addresses about MiningV1Calc and MiningV1Op
- 2020-12-16: update ropsten addresses
- 2020-12-15: update kovan addresses
- 2020-12-03: update kovan addresses
- 2020-11-14: Upgrade framework to MiningV1
- 2020-11-03: Migrate from truffle to hardhat
