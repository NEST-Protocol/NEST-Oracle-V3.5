const contractsDeployed_localhost = require("./.contracts_localhost.js");
const contractsDeployed_kovan = require("./.contracts_kovan.js");
const contractsDeployed_ropsten = require("./.contracts_ropsten.js");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST,
    deployNestProtocol,
    deployNestProtocolWithProxy, getContractsFromAddrList,
    setupNest } = require("./deploy.js");

const main = async function () {

    const addrList = function () {
        if (network.name === "localhost") {
            return contractsDeployed_localhost;
        } else if (network.name === "kovan") {
            return contractsDeployed_kovan;
        } else if (network.name === "ropsten") {
            return contractsDeployed_ropsten;
        }
    } ();

    const contracts = await getContractsFromAddrList(addrList);
    const NestMining = contracts.NestMining;

    console.log(`> [INIT]: Starting to setParameters ...`);
    let tx = await NestMining.setParams({
        miningEthUnit: 1,
        nestStakedNum1k: 1,
        biteFeeRate: 1,
        miningFeeRate: 1,
        priceDurationBlock: 20,
        maxBiteNestedLevel: 3,
        biteInflateFactor: 2,
        biteNestInflateFactor: 2,
    });

    await tx.wait();

    const params = await NestMining.parameters();
    console.log(`>>> [INFO] parameters=`, params);

    console.log(`> [INIT]: Complete parameter changes ...`);

}

main()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });