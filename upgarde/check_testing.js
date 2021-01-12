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

const contractsToken = require("./.contracts_token.js");

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

    const NestPool = contracts.NestPool;
    const NestMining = contracts.NestMining;
    const NestStaking = contracts.NestStaking;
    const NTokenController = contracts.NTokenController;
    const NNToken = contracts.NNToken;
    const NNRewardPool = contracts.NNRewardPool;
    const NestQuery = contracts.NestQuery;
    const NestDAO = contracts.NestDAO;
    const NestUpgrade = contracts.NestUpgrade;
    
    //================================================//
    let tx;

    tx = await NestDAO.totalETHRewards(addrList.NEST);
    console.log("ETH1  = ",tx.toString());
    
    tx = await NestDAO.totalETHRewards(CNWBTC.address);
    console.log("ETH2  = ",tx.toString());

}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });