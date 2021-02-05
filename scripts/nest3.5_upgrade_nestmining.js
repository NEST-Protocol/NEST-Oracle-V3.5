const contractsDeployed_localhost = require("./.contracts_localhost.js");
const contractsDeployed_kovan = require("./.contracts_kovan.js");
const contractsDeployed_ropsten = require("./.contracts_ropsten.js");
const contractsDeployed_miannet = require("./.contracts_mainnet.js");


async function main() {

    const addrList = function () {
        if (network.name === "localhost") {
            return contractsDeployed_localhost;
        } else if (network.name === "kovan") {
            return contractsDeployed_kovan;
        }else if (network.name === "ropsten") {
            return contractsDeployed_ropsten;
        }else{
            return contractsDeployed_miannet;
        }
    } (); 

    [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

    const contracts = await getContractsFromAddrList(addrList);

    const NestMining = contracts.NestMining;
    
    console.log(`> [INIT]: Starting to upgrade Nest-Protocol v3.5 ...`);


    // upgrade NestMining
    const MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    const MiningV1Calc = await MiningV1CalcLibrary.deploy();
    await MiningV1Calc.deployTransaction.wait();
    console.log(`>>> [UPGD]: NestMiningV1/MiningV1Calc deployed, address=${MiningV1Calc.address}, block=${MiningV1Calc.deployTransaction.blockNumber}`);

    addrList.MiningV1Calc = MiningV1Calc.address;
    const MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    const MiningV1Op = await MiningV1OpLibrary.deploy();
    await MiningV1Op.deployTransaction.wait();
    console.log(`>>> [UPGD]: NestMiningV1/MiningV1Op deployed, address=${MiningV1Op.address}, block=${MiningV1Op.deployTransaction.blockNumber}`);
    addrList.MiningV1Op = MiningV1Op.address;

    const NewNestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
    {
        libraries: {
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address
            }
    });
    console.log(`>>> [UPGD]: NestMining has been deployed, address=${NestMining.address}, block=${MiningV1Op.deployTransaction.blockNumber}`);

    const v0 = await NestMining.version();
    console.log(`>>>    [INFO]: OLD NestMining.version = ${v0}`);

    const NewNestMining = await upgrades.upgradeProxy(addrList.NestMining, NewNestMiningV1Contract, 
        { unsafeAllowCustomTypes: true, unsafeAllowLinkedLibraries: true});
    console.log(`>>> [UPGD]: NestMining upgraded with Proxy ...... [OK]`);
    console.log(`>>>    [INFO]: NestMining.address=${NewNestMining.address}`);

    const para = await NestMining.parameters();
    console.log("para =",para);

}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });