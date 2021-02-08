# NEST Protocol Version 3.5

## Introduction

- [NestWhitePaper](https://nestprotocol.org/doc/ennestwhitepaper.pdf)
## Documentation

- [Decentralized Price oracle](https://docs.nestprotocol.org/)

### Smart Contract Diagrams

- [Contract Architecture](https://github.com/NEST-Protocol/NEST-Oracle-V3.5/blob/develop-miningv1/docs/nest35_contract_diagrams.pdf)

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
|timestamp| 2021-1-22 15:57:52 |
| USDT |  0xDab1bbE5624723f4C3fE324637123076a6696b00 | 
| WBTC |  0xfB3174BE6d17513DC0D6a528a6dC373A06032736 | 
| NWBTC |  0xd5D71dC47Fa5cA96c99B5e0d5929CBFFD7fb8D19 | 
|NEST| 0x840F6F9b5D71b14F6D402c5c233B273535016C64 |
| NN |  0x59d7FD9Fc47392897c71B8e9AEd3919C1d97AeF2 | 
| IterableMapping |  0x07c5cC570113aa1dfD1943adEe525A009b2B6806 |  
| NestPool |  0x01eecfA850F4Ea6dfb27Db282D5110Cc7578e134 | 
| MiningV1Calc |  0xa6E0Aec695843649a7dC4c360be35d70bE4Cc92D | 
| MiningV1Op |  0x747Ef40ed5843438e82223488aC69e1301552cE5 | 
| NestMining |  0xb68CeEA8d5344A777539F465d87f665E95FbC574 | 
| NestStaking |  0xE97f009764007142c4d23f30E1eA1B1B01cFA2a3 | 
| NNRewardPool |  0x63Ba3bF079b5019054e882cE943026DDBf8c34B7 | 
| NTokenController | 0xB425fdA946e25E044f7E5D5d7E315962Db4e4Fb5 |
| NestQuery | 0x086bfB19dD7d9a7c382E87B1473dFd7894797326 |
| NestDAO | 0x08ae4bFf27b350A1b56acc1fe761f5BD7396e1FC |


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

- 2021-01-22: update kovan addresses
- 2021-01-12: update kovan addresses
- 2021-01-06: upgrade kovan addresses
- 2020-12-25: upgrade kovan addresses
- 2020-12-24: upgrade kovan addresses about MiningV1Calc and MiningV1Op
- 2020-12-16: update ropsten addresses
- 2020-12-15: update kovan addresses
- 2020-12-03: update kovan addresses
- 2020-11-14: Upgrade framework to MiningV1
- 2020-11-03: Migrate from truffle to hardhat
