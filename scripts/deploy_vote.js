
const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest,
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

const contracts = require(`../.contracts_${network.name}.json`);

const write_to_file = `.nest3.6_${network.name}.json`

const voteParams = {
    voteDuration: 100,    
    acceptancePercentage: 51,   
    proposalStakingAmount: NEST(100),
    minimalVoteAmount: NEST(10), 
}

async function main() {

    let tx;
    let receipt;
    
    [deployer, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();
    console.log(`> [INFO] Load accounts ... OK`);

    let filename = `.contracts_${network.name}.json`;

    let contracts = await load_contracts(filename);

    if (contracts.length <= 0) {
        console.log(`> [FATAL] Load ${filename} ... FAILED`);
        return
    }

    const NestVoteContract = await ethers.getContractFactory("NestVote");
    const NestVote = await NestVoteContract.deploy(NestPool.address);
    await NestVote.deployTransaction.wait();    
    contracts.NestVote = NestVote;

    console.log(`> [DPLY] NestVote deployed, address=${NestVote.address} ✅`);

    const ProxyAdmin = await upgrades.admin.getInstance();
    contracts.ProxyAdmin = ProxyAdmin;

    console.log(`> [INFO] ProxyAdmin.address=${ProxyAdmin.address}`);

    await save_contracts(contracts, filename);

    console.log(`> [INFO] Update file ${filename} ... OK `);

    // TODO: read parameters from NestVote
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });






