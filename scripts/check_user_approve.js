
const { commify } = require("ethers/lib/utils");
const  contractsDeployed_localhost= require("./.contracts_localhost.js");
const  contractsDeployed_kovan = require("./.contracts_kovan.js");


const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, 
    show_eth, show_usdt, show_64x64} = require("./utils.js");

const main = async function () {

    const contractsDeployed = function () {
        if (network.name === "localhost") {
            return contractsDeployed_localhost;
        } else if (network.name === "kovan") {
            return contractsDeployed_kovan;
        }
    } ();    

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    CUSDT = await ethers.getContractAt("UERC20", contractsDeployed.USDT);
    console.log(`> [INIT]: deployed usdt address ...`);

    const NestToken = await ethers.getContractAt("IBNEST", contractsDeployed.NEST,
        {
            libraries: {
                IterableMapping: contractsDeployed.IterableMapping
            }
        });
    console.log(`> [INIT]: deployed nestToken address ...`);


    // NestToken = await ethers.getContractAt("NestToken", contractsDeployed.NestToken);

    NestPool = await ethers.getContractAt("NestPool", contractsDeployed.NestPool);
    console.log(`> [INIT]: deployed NestPool address ...`);

    NestStaking = await ethers.getContractAt("NestStaking", contractsDeployed.NestStaking);
    console.log(`> [INIT]: deployed NestStaking address ...`);
    
    NNRewardPool = await ethers.getContractAt("NNRewardPool", contractsDeployed.NNRewardPool);
    console.log(`> [INIT]: deployed NNRewardPool address ...`);
    
    NTokenController = await ethers.getContractAt("NTokenController", contractsDeployed.NTokenController);
    console.log(`> [INIT]: deployed NTokenController address ...`);
    
    NestQuery = await ethers.getContractAt("NestQuery", contractsDeployed.NestQuery);
    console.log(`> [INIT]: deployed NestQuery address ...`);

    NestDAO = await ethers.getContractAt("NestDAO", contractsDeployed.NestDAO);
    console.log(`> [INIT]: deployed NestDAO address ...`);
    
    NestMining = await ethers.getContractAt("NestMiningV1", contractsDeployed.NestMining, 
        {
            libraries: {
                MiningV1Calc: contractsDeployed.MiningV1Calc, 
                MiningV1Op: contractsDeployed.MiningV1Op} 
        });
    console.log(`> [INIT]: deployed NestMiningV1 address ...`);
       
    let tx = await NestToken.transfer(userA.address, NEST("200000"));
    await tx.wait();
    console.log(`> [INIT]: transfer Nest to userA about nest ...`);

    tx = await NestToken.transfer(userB.address, NEST("200000"));
    await tx.wait();
    console.log(`> [INIT]: transfer Nest to userB about nest ...`);

    tx = await NestToken.connect(userA).approve(NestPool.address, NEST("10000000000"));
    await tx.wait();
    console.log(`> [INIT]: authorised by the userA to NestPool about nest ...`);

    tx = await NestToken.connect(userB).approve(NestPool.address, NEST("10000000000"));
    await tx.wait();
    console.log(`> [INIT]: authorised by the userB to NestPool about nest ...`);
    
    tx = await NestToken.connect(userA).approve(NestStaking.address, NEST("10000000000"));
    await tx.wait();
    console.log(`> [INIT]: authorised by the userA to NestStaking about nest ...`);
    
    tx = await NestToken.connect(userB).approve(NestStaking.address, NEST("10000000000"));
    await tx.wait();
    console.log(`> [INIT]: authorised by the userB to NestStaking about nest ...`);

    tx = await CUSDT.transfer(userA.address, USDT('1000000'));
    await tx.wait();
    console.log(`> [INIT]: transfer usdt to userA about usdt ...`);
    
    tx = await CUSDT.connect(userA).approve(NestPool.address, USDT("1000000"));
    await tx.wait();
    console.log(`> [INIT]: authorised by the userA to NestPool about usdt ...`);
    
    tx = await CUSDT.transfer(userB.address, USDT('1000000'));
    await tx.wait();
    console.log(`> [INIT]: transfer usdt to userB about usdt ...`);

    tx = await CUSDT.connect(userB).approve(NestPool.address, USDT("1000000"));
    await tx.wait();
    console.log(`> [INIT]: authorised by the userB to NestPool about usdt ...`);


}

main()
.then( () => process.exit( 0 ) )
.catch( err => {
    console.error(err);
    process.exit( 1 );
});