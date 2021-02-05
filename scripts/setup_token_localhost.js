const { BigNumber } = require("ethers");

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

const NEST1M = function (amount) {
    return BigNumber.from(amount).mul(BigNumber.from(10).pow(24));
}

async function main() {

    let tx;
    let receipt;
    
    [deployer, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();
    console.log(`> [INIT]: Accounts ... OK`);

    let filename = `.contracts_${network.name}.json`;

    let contracts = await load_contracts(filename);

    if (contracts.length <= 0) {
        console.log(`> [FATAL] Load ${filename} ... FAILED`);
        return
    }

    console.log(`> [INFO] Load ${filename} ... OK`);


    NestToken = contracts.NEST;

    tx = await NestToken.transfer(userA.address, NEST1M("100"));
    tx.wait(1);

    tx = await NestToken.transfer(userB.address, NEST1M("100"));
    tx.wait(1);
    
    tx = await NestToken.transfer(userC.address, NEST1M("100"));
    tx.wait(1);

    tx = await NestToken.transfer(userD.address, NEST1M("100"));
    tx.wait(1);
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });
