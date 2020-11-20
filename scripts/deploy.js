
async function main() {

    [owner] = await ethers.getSigners();

    ERC20Contract = await ethers.getContractFactory("UERC20");
    CUSDT = await ERC20Contract.deploy("10000000000000000", "USDT Test Token", "USDT", 6);
    CWBTC = await ERC20Contract.deploy("2100000000000000", "WBTC Test Token", "WBTC", 6);
    console.log("> [INIT]: CUSDT, CWBTC deployed");

    IterableMappingContract = await ethers.getContractFactory("IterableMapping");
    IterableMapping = await IterableMappingContract.deploy();
    console.log("> [INIT]: IterableMapping deployed");

    NestToken = await ethers.getContractFactory("IBNEST",
        {
            libraries: {
                IterableMapping: IterableMapping.address
            }
        });

    NestToken = await NestToken.deploy();
    console.log("> [INIT]: NestToken deployed");

    NestPoolContract = await ethers.getContractFactory("NestPool");
    NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract
    console.log("> [INIT]: NestPool deployed");

    NestStakingContract = await ethers.getContractFactory("NestStaking");
    NestStaking = await NestStakingContract.deploy(NestToken.address);
    console.log("> [INIT]: NestStaking deployed");

    MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
    MiningV1Calc = await MiningV1CalcLibrary.deploy();
    console.log("> [INIT]: MiningV1Calc deployed");

    MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
    MiningV1Op = await MiningV1OpLibrary.deploy();
    console.log("> [INIT]: MiningV1Op deployed");

    NestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
    {
        libraries: {
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address
            }
    });
    NestMining = await NestMiningV1Contract.deploy();
    console.log("> [INIT]: NestMining deployed");

    NNTokenContract = await ethers.getContractFactory("NNToken");
    NNToken = await NNTokenContract.deploy(1500, "NNT");
    console.log("> [INIT]: NNToken deployed");

    NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
    NNRewardPool = await NNRewardPoolContract.deploy(NestToken.address, NNToken.address);
    console.log("> [INIT]: NNRewardPool deployed");

    NTokenControllerContract = await ethers.getContractFactory("NTokenController");
    NTokenController = await NTokenControllerContract.deploy();
    console.log("> [INIT]: NTokenController deployed");

    NestQueryContract = await ethers.getContractFactory("NestQuery");
    NestQuery = await NestQueryContract.deploy();
    console.log("> [INIT]: NestQuery deployed");

    console.log(`> [INIT] owner = `, owner.address);

    console.log("NestToken:", NestToken.address);
    console.log("NestPool:", NestPool.address);
    console.log("NestStaking:", NestStaking.address);
    console.log("NestMining:", NestMining.address);
    console.log("NNToken:", NNToken.address);
    console.log("NNRewardPool:", NNRewardPool.address);
    console.log("NTokenController:", NTokenController.address);
    console.log("NestQuery:", NestQuery.address);

    _C_NestStaking = NestStaking.address;
    _C_NestToken = NestToken.address;
    _C_NestPool = NestPool.address;
    _C_NestMining = NestMining.address;
    _C_USDT = CUSDT.address;
    _C_WBTC = CWBTC.address;
    _C_NNRewardPool = NNRewardPool.address;
    _C_NNToken = NNToken.address;
    _C_NTokenController = NTokenController.address;
    _C_NestQuery = NestQuery.address;

    await NestMining.init();

    await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);
    console.log(`> [INIT] deployer: set (USDT <-> NEST)`);

    await NestPool.setContracts(_C_NestMining, _C_NestToken, _C_NTokenController, _C_NNRewardPool);
    console.log(`> [INIT] NestPool.setContracts()`);

    await NestMining.setAddresses(owner.address, owner.address);
    console.log(`> [INIT] NestMining.setAddresses()`);

    await NestMining.setContracts(_C_NestToken, _C_NestPool, _C_NestStaking, _C_NestQuery);
    console.log(`> [INIT] NestMining.setContracts()`);

    await NTokenController.setContracts(_C_NestToken, _C_NestPool);
    console.log(`> [INIT] NTokenController.setContracts()`);

    await NestQuery.setContracts(_C_NestToken, _C_NestMining, _C_NestStaking, _C_NestPool, owner.address);
    console.log(`> [INIT] NestQuery.setContracts()`);

}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });