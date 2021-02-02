// const {ethers} = require("ethers");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest, 
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

    const NestDAOV2Contract = await ethers.getContractFactory("NestDAOV2");
    NestDAOV2 = await NestDAOV2Contract.deploy();
    await NestDAOV2.deployTransaction.wait();
    console.log(`> [DPLY] NestDAOV2 deployed, address=${NestDAOV2.address} ✅`);

    await save_contract(NestDAOV2, "NestDAOV2");

    console.log(`> [INFO] Update file  ... OK `);

}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });



