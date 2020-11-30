
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

exports.printContractsOfNest = function (deployer, contracts) {

    console.log("Contracts deployed:\n=========================");
    Object.entries(contracts).forEach((e) => {
        const [k, v] = e;
        console.log(`| ${k} |  ${v} | `);
    })
}

exports.deployNestProtocol = async function (deployer, contracts) {

    console.log(`> [INIT]: Starting to deploy Nest-Protocol v3.5 ...`);
    console.log(`> [INFO]: NN=${contracts.NN.address}`);
    console.log(`> [INFO]: NestToken=${contracts.NEST.address}`);
    console.log(`> [INFO]: deployer=${deployer.address}`);

    const NestPoolContract = await ethers.getContractFactory("NestPool");
    const NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract
    await NestPool.deployed();
    contracts.NestPool = NestPool;
    console.log(`> [INIT]: NestPool deployed, address=${NestPool.address}`);

    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    await MiningV1Calc.deployed();
    contracts.MiningV1Calc = MiningV1Calc;
    console.log(`> [INIT]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}`);

    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    await MiningV1Op.deployed();
    contracts.MiningV1Op = MiningV1Op;
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
    await NestMining.initialize(NestPool.address);
    contracts.NestMining = NestMining;
    console.log(`> [INIT]: NestMining deployed, address=${NestMining.address}`);

    const NestStakingContract = await ethers.getContractFactory("NestStaking");
    const NestStaking = await NestStakingContract.deploy();
    await NestStaking.initialize(NestPool.address);
    contracts.NestStaking = NestStaking;
    console.log(`> [INIT]: NestStaking deployed, address=${NestStaking.address}`);

    const NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
    const NNRewardPool = await NNRewardPoolContract.deploy(NestPool.address, contracts.NN.address);
    contracts.NNRewardPool = NNRewardPool;
    console.log(`> [INIT]: NNRewardPool deployed, address=${NNRewardPool.address}`);

    const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
    const NTokenController = await NTokenControllerContract.deploy(NestPool.address);
    contracts.NTokenController = NTokenController;
    console.log(`> [INIT]: NTokenController deployed, address=${NTokenController.address}`);

    const NestQueryContract = await ethers.getContractFactory("NestQuery");
    const NestQuery = await NestQueryContract.deploy();
    let tx = await NestQuery.initialize(NestPool.address);
    tx.wait();
    contracts.NestQuery = NestQuery;
    console.log(`> [INIT]: NestQuery deployed, address=${NestQuery.address}`);

    const NestDAOContract = await ethers.getContractFactory("NestDAO");
    const NestDAO = await NestDAOContract.deploy(NestPool.address);
    NestDAO.deployTransaction.wait();
    contracts.NestDAO = NestDAO;

    console.log(`> [INIT]: NestDAO deployed, address=${NestDAO.address}`);

    console.log("\n=========================");
    let addrOfNest = new Object();
    Object.entries(contracts).forEach((e) => {
        const [k, v] = e;
        addrOfNest[k] = v.address;
        console.log(`${k}: "${v.address}", `);
    })
    return addrOfNest;
}

exports.deployNestProtocolWithProxy = async function (deployer, contracts) {

    console.log(`> [INIT]: Starting to deploy Nest-Protocol v3.5 ...`);
    console.log(`> [INFO]: NN=${contracts.NN.address}`);
    console.log(`> [INFO]: NestToken=${contracts.NEST.address}`);
    console.log(`> [INFO]: deployer=${deployer.address}`);

    const NestPoolContract = await ethers.getContractFactory("NestPool");
    const NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract
    await NestPool.deployed();
    contracts.NestPool = NestPool;
    console.log(`> [INIT]: NestPool deployed, address=${NestPool.address}`);

    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    await MiningV1Calc.deployed();
    contracts.MiningV1Calc = MiningV1Calc;
    console.log(`> [INIT]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}`);

    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    await MiningV1Op.deployed();
    contracts.MiningV1Op = MiningV1Op;
    console.log(`> [INIT]: NestMiningV1/MiningV1Op deployed, address=${MiningV1Op.address}`);

    const NestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
    {
        libraries: {
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address
            }
    });
    console.log(`> [INIT]: NestMining is being deployed`);

    // const NestMining = await NestMiningV1Contract.deploy();
    // console.log(`> [INIT]: NestMining deployed, address=${NestMining.address}`);

    const NestMining = await upgrades.deployProxy(NestMiningV1Contract, [NestPool.address],
        { unsafeAllowCustomTypes: true, unsafeAllowLinkedLibraries: true});
    await NestMining.deployed();
    contracts.NestMining = NestMining;
    console.log(`> [INIT]: NestMining deployed with Proxy, address=${NestMining.address}`);

    const NestStakingContract = await ethers.getContractFactory("NestStaking");
    const NestStaking = await upgrades.deployProxy(NestStakingContract, [NestPool.address]);
    // const NestStaking = await NestStakingContract.deploy();
    // await NestStaking.initialize();
    await NestStaking.deployed();
    contracts.NestStaking = NestStaking;
    console.log(`> [INIT]: NestStaking deployed with Proxy, address=${NestStaking.address}`);

    const NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
    const NNRewardPool = await NNRewardPoolContract.deploy(NestPool.address, NNToken.address);
    await NNRewardPool.deployed();
    contracts.NNRewardPool = NNRewardPool;
    console.log(`> [INIT]: NNRewardPool deployed, address=${NNRewardPool.address}`);

    const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
    const NTokenController = await NTokenControllerContract.deploy(NestPool.address);
    await NTokenController.deployed();
    contracts.NTokenController = NTokenController;
    console.log(`> [INIT]: NTokenController deployed, address=${NTokenController.address}`);

    const NestQueryContract = await ethers.getContractFactory("NestQuery");
    const NestQuery = await upgrades.deployProxy(NestQueryContract, [NestPool.address], {unsafeAllowCustomTypes: true});
    await NestQuery.deployed();
    contracts.NestQuery = NestQuery;
    console.log(`> [INIT]: NestQuery deployed with Proxy, address=${NestQuery.address}`);

    const NestDAOContract = await ethers.getContractFactory("NestDAO");
    const NestDAO = await upgrades.deployProxy(NestQueryContract, [NestPool.address], {unsafeAllowCustomTypes: true});
    await NestDAO.deployed();
    contracts.NestDAO = NestDAO;
    console.log(`> [INIT]: NestQuery deployed with Proxy, address=${NestQuery.address}`);

    console.log("Contracts deployed:\n=========================");
    // console.log(`USDT: "${contracts.USDT.address}",`);
    // console.log(`WBTC: "${contracts.WBTC.address}",`);
    // console.log(`IterableMapping: "${contracts.IterableMapping.address}",`);
    // console.log(`NEST: "${contracts.NEST.address}",`);
    // console.log(`NN: "${contracts.NN.address}",`);
    // console.log(`NestPool: "${NestPool.address}",`);
    // console.log(`MiningV1Calc: "${MiningV1Calc.address}",`);
    // console.log(`MiningV1Op: "${MiningV1Op.address}",`);
    // console.log(`NestMining: "${NestMining.address}",`);
    // console.log(`NestStaking: "${NestStaking.address}",`);
    // console.log(`NNRewardPool: "${NNRewardPool.address}",`);
    // console.log(`NTokenController: "${NTokenController.address}",`);
    // console.log(`NestQuery: "${NestQuery.address}",`);
    
    let addrOfNest = new Object();
    Object.entries(contracts).forEach((e) => {
        const [k, v] = e;
        addrOfNest[k] = v.address;
        console.log(`${k}: "${v.address}", `);
    })
    return addrOfNest;
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
    console.log(`> [INFO]: NestDAO          =${contractsOfNest.NestDAO}`);

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
    NestDAO = await ethers.getContractAt("NestDAO", contractsOfNest.NestDAO);

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
    console.log(`NestDAO: "${contractsOfNest.NestDAO}",`);
}

exports.setupNest = async function (deployer, contractsOfNest) {

    console.log(`> [INIT]: Starting to setup Nest-Protocol v3.5 ...`);

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
    NestDAO = await ethers.getContractAt("NestDAO", contractsOfNest.NestDAO);
    NestMining = await ethers.getContractAt("NestMiningV1", contractsOfNest.NestMining, 
        {
            libraries: {
                MiningV1Calc: contractsOfNest.MiningV1Calc, 
                MiningV1Op: contractsOfNest.MiningV1Op} 
        });

    tx = await NestMining.init();
    tx.wait();
    console.log(`> [INIT] deployer: setup NestMining`);

    tx = await NestPool.setContracts(NestToken.address, NestMining.address, 
                    NestStaking.address, NTokenController.address, NNToken.address, 
                    NNRewardPool.address, NestQuery.address, NestDAO.address);
    tx.wait();
    console.log(`> [INIT] NestPool.setContracts()`);
    
    tx = await NestPool.setNTokenToToken(CUSDT.address, NestToken.address);
    tx.wait();
    console.log(`> [INIT] deployer: set (USDT <-> NEST) to NestPool`);

}

exports.checkDeployment = async function (deployer, contractsOfNest, userA, userB) {

    console.log(`> [INIT]: Starting to check Nest-Protocol v3.5 ...`);

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
    NestDAO = await ethers.getContractAt("NestDAO", contractsOfNest.NestDAO);
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
