

const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, 
    upgradeNestMiningWithProxy,
    setupNest} = require("../test/deploy.js");

const contractsDeployed = {
    USDT: "0xccA9728291bC98ff4F97EF57Be3466227b0eb06C",
    WBTC: "0xc6B407503dE64956Ad3cF5Ab112cA4f56AA13517",
    NEST: "0x6A47346e722937B60Df7a1149168c0E76DD6520f",
    NN: "0x7A28cf37763279F774916b85b5ef8b64AB421f79",
    NestPool: "0x2BB8B93F585B43b06F3d523bf30C203d3B6d4BD4",
    MiningV1Op: "0xd0EC100F1252a53322051a95CF05c32f0C174354",
    MiningV1Calc: "0xB7ca895F81F20e05A5eb11B05Cbaab3DAe5e23cd",
    NestMining: "0xCa57C1d3c2c35E667745448Fef8407dd25487ff8",
    NestStaking: "0xc3023a2c9f7B92d1dd19F488AF6Ee107a78Df9DB",
    NNRewardPool: "0x124dDf9BdD2DdaD012ef1D5bBd77c00F05C610DA",
    NTokenController: "0xe044814c9eD1e6442Af956a817c161192cBaE98F",
    NestQuery: "0xaB837301d12cDc4b97f1E910FC56C9179894d9cf"
}

const contractsUpgraded = {
    USDT: "0xccA9728291bC98ff4F97EF57Be3466227b0eb06C",
    WBTC: "0xc6B407503dE64956Ad3cF5Ab112cA4f56AA13517",
    NEST: "0x6A47346e722937B60Df7a1149168c0E76DD6520f",
    NN: "0x7A28cf37763279F774916b85b5ef8b64AB421f79",
    NestPool: "0x2BB8B93F585B43b06F3d523bf30C203d3B6d4BD4",
    MiningV1Calc: "0xDf951d2061b12922BFbF22cb17B17f3b39183570",
    MiningV1Op: "0x4f42528B7bF8Da96516bECb22c1c6f53a8Ac7312",
    NestMining: "0xCa57C1d3c2c35E667745448Fef8407dd25487ff8",
    NestStaking: "0xc3023a2c9f7B92d1dd19F488AF6Ee107a78Df9DB",
    NNRewardPool: "0x124dDf9BdD2DdaD012ef1D5bBd77c00F05C610DA",
    NTokenController: "0xe044814c9eD1e6442Af956a817c161192cBaE98F",
    NestQuery: "0xaB837301d12cDc4b97f1E910FC56C9179894d9cf",
}

async function main() {
    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    let CNest = await upgradeNestMiningWithProxy(owner, contractsDeployed);

}


main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });