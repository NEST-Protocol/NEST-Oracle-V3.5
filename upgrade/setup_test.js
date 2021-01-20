
const { usdtdec, wbtcdec, nestdec, ethdec,
    ETH, USDT, WBTC, MBTC, NEST, BigNum,
    show_eth, show_usdt, show_64x64, timeConverter } = require("../upgrade/utils.js");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST,deployUpgrade,
    deployNestProtocol,
    deployNestProtocolWithProxy, getContractsFromAddrList,
    setupNest } = require("./deploy.js");

const contractsDeployed_kovan = require("./.contracts_kovan.js");
const contractsDeployed_mainnet = require("./.contracts_mainnet.js");

const contractsNestv3 = require("./.contracts_nest_v3_0.js");

const contractsToken = require("./.contracts_token.js");
const contractsNToken = require("./.contracts_ntoken.js");

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
    //const CWBTC = contracts.CWBTC;
    //const CNWBTC = contracts.CNWBTC;
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
            miningFeeRate: 33,
            priceDurationBlock: 25,
            maxBiteNestedLevel: 3,
            biteInflateFactor: 2,
            biteNestInflateFactor: 2,
        };
    }

    
    tx = await NestPool.setContracts(contractsNestv3.NEST, NestMining.address,
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
    
    tx = await NestPool.setGovernance(NestUpgrade.address);
    tx.wait(5);
    console.log(`>>> [STUP] NestPool.governance ==> NestUpgrade (${NestUpgrade.address}) ...... OK`);
    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);
    

    console.log("Nest_3_MiningContract = ",contractsNestv3.Nest_3_MiningContract);
    console.log("Nest_NToken_TokenMapping = ",contractsNestv3.Nest_NToken_TokenMapping);
    console.log("Nest_NToken_TokenAuction = ",contractsNestv3.Nest_NToken_TokenAuction);
    console.log("contractsToken.token1 = ",contractsToken.token1);
    console.log("contractsToken.token2 = ",contractsToken.token2);
    console.log("params = ",params);
    
    /// @dev need to fix
    tx = await NestUpgrade.setPairsOfTokens(
        contractsNestv3.USDT,
        contractsNestv3.Nest_NToken_TokenMapping,
        [contractsToken.token1, contractsToken.token2]);
    tx.wait(3);
    console.log(`>>> [STUP] NestUpgrade.setPairsOfTokens() ...... OK`);

    // there may be wrong result  
    //tx.wait(2);
    //const param_pos1 = await NestMining.parameters();
    //console.log(`>>> [INFO] param_pos1=`, param_pos1);

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