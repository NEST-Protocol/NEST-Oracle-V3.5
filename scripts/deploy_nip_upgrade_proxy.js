// const {ethers} = require("ethers");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest, 
    load_address, save_address,
    load_contract, save_contract,
    load_contracts, save_contracts} = require("./deploy.js");

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

async function main() {

    let tx;
    let receipt;
    

    [deployer, userA, userB, userC] = await ethers.getSigners();
    console.log(`> [INFO] Load accounts ... OK`);

    let filename = `.contracts_${network.name}.json`;

    let contracts = await load_contracts(filename);

    if (contracts.length <= 0) {
        console.log(`> [FATAL] Load ${filename} ... FAILED`);
        return
    }

    // 1. setup NestVote as the new governance 

    const NIPProxyUpgradeContract = await ethers.getContractFactory("NIPProxyUpgrade");
    NIPProxyUpgrade = await NIPProxyUpgradeContract.deploy();
    await NIPProxyUpgrade.deployTransaction.wait();
    console.log(`> [DPLY] NIPProxyUpgrade deployed, address=${NIPProxyUpgrade.address} ✅`);


    await save_contract(NIPProxyUpgrade, "NIPProxyUpgrade");

    const ProxyAdmin = await upgrades.admin.getInstance();    
    console.log(`> [INFO] proxy.admin=${ProxyAdmin.address}`);

    await save_address(ProxyAdmin.address, "ProxyAdmin");

}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });
