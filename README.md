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
| block | 9622843 |
|timestamp| 2021-2-8 18:20:15 |
| USDT |  0x0B64C90403923d978713EFF36e638192c8F3307E | 
| WBTC |  0x0732596120a9974E3f2784c09D5469029F59299b | 
| NWBTC |  0x62e93A7dD4Ecfded4Ae08a8c080516E02950e39f | 
|NEST| 0x6567da092FF12b00aEf048FDC8Af62aA0aFB0073 |
| NN |  0x73bfd0a9f4A1270F693A4264A963B8Ef3700a1cc | 
| IterableMapping |  0xbC4b8AF67781A209be1601243948f79C3A746521 |  
| NestPool |  0xd49685716A238F0361363E7acCbe3ec26CEBA3ab | 
| MiningV1Calc |  0xA004151Ff7edA4e3F0D25F9c1452F9720b3cda41 | 
| MiningV1Op |  0xf906B5d962345885c543b3D553Cd892cFed20694 | 
| NestMining |  0x66e43f3E39386dE8CA22fEf3e136Ac54de3E51BF | 
| NestStaking |  0xA3946A86902Ed9A29f8DdF5c5af27703625EF930 | 
| NNRewardPool |  0xF6Ac835A5870963DDc8A0B092a4ecB75921F0deb | 
| NTokenController | 0xb3743f283E524c402040CB9B99A6013Afd63AFe8 |
| NestQuery | 0xF0DfdC5Cc55aA01b3C90b9AD7DD994DbDCa6D7Fb |
| NestDAO | 0x8bBfAc5917777299A3129e954d31388DC6130426 |



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
| latestMiningHeight | 9622640 |
| minedNestTotalAmount | NEST(1000) |
| miningEthUnit | 1 |
| nestStakedNum1k |1 |
| biteFeeRate | 1 |
| miningFeeRate | 1 |
| priceDurationBlock | 10 |
| maxBiteNestedLevel | 3 |
| biteInflateFactor | 2 |
| biteNestInflateFactor | 2 |

## Changelog

- 2021-02-08: update ropsten address 
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
