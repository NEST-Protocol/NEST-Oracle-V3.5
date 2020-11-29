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
    USDT: "0x0B32a3F8f5b7E5d315b9E52E640a49A89d89c820",
    WBTC: "0xF357118EBd576f3C812c7875B1A1651a7f140E9C",
    IterableMapping: "0x519b05b3655F4b89731B677d64CEcf761f4076f6",
    NEST: "0x057cD3082EfED32d5C907801BF3628B27D88fD80",
    NN: "0xb6057e08a11da09a998985874FE2119e98dB3D5D",
    NestPool: "0xad203b3144f8c09a20532957174fc0366291643c",
    MiningV1Calc: "0x31403b1e52051883f2Ce1B1b4C89f36034e1221D",
    MiningV1Op: "0x4278C5d322aB92F1D876Dd7Bd9b44d1748b88af2",
    NestMining: "0x0D92d35D311E54aB8EEA0394d7E773Fc5144491a",
    NestStaking: "0x24EcC5E6EaA700368B8FAC259d3fBD045f695A08",
    NNRewardPool: "0x876939152C56362e17D508B9DEA77a3fDF9e4083",
    NTokenController: "0xD56e6F296352B03C3c3386543185E9B8c2e5Fd0b",
    NestQuery: "0xEC7cb8C3EBE77BA6d284F13296bb1372A8522c5F",
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