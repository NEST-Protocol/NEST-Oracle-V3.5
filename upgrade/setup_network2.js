
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
const { expect } = require("chai");

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
    let genesis;
    let lastB;
    let mined;
    let tx;

    tx = await NestPool.setGovernance(NestUpgrade.address);
    tx.wait(1);
    console.log(`>>> [STUP] NestPool.governance ==> NestUpgrade (${NestUpgrade.address}) ...... OK`);
    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);
    
    /// @dev need to fix
    tx = await NestUpgrade.transferFundsFromNest3(
        contractsDeployed_nestv3.Nest_3_MiningContract,
        contractsDeployed_nestv3.Nest_NToken_TokenAuction,
        contractsDeployed_nestv3.Nest_3_Abonus,
        contractsDeployed_nestv3.Nest_3_Leveling,
        [usdt.addr, token1.addr, ...]
        );
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