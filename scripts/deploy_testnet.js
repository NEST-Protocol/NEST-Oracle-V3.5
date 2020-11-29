
const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, 
    setupNest} = require("./deploy.js");

async function main(network) {

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    CUSDT = await deployUSDT();
    CWBTC = await deployWBTC();
    [NestToken, IterableMapping] = await deployNEST();
    NNToken = await deployNN();
    let contracts = {CUSDT: CUSDT, CWBTC: CWBTC, NEST: NestToken, NN: NNToken, IterableMapping: IterableMapping}; 
    let CNest = await deployNestProtocolWithProxy(owner, contracts);
    CNest.CUSDT = CUSDT;
    CNest.CWBTC = CWBTC;
    CNest.NestToken = NestToken;
    CNest.NNToken = NNToken;
    CNest.IterableMapping = IterableMapping;
    // await setupNest(owner, CNest);
}


main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });