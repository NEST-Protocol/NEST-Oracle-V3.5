# Scripts for voting and governance

## Preparation

$ npx hardhat run scripts/deploy_localhost.js --network localhost
(or $ npx hardhat run scripts/deploy_kovan.js --network kovan)
Please make sure that `.contracts_localhost.json` contains all of the addresses of contracts.

#### Deploy NestVote contract

Deploy `NestVote` to  localhost/testnet/mainnet.

```
$ npx hardhat run --network localhost scripts/deploy_vote.js
```

Initialize parameters of `NestVote`.

```
$ npx hardhat run --network localhost scripts/setup_vote.js
```


#### Grant governance to NestVote

Set governance of `NestPool` to `NestVote` and load the new values to other contracts.

```
$ npx hardhat run --network localhost scripts/grant_gov_to_vote.js
```


## NIP SetParam

```
$ npx hardhat run --network localhost scripts/deploy_nip_set_param.js
```


```
$ npx hardhat run --network localhost scripts/test_nip_set_param.js
```


## NIP Release governance

```
$ npx hardhat run --network localhost scripts/deploy_nip_release_gov.js
```

```
$ npx hardhat run --network localhost scripts/test_nip_release_gov.js
```

## NIP upgrade proxy

```
$ npx hardhat run --network localhost scripts/deploy_nip_upgrade_proxy.js
```

```
$ npx hardhat run --network localhost scripts/deploy_nestdao_impl.js
```

```
$ npx hardhat run --network localhost scripts/test_nip_upgrade_proxy.js
```