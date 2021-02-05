
require("ethers");
const {expect} = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, 
    show_eth, show_usdt, show_64x64, timeConverter} = require("./utils.js");

exports.deployERC20 = async function (total, name, symbol, decimals) {

        const ERC20Contract = await ethers.getContractFactory("UERC20");
    
        const CERC20 = await ERC20Contract.deploy(total, name, symbol, decimals);
        
        const tx = CERC20.deployTransaction;
        await tx.wait(1);
    
        console.log(`>>> [DPLY]: USDT deployed, address=${CERC20.address}, block=${tx.blockNumber}`);
    
        return CERC20;
}

exports.deployUSDT = async function () {

    const ERC20Contract = await ethers.getContractFactory("UERC20");

    const CUSDT = await ERC20Contract.deploy("10000000000000000", "USDT Test Token", "USDT", 6);
    
    const tx = CUSDT.deployTransaction;
    await tx.wait(1);

    console.log(`>>> [DPLY]: USDT deployed, address=${CUSDT.address}, block=${tx.blockNumber}`);

    return CUSDT;
}

exports.deployWBTC = async function () {

    const ERC20Contract = await ethers.getContractFactory("UERC20");

    const CWBTC = await ERC20Contract.deploy("2100000000000000", "WBTC Test Token", "WBTC", 6);

    const tx = CWBTC.deployTransaction;
    await tx.wait(1);
    
    console.log(`>>> [DPLY]: WBTC deployed, address=${CWBTC.address}, block=${tx.blockNumber}`);

    return CWBTC;
}

exports.deployHBTC = async function () {

    const ERC20Contract = await ethers.getContractFactory("UERC20");

    const CHBTC = await ERC20Contract.deploy("21000000000000000000000000", "HBTC Test Token", "HBTC", 18);

    const tx = CHBTC.deployTransaction;
    await tx.wait(1);
    
    console.log(`>>> [DPLY]: HBTC deployed, address=${CHBTC.address}, block=${tx.blockNumber}`);

    return CHBTC;
}

exports.deployUSDC = async function () {

    const ERC20Contract = await ethers.getContractFactory("UERC20");

    const CUSDC = await ERC20Contract.deploy("900000000000000000000000", "USDC Test Token", "USDC", 18);

    const tx = CUSDC.deployTransaction;
    await tx.wait(1);
    
    console.log(`>>> [DPLY]: USDC deployed, address=${CUSDC.address}, block=${tx.blockNumber}`);

    return CUSDC;
}

exports.deployNWBTC = async function (owner) {

    console.log(`>>> [DPLY] NWBTC .......`);
    const NTokenContract = await ethers.getContractFactory("NestNToken");
    console.log(`>>> [DPLY] NWBTC .......2`);

    const CNWBTC = await NTokenContract.deploy("900000000000000000000000", "NWBTC", "NWBTC", owner.address);
    console.log(`>>> [DPLY] NWBTC .......3`);

    const tx = CNWBTC.deployTransaction;
    await tx.wait(1);
    console.log(`>>> [DPLY] NWBTC .......4`);

    console.log(`>>> [DPLY]: NWBTC deployed, address=${CNWBTC.address}, block=${tx.blockNumber}`);

    return CNWBTC;
}

exports.deployNHBTC = async function (owner) {

    console.log(`>>> [DPLY] NHBTC .......`);
    const NTokenContract = await ethers.getContractFactory("NestNToken");
    console.log(`>>> [DPLY] NHBTC .......2`);

    const CNHBTC = await NTokenContract.deploy("900000000000000000000000", "NHBTC", "NHBTC", owner.address);
    console.log(`>>> [DPLY] NHBTC .......3`);

    const tx = CNHBTC.deployTransaction;
    await tx.wait(1);
    console.log(`>>> [DPLY] NHBTC .......4`);

    console.log(`>>> [DPLY]: NHBTC deployed, address=${CNHBTC.address}, block=${tx.blockNumber}`);

    return CNHBTC;
}

exports.deployNEST = async function () {

    const IterableMappingContract = await ethers.getContractFactory("IterableMapping");
    const IterableMapping = await IterableMappingContract.deploy();
    await IterableMapping.deployTransaction.wait();
    console.log(`>>> [DPLY]: IterableMapping deployed, address=${IterableMapping.address}`);

    const NestTokenContract = await ethers.getContractFactory("IBNEST",
        {
            libraries: {
                IterableMapping: IterableMapping.address
            }
        });

    const NestToken = await NestTokenContract.deploy();
    await NestToken.deployTransaction.wait();

    console.log(`>>> [DPLY]: NestToken deployed, address=${NestToken.address}, block=${NestToken.deployTransaction.blockNumber}`);
    return [NestToken, IterableMapping];
}

exports.deployNN = async function () {
    const NNTokenContract = await ethers.getContractFactory("NNToken");
    const NNToken = await NNTokenContract.deploy(1500, "NNT");
    await NNToken.deployTransaction.wait();
    await NNToken.deployed();
    console.log(`>>> [DPLY]: NNToken deployed, address=${NNToken.address}, block=${NNToken.deployTransaction.blockNumber}`);
    return NNToken;
}


exports.printContracts = function (format, contracts) {

    console.log("\n Contracts deployed:\n=========================");
    if (format === "js") {
        Object.entries(contracts).forEach((e) => {
            const [k, v] = e;
            console.log(`${k}: "${v}",`);
        })
    } else {
        Object.entries(contracts).forEach((e) => {
            const [k, v] = e;
            console.log(`| ${k} |  ${v} | `);
        })
    }
}

const getContractsFromAddrList = async function (addrList) {

    const CUSDT = await ethers.getContractAt("UERC20", addrList.USDT);
    const CWBTC = await ethers.getContractAt("UERC20", addrList.WBTC);

    const NestToken = await ethers.getContractAt("IBNEST", addrList.NEST,
        {
            libraries: {
                IterableMapping: addrList.IterableMapping
            }
        });

    NNToken = await ethers.getContractAt("NNToken", addrList.NN);
    NestPool = await ethers.getContractAt("NestPool", addrList.NestPool);
    NestStaking = await ethers.getContractAt("NestStaking", addrList.NestStaking);
    NNRewardPool = await ethers.getContractAt("NNRewardPool", addrList.NNRewardPool);
    NTokenController = await ethers.getContractAt("NTokenController", addrList.NTokenController);
    NestQuery = await ethers.getContractAt("NestQuery", addrList.NestQuery);
    NestDAO = await ethers.getContractAt("NestDAO", addrList.NestDAO);
    NestMining = await ethers.getContractAt("NestMiningV1", addrList.NestMining, 
        {
            libraries: {
                MiningV1Calc: addrList.MiningV1Calc, 
                MiningV1Op: addrList.MiningV1Op} 
        });
    return {
        CUSDT: CUSDT, 
        CWBTC: CWBTC, 
        NestToken: NestToken, 
        NNToken: NNToken,
        NestPool: NestPool, 
        NestMining: NestMining,
        NestStaking: NestStaking,
        NNRewardPool: NNRewardPool,
        NTokenController: NTokenController,
        NestQuery: NestQuery,
        NestDAO: NestDAO,
    }
}

exports.getContractsFromAddrList = getContractsFromAddrList;

exports.deployNestProtocol = async function (deployer, contracts) {

    console.log(`> [DPLY]: Starting to deploy Nest-Protocol v3.5 ...`);
    console.log(`>>> [INFO]: NN=${contracts.NN.address}`);
    console.log(`>>> [INFO]: NestToken=${contracts.NEST.address}`);
    console.log(`>>> [INFO]: deployer=${deployer.address}`);

    const NestPoolContract = await ethers.getContractFactory("NestPool");
    const NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract
    await NestPool.deployed();
    contracts.NestPool = NestPool;
    console.log(`>>> [DPLY]: NestPool deployed, address=${NestPool.address}, block=${NestPool.deployTransaction.blockNumber}`);

    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    await MiningV1Calc.deployed();
    contracts.MiningV1Calc = MiningV1Calc;
    console.log(`>>> [DPLY]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}, block=${MiningV1Calc.deployTransaction.blockNumber}`);

    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    await MiningV1Op.deployed();
    contracts.MiningV1Op = MiningV1Op;
    console.log(`>>> [DPLY]: NestMiningV1/MiningV1Op deployed, address=${MiningV1Op.address}, block=${MiningV1Op.deployTransaction.blockNumber}`);

    const NestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
    {
        libraries: {
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address
            }
    });
    const NestMining = await NestMiningV1Contract.deploy();
    await NestMining.deployed();
    console.log(`>>> [DPLY]: NestMiningV1 deployed, address=${NestMining.address}, block=${NestMining.deployTransaction.blockNumber}`);

    let tx = await NestMining.initialize(NestPool.address);
    contracts.NestMining = NestMining;
    console.log(`>>> [INIT]: NestMining initialized, block=${tx.blockNumber}`);

    const NestStakingContract = await ethers.getContractFactory("NestStaking");
    const NestStaking = await NestStakingContract.deploy();
    console.log(`>>> [DPLY]: NestStaking deployed, address=${NestStaking.address}, block=${NestStaking.deployTransaction.blockNumber}`);
    contracts.NestStaking = NestStaking;

    tx = await NestStaking.initialize(NestPool.address);
    console.log(`>>> [INIT]: NestStaking initialized, block=${tx.blockNumber}`);

    const NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
    const NNRewardPool = await NNRewardPoolContract.deploy(NestPool.address, contracts.NN.address);
    await NNRewardPool.deployTransaction.wait();
    contracts.NNRewardPool = NNRewardPool;
    console.log(`>>> [DPLY]: NNRewardPool deployed, address=${NNRewardPool.address}, block=${NNRewardPool.deployTransaction.blockNumber}`);

    const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
    const NTokenController = await NTokenControllerContract.deploy(NestPool.address);
    contracts.NTokenController = NTokenController;
    console.log(`>>> [DPLY]: NTokenController deployed, address=${NTokenController.address}`);

    const NestQueryContract = await ethers.getContractFactory("NestQuery");
    const NestQuery = await NestQueryContract.deploy();
    await NestQuery.deployTransaction.wait();
    console.log(`>>> [DPLY]: NestQuery deployed, address=${NestQuery.address}, block=${NestQuery.deployTransaction.blockNumber}`);
    contracts.NestQuery = NestQuery;

    tx = await NestQuery.initialize(NestPool.address);
    await tx.wait();
    console.log(`>>> [INIT]: NestMining initialized, block=${tx.blockNumber}`);

    const NestDAOContract = await ethers.getContractFactory("NestDAO");
    const NestDAO = await NestDAOContract.deploy();
    tx = NestDAO.deployTransaction;
    receipt = await tx.wait();
    console.log(`>>> [DPLY]: NestDAO deployed, address=${NestQuery.address}, block=${tx.blockNumber}`);
    contracts.NestDAO = NestDAO;

    tx = await NestDAO.initialize(NestPool.address);
    console.log(`>>> [INIT]: NestDAO initialized, block=${tx.blockNumber}`);

    const bn = tx.blockNumber;
    const ts = (await ethers.provider.getBlock(bn)).timestamp;
    const nw = (await ethers.provider.getNetwork).name;
    console.log(`>>>       network=${nw}, time=${timeConverter(ts)} `);
    
    let addrOfNest = {network: nw, block: bn, timestamp: timeConverter(ts)};
    Object.entries(contracts).forEach((e) => {
        const [k, v] = e;
        addrOfNest[k] = v.address;
    })
    return addrOfNest;
}

exports.deployNestProtocolWithProxy = async function (deployer, contracts) {

    console.log(`> [DPLY]: Starting to deploy Nest-Protocol v3.5 ...`);
    console.log(`>>> [INFO]: deployer=${deployer.address}`);
    console.log(`>>> [INFO]: NN=${contracts.NN.address}`);
    console.log(`>>> [INFO]: NestToken=${contracts.NEST.address}`);

    const NestPoolContract = await ethers.getContractFactory("NestPool");
    const NestPool = await NestPoolContract.deploy(); 
    await NestPool.deployed();
    contracts.NestPool = NestPool;
    console.log(`>>> [DPLY]: NestPool deployed, address=${NestPool.address}, block=${NestPool.deployTransaction.blockNumber}`);

    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    await MiningV1Calc.deployed();
    contracts.MiningV1Calc = MiningV1Calc;
    console.log(`>>> [DPLY]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}, block=${MiningV1Calc.deployTransaction.blockNumber}`);

    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    await MiningV1Op.deployed();
    contracts.MiningV1Op = MiningV1Op;
    console.log(`>>> [DPLY]: NestMiningV1/MiningV1Op deployed, address=${MiningV1Op.address}, block=${MiningV1Op.deployTransaction.blockNumber}`);

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
    await NestMining.deployTransaction.wait();
    contracts.NestMining = NestMining;
    console.log(`>>> [DPLY]: NestMiningV1 deployed with proxy, address=${NestMining.address}, block=${NestMining.deployTransaction.blockNumber}`);

    const NestStakingContract = await ethers.getContractFactory("NestStaking");
    const NestStaking = await upgrades.deployProxy(NestStakingContract, [NestPool.address]);
    await NestStaking.deployTransaction.wait();
    contracts.NestStaking = NestStaking;
    console.log(`>>> [DPLY]: NestStaking deployed with Proxy, address=${NestStaking.address}, block=${NestStaking.deployTransaction.blockNumber}`);

    const NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
    const NNRewardPool = await NNRewardPoolContract.deploy(NestPool.address, contracts.NN.address);
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
    console.log(`>>> [DPLY]: NestQuery deployed with proxy, address=${NestQuery.address}, block=${NestQuery.deployTransaction.blockNumber}`);

    const NestDAOContract = await ethers.getContractFactory("NestDAO");
    const NestDAO = await upgrades.deployProxy(NestDAOContract, [NestPool.address], {unsafeAllowCustomTypes: true});
    tx = NestDAO.deployTransaction;
    receipt = await tx.wait();
    console.log(`>>> [DPLY]: NestDAO deployed with Proxy, address=${NestDAO.address}, block=${NestDAO.deployTransaction.blockNumber}`);
    contracts.NestDAO = NestDAO;
    
    const bn = tx.blockNumber;
    const ts = (await ethers.provider.getBlock(bn)).timestamp;
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
    return addrOfNest;
}

exports.upgradeNestMiningWithProxy = async function (deployer, addrList) {

    console.log(`> [INIT]: Starting to upgrade Nest-Protocol v3.5 ...`);

    console.log(`>      [UPGD]: deployer         =${deployer.address}`);
    console.log(`>      [UPGD]: NN               =${addrList.NN}`);
    console.log(`>      [UPGD]: NestToken        =${addrList.NestToken}`);
    console.log(`>      [UPGD]: NestPool         =${addrList.NestPool}`);
    console.log(`>      [UPGD]: NestMining       =${addrList.NestMining}`);
    console.log(`>      [UPGD]: NestStaking      =${addrList.NestStaking}`);
    console.log(`>      [UPGD]: NNRewardPool     =${addrList.NNRewardPool}`);
    console.log(`>      [UPGD]: NTokenController =${addrList.NTokenController}`);
    console.log(`>      [UPGD]: NestQuery        =${addrList.NestQuery}`);
    console.log(`>      [UPGD]: NestDAO          =${addrList.NestDAO}`);

    const contracts = await getContractsFromAddrList(addrList);

    const CUSDT = contracts.CUSDT;
    const NestToken = contracts.NestToken;
    const NestPool = contracts.NestPool;
    const NestMining = contracts.NestMining;
    const NestStaking = contracts.NestStaking;
    const NTokenController = contracts.NTokenController;
    const NNToken = contracts.NNToken;
    const NNRewardPool = contracts.NNRewardPool;
    const NestQuery = contracts.NestQuery;
    const NestDAO = contracts.NestDAO;

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

    const NewNestMining = await upgrades.upgradeProxy(contractsOfNest.NestMining, NewNestMiningV1Contract, 
        { unsafeAllowCustomTypes: true, unsafeAllowLinkedLibraries: true});
    tx = NewNestMining.deployTransaction;
    receipt = await tx.wait();
    console.log(`> [INIT]: NestMining upgraded with Proxy, address=${NewNestMining.address}`);
    
    const bn = tx.blockNumber;
    const ts = (await ethers.provider.getBlock(bn)).timestamp;
    const nw = (await ethers.provider.getNetwork).name;
    console.log(`>       network=${nw}   block=${tx.blockNumber}, time=${timeConverter(ts)} `);
    
    addrList.timestamp = timeConverter(ts);
    addrList.block = bn;
    return addrList;
}

exports.deployUpgrade = async function (deployer, _C_NestPool) {

    const UpgContract = await ethers.getContractFactory("NestUpgrade");

    const NestUpgrade = await UpgContract.deploy(_C_NestPool);
    
    const tx = NestUpgrade.deployTransaction;
    await tx.wait(1);

    console.log(`>>> [DPLY]: NestUpgrade deployed, address=${NestUpgrade.address}, block=${tx.blockNumber}`);

    return NestUpgrade;
}

exports.setupNest = async function (deployer, addrList) {

    console.log(`> [INIT]: Starting to setup Nest-Protocol v3.5 ...`);

    const contracts = await getContractsFromAddrList(addrList);

    const CUSDT = contracts.CUSDT;
    const NestToken = contracts.NestToken;
    const NestPool = contracts.NestPool;
    const NestMining = contracts.NestMining;
    const NestStaking = contracts.NestStaking;
    const NTokenController = contracts.NTokenController;
    const NNToken = contracts.NNToken;
    const NNRewardPool = contracts.NNRewardPool;
    const NestQuery = contracts.NestQuery;
    const NestDAO = contracts.NestDAO;

    tx = await NestMining.setup(1, 1, NEST(1000), {
        miningEthUnit: 10,
        nestStakedNum1k: 1,
        biteFeeRate: 1,
        miningFeeRate: 10,
        priceDurationBlock: 25,
        maxBiteNestedLevel: 3,
        biteInflateFactor: 2,
        biteNestInflateFactor:2,
    });
    await tx.wait();
    console.log(`> [INIT] deployer: setup NestMining`);

    tx = await NestPool.setContracts(NestToken.address, NestMining.address, 
                    NestStaking.address, NTokenController.address, NNToken.address, 
                    NNRewardPool.address, NestQuery.address, NestDAO.address);
    await tx.wait();
    console.log(`> [INIT] NestPool.setContracts() ...... OK`);

    tx = await NestMining.loadContracts();
    await tx.wait();
    console.log(`> [INIT] NestMining.loadContracts() ...... OK`);
    
    tx = await NestStaking.loadContracts();
    await tx.wait();
    console.log(`> [INIT] NestStaking.loadContracts() ...... OK`);

    tx = await NTokenController.loadContracts();
    await tx.wait();
    console.log(`> [INIT] NTokenController.loadContracts() ...... OK`);

    tx = await NNRewardPool.loadContracts();
    await tx.wait();
    console.log(`> [INIT] NNRewardPool.loadContracts() ...... OK`);

    tx = await NestQuery.loadContracts();
    await tx.wait();
    console.log(`> [INIT] NestQuery.loadContracts() ...... OK`);

    tx = await NestDAO.loadContracts();
    await tx.wait();
    console.log(`> [INIT] NestDAO.loadContracts() ...... OK`);
    
    tx = await NestPool.setNTokenToToken(CUSDT.address, NestToken.address);
    await tx.wait();
    console.log(`> [INIT] set (USDT <-> NEST) in NestPool ...... OK`);

}

exports.checkDeployment = async function (deployer, addrList, userA, userB) {

    console.log(`> [INIT]: Starting to check Nest-Protocol v3.5 ...`);

    const contracts = await getContractsFromAddrList(addrList);

    const CUSDT = contracts.CUSDT;
    const NestToken = contracts.NestToken;
    const NestPool = contracts.NestPool;
    const NestMining = contracts.NestMining;
    const NestStaking = contracts.NestStaking;
    const NTokenController = contracts.NTokenController;
    const NNToken = contracts.NNToken;
    const NNRewardPool = contracts.NNRewardPool;
    const NestQuery = contracts.NestQuery;
    const NestDAO = contracts.NestDAO;
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

exports.load_address = async function (name) {

    let filename = `.${name}_${network.name}.json`
    let rawdata = fs.readFileSync(filename);
    let contracts_address = JSON.parse(rawdata);
    const address = contracts_address[name];
    if (!address) {
        console.log(`> [EROR] Load address(${name}) from ${filename} ... FAILED ❌ `);
        return {}
    }
    console.log(`> [INFO] Load address(${name}) from ${filename} ... OK `);
    return address
}

exports.save_address = async function (address, name) {

    const filename = `.${name}_${network.name}.json`

    const bn = (await ethers.provider.getBlockNumber());
    const ts = (await ethers.provider.getBlock(bn)).timestamp;

    let contracts_address = {
        network: network.name,
        block: bn, 
        timestamp: timeConverter(ts)
    };
    contracts_address[name] = address;
    
    fs.writeFileSync(filename, JSON.stringify(contracts_address, null, 4));

    console.log(`> [INFO] Save address(${address}) into file ${filename} ... OK `);

}


exports.load_contract = async function (name) {

    let filename = `.${name}_${network.name}.json`
    let rawdata = fs.readFileSync(filename);
    let contracts_address = JSON.parse(rawdata);
    let contract = await ethers.getContractAt(name, contracts_address[name]);
    if (!contract) {
        console.log(`> [EROR] Load contract(${name}) from ${filename} ... FAILED ❌ `);
        return {}
    }
    console.log(`> [INFO] Load contract(${name}) from ${filename} ... OK `);

    return contract
}

exports.save_contract = async function (contract, name) {

    const filename = `.${name}_${network.name}.json`

    const bn = (await ethers.provider.getBlockNumber());
    const ts = (await ethers.provider.getBlock(bn)).timestamp;

    let contracts_address = {
        network: network.name,
        block: bn, 
        timestamp: timeConverter(ts)
    };
    contracts_address[name] =  contract.address;
    
    fs.writeFileSync(filename, JSON.stringify(contracts_address, null, 4));

    console.log(`> [INFO] Save contract(${name}) into file ${filename} ... OK `);
}

exports.load_contracts = async function (filename) {

    let rawdata = fs.readFileSync(filename);
    let contracts_address = JSON.parse(rawdata);

    let contracts = {};

    CUSDT = await ethers.getContractAt("UERC20", contracts_address.USDT);
    console.log(`> [INFO] USDT.symbol=${await CUSDT.symbol()}`);
    CWBTC = await ethers.getContractAt("UERC20", contracts_address.WBTC);
    CNWBTC = await ethers.getContractAt("NNToken", contracts_address.NWBTC);
    
    console.log(`> [INFO] Load USDT(${contracts_address.USDT}), WBTC(${contracts_address.WBTC}), NWBTC(${contracts_address.NWBTC}) ... OK`);
    contracts.USDT = CUSDT;
    contracts.WBTC = CWBTC;
    contracts.NWBTC = CNWBTC;

    IterableMapping = await ethers.getContractAt("IterableMapping", contracts_address.IterableMapping);
    NestToken = await ethers.getContractAt("IBNEST", contracts_address.NEST,
        {
            libraries: {
                IterableMapping: contracts_address.IterableMapping
            }
        });
    console.log(`> [INFO] Load NestToken(${contracts_address.NEST}) ... OK`);
    contracts.NEST = NestToken;
    contracts.IterableMapping = IterableMapping;

    if (! contracts_address.NNToken || !contracts_address.NEST) {
        console.log(`[ERRO] NN Token not found !!!`)
        return {}
    }

    NNToken = await ethers.getContractAt("NNToken", contracts_address.NNToken);
    console.log(`> [INFO] Load NNToken(${contracts_address.NNToken}) ... OK`);
    contracts.NNToken = NNToken;

    if (! contracts_address.NestPool) {
        console.log(`[ERRO] NestPool not found !!!`)
        return {}
    }

    NestPool = await ethers.getContractAt("NestPool", contracts_address.NestPool);
    console.log(`> [INFO] Load NestPool(${contracts_address.NestPool}) ... OK`);
    contracts.NestPool = NestPool;

    if (!contracts_address.NestMiningV1Calc || !contracts_address.NestMiningV1Op 
            || !contracts_address.NestMining || !contracts_address.NestMiningV1Impl) {
        console.log(`[ERRO] NestMiningV1 (or MiningV1Calc, MiningV1Op) not found !!!`)
        return {}
    }

    NestMiningV1Calc = await ethers.getContractAt("MiningV1Calc", contracts_address.NestMiningV1Calc);
    NestMiningV1Op = await ethers.getContractAt("MiningV1Op", contracts_address.NestMiningV1Op);
    contracts.NestMiningV1Calc = NestMiningV1Calc;
    contracts.NestMiningV1Op = NestMiningV1Op;

    NestMiningProxy = await ethers.getContractAt("NestMiningV1", contracts_address.NestMining,
    {
        libraries: {
            MiningV1Calc: contracts_address.NestMiningV1Calc, 
            MiningV1Op: contracts_address.NestMiningV1Op} 
    });
    NestMiningV1Impl = await ethers.getContractAt("NestMiningV1", contracts_address.NestMiningV1Impl,
    {
        libraries: {
            MiningV1Calc: contracts_address.NestMiningV1Calc, 
            MiningV1Op: contracts_address.NestMiningV1Op} 
    });
    console.log(`> [INFO] Load NestMiningProxy(${contracts_address.NestMining}), NestMiningImpl(${contracts_address.NestMiningV1Impl}) ... OK`);
    contracts.NestMining = NestMiningProxy;
    contracts.NestMiningV1Impl = NestMiningV1Impl;

    if (! contracts_address.NestStaking || !contracts_address.NestStakingImpl) {
        console.log(`[ERRO] NestStaking (or NestStakingImpl) not found !!!`)
        return {}
    }

    NestStakingProxy = await ethers.getContractAt("NestStaking", contracts_address.NestStaking);
    NestStakingImpl = await ethers.getContractAt("NestStaking", contracts_address.NestStakingImpl);
    console.log(`> [INFO] Load NestStakingImpl(${contracts_address.NestStakingImpl}), NestStakingProxy(${contracts_address.NestStaking}) ... OK`);
    contracts.NestStaking = NestStakingProxy;
    contracts.NestStakingImpl = NestStakingImpl;

    NNRewardPool = await ethers.getContractAt("NNRewardPool", contracts_address.NNRewardPool);
    console.log(`> [INFO] Load NNRewardPool from ${contracts_address.NNRewardPool} ... OK`);
    NTokenController = await ethers.getContractAt("NTokenController", contracts_address.NTokenController);
    console.log(`> [INFO] Load NTokenController from ${contracts_address.NTokenController} ... OK`);
    contracts.NNRewardPool = NNRewardPool;
    contracts.NTokenController = NTokenController;

    NestQueryContract = await ethers.getContractFactory("NestQuery");
    NestQueryProxy = NestQueryContract.attach(contracts_address.NestQuery);
    NestQueryImpl = await ethers.getContractAt("NestQuery", contracts_address.NestQueryImpl);
    console.log(`> [INFO] Load NestQueryProxy from ${contracts_address.NestQuery} ... OK`);
    contracts.NestQuery = NestQueryProxy;
    contracts.NestQueryImpl = NestQueryImpl;

    NestDAOContract = await ethers.getContractFactory("NestDAO");
    NestDAOProxy = NestDAOContract.attach(contracts_address.NestDAO);
    console.log(`> [INFO] Load NestDAOProxy from ${contracts_address.NestDAO} ... OK`);
    contracts.NestDAO = NestDAOProxy;


    if (contracts_address.ProxyAdmin) {
        // NestVote = await ethers.getContractAt("NestVote", contracts_address.NestVote);
        // console.log(`> [INIT] Load NestVote from ${contracts_address.NestVote} ... OK`);
        // contracts.NestVote = NestVote;
    }

    if (contracts_address.NestVote) {
        NestVote = await ethers.getContractAt("NestVote", contracts_address.NestVote);
        console.log(`> [INFO] Load NestVote from ${contracts_address.NestVote} ... OK`);
        contracts.NestVote = NestVote;
    }

    if (contracts_address.NIPReleaseGov) {
        NIPReleaseGov = await ethers.getContractAt("NIPReleaseGov", contracts_address.NIPReleaseGov);
        console.log(`> [INFO] Load NIPReleaseGov from ${contracts_address.NIPReleaseGov} ... OK`);
        contracts.NIPReleaseGov = NIPReleaseGov;
    }
    console.log(`> [INFO] Load contracts from file ${filename} ... OK `);

    return contracts;
}

exports.save_contracts = async function (contracts, filename) {

    const bn = (await ethers.provider.getBlockNumber());
    const ts = (await ethers.provider.getBlock(bn)).timestamp;

    let contracts_address = {
        network: network.name,
        block: bn, 
        timestamp: timeConverter(ts)
    };

    Object.entries(contracts).forEach((e) => {
        const [k, v] = e;
        contracts_address[k] = v.address;
    })
    
    fs.writeFileSync(filename, JSON.stringify(contracts_address, null, 4));

    console.log(`> [INFO] Save contracts into file ${filename} ... OK `);
}