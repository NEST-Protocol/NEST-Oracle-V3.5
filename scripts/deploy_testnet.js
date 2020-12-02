
const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest} = require("./deploy.js");


const contractsDeployed_localhost = require("./.contracts_localhost.js");
const contractsDeployed_kovan = require("./.contracts_kovan.js");

async function main(network) {

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    CUSDT = await deployUSDT();
    CWBTC = await deployWBTC();
    [NestToken, IterableMapping] = await deployNEST();
    NNToken = await deployNN();
    let contracts = {USDT: CUSDT, WBTC: CWBTC, NEST: NestToken, NN: NNToken, IterableMapping: IterableMapping}; 
    let addrOfNest = await deployNestProtocolWithProxy(owner, contracts);
    printContracts("js", addrOfNest);

    // await setupNest(owner, CNest);
}


main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });