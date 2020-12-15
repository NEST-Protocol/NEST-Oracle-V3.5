
const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest} = require("./deploy.js");


// const contractsDeployed_localhost = require("./.contracts_localhost.js");
// const contractsDeployed_kovan = require("./.contracts_kovan.js");

async function main() {

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();
    console.log(`> [INIT]: Starting to deploy address ... ok`);

    CUSDT = await deployUSDT();
    console.log(`> [INIT]: Starting to deployUSDT ... ok`);

    CWBTC = await deployWBTC();
    console.log(`> [INIT]: Starting to deployWBTC ... ok`);

    [NestToken, IterableMapping] = await deployNEST();
    console.log(`> [INIT]: Starting to deployNEST ... ok`);
    
    NNToken = await deployNN();
    console.log(`> [INIT]: Starting to deployNN ... ok`);

    let contracts = {USDT: CUSDT, WBTC: CWBTC, NEST: NestToken, NN: NNToken, IterableMapping: IterableMapping}; 
    let addrOfNest = await deployNestProtocolWithProxy(owner, contracts);
    printContracts("js", addrOfNest);
    
    console.log(`> [INIT]: achieved to deploy address ... ok`);
    // await setupNest(owner, CNest);
}


main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });