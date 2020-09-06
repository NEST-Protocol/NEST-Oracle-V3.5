const UERC20 = artifacts.require("test/UERC20");

const IBNEST = artifacts.require("IBNEST");
const IterableMapping = artifacts.require("IterableMapping");

const NestPool = artifacts.require("NestPool");
const DAO = artifacts.require("DAO");

const BonusPool = artifacts.require("BonusPool");
const Staking = artifacts.require("Staking");

const NestMining = artifacts.require("NestMining");

const NNRewardPool = artifacts.require("NNRewardPool");

const NNToken = artifacts.require("test/NNToken");

// const WETH9 = artifacts.require("test/WETH9");
// const NEST3PriceOracleMock = artifacts.require("mock/NEST3PriceOracleMock");
// const CofiXFactory = artifacts.require("CofiXFactory");
// const CofiXRouter = artifacts.require("CofiXRouter");
// const CofiXController = artifacts.require("CofiXController");

module.exports = async function(deployer) {

    // Test token
    let totalSupply = (10**12)*(10**6);  
    await deployer.deploy(UERC20, "10000000000000000", "USDT Test Token", "USDT", 6);

    await deployer.deploy(IterableMapping);
    await deployer.link(IterableMapping, IBNEST);
    await deployer.deploy(IBNEST);
    
    await deployer.deploy(DAO, 91);

    await deployer.deploy(NestPool, DAO.address);

    await deployer.deploy(BonusPool);

    await deployer.deploy(Staking, BonusPool.address, IBNEST.address);

    await deployer.deploy(NestMining, IBNEST.address, NestPool.address, BonusPool.address);

    await deployer.deploy(NestMining, IBNEST.address, NestPool.address, BonusPool.address);

    await deployer.deploy(NNToken, 1500, "NNT");

    await deployer.deploy(NNRewardPool, IBNEST.address, NNToken.address);

    // // WETH contract
    // await deployer.deploy(WETH9);

    // // NEST3 Price Oracle Mock
    // await deployer.deploy(NEST3PriceOracleMock, WETH9.address);

    // // CofiXController
    // await deployer.deploy(CofiXController, NEST3PriceOracleMock.address);

    // // CofiXFactory
    // await deployer.deploy(CofiXFactory, CofiXController.address, WETH9.address);

    // // CofiXRouter
    // await deployer.deploy(CofiXRouter, CofiXFactory.address, WETH9.address);

};