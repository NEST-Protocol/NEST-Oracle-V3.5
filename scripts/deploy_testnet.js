
const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest} = require("./deploy.js");


// const contractsDeployed_localhost = require("./.contracts_localhost.js");
// const contractsDeployed_kovan = require("./.contracts_kovan.js");

async function main() {
     console.log(`>>> [DPLY] start deploy address .......`);
    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();
    console.log(`>>> [DPLY] get address .......ok`);

    CUSDT = await deployUSDT();
    console.log(`>>> [DPLY] deployUSDT .......ok`);

    CWBTC = await deployWBTC();
    console.log(`>>> [DPLY] deployWBTC .......ok`);

    [NestToken, IterableMapping] = await deployNEST();
    console.log(`>>> [DPLY] deployNEST .......ok`);
    
    NNToken = await deployNN();
    console.log(`>>> [DPLY] deployNN .......ok`);

    let contracts = {USDT: CUSDT, WBTC: CWBTC, NEST: NestToken, NN: NNToken, IterableMapping: IterableMapping}; 
    let addrOfNest = await deployNestProtocolWithProxy(owner, contracts);
    console.log(`>>> [DPLY] deployNestProtocolWithProxy .......ok`);

    printContracts("js", addrOfNest);
    console.log(`>>> [DPLY] deploy address done .......`);

    // await setupNest(owner, CNest);
}


main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });