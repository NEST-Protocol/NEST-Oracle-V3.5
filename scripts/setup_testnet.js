require("ethers");

const { usdtdec, wbtcdec, nestdec, ethdec,
    ETH, USDT, WBTC, MBTC, NEST, BigNum,
    show_eth, show_usdt, show_64x64, timeConverter } = require("./utils.js");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    deployNestProtocolWithProxy, getContractsFromAddrList,
    deployUpgrade,
    setupNest } = require("./deploy.js");

const contractsDeployed_localhost = require("./.contracts_localhost.js");
const contractsDeployed_kovan = require("./.contracts_kovan.js");
const { expect } = require("chai");

async function main() {

    const addrList = function () {
        if (network.name === "localhost") {
            return contractsDeployed_localhost;
        } else if (network.name === "kovan") {
            return contractsDeployed_kovan;
        }
    }();

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();


    const contracts = await getContractsFromAddrList(addrList);

    const CUSDT = contracts.CUSDT;
    const CWBTC = contracts.CWBTC;
    const NestToken = contracts.NestToken;
    const NestPool = contracts.NestPool;
    const NestMining = contracts.NestMining;
    const NestStaking = contracts.NestStaking;
    const NTokenController = contracts.NTokenController;
    const NNToken = contracts.NNToken;
    const NNRewardPool = contracts.NNRewardPool;
    const NestQuery = contracts.NestQuery;
    const NestDAO = contracts.NestDAO;

    const balance_nest_nestpool = await NestPool.balanceOfNestInPool(NestPool.address);

    if (balance_nest_nestpool < NEST(3000000000)) {
        let tx = await NestToken.transfer(NestPool.address, NEST("3000000000"));
        await tx.wait();
        console.log(`> [INIT]: transfer Nest to NestPool about nest ...`);
    }

    let params;
    let genesis;
    let lastB;
    let mined;
    let tx;
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
    } else if (network.name === "kovan") {
        genesis = 1;
        lastB = 22397738;
        mined = NEST(1000);
        params = {
            miningEthUnit: 1,
            nestStakedNum1k: 1,
            biteFeeRate: 0,
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
    console.log(`>>>[STUP] NestPool.setContracts() ..... ok`);
    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);

    const NTokenContract = await ethers.getContractFactory("NestNToken");

    const CNWBTC = await NTokenContract.deploy("NWBTC", "NWBTC", owner.address);
    console.log(`>>> [DPLY]: NWBTC deployed, address=${CNWBTC.address}, block=${tx.blockNumber}`);

    tx = CNWBTC.deployTransaction;
    await tx.wait(1);

    NestUpgrade = await deployUpgrade(owner, NestPool.address);

    tx = await NestPool.setGovernance(NestUpgrade.address);
    tx.wait(1);
    console.log(`>>> [STUP] NestPool.governance ==> NestUpgrade (${NestUpgrade.address}) ...... OK`);
    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);

    tx = await NestUpgrade.setup(genesis, lastB, mined, params, 
        [CUSDT.address, CWBTC.address], [NestToken.address, CNWBTC.address]);
    tx.wait(1);
    console.log(`>>> [STUP] NestUpgrade.setup() ...... OK`);
    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);

    params = await NestMining.parameters();
    console.log(`>>> [INFO] parameters=`, params);


    const rs_nest = await NestPool.getNTokenFromToken(CUSDT.address);
    if (rs_nest != NestToken.address) {
        console.log(`>>> [EROR] NTOKEN_USDT=${rs_nest}, Nest=${NestToken.address}`);
    } else {
        console.log(`>>> [STUP] deployer: set (USDT <-> NEST) to NestPool ...... ok`);
    }

    const rs_nwbtc = await NestPool.getNTokenFromToken(CWBTC.address);
    if (rs_nwbtc != CNWBTC.address) {
        console.log(`>>> [EROR] NTOKEN_WBTC=${rs_nwbtc}, NWBTC=${CNWBTC.address}`);
    } else {
        console.log(`>>> [STUP] deployer: set (WBTC <-> NWBTC) to NestPool ...... ok`);
    }
    // tx = await NestPool.setNTokenToToken(CUSDT.address, NestToken.address);
    // receipt = await tx.wait();
    // console.log(`>>> [STUP] deployer: set (USDT <-> NEST) to NestPool ...... ok`);
    // bn = tx.blockNumber;
    // ts = (await ethers.provider.getBlock(bn)).timestamp;
    // nw = (await ethers.provider.getNetwork()).name;
    // console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });