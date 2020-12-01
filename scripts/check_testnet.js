const contractsDeployed_kovan = {
    USDT: "0x4349C96f686973d3A6C2BE0D18ADBB7002E7E486",
    WBTC: "0xa71aeaD2011C0810f608109e35d71d67b5892B8d",
    IterableMapping: "0x861a88C3419c8F7e9412ef751332c5bE72aB041F",
    NEST: "0x1dF3eb17e2b38Ce354f3DE5ECa41137e969B9B60",
    NN: "0xffd7270664D15A32f84852BdD5E10064Fe67AF07",
    NestPool: "0x0cAB66dB4b1A9f9719bB0E654BF066fA8245d50c",
    MiningV1Calc: "0x2d3cA16D9b5bCeb98bFA375c1af41721f76D4A81",
    MiningV1Op: "0x57743A5A1b2CCfE0D4d3Fd86Ee67f66Ff97C3094",
    NestMining: "0x727F46f177cc49854873FB6872e5ef64408f9dF9",
    NestStaking: "0x0ab354949E511a0C766a5aA2830B290F618467F1",
    NNRewardPool: "0x9F10F2a1261ab01a97cd57F86b0795E394224973",
    NTokenController: "0x2E5690d9D53C47E7B2Ea7af02842Abb9130DAe64",
    NestQuery: "0xc76dE07116fF220a5d859B85CCe48Cb2aCc4d4dB"
}

const contractsDeployed_localhost = {
    USDT: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    WBTC: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    NEST: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    NN: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    IterableMapping: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    NestPool: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    MiningV1Calc: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    MiningV1Op: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    NestMining: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
    NestStaking: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
    NNRewardPool: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
    NTokenController: "0x9A676e781A523b5d0C0e43731313A708CB607508",
    NestQuery: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
    NestDAO: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
}

const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, 
    upgradeNestMiningWithProxy,
    checkDeployment, getContractsFromAddrList,
    setupNest} = require("./deploy.js");

const contractsDeployed_localhost = require("./.contracts_localhost.js");
const contractsDeployed_kovan = require("./.contracts_kovan.js");

const main = async function () {

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    await checkDeployment(owner, contractsDeployed_localhost, userA, userB);
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });