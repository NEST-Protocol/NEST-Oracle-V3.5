
const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest,
    load_contracts, save_contracts } = require("./deploy.js");

const {usdtdec, wbtcdec, nestdec, ethdec, 
        ETH, USDT, WBTC, MBTC, NEST, BigNum, 
        show_eth, show_usdt, show_64x64, timeConverter} = require("./utils.js");

const fs = require('fs');

const {
    assertUpgradeSafe,
    assertStorageUpgradeSafe,
    getStorageLayout,
    fetchOrDeploy,
    getVersion,
    getUnlinkedBytecode,
    getImplementationAddress,
    getAdminAddress } = require('@openzeppelin/upgrades-core');

const contracts = require(`../.contracts_${network.name}.json`);

async function main() {

    let tx;
    let receipt;
    
    let filename = `.contracts_${network.name}.json`;

    [deployer, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();
    console.log(`> [INFO] Load accounts ... OK`);

    let contracts = await load_contracts(filename);

    if (contracts.length <= 0) {
        console.log(`> [FATAL] Load ${filename} ... FAILED`);
        return
    }

    console.log(`> [INFO] Load ${filename} ... OK`);

    // 1. setup NestVote as the new governance 

    tx = await contracts.NestPool.setGovernance(NestVote.address);
    tx.wait();
    console.log(`> [INFO] Set governance to NestVote ... OK ✅`);

    // 2. load governance 

    tx = await contracts.NestMining.loadGovernance();
    tx.wait();
    tx = await contracts.NestStaking.loadGovernance();
    tx.wait();
    tx = await contracts.NestQuery.loadGovernance();
    tx.wait();
    tx = await contracts.NestDAO.loadGovernance();
    tx.wait();
    tx = await contracts.NNRewardPool.loadGovernance();
    tx.wait();
    tx = await contracts.NTokenController.loadGovernance();
    tx.wait();
    tx = await contracts.NestVote.loadGovernance();
    tx.wait();

    console.log(`> [INFO] NestVote.address=${contracts.NestVote.address}`)
    console.log(`> [INFO] NestPool.governance=${await contracts.NestPool.governance()}`)
    console.log(`> [INFO] NestMining.governance=${await contracts.NestMining.governance()}`)
    console.log(`> [INFO] NestVote.governance=${await contracts.NestVote.governance()}`)

    const ProxyAdmin = await upgrades.admin.getInstance();    
    console.log(`> [INFO] proxy.admin=${ProxyAdmin.address}`);

    const owner = await ProxyAdmin.owner();
    console.log(`> [INFO] ProxyAdmin.owner=${owner}`);

    if (owner == deployer.address) {
        tx = await ProxyAdmin.transferOwnership(contracts.NestVote.address);
        tx.wait();
        console.log(`> [INFO] ProxyAdmin.transferOwnership to NestVote(${NestVote.address}) ... OK ✅ ⚠️⚠️⚠️`);
    }
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });
