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
    USDT: "0x82A9286dB983093Ff234cefCea1d8fA66382876B", 
    WBTC: "0x41219a0a9C0b86ED81933c788a6B63Dfef8f17eE", 
    NEST: "0xF67e26649037695DdFAB19f4E22d5c9Fd1564592", 
    NN: "0xeA8AE08513f8230cAA8d031D28cB4Ac8CE720c68", 
    IterableMapping: "0x1d460d731Bd5a0fF2cA07309dAEB8641a7b175A1", 
    NestPool: "0x6431AF84d34F0522cAA58b221d94A150B5AdAC69", 
    MiningV1Calc: "0x18b7CBdfFA52d1e7BB992fd50f394c5b59E20B72", 
    MiningV1Op: "0x2f321ed425c82E74925488139e1556f9B76a2551", 
    NestMining: "0x3A906C603F080D96dc08f81CF2889dAB6FF299dE", 
    NestStaking: "0x820638ecd57B55e51CE6EaD7D137962E7A201dD9", 
    NNRewardPool: "0x725314746e727f586E9FCA65AeD5dBe45aA71B99", 
    NTokenController: "0x987Aa6E80e995d6A76C4d061eE324fc760Ea9F61", 
    NestQuery: "0x6B9C4119796C80Ced5a3884027985Fd31830555b", 
    NestDAO: "0xA8d14b3d9e2589CEA8644BB0f67EB90d21079f8B", 
}


const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol,
    deployNestProtocolWithProxy, 
    setupNest} = require("./deploy.js");

async function main(network) {
    
    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    await setupNest(owner, contractsDeployed_localhost);
}


main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });