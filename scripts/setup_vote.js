
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

    tx = await NestVote.setParam(1, voteParams.voteDuration);
    tx.wait(1);
    console.log(`> [INIT] NestVote.setParam(1) ... OK ✅`);
    tx = await NestVote.setParam(2, voteParams.acceptancePercentage);
    tx.wait(1);
    console.log(`> [INIT] NestVote.setParam(2) ... OK ✅`);
    tx = await NestVote.setParam(3, voteParams.proposalStakingAmount);
    tx.wait(1);
    console.log(`> [INIT] NestVote.setParam(3) ... OK ✅`);
    tx = await NestVote.setParam(4, voteParams.minimalVoteAmount);
    tx.wait(1);
    console.log(`> [INIT] NestVote.setParam(4) ... OK ✅`);

    // TODO: read parameters from NestVote
    tx = await NestVote.voteDuration();
    console.log("voteDuration = ", tx.toString());

    tx = await NestVote.acceptancePercentage();
    console.log("acceptancePercentage = ", tx.toString());

    tx = await NestVote.proposalStakingAmount();
    console.log("proposalStakingAmount = ", tx.toString());

    tx = await NestVote.minimalVoteAmount();
    console.log("minimalVoteAmount = ", tx.toString());
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });






