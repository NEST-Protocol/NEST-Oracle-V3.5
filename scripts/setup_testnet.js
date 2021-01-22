
const { usdtdec, wbtcdec, nestdec, ethdec,
    ETH, USDT, WBTC, MBTC, NEST, BigNum,
    show_eth, show_usdt, show_64x64, timeConverter } = require("./utils.js");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST,deployUpgrade,
    deployNestProtocol,
    deployNestProtocolWithProxy, getContractsFromAddrList,
    setupNest } = require("./deploy.js");

const contractsDeployed_localhost = require("./.contracts_localhost.js");
const contractsDeployed_kovan = require("./.contracts_kovan.js");
const contractsDeployed_ropsten = require("./.contracts_ropsten.js");
const { expect } = require("chai");

async function main() {

    const addrList = function () {
        if (network.name === "localhost") {
            return contractsDeployed_localhost;
        } else if (network.name === "kovan") {
            return contractsDeployed_kovan;
        } else if (network.name === "ropsten") {
            return contractsDeployed_ropsten;
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
    console.log("balance_nest_nestpool = ",balance_nest_nestpool);
    
    if (balance_nest_nestpool < NEST("3000000000")) {
        let tx = await NestToken.transfer(NestPool.address, NEST("3000000000"));
        await tx.wait();
        console.log(`> [INIT]: transfer Nest to NestPool about nest ...  OK`);
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
        genesis = 6236588;
        lastB = 22980700;
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
    }else if (network.name === "ropsten") {
        genesis = 6236588;
        lastB = 9269160;
        mined = NEST(1000);
        params = {
            miningEthUnit: 1,
            nestStakedNum1k: 1,
            biteFeeRate: 1,
            miningFeeRate: 1,
            priceDurationBlock: 5,
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

    tx = await NestPool.setNTokenToToken(CWBTC.address, addrList.NWBTC);
    tx.wait(1);
    console.log(`>>> [STUP] deployer: set (WBTC <-> CWBTC) to NestPool ...... ok`);

    
    tx = await NestMining.setup(genesis, lastB, mined, params);
    tx.wait(1);
    console.log(`>>> [STUP] NestMining.setup() ...... OK`);
    
    // there may be wrong result  
    const param_pos = await NestMining.parameters();
    console.log(`>>> [INFO] parameters=`, param_pos);

    tx.wait(2);
    const param_pos1 = await NestMining.parameters();
    console.log(`>>> [INFO] parameters=`, param_pos1);

    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);
    
}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });