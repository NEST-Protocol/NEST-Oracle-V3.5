# NEST Protocol Version 3.5

## Development

### Install Dependencies

```
npm install
npm install -g truffle
```

### Build

```shell
truffle compile
```

### Test

```shell
npm run test
```

### Deploy

#### Local Development

```shell
truffle migrate --network development
```

#### Ropsten testnet

```shell
export mnemonic=YOUR_OWN_MNEMONIC
export INFURA_PROJECT_ID=YOUR_OWN_INFURA_PROJECT_ID
truffle migrate --network ropsten
```
