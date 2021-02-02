
const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest } = require("./deploy.js");

const {usdtdec, wbtcdec, nestdec, ethdec, 
        ETH, USDT, WBTC, MBTC, NEST, BigNum, 
        show_eth, show_usdt, show_64x64, timeConverter} = require("./utils.js");

const fs = require('fs');

const {
    assertUpgradeSafe,
    assertStorageUpgradeSafe,
    getStorageLayout,
    fetchOrDeploy,
    getVersion,
    getUnlinkedBytecode,
    getImplementationAddress,
    getAdminAddress,
  } = require('@openzeppelin/upgrades-core');

async function main() {

    let tx;
    let receipt;
    
    [deployer, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();
    console.log(`> [INIT]: Accounts ... OK`);

    CUSDT = await deployUSDT();
    console.log(`> [DPLY]: Starting to deploy USDT Token ... OK`);

    CWBTC = await deployWBTC();
    console.log(`> [DPLY]: Starting to deploy WBTC Token ... OK`);

    CNWBTC = await deployNWBTC(deployer);
    console.log(`> [DPLY]: Starting to deploy NWBTC Token ... OK`);

    [NestToken, IterableMapping] = await deployNEST();
    console.log(`> [DPLY]: Starting to deploy NESTToken ... OK`);

    NNToken = await deployNN();
    console.log(`> [DPLY]: Starting to deploy NNToken ... OK`);

    let contracts = {USDT: CUSDT, WBTC: CWBTC, NWBTC: CNWBTC, NEST: NestToken, IterableMapping: IterableMapping, NNToken: NNToken, IterableMapping: IterableMapping}; 

    console.log(`> [DPLY]: Starting to deploy Nest-Protocol v3.5 ...`);
    console.log(`>>> [INFO]: deployer=${deployer.address}`);
    console.log(`>>> [INFO]: NNToken=${contracts.NNToken.address}`);
    console.log(`>>> [INFO]: NestToken=${contracts.NEST.address}`);

    const NestPoolContract = await ethers.getContractFactory("NestPool");
    const NestPool = await NestPoolContract.deploy(); 
    await NestPool.deployed();
    contracts.NestPool = NestPool;
    console.log(`>>> [DPLY]: NestPool deployed, address=${NestPool.address}, block=${NestPool.deployTransaction.blockNumber}`);

    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    await MiningV1Calc.deployed();
    contracts.NestMiningV1Calc = MiningV1Calc;
    console.log(`>>> [DPLY]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}, block=${MiningV1Calc.deployTransaction.blockNumber}`);

    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    await MiningV1Op.deployed();
    contracts.NestMiningV1Op = MiningV1Op;
    console.log(`>>> [DPLY]: NestMiningV1/MiningV1Op deployed, address=${MiningV1Op.address}, block=${MiningV1Op.deployTransaction.blockNumber}`);

    const NestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
    {
        libraries: {
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address
            }
    });

    const NestMining = await upgrades.deployProxy(NestMiningV1Contract, [NestPool.address],
        { unsafeAllowCustomTypes: true, unsafeAllowLinkedLibraries: true});
    await NestMining.deployTransaction.wait();
    contracts.NestMining = NestMining;
    const NestMiningImplAddress = await getImplementationAddress(ethers.provider, NestMining.address);
    const NestMiningImpl = await NestMiningV1Contract.attach(NestMiningImplAddress);
    contracts.NestMiningV1Impl = NestMiningImpl;

    const ProxyAdmin = await upgrades.admin.getInstance();
    console.log(`>>> [DPLY]: NestMiningV1 deployed with proxy, proxy=${NestMining.address}, impl=${NestMiningImpl.address}, admin=${ProxyAdmin.address}, block=${NestMining.deployTransaction.blockNumber}`);

    const NestStakingContract = await ethers.getContractFactory("NestStaking");
    const NestStaking = await upgrades.deployProxy(NestStakingContract, [NestPool.address]);
    await NestStaking.deployTransaction.wait();
    contracts.NestStaking = NestStaking;
    const NestStakingImplAddress = await getImplementationAddress(ethers.provider, NestStaking.address);
    const NestStakingImpl = await NestStakingContract.attach(NestStakingImplAddress);
    contracts.NestStakingImpl = NestStakingImpl;
    const ProxyAdmin2 = await upgrades.admin.getInstance();
    console.log(`>>> [DPLY]: NestStaking deployed with Proxy, proxy=${NestStaking.address}, impl=${NestStakingImpl.address}, admin=${ProxyAdmin2.address}, block=${NestStaking.deployTransaction.blockNumber}`);

    const NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
    const NNRewardPool = await NNRewardPoolContract.deploy(NestPool.address, contracts.NNToken.address);
    await NNRewardPool.deployTransaction.wait();
    contracts.NNRewardPool = NNRewardPool;
    console.log(`>>> [DPLY]: NNRewardPool deployed, address=${NNRewardPool.address}, block=${NNRewardPool.deployTransaction.blockNumber}`);

    const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
    const NTokenController = await NTokenControllerContract.deploy(NestPool.address);
    contracts.NTokenController = NTokenController;
    console.log(`>>> [DPLY]: NTokenController deployed, address=${NTokenController.address}`);


    const NestQueryContract = await ethers.getContractFactory("NestQuery");
    const NestQuery = await upgrades.deployProxy(NestQueryContract, [NestPool.address], {unsafeAllowCustomTypes: true});
    await NestQuery.deployed();
    contracts.NestQuery = NestQuery;
    const NestQueryImplAddress = await getImplementationAddress(ethers.provider, NestQuery.address);
    const NestQueryImpl = await NestQueryContract.attach(NestQueryImplAddress);
    contracts.NestQueryImpl = NestQueryImpl;
    const ProxyAdmin3 = await upgrades.admin.getInstance();
    console.log(`>>> [DPLY]: NestQuery deployed with proxy, proxy=${NestQuery.address}, impl=${NestQueryImpl.address}, admin=${ProxyAdmin3.address}, block=${NestQuery.deployTransaction.blockNumber}`);

    const NestDAOContract = await ethers.getContractFactory("NestDAO");
    const NestDAO = await upgrades.deployProxy(NestDAOContract, [NestPool.address], {unsafeAllowCustomTypes: true});
    tx = NestDAO.deployTransaction;
    receipt = await tx.wait();
    contracts.NestDAO = NestDAO;
    const NestDAOImplAddress = await getImplementationAddress(ethers.provider, NestDAO.address);
    const NestDAOImpl = await NestDAOContract.attach(NestDAOImplAddress);
    contracts.NestDAOImpl = NestDAOImpl;
    const ProxyAdmin4 = await upgrades.admin.getInstance();    
    console.log(`>>> [DPLY]: NestDAO deployed with Proxy, proxy=${NestDAO.address}, impl=${NestDAOImpl.address}, admin=${ProxyAdmin4.address}, block=${NestDAO.deployTransaction.blockNumber}`);

    let bn = tx.blockNumber;
    let ts = (await ethers.provider.getBlock(bn)).timestamp;
    let nw = (await ethers.provider.getNetwork()).name;
    if (nw === "unknown") {
        nw = network.name;
    }
    console.log(`>>>       network=${nw}, time=${timeConverter(ts)} `);
    
    let addrOfNest = {network: nw, block: bn, timestamp: timeConverter(ts)};
    Object.entries(contracts).forEach((e) => {
        const [k, v] = e;
        addrOfNest[k] = v.address;
    })

    console.log(`>>> [DPLY] deployNestProtocolWithProxy ... OK`);

    printContracts("js", addrOfNest);

    const filename = `.contracts_${network.name}.json`

    fs.writeFile (filename, JSON.stringify(addrOfNest, null, 4), function(err) {
        if (err) throw err;
        console.log('complete');
        }
    );

    console.log(`> [DPLY]: Starting to setup Nest-Protocol v3.5 ...`);

    if ((await NestPool.balanceOfNestInPool(NestPool.address)) < NEST("3000000000")) {
        tx = await NestToken.transfer(NestPool.address, NEST("3000000000"));
        await tx.wait();
        console.log(`>>> [INIT]: transfer Nest to NestPool about nest ...  OK`);
    }

    let params;
    let genesis;
    let lastB;
    let mined;
    if (network.name === "localhost") {
        genesis = 1;
        lastB = 1;
        mined = NEST(1000);
        params = {
            miningEthUnit: 1,
            nestStakedNum1k: 1,
            biteFeeRate: 1,
            miningFeeRate: 1,
            priceDurationBlock: 20,
            maxBiteNestedLevel: 3,
            biteInflateFactor: 2,
            biteNestInflateFactor: 2,
        };
    }

    tx = await NestPool.setContracts(NestToken.address, NestMining.address,
        NestStaking.address, NTokenController.address, NNToken.address,
        NNRewardPool.address, NestQuery.address, NestDAO.address);
    receipt = await tx.wait();
    console.log(`>>>[STUP] NestPool.setContracts() ..... OK`);
    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);

    const param_pre = await NestMining.parameters();
    console.log(`>>> [INFO] parameters=`, param_pre);
    
    tx = await NestPool.setNTokenToToken(CUSDT.address, NestToken.address);
    receipt = await tx.wait();
    console.log(`>>> [STUP] deployer: set (USDT <-> NEST) to NestPool ...... ok`);

    tx = await NestPool.setNTokenToToken(CWBTC.address, CNWBTC.address);
    tx.wait(1);
    console.log(`>>> [STUP] deployer: set (WBTC <-> CWBTC) to NestPool ...... ok`);

    
    tx = await NestMining.setup(genesis, lastB, mined, params);
    tx.wait(1);
    console.log(`>>> [STUP] NestMining.setup() ...... OK`);
    
    tx.wait(2);
    const param = await NestMining.parameters();
    console.log(`>>> [INFO] parameters=`, param);

    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);

}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });