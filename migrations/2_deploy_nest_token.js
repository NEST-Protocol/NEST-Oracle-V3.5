const IBNEST = artifacts.require("IBNEST");
const IterableMapping = artifacts.require("IterableMapping");

module.exports = async function(deployer) {
    await deployer.deploy(IterableMapping);
    await deployer.link(IterableMapping, IBNEST);
    await deployer.deploy(IBNEST);
}