const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, 
    upgradeNestMiningWithProxy,
    checkDeployment, getContractsFromAddrList,
    setupNest} = require("./deploy.js");

const contractsDeployed_localhost = require("./.contracts_localhost.js");
const contractsDeployed_kovan = require("./.contracts_kovan.js");

const main = async function () {

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    await checkDeployment(owner, contractsDeployed_localhost, userA, userB);
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });