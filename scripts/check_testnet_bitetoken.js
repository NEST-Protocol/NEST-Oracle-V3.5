const  contractsDeployed_localhost = require("./.contracts_localhost.js");
const  contractsDeployed_kovan = require("./.contracts_kovan.js");
const  contractsDeployed_ropsten = require("./.contracts_ropsten.js");

const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, 
    upgradeNestMiningWithProxy,
    checkDeployment, 
    setupNest} = require("./deploy.js");

const {usdtdec, wbtcdec, nestdec, ethdec, 
        ETH, USDT, WBTC, MBTC, NEST, BigNum,BigN, 
        show_eth, show_usdt, show_64x64, advanceBlock,goBlocks} = require("./utils.js");
        
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

    CUSDT = await ethers.getContractAt("UERC20", contractsDeployed.USDT);

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
    await NestMining.loadContracts();
    await NNRewardPool.loadContracts();
    await NestDAO.loadContracts();
  
    const params = await NestMining.parameters();
    const ethNum = BigN(params.miningEthUnit);
    const biteFactor = params.biteInflateFactor;
    const nestStakedNum1k = params.nestStakedNum1k;
    
    const NToken = await NestPool.getNTokenFromToken(CUSDT.address);
    //console.log("NToken = ",NToken);
    
    let tx = await NestMining.connect(userA).post2(CUSDT.address, ethNum, USDT(450), NEST(1000), { value: ETH(ethNum.mul(2).add(1))});
    console.log('> [INIT]: NestMining.post2() userA post2 ...... ok');
     
    await tx.wait(1);
    console.log('>>> [WAIT]: waited 1 blocks ...... ok');

    const index_post_usdt = await NestMining.lengthOfPriceSheets(CUSDT.address);
    const index_post_ntoken = await NestMining.lengthOfPriceSheets(NestToken.address);
    console.log("index_post_usdt = ",index_post_usdt.toString());
    console.log('> [INIT]: NestMining.lengthOfPriceSheets() lengthOfPriceSheets() ...... ok');

    const pricesheet_post_usdt_pre = await NestMining.fullPriceSheet(CUSDT.address, index_post_usdt.sub(1));
    
    tx = await NestMining.connect(userB).biteToken(CUSDT.address, index_post_usdt.sub(1), ethNum, USDT(300), { value: ETH(ethNum.mul(biteFactor).add(ethNum).add(1)) });
    console.log('> [INIT]: NestMining.biteToken() bitetoken() ...... ok');
    
    await tx.wait(6);
    //await tx.wait(21);
    console.log('> [WAIT]: waited 21(kovan) / 6(ropsten)   blocks ...... ok');
    //await tx.wait();
    //await goBlocks(provider, 21);
    
    const index_biteToken = await NestMining.lengthOfPriceSheets(CUSDT.address);
    console.log('> [INIT]: NestMining.lengthOfPriceSheets() lengthOfPriceSheets() ...... ok');
    
    const pricesheet_post_usdt = await NestMining.fullPriceSheet(CUSDT.address, index_post_usdt.sub(1));


    const ethAmount_post_usdt = ETH(BigN(pricesheet_post_usdt.ethNumBal));
    const tokenAmount_post_usdt = USDT(BigN(pricesheet_post_usdt.tokenNumBal).mul(450));


    const pricesheet_post_ntoken = await NestMining.fullPriceSheet(NestToken.address, index_post_ntoken.sub(1));

    const ethAmount_post_ntoken = ETH(pricesheet_post_ntoken.ethNumBal);
    
    const ntokenAmount_post_ntoken = NEST(BigN(pricesheet_post_ntoken.tokenNumBal).mul(1000));
   

    const nestAmount_post = NEST(BigN(nestStakedNum1k).mul(2).mul(1000));
    const totalNestAmount = ntokenAmount_post_ntoken.add(nestAmount_post);
   
    const pricesheet_bitetoken = await NestMining.fullPriceSheet(CUSDT.address, index_biteToken.sub(1));
    console.log('> [INIT]: NestMining.fullPriceSheet() fullPriceSheet ...... ok');
    
    const ethAmount_bitetoken = ETH(pricesheet_bitetoken.ethNumBal);
   
    const tokenAmount_bitetoken = USDT(BigN(pricesheet_bitetoken.tokenNumBal).mul(300));
    const NestAmount_bitetoken = NEST(BigN(pricesheet_bitetoken.nestNum1k).mul(1000));
    
    tx = await NestMining.connect(userA).close(CUSDT.address, index_post_usdt.sub(1));
    await tx.wait();
    console.log('> [INIT]: NestMining.connect(userA).close() close usdt ...... ok');

    tx = await NestMining.connect(userA).close(NestToken.address, index_post_ntoken.sub(1));
    await tx.wait();
    console.log('> [INIT]: NestMining.connect(userA).close() close ntoken ...... ok');

    tx = await NestMining.connect(userB).close(CUSDT.address, index_biteToken.sub(1));
    await tx.wait();
    console.log('> [INIT]: NestMining.connect(userB).close() close  ...... ok');

    tx = await NestMining.connect(userA).withdrawEthAndToken(ethAmount_post_usdt, CUSDT.address, tokenAmount_post_usdt);
    await tx.wait();
    console.log('> [INIT]: NestMining.withdrawEthAndToken() token ...... ok');

    tx = await NestMining.connect(userA).withdrawEthAndToken(ethAmount_post_ntoken, CUSDT.address, totalNestAmount);
    await tx.wait();
    console.log('> [INIT]: NestMining.withdrawEthAndToken() ntoken ...... ok');
    
   
    tx = await NestMining.connect(userB).withdrawEthAndToken(ethAmount_bitetoken, CUSDT.address, tokenAmount_bitetoken);
    await tx.wait();
    console.log('> [INIT]: NestMining.withdrawEthAndToken() token ...... ok');
    
    tx = await NestMining.connect(userB).withdrawEthAndToken(0, CUSDT.address, NestAmount_bitetoken);
    await tx.wait();
    console.log('> [INIT]: NestMining.withdrawEthAndToken() nest ...... ok');
    
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });