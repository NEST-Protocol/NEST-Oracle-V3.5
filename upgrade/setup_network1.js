
const { usdtdec, wbtcdec, nestdec, ethdec,
    ETH, USDT, WBTC, MBTC, NEST, BigNum,
    show_eth, show_usdt, show_64x64, timeConverter } = require("./utils.js");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST,deployUpgrade,
    deployNestProtocol,
    deployNestProtocolWithProxy, getContractsFromAddrList,
    setupNest } = require("./deploy.js");

const contractsDeployed_kovan = require("./.contracts_kovan.js");
const contractsDeployed_mainnet = require("./.contracts_mainnet.js");

const contractsDeployed_nestv3 = require("./.contracts_nest_v3_0.js");

async function main() {
    const addrList = function () {
        if (network.name === "kovan") {
            return contractsDeployed_kovan;
        } else {
            return contractsDeployed_mainnet;
        }
    }();

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();


    const contracts = await getContractsFromAddrList(addrList);

    //const CUSDT = contracts.CUSDT;
    
    //const NestToken = contracts.NestToken;
    const NestPool = contracts.NestPool;
    const NestMining = contracts.NestMining;
    const NestStaking = contracts.NestStaking;
    const NTokenController = contracts.NTokenController;
    const NNToken = contracts.NNToken;
    const NNRewardPool = contracts.NNRewardPool;
    const NestQuery = contracts.NestQuery;
    const NestDAO = contracts.NestDAO;
    const NestUpgrade = contracts.NestUpgrade;

    let params;
    let tx;

    if (network.name === "kovan") {
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
    } else {
        params = {
            miningEthUnit: 10,
            nestStakedNum1k: 1,
            biteFeeRate: 3,
            miningFeeRate: 3,
            priceDurationBlock: 25,
            maxBiteNestedLevel: 3,
            biteInflateFactor: 2,
            biteNestInflateFactor: 2,
        };
    }
    
    tx = await NestPool.setContracts(addrList.NEST, NestMining.address,
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
    
    tx = await NestPool.setNTokenToToken(addrList.USDT, addrList.NEST);
    receipt = await tx.wait();
    console.log(`>>> [STUP] deployer: set (USDT <-> NEST) to NestPool ...... ok`);
    
    //const NTokenContract = await ethers.getContractFactory("NestNToken");
    
    //NestUpgrade = await deployUpgrade(owner, NestPool.address);
    //console.log(`>>> [DPLY]: deployUpgrade deployed  ............. OK`);
    
    tx = await NestPool.setGovernance(NestUpgrade.address);
    tx.wait(1);
    console.log(`>>> [STUP] NestPool.governance ==> NestUpgrade (${NestUpgrade.address}) ...... OK`);
    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);
    
    /// @dev need to fix
    tx = await NestUpgrade.setNTokenToToken(
        contractsDeployed_nestv3.Nest_3_MiningContract,
        contractsDeployed_nestv3.Nest_NToken_TokenMapping,
        contractsDeployed_nestv3.Nest_NToken_TokenAuction,
        params,
        ['0x0A6573bb90A60A27C845800382852935216c3102', '0x1090ADb9Cb0bbc369394549Bf16411904Fa9e042']);
    tx.wait(1);
    console.log(`>>> [STUP] NestUpgrade.setNTokenToToken() ...... OK`);

    // there may be wrong result  
    const param_pos = await NestMining.parameters();
    console.log(`>>> [INFO] parameters=`, param_pos);

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