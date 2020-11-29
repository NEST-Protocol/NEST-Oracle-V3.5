# Nest Protocol Version 3.5

## Introduction

## Development

### Install Dependencies

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

#### Local Development


#### Kovan testnet

| Contract | Address |
| ------------ | ------------|
| USDT |  0x4349C96f686973d3A6C2BE0D18ADBB7002E7E486 | 
| WBTC |  0xa71aeaD2011C0810f608109e35d71d67b5892B8d | 
| IterableMapping |  0x861a88C3419c8F7e9412ef751332c5bE72aB041F | 
| NEST |  0x1dF3eb17e2b38Ce354f3DE5ECa41137e969B9B60 | 
| NNToken |  0xffd7270664D15A32f84852BdD5E10064Fe67AF07 | 
| NestPool |  0x0cAB66dB4b1A9f9719bB0E654BF066fA8245d50c | 
| NestMining |  0x727F46f177cc49854873FB6872e5ef64408f9dF9 | 
| NestStaking |  0x0ab354949E511a0C766a5aA2830B290F618467F1 | 
| NNRewardPool |  0x9F10F2a1261ab01a97cd57F86b0795E394224973 | 
| NTokenController |  0x2E5690d9D53C47E7B2Ea7af02842Abb9130DAe64 | 
| NestQuery |  0xc76dE07116fF220a5d859B85CCe48Cb2aCc4d4dB | 


## Changelog

- 2020-11-14: Upgrade framework to MiningV1
- 2020-11-03: Migrate from truffle to hardhat