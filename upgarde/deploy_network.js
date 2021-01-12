
const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, deployNWBTC,
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest} = require("./deploy.js");

async function main() {
     console.log(`>>> [DPLY] start deploy address .......`);
    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();
    console.log(`> [INIT]: Starting to deploy address ... ok`);

    NNToken = await deployNN();
    console.log(`> [INIT]: Starting to deployNN ... ok`);

    let contracts = {NN: NNToken}; 
    let addrOfNest = await deployNestProtocolWithProxy(owner, contracts);
    console.log(`>>> [DPLY] deployNestProtocolWithProxy .......ok`);

    printContracts("js", addrOfNest);
}


main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });