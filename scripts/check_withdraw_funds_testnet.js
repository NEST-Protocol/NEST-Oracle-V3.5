const contractsDeployed_localhost = require("./.contracts_localhost.js");
const contractsDeployed_kovan = require("./.contracts_kovan.js");
const contractsDeployed_ropsten = require("./.contracts_ropsten.js");

const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, 
    upgradeNestMiningWithProxy,
    checkDeployment, 
    setupNest} = require("./deploy.js");

const {usdtdec, wbtcdec, nestdec, ethdec, 
        ETH, USDT, WBTC, MBTC, NEST, BigNum,BigN, 
        show_eth, show_usdt, show_64x64, advanceBlock} = require("./utils.js");
        
let provider = ethers.provider;


const main = async function () {

    const contractsDeployed = function () {
        if (network.name === "localhost") {
            return contractsDeployed_localhost;
        } else if (network.name === "kovan") {
            return contractsDeployed_kovan;
        } else if (network.name === "ropsten") {
            return contractsDeployed_ropsten;
        }
    } ();

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    console.log(`> [INIT]: Starting to check Nest-Protocol v3.5 ...`);


    const NestToken = await ethers.getContractAt("IBNEST", contractsDeployed.NEST,
        {
            libraries: {
                IterableMapping: contractsDeployed.IterableMapping
            }
        });

    // NestToken = await ethers.getContractAt("NestToken", contractsDeployed.NestToken);

    NestPool = await ethers.getContractAt("NestPool", contractsDeployed.NestPool);
    NestStaking = await ethers.getContractAt("NestStaking", contractsDeployed.NestStaking);
    NNRewardPool = await ethers.getContractAt("NNRewardPool", contractsDeployed.NNRewardPool);
    NTokenController = await ethers.getContractAt("NTokenController", contractsDeployed.NTokenController);
    NestQuery = await ethers.getContractAt("NestQuery", contractsDeployed.NestQuery);
    NestDAO = await ethers.getContractAt("NestDAO", contractsDeployed.NestDAO);
    NestMining = await ethers.getContractAt("NestMiningV1", contractsDeployed.NestMining, 
        {
            libraries: {
                MiningV1Calc: contractsDeployed.MiningV1Calc, 
                MiningV1Op: contractsDeployed.MiningV1Op} 
        });
  
    const params = await NestMining.parameters();
    const ethNum = BigN(params.miningEthUnit);
    const biteFactor = params.biteInflateFactor;
    const nestStakedNum1k = params.nestStakedNum1k;

    const balnaceOfEth_userA = await NestPool.balanceOfEthInPool(userA.address);
    console.log('> [INIT]: NestPool.balanceOfEthInPool() balnaceOfEth_userA ...... ok');

    const balnaceOfNest_userA = await NestPool.balanceOfNestInPool(userA.address);
    console.log('> [INIT]: NestPool.balanceOfNestInPool() balnaceOfNest_userA ...... ok');

    const balnaceOfNest_NestPool = await NestPool.balanceOfNestInPool(NestPool.address);
    console.log('> [INIT]: NestPool.balanceOfNestInPool() balnaceOfNest_userA ...... ok');

    //console.log("balnaceOfNest_NestPool = ",balnaceOfNest_NestPool.toString());
  
    const balnaceOfToken_userA = await NestPool.balanceOfTokenInPool(userA.address, CUSDT.address);
    console.log('> [INIT]: NestPool.balanceOfTokenInPool() balanceOfTokenInPool_userA ...... ok');
    
    const balnaceOfEth_userB = await NestPool.balanceOfEthInPool(userB.address);
    console.log('> [INIT]: NestPool.balanceOfEthInPool() balnaceOfEth_userB ...... ok');

    const balnaceOfNest_userB = await NestPool.balanceOfNestInPool(userB.address);
    console.log('> [INIT]: NestPool.balanceOfNestInPool() balnaceOfNest_userB ...... ok');


    const balnaceOfToken_userB = await NestPool.balanceOfTokenInPool(userB.address, CUSDT.address);
    console.log('> [INIT]: NestPool.balanceOfTokenInPool() balanceOfTokenInPool_userB ...... ok');

    
    let tx = await NestMining.connect(userA).withdrawEthAndToken(balnaceOfEth_userA, CUSDT.address, balnaceOfToken_userA);
    await tx.wait();
    console.log('> [INIT]: NestPool.withdrawEthAndToken() withdrawEthAndToken of userA ...... ok');
    
    
    tx = await NestMining.connect(userA).withdrawNest(balnaceOfNest_userA);
    await tx.wait();
    console.log('> [INIT]: NestPool.withdrawEthAndToken() withdrawNest of userA ...... ok');
    
    
    tx = await NestMining.connect(userB).withdrawEthAndToken(balnaceOfEth_userB, CUSDT.address, balnaceOfToken_userB);
    await tx.wait();
    console.log('> [INIT]: NestPool.withdrawEthAndToken() withdrawEthAndToken of userB ...... ok');
    
    
    tx = await NestMining.connect(userB).withdrawNest(balnaceOfNest_userB);
    await tx.wait();
    console.log('> [INIT]: NestPool.withdrawEthAndToken() withdrawNest of userB ...... ok');

    
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });