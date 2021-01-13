
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

const contractsNestv3 = require("./.contracts_nest_v3_0.js");

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

    let tx;
    
    const param_pre = await NestMining.parameters();
    console.log(`>>> [INFO] parameters=`, param_pre);

    const gov_pre = await NestPool.governance();
    console.log("gov_pre = ", gov_pre);
    
    tx = await NestPool.setGovernance(NestUpgrade.address);
    tx.wait(1);
    console.log(`>>> [STUP] NestPool.governance ==> NestUpgrade (${NestUpgrade.address}) ...... OK`);
    bn = tx.blockNumber;
    ts = (await ethers.provider.getBlock(bn)).timestamp;
    nw = (await ethers.provider.getNetwork()).name;
    console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);
    
    const gov_pos = await NestPool.governance();
    console.log("gov_pre = ", gov_pos);

    console.log("Nest_3_MiningContract = ",contractsNestv3.Nest_3_MiningContract);
    console.log("Nest_3_Abonus = ",contractsNestv3.Nest_3_Abonus);
    console.log("Nest_NToken_TokenAuction = ",contractsNestv3.Nest_NToken_TokenAuction);
    console.log("contractsNestv3.Nest_3_Leveling = ",contractsNestv3.Nest_3_Leveling);
    console.log("contractsNestv3.USDT = ",contractsNestv3.USDT);
    console.log("contractsToken.token1 = ",contractsToken.token1);
    console.log("contractsToken.token2 = ",contractsToken.token2);
    
    tx = await NestUpgrade.latestHeight();
    console.log("latestHeight = ",tx.toString());
    
    tx = await NestUpgrade.flag();
    console.log("flag = ",tx.toString());
    
    tx = await NestUpgrade.ntoken_num1();
    console.log("ntoken_num1 = ",tx.toString());

    tx = await NestUpgrade.ntoken_num2();
    console.log("ntoken_num2 = ",tx.toString());

    tx = await NestUpgrade.nestBal();
    console.log("nestBal = ",tx.toString());

    tx = await NestUpgrade.minedNestAmount();
    console.log("minedNestAmount = ",tx.toString());
     
    tx = await NestUpgrade.nest();
    console.log("nest = ",tx.toString());
    
    
    /// @dev need to fix
    tx = await NestUpgrade.transferNestFromNest3(contractsNestv3.Nest_3_MiningContract);
    tx.wait(1);
    console.log(`>>> [STUP] NestUpgrade.transferNestFromNest3() ...... OK`);
    
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