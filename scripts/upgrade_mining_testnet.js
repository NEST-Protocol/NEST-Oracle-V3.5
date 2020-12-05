

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, 
    show_eth, show_usdt, show_64x64, timeConverter} = require("./utils.js");

const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts, getContractsFromAddrList,
    setupNest} = require("./deploy.js");

const contractsDeployed_localhost = require("./.contracts_localhost.js");
const contractsDeployed_kovan = require("./.contracts_kovan.js");


async function main() {

    const addrList = function () {
        if (network.name === "localhost") {
            return contractsDeployed_localhost;
        } else if (network.name === "kovan") {
            return contractsDeployed_kovan;
        }
    } ();    
    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    const contracts = await getContractsFromAddrList(addrList);

    // const CUSDT = contracts.CUSDT;
    // const NestToken = contracts.NestToken;
    // const NestPool = contracts.NestPool;
    const NestMining = contracts.NestMining;
    // const NestStaking = contracts.NestStaking;
    // const NTokenController = contracts.NTokenController;
    // const NNToken = contracts.NNToken;
    // const NNRewardPool = contracts.NNRewardPool;
    // const NestQuery = contracts.NestQuery;
    // const NestDAO = contracts.NestDAO;

    console.log(`> [INIT]: Starting to upgrade Nest-Protocol v3.5 ...`);

    // upgrade NestMining
    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    await MiningV1Calc.deployTransaction.wait();
    console.log(`>>> [UPGD]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}, block=${MiningV1Calc.deployTransaction.blockNumber}`);

    addrList.MiningV1Calc = MiningV1Calc.address;
    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    await MiningV1Op.deployTransaction.wait();
    console.log(`>>> [UPGD]: NestMiningV1/MiningV1Op deployed, address=${MiningV1Op.address}, block=${MiningV1Op.deployTransaction.blockNumber}`);
    addrList.MiningV1Op = MiningV1Op.address;

    const NewNestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
    {
        libraries: {
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address
            }
    });
    console.log(`>>> [UPGD]: NestMining has been deployed, address=${NestMining.address}, block=${MiningV1Op.deployTransaction.blockNumber}`);

    const v0 = await NestMining.version();
    console.log(`>>>    [INFO]: OLD NestMining.version = ${v0}`);

    const NewNestMining = await upgrades.upgradeProxy(addrList.NestMining, NewNestMiningV1Contract, 
        { unsafeAllowCustomTypes: true, unsafeAllowLinkedLibraries: true});
    console.log(`>>> [UPGD]: NestMining upgraded with Proxy ...... [OK]`);
    console.log(`>>>    [INFO]: NestMining.address=${NewNestMining.address}`);

    const tx = await NestMining.incVersion();
    await tx.wait();
    const v1 = await NestMining.version();
    console.log(`>>>    [INFO]: NEW NestMining.version = ${v1}, block=${tx.blockNumber}`);

    await printContracts("js", addrList);


}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });