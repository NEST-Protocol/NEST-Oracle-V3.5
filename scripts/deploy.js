
require("ethers");
const {expect} = require("chai");

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, 
    show_eth, show_usdt, show_64x64} = require("./utils.js");


exports.deployUSDT = async function () {

    const ERC20Contract = await ethers.getContractFactory("UERC20");

    const CUSDT = await ERC20Contract.deploy("10000000000000000", "USDT Test Token", "USDT", 6);
    
    console.log(`> [INIT]: USDT deployed, address=${CUSDT.address}`);

    return CUSDT;
}

exports.deployWBTC = async function () {

    const ERC20Contract = await ethers.getContractFactory("UERC20");

    const CWBTC = await ERC20Contract.deploy("2100000000000000", "WBTC Test Token", "WBTC", 6);
    
    console.log(`> [INIT]: WBTC deployed, address=${CWBTC.address}`);

    return CWBTC;
}


exports.deployNEST = async function () {

    const IterableMappingContract = await ethers.getContractFactory("IterableMapping");
    const IterableMapping = await IterableMappingContract.deploy();
    await IterableMapping.deployed();
    console.log(`> [INIT]: IterableMapping deployed, address=${IterableMapping.address}`);

    const NestTokenContract = await ethers.getContractFactory("IBNEST",
        {
            libraries: {
                IterableMapping: IterableMapping.address
            }
        });

    const NestToken = await NestTokenContract.deploy();
    await NestToken.deployed();
    console.log(`> [INIT]: NestToken deployed, address=${NestToken.address}`);
    return [NestToken, IterableMapping];
}

exports.deployNN = async function () {
    const NNTokenContract = await ethers.getContractFactory("NNToken");
    const NNToken = await NNTokenContract.deploy(1500, "NNT");
    await NNToken.deployed();
    console.log(`> [INIT]: NNToken deployed, address=${NNToken.address}`);
    return NNToken;
}

exports.deployNestProtocol = async function (deployer, contracts) {

    console.log(`> [INIT]: Starting to deploy Nest-Protocol v3.5 ...`);
    console.log(`> [INFO]: NN=${contracts.NN.address}`);
    console.log(`> [INFO]: NestToken=${contracts.NEST.address}`);
    console.log(`> [INFO]: deployer=${deployer.address}`);

    const NestPoolContract = await ethers.getContractFactory("NestPool");
    const NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract
    await NestPool.deployed();
    console.log(`> [INIT]: NestPool deployed, address=${NestPool.address}`);

    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    await MiningV1Calc.deployed();
    console.log(`> [INIT]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}`);

    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    await MiningV1Op.deployed();
    console.log(`> [INIT]: NestMiningV1/MiningV1Op deployed, address=${MiningV1Op.address}`);

    const NestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
    {
        libraries: {
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address
            }
    });
    const NestMining = await NestMiningV1Contract.deploy();
    await NestMining.deployed();
    await NestMining.initialize();
    console.log(`> [INIT]: NestMining deployed, address=${NestMining.address}`);

    const NestStakingContract = await ethers.getContractFactory("NestStaking");
    const NestStaking = await NestStakingContract.deploy();
    await NestStaking.initialize();
    console.log(`> [INIT]: NestStaking deployed, address=${NestStaking.address}`);

    const NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
    const NNRewardPool = await NNRewardPoolContract.deploy(contracts.NEST.address, contracts.NN.address);
    console.log(`> [INIT]: NNRewardPool deployed, address=${NNRewardPool.address}`);

    const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
    const NTokenController = await NTokenControllerContract.deploy();
    console.log(`> [INIT]: NTokenController deployed, address=${NTokenController.address}`);

    const NestQueryContract = await ethers.getContractFactory("NestQuery");
    const NestQuery = await NestQueryContract.deploy();
    let tx = await NestQuery.initialize();
    tx.wait();
    console.log(`> [INIT]: NestQuery deployed, address=${NestQuery.address}`);


    console.log("Contracts deployed:\n=========================");
    console.log(`| USDT |  ${contracts.CUSDT.address} | `);
    console.log(`| WBTC |  ${contracts.CWBTC.address} | `);
    console.log(`| NEST |  ${contracts.NEST.address} | `);
    console.log(`| NN |  ${contracts.NN.address} | `);
    console.log(`| NestPool |  ${NestPool.address} | `);
    console.log(`| NestMining |  ${NestMining.address} | `);
    console.log(`| NestStaking |  ${NestStaking.address} | `);
    console.log(`| NNRewardPool |  ${NNRewardPool.address} | `);
    console.log(`| NTokenController |  ${NTokenController.address} | `);
    console.log(`| NestQuery |  ${NestQuery.address} | `);

    console.log("printing...:\n=========================");
    console.log(`USDT: "${contracts.CUSDT.address}",`);
    console.log(`WBTC: "${contracts.CWBTC.address}",`);
    console.log(`NEST: "${contracts.NEST.address}",`);
    console.log(`IterableMapping: "${contracts.IterableMapping.address}",`);

    console.log(`NN: "${contracts.NN.address}",`);
    console.log(`NestPool: "${NestPool.address}",`);
    console.log(`MiningV1Calc: "${MiningV1Calc.address}",`);
    console.log(`MiningV1Op: "${MiningV1Op.address}",`);
    console.log(`NestMining: "${NestMining.address}",`);
    console.log(`NestStaking: "${NestStaking.address}",`);
    console.log(`NNRewardPool: "${NNRewardPool.address}",`);
    console.log(`NTokenController: "${NTokenController.address}",`);
    console.log(`NestQuery: "${NestQuery.address}",`);

    return {
        NestPool: NestPool,
        MiningV1Calc: MiningV1Calc,
        MiningV1Op: MiningV1Op,
        NestMining: NestMining,
        NNRewardPool: NNRewardPool,
        NestStaking: NestStaking,
        NTokenController: NTokenController,
        NestQuery: NestQuery
    }
}

exports.deployNestProtocolWithProxy = async function (deployer, contracts) {

    console.log(`> [INIT]: Starting to deploy Nest-Protocol v3.5 ...`);
    console.log(`> [INFO]: NN=${contracts.NN.address}`);
    console.log(`> [INFO]: NestToken=${contracts.NEST.address}`);
    console.log(`> [INFO]: deployer=${deployer.address}`);

    const NestPoolContract = await ethers.getContractFactory("NestPool");
    const NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract
    await NestPool.deployed();
    console.log(`> [INIT]: NestPool deployed, address=${NestPool.address}`);

    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    await MiningV1Calc.deployed();
    console.log(`> [INIT]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}`);

    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    await MiningV1Op.deployed();
    console.log(`> [INIT]: NestMiningV1/MiningV1Op deployed, address=${MiningV1Op.address}`);

    const NestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
    {
        libraries: {
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address
            }
    });
    console.log(`> [INIT]: NestMining is being deployed`);

    const NestMining = await NestMiningV1Contract.deploy();
    console.log(`> [INIT]: NestMining deployed, address=${NestMining.address}`);

    // const NestMining = await upgrades.deployProxy(NestMiningV1Contract, 
        // { unsafeAllowCustomTypes: true, unsafeAllowLinkedLibraries: true});
    await NestMining.deployed();
    // console.log(`> [INIT]: NestMining deployed with Proxy, address=${NestMining.address}`);

    const NestStakingContract = await ethers.getContractFactory("NestStaking");
    const NestStaking = await upgrades.deployProxy(NestStakingContract);
    // const NestStaking = await NestStakingContract.deploy();
    // await NestStaking.initialize();
    await NestStaking.deployed();
    console.log(`> [INIT]: NestStaking deployed with Proxy, address=${NestStaking.address}`);

    const NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
    const NNRewardPool = await NNRewardPoolContract.deploy(contracts.NEST.address, contracts.NN.address);
    await NNRewardPool.deployed();
    console.log(`> [INIT]: NNRewardPool deployed, address=${NNRewardPool.address}`);

    const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
    const NTokenController = await NTokenControllerContract.deploy();
    await NTokenController.deployed();
    console.log(`> [INIT]: NTokenController deployed, address=${NTokenController.address}`);

    const NestQueryContract = await ethers.getContractFactory("NestQuery");
    const NestQuery = await upgrades.deployProxy(NestQueryContract, {unsafeAllowCustomTypes: true});
    await NestQuery.deployed();
    console.log(`> [INIT]: NestQuery deployed with Proxy, address=${NestQuery.address}`);

    console.log("Contracts deployed:\n=========================");
    console.log(`| USDT |  ${contracts.CUSDT.address} | `);
    console.log(`| WBTC |  ${contracts.CWBTC.address} | `);
    console.log(`| IterableMapping |  ${contracts.IterableMapping.address} | `);
    console.log(`| NEST |  ${contracts.NEST.address} | `);
    console.log(`| NN |  ${contracts.NN.address} | `);
    console.log(`| NestPool |  ${NestPool.address} | `);
    console.log(`| NestMining |  ${NestMining.address} | `);
    console.log(`| NestStaking |  ${NestStaking.address} | `);
    console.log(`| NNRewardPool |  ${NNRewardPool.address} | `);
    console.log(`| NTokenController |  ${NTokenController.address} | `);
    console.log(`| NestQuery |  ${NestQuery.address} | `);

    console.log("Contracts deployed:\n=========================");
    console.log(`USDT: "${contracts.CUSDT.address}",`);
    console.log(`WBTC: "${contracts.CWBTC.address}",`);
    console.log(`IterableMapping: "${contracts.IterableMapping.address}",`);
    console.log(`NEST: "${contracts.NEST.address}",`);
    console.log(`NN: "${contracts.NN.address}",`);
    console.log(`NestPool: "${NestPool.address}",`);
    console.log(`MiningV1Calc: "${MiningV1Calc.address}",`);
    console.log(`MiningV1Op: "${MiningV1Op.address}",`);
    console.log(`NestMining: "${NestMining.address}",`);
    console.log(`NestStaking: "${NestStaking.address}",`);
    console.log(`NNRewardPool: "${NNRewardPool.address}",`);
    console.log(`NTokenController: "${NTokenController.address}",`);
    console.log(`NestQuery: "${NestQuery.address}",`);
    
    return {
        NestPool: NestPool.address,
        MiningV1Calc: MiningV1Calc.address,
        MiningV1Op: MiningV1Op.address,
        NestMining: NestMining.address,
        NNRewardPool: NNRewardPool.address,
        NestStaking: NestStaking.address,
        NTokenController: NTokenController.address,
        NestQuery: NestQuery.address
    }
}

exports.upgradeNestMiningWithProxy = async function (deployer, contractsOfNest) {

    console.log(`> [INIT]: Starting to upgrade Nest-Protocol v3.5 ...`);

    console.log(`> [INFO]: deployer         =${deployer.address}`);
    console.log(`> [INFO]: NN               =${contractsOfNest.NN}`);
    console.log(`> [INFO]: NestToken        =${contractsOfNest.NestToken}`);
    console.log(`> [INFO]: NestPool         =${contractsOfNest.NestPool}`);
    console.log(`> [INFO]: NestMining       =${contractsOfNest.NestMining}`);
    console.log(`> [INFO]: NestStaking      =${contractsOfNest.NestStaking}`);
    console.log(`> [INFO]: NNRewardPool     =${contractsOfNest.NNRewardPool}`);
    console.log(`> [INFO]: NTokenController =${contractsOfNest.NTokenController}`);
    console.log(`> [INFO]: NestQuery        =${contractsOfNest.NestQuery}`);

    NestPool = await ethers.getContractAt("NestPool", contractsOfNest.NestPool);

    // MiningV1Calc = await ethers.getContractAt("MiningV1Calc", contractsOfNest.MiningV1Calc);
    // MiningV1Op = await ethers.getContractAt("MiningV1Op", contractsOfNest.NestMining);
    // NestMining = await ethers.getContractAt("NestMiningV1", contractsOfNest.NestMining, 
    //     {libraries: {
    //         MiningV1Calc: contractsOfNest.MiningV1Calc, 
    //         MiningV1Op: contractsOfNest.MiningV1Op} });
    NestStaking = await ethers.getContractAt("NestStaking", contractsOfNest.NestStaking);
    NNRewardPool = await ethers.getContractAt("NNRewardPool", contractsOfNest.NNRewardPool);
    NTokenController = await ethers.getContractAt("NTokenController", contractsOfNest.NTokenController);
    NestQuery = await ethers.getContractAt("NestQuery", contractsOfNest.NestQuery);

    // upgrade NestMining
    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    console.log(`> [INIT]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}`);

    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    console.log(`> [INIT]: NestMiningV1/MiningV1Op deployed, address=${MiningV1Op.address}`);

    const NewNestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
    {
        libraries: {
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address
            }
    });
    console.log(`> [INIT]: NestMining is being deployed`);

    // const NestMining = await NestMiningV1Contract.deploy();
    // console.log(`> [INIT]: NestMining deployed, address=${NestMining.address}`);

    const NestMining = await upgrades.upgradeProxy(contractsOfNest.NestMining, NewNestMiningV1Contract, 
        { unsafeAllowCustomTypes: true, unsafeAllowLinkedLibraries: true});
    console.log(`> [INIT]: NestMining upgraded with Proxy, address=${NestMining.address}`);

    // const NestStakingContract = await ethers.getContractFactory("NestStaking");
    // const NestStaking = await upgrades.deployProxy(NestStakingContract);
    // // const NestStaking = await NestStakingContract.deploy();
    // // await NestStaking.initialize();
    // console.log(`> [INIT]: NestStaking deployed with Proxy, address=${NestStaking.address}`);

    // const NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
    // const NNRewardPool = await NNRewardPoolContract.deploy(contracts.NestToken.address, contracts.NN.address);
    // console.log(`> [INIT]: NNRewardPool deployed, address=${NNRewardPool.address}`);

    // const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
    // const NTokenController = await NTokenControllerContract.deploy();
    // console.log(`> [INIT]: NTokenController deployed, address=${NTokenController.address}`);

    // const NestQueryContract = await ethers.getContractFactory("NestQuery");
    // const NestQuery = await upgrades.deployProxy(NestQueryContract, {unsafeAllowCustomTypes: true});
    // // const NestQuery = await NestQueryContract.deploy();
    // console.log(`> [INIT]: NestQuery deployed with Proxy, address=${NestQuery.address}`);

    console.log("printing...:\n=========================");
    console.log(`USDT: "${contractsOfNest.USDT}",`);
    console.log(`WBTC: "${contractsOfNest.WBTC}",`);
    console.log(`NEST: "${contractsOfNest.NEST}",`);
    console.log(`NN: "${contractsOfNest.NN}",`);
    console.log(`NestPool: "${contractsOfNest.NestPool}",`);
    console.log(`MiningV1Calc: "${MiningV1Calc.address}",`);
    console.log(`MiningV1Op: "${MiningV1Op.address}",`);
    console.log(`NestMining: "${NestMining.address}",`);
    console.log(`NestStaking: "${contractsOfNest.NestStaking}",`);
    console.log(`NNRewardPool: "${contractsOfNest.NNRewardPool}",`);
    console.log(`NTokenController: "${contractsOfNest.NTokenController}",`);
    console.log(`NestQuery: "${contractsOfNest.NestQuery}",`);
}

exports.setupNest = async function (deployer, contractsOfNest) {

    console.log(`> [INIT]: Starting to setup Nest-Protocol v3.5 ...`);

    // console.log(`> [INFO]: deployer         =${deployer.address}`);
    // console.log(`> [INFO]: NN               =${contractsOfNest.NN}`);
    // console.log(`> [INFO]: NestToken        =${contractsOfNest.NEST}`);
    // console.log(`> [INFO]: NestPool         =${contractsOfNest.NestPool}`);
    // console.log(`> [INFO]: NestMining       =${contractsOfNest.NestMining}`);
    // console.log(`> [INFO]: NestStaking      =${contractsOfNest.NestStaking}`);
    // console.log(`> [INFO]: NNRewardPool     =${contractsOfNest.NNRewardPool}`);
    // console.log(`> [INFO]: NTokenController =${contractsOfNest.NTokenController}`);
    // console.log(`> [INFO]: NestQuery        =${contractsOfNest.NestQuery}`);

    CUSDT = await ethers.getContractAt("UERC20", contractsOfNest.USDT);

    const NestToken = await ethers.getContractAt("IBNEST", contractsOfNest.NEST,
        {
            libraries: {
                IterableMapping: contractsOfNest.IterableMapping
            }
        });

    // NestToken = await ethers.getContractAt("NestToken", contractsOfNest.NestToken);

    NNToken = await ethers.getContractAt("NNToken", contractsOfNest.NN);
    NestPool = await ethers.getContractAt("NestPool", contractsOfNest.NestPool);
    NestStaking = await ethers.getContractAt("NestStaking", contractsOfNest.NestStaking);
    NNRewardPool = await ethers.getContractAt("NNRewardPool", contractsOfNest.NNRewardPool);
    NTokenController = await ethers.getContractAt("NTokenController", contractsOfNest.NTokenController);
    NestQuery = await ethers.getContractAt("NestQuery", contractsOfNest.NestQuery);
    NestMining = await ethers.getContractAt("NestMiningV1", contractsOfNest.NestMining, 
        {
            libraries: {
                MiningV1Calc: contractsOfNest.MiningV1Calc, 
                MiningV1Op: contractsOfNest.MiningV1Op} 
        });

    console.log(`> [INFO]: USDT             =${CUSDT.address}`);
    // console.log(`> [INFO]: WBTC             =${CWBTC.address}`);
    console.log(`> [INFO]: NN               =${NNToken.address}`);
    console.log(`> [INFO]: NestToken        =${NestToken.address}`);
    console.log(`> [INFO]: NestPool         =${NestPool.address}`);
    console.log(`> [INFO]: NestMining       =${NestMining.address}`);
    console.log(`> [INFO]: NestStaking      =${NestStaking.address}`);
    console.log(`> [INFO]: NNRewardPool     =${NNRewardPool.address}`);
    console.log(`> [INFO]: NTokenController =${NTokenController.address}`);
    console.log(`> [INFO]: NestQuery        =${NestQuery.address}`);

    const _C_USDT = CUSDT.address;
    // const _C_WBTC = CWBTC.address;
    const _C_NestToken = NestToken.address;
    const _C_NestPool = NestPool.address;
    const _C_NestMining = NestMining.address;
    const _C_NestStaking = NestStaking.address;
    const _C_NNRewardPool = NNRewardPool.address;
    const _C_NNToken = NNToken.address;
    const _C_NTokenController = NTokenController.address;
    const _C_NestQuery = NestQuery.address;


    let tx = await NestMining.initialize();
    tx.wait();
    console.log(`> [INIT] NestMining.initialize()`);

    tx = await NestMining.init();
    tx.wait();
    console.log(`> [INIT] deployer: setup NestMining`);

    // await NestMining.setAddresses(deployer.address, deployer.address);
    // console.log(`> [INIT] NestMining.setAddresses()`);

    tx = await NestMining.setContracts(_C_NestToken, _C_NestPool, _C_NestStaking, _C_NestQuery);
    tx.wait();
    console.log(`> [INIT] NestMining.setContracts()`);

    tx = await NestPool.setContracts(_C_NestMining, _C_NestToken, _C_NTokenController, _C_NNRewardPool, _C_NestStaking);
    tx.wait();
    console.log(`> [INIT] NestPool.setContracts()`);
    
    tx = await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);
    tx.wait();
    console.log(`> [INIT] deployer: set (USDT <-> NEST) to NestPool`);

    tx = await NestStaking.setContracts(_C_NestToken, _C_NestPool);
    tx.wait();
    console.log(`> [INIT] NestStaking.setContracts()`);

    tx = await NNToken.setContracts(_C_NNRewardPool);
    tx.wait();
    console.log(`> [INIT] NNToken.setContracts()`);

    tx = await NNRewardPool.setContracts(_C_NestToken, _C_NNToken, _C_NestPool, _C_NestMining);
    tx.wait();
    console.log(`> [INIT] NNRewardPool.setContracts()`);

    tx = await NTokenController.setContracts(_C_NestToken, _C_NestPool);
    tx.wait();
    console.log(`> [INIT] NTokenController.setContracts()`);

    tx = await NestQuery.setContracts(_C_NestToken, _C_NestMining, _C_NestStaking, _C_NestPool, deployer.address);
    tx.wait();
    console.log(`> [INIT] NestQuery.setContracts()`);

}

exports.checkDeployment = async function (deployer, contractsOfNest, userA, userB) {

    console.log(`> [INIT]: Starting to check Nest-Protocol v3.5 ...`);

    console.log(`> [INFO]: deployer         =${deployer.address}`);
    console.log(`> [INFO]: NN               =${contractsOfNest.NN}`);
    console.log(`> [INFO]: NestToken        =${contractsOfNest.NEST}`);
    console.log(`> [INFO]: NestPool         =${contractsOfNest.NestPool}`);
    console.log(`> [INFO]: NestMining       =${contractsOfNest.NestMining}`);
    console.log(`> [INFO]: NestStaking      =${contractsOfNest.NestStaking}`);
    console.log(`> [INFO]: NNRewardPool     =${contractsOfNest.NNRewardPool}`);
    console.log(`> [INFO]: NTokenController =${contractsOfNest.NTokenController}`);
    console.log(`> [INFO]: NestQuery        =${contractsOfNest.NestQuery}`);

    CUSDT = await ethers.getContractAt("UERC20", contractsOfNest.USDT);

    const NestToken = await ethers.getContractAt("IBNEST", contractsOfNest.NEST,
        {
            libraries: {
                IterableMapping: contractsOfNest.IterableMapping
            }
        });

    // NestToken = await ethers.getContractAt("NestToken", contractsOfNest.NestToken);

    NestPool = await ethers.getContractAt("NestPool", contractsOfNest.NestPool);
    NestStaking = await ethers.getContractAt("NestStaking", contractsOfNest.NestStaking);
    NNRewardPool = await ethers.getContractAt("NNRewardPool", contractsOfNest.NNRewardPool);
    NTokenController = await ethers.getContractAt("NTokenController", contractsOfNest.NTokenController);
    NestQuery = await ethers.getContractAt("NestQuery", contractsOfNest.NestQuery);
    NestMining = await ethers.getContractAt("NestMiningV1", contractsOfNest.NestMining, 
        {
            libraries: {
                MiningV1Calc: contractsOfNest.MiningV1Calc, 
                MiningV1Op: contractsOfNest.MiningV1Op} 
        });
    
    await CUSDT.transfer(userA.address, USDT('1000000'));
    await CUSDT.connect(userA).approve(NestPool.address, USDT("1000000"));
    expect(await CUSDT.allowance(userA.address, NestPool.address)).to.equal(USDT("1000000"));
    await NestToken.transfer(userA.address, NEST("200000"));
    await NestToken.connect(userA).approve(NestPool.address, NEST("10000000000"));
    expect(await NestToken.allowance(userA.address, NestPool.address)).to.equal(NEST("10000000000"));
    await NestToken.connect(userA).approve(NestStaking.address, NEST("10000000000"));
    expect(await NestToken.allowance(userA.address, NestStaking.address)).to.equal(NEST("10000000000"));

    await NestMining.connect(userA).post2(CUSDT.address, 10, USDT(450), NEST(1000), { value: ETH(22) });
    console.log(`> [INIT]: NestMining.post2() ...... ok`);

    await NestStaking.addETHReward(NestToken.address, {value: ETH(4)});
    await NestStaking.connect(userA).stake(NestToken.address, NEST(100));
    await NestStaking.connect(userA).unstake(NestToken.address, NEST(100));
    
    console.log(`> [INIT]: NestStaking.stake() unstake() ...... ok`);

}
