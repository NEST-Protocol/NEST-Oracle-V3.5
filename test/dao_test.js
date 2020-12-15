const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const {deployMockContract} = require('@ethereum-waffle/mock-contract');

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64} = require("../scripts/utils.js");

const {deployUSDT, deployWBTC, deployNN, deployERC20,
    deployNEST, 
    deployNestProtocol, 
    printContracts,
    setupNest} = require("../scripts/deploy.js");

describe("NestToken contract", function () {
        // Mocha has four functions that let you hook into the the test runner's
        // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.
    
    let owner;
    let userA;
    let userB;
    let userC;
    let userD;

    let NestDAO;
    
    before(async function () {
    
        [owner, userA, userB, userC, userD] = await ethers.getSigners();
    
        CUSDT = await deployUSDT();
        CWBTC = await deployWBTC();
        [NestToken, IterableMapping] = await deployNEST();
        NNToken = await deployNN();

        _C_USDT = CUSDT.address;
        _C_WBTC = CWBTC.address;
        _C_NestToken = NestToken.address;

        const NestPoolContract = await ethers.getContractFactory("NestPool");
        NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract
        await NestPool.deployed();
        console.log(`>>> [DPLY]: NestPool deployed, address=${NestPool.address}, block=${NestPool.deployTransaction.blockNumber}`);

        _C_NestPool = NestPool.address;

        const NestStakingContract = await ethers.getContractFactory("NestStaking");
        NestStaking = await NestStakingContract.deploy();
        console.log(`>>> [DPLY]: NestStaking deployed, address=${NestStaking.address}, block=${NestStaking.deployTransaction.blockNumber}`);
    
        tx = await NestStaking.initialize(NestPool.address);
        console.log(`>>> [INIT]: NestStaking initialized, block=${tx.blockNumber}`);

        const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
        const NTokenController = await NTokenControllerContract.deploy(NestPool.address);
        console.log(`>>> [DPLY]: NTokenController deployed, address=${NTokenController.address}`);
    
        const NestQueryContract = await ethers.getContractFactory("NestQuery");
        NestQuery = await NestQueryContract.deploy();
        await NestQuery.deployTransaction.wait();
        console.log(`>>> [DPLY]: NestQuery deployed, address=${NestQuery.address}, block=${NestQuery.deployTransaction.blockNumber}`);
    
        tx = await NestQuery.initialize(NestPool.address);
        await tx.wait();
        console.log(`>>> [INIT]: NestMining initialized, block=${tx.blockNumber}`);

        const NestDAOContract = await ethers.getContractFactory("NestDAO");
        NestDAO = await NestDAOContract.deploy();
        tx = NestDAO.deployTransaction;
        receipt = await tx.wait();
        console.log(`>>> [DPLY]: NestDAO deployed, address=${NestDAO.address}, block=${tx.blockNumber}`);
      
        _C_NestDAO = NestDAO.address;

        const INestMining = require("../artifacts/contracts/iface/INestMining.sol/INestMining");
        MockNestMining = await deployMockContract(owner, INestMining.abi);
        
        const INNRewardPool = require("../artifacts/contracts/iface/INNRewardPool.sol/INNRewardPool");
        MockNNRewardPool = await deployMockContract(owner, INNRewardPool.abi);

        const INestQuery = require("../artifacts/contracts/iface/INestQuery.sol/INestQuery");
        MockNestQuery = await deployMockContract(owner, INestQuery.abi);


        tx = await NestDAO.initialize(NestPool.address);
        console.log(`>>> [INIT]: NestDAO initialized, block=${tx.blockNumber}`);

        _C_NestMining = MockNestMining.address;
        _C_NestStaking = NestStaking.address;

        // await MockNestPool.mock.addrOfNestToken.returns(_C_NestToken);
        // await MockNestPool.mock.addrOfNestStaking.returns(_C_NestStaking);
        // await MockNestPool.mock.addrOfNestQuery.returns(_C_NestQuery);
        // await MockNestPool.mock.addrOfNestMining.returns(_C_NestMining);

        tx = await NestPool.setContracts(NestToken.address, MockNestMining.address, 
            NestStaking.address, NTokenController.address, NNToken.address, 
            MockNNRewardPool.address, MockNestQuery.address, NestDAO.address);
        await tx.wait();
        console.log(`> [INIT] NestPool.setContracts() ...... OK`);


        await NestDAO.loadContracts();
        console.log(`>>> [STUP]: NestDAO.loadContracts() ....... OK `);

        await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);
    
    });


    describe('NEST Token', function () {
        it("should have correct totalSupply, NEST(10,000,000,000)", async () => {
            const expectedTotalSupply = NEST('10000000000');
            let totalSupply = await NestToken.totalSupply();
            expect(totalSupply).to.equal(expectedTotalSupply);
        });

        it("should transfer correctly, NEST(2,000,000,000) [Owner => userA]", async () => {
            const amount = NEST("2000000000");
            await NestToken.connect(owner).transfer(userA.address, amount, { gasPrice: 0});
            const userA_balance = await NestToken.balanceOf(userA.address);
            expect(userA_balance).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000) [userA -> _C_NestDAO]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestDAO, amount, { gasPrice: 0});
            const approved = await NestToken.allowance(userA.address, _C_NestDAO);
            expect(approved).to.equal(amount);
        });

    });


    describe('Nest DAO', function () {

        it("can start", async () => {
            await NestDAO.start();
            expect(await NestDAO.flag()).to.equal(2);
        });

        it("can collect NEST reward", async () => {
            await NestToken.connect(userA).approve(_C_NestPool, NEST("2000000000"), { gasPrice: 0});
            await NestPool.depositNToken(_C_NestDAO, userA.address, _C_NestToken, NEST(100));
            const rs_pre = await NestDAO.ntokenLedger(_C_NestToken);
            await NestDAO.collectNestReward();
            const rs_post = await NestDAO.ntokenLedger(_C_NestToken);
            expect(rs_pre.rewardedAmount.add(NEST(100))).to.equal(rs_post.rewardedAmount);
        });

        it("can collect ETH reward", async () => {
            const bn = await ethers.provider.getBlockNumber();
            await NestToken.transfer(_C_NestDAO, NEST(100));
            await NestDAO.collectETHReward(_C_NestToken);
        });

        it("can redeem", async () => {
            const bn = await ethers.provider.getBlockNumber();
            await MockNestMining.mock.priceAvgAndSigmaOf.withArgs(_C_NestToken).returns(NEST(100), ETH(100), 21, bn);
            await NestDAO.addETHReward(_C_NestToken, { value: ETH(2)});

            const eth_A_pre = await userA.getBalance(); 
            await NestDAO.connect(userA).redeem(_C_NestToken, NEST(100), { gasPrice: 0});
            const eth_A_post = await userA.getBalance(); 
            expect(eth_A_post.sub(eth_A_pre)).to.equal(ETH(1));
        });
    
    });
});
