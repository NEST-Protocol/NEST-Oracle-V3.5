const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const {deployMockContract} = require('@ethereum-waffle/mock-contract');

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64, goBlocks} = require("../scripts/utils.js");

const {deployUSDT, deployWBTC, deployNN, deployERC20,
    deployNEST, deployNWBTC,
    deployNestProtocol, 
    printContracts,
    setupNest} = require("../scripts/deploy.js");

const nwbtc = BigNumber.from(10).pow(18);

let provider = ethers.provider;

const advanceTime = async (provider, seconds) => {
    await provider.send("evm_increaseTime", [seconds]);
    console.log(`>> [INFO] time + ${seconds} s`);
};


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
        CNWBTC = await deployNWBTC(owner);


        _C_USDT = CUSDT.address;
        _C_WBTC = CWBTC.address;
        _C_NWBTC = CNWBTC.address;
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


        const NestVoteContract = await ethers.getContractFactory("NestVote");
        NestVote = await NestVoteContract.deploy();
        tx = NestVote.deployTransaction;
        receipt = await tx.wait();
        console.log(`>>> [DPLY]: NestVote deployed, address=${NestVote.address}, block=${tx.blockNumber}`);

        _C_NestVote = NestVote.address;

        const VoteTest1Contract = await ethers.getContractFactory("VoteTest1");
        VoteTest1 = await VoteTest1Contract.deploy();
        tx = VoteTest1.deployTransaction;
        receipt = await tx.wait();
        console.log(`>>> [DPLY]: VoteTest1 deployed, address=${VoteTest1.address}, block=${tx.blockNumber}`);

        _C_VoteTest1 = VoteTest1.address;

        const VoteTest2Contract = await ethers.getContractFactory("VoteTest2");
        VoteTest2 = await VoteTest2Contract.deploy();
        tx = VoteTest2.deployTransaction;
        receipt = await tx.wait();
        console.log(`>>> [DPLY]: VoteTest2 deployed, address=${VoteTest2.address}, block=${tx.blockNumber}`);

        _C_VoteTest2 = VoteTest2.address;

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


        await NestVote.initialize(_C_NestPool);
        console.log(`>>> [INIT]: NestVote initialized ................ OK`);

        await NestVote.loadContracts();
        console.log(`>>> [LOAD]: NestVote loadContracts ................ OK`);

    });


    describe('NEST Token', function () {
        it("should have correct totalSupply, NEST(10,000,000,000)", async () => {
            const expectedTotalSupply = NEST('10000000000');
            let totalSupply = await NestToken.totalSupply();
            const amount = NEST("20000000");
            await NestPool.initNestLedger(amount);
            expect(totalSupply).to.equal(expectedTotalSupply);
        });

        it("should transfer correctly, NEST(2,000,000,000) [Owner => userA]", async () => {
            const amount = NEST("2000000000");
            await NestToken.connect(owner).transfer(userA.address, amount, { gasPrice: 0});
            const userA_balance = await NestToken.balanceOf(userA.address);
            expect(userA_balance).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000)", async () => {
            const amount = NEST("10000000000");
            await NestToken.connect(userA).approve(_C_NestDAO, amount, { gasPrice: 0});
            await NestToken.connect(userA).approve(NestVote.address, amount, { gasPrice: 0});
            const approved = await NestToken.allowance(userA.address, _C_NestDAO);
            expect(approved).to.equal(amount);
        });

        it("should transfer correctly, NEST(2,000,000,000) [Owner => userB]", async () => {
            const amount = NEST("2000000000");
            await NestToken.connect(owner).transfer(userB.address, amount, { gasPrice: 0});
            const userB_balance = await NestToken.balanceOf(userB.address);
            expect(userB_balance).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000) ", async () => {
            const amount = NEST("10000000000");
            await NestToken.connect(userB).approve(_C_NestDAO, amount, { gasPrice: 0});
            await NestToken.connect(userB).approve(NestVote.address, amount, { gasPrice: 0});
            const approved = await NestToken.allowance(userB.address, _C_NestDAO);
            expect(approved).to.equal(amount);
        });

    });


    describe('NestVote', function () {

        // check setParams func
        it("should setParams correctly", async () => {

            const voteDuration_pre = await NestVote.voteDuration();
            const acceptance_pre = await NestVote.acceptance();
            const proposalStaking_pre = await NestVote.proposalStaking();

            //console.log("voteDuration_pre = ", voteDuration_pre);
            //console.log("acceptance_pre = ", acceptance_pre);
            //console.log("proposalStaking_pre = ", proposalStaking_pre.toString());

            await NestVote.setParams(100, 50, NEST(100));
            
            const voteDuration_pos = await NestVote.voteDuration();
            const acceptance_pos = await NestVote.acceptance();
            const proposalStaking_pos = await NestVote.proposalStaking();

            //console.log("voteDuration_pos = ", voteDuration_pos);
            //console.log("acceptance_pos = ", acceptance_pos);
            //console.log("proposalStaking_pos = ", proposalStaking_pos.toString());

            expect(voteDuration_pos).to.equal(100);
            expect(acceptance_pos).to.equal(50);
            expect(proposalStaking_pos).to.equal(NEST(100));
        });

        // check propose func 
        it("should propose correctly", async () => {

            await NestVote.connect(userA).propose(userA.address, 'test0');

            const list = await NestVote.proposalList([0]);
            //console.log("list = ", list);

            const blnc = await NestToken.balanceOf(NestVote.address);

            expect(list.contractAddr).to.equal(userA.address);
            expect(list.proposer).to.equal(userA.address);
            expect(blnc).to.equal(NEST(100));
        });

    
        // check vote func
        it("should vote correctly", async () => {
            await NestVote.connect(userA).propose(userA.address, 'test1');

            await NestVote.connect(userA).vote(1, NEST(100));

            const voters = await NestVote.numberOfVoters(1);

            const totalStakedNest = await NestVote.stakedNestNum(1);

            const userA_StakedNest = await NestVote.stakedNestAmount(1, userA.address);
            
            const blnc = await NestToken.balanceOf(NestVote.address);

            expect(blnc).to.equal(NEST(300));

            expect(voters).to.equal(1);

            expect(totalStakedNest).to.equal(NEST(100));

            expect(userA_StakedNest).to.equal(NEST(100));
        });


        // check revoke func
        it("should revoke correctly", async () => {

            await NestVote.connect(userA).revoke(1, NEST(100));
            
            const blnc = await NestToken.balanceOf(NestVote.address);

            const totalStakedNest = await NestVote.stakedNestNum(1);

            const voters = await NestVote.numberOfVoters(1);

            const userA_StakedNest = await NestVote.stakedNestAmount(1, userA.address);

            expect(blnc).to.equal(NEST(200));

            expect(voters).to.equal(0);

            expect(totalStakedNest).to.equal(0);

            expect(userA_StakedNest).to.equal(0);

        });


        // check withdraw func
        it("should withdrw correctly", async () => {

            // voteDuration = 10 s, acceptance = 50%, proposalStaking = NEST(100)
            await NestVote.setParams(10, 50, NEST(100));

            await NestVote.connect(userA).propose(userA.address, 'test2');
            //console.log("userA.address = ", userA.address);

            const list1 = await NestVote.proposalList(2);
            //console.log("list1 = ", list1);
            
            await NestVote.connect(userA).vote(2, NEST(100));

            const list2 = await NestVote.proposalList(2);
            //console.log("list2 = ", list2);


            await MockNestMining.mock.minedNestAmount.withArgs().returns(NEST(400));

            // timestamp + 11 s
            await advanceTime(provider, 11);

            await NestVote.connect(userA).execute(2);

            const list3 = await NestVote.proposalList(2);
            //console.log("list3 = ", list3);

            await NestVote.connect(userA).withdraw(2);

            const list4 = await NestVote.proposalList(2);
            //console.log("list4 = ", list4);


            // reset params
            // voteDuration = 100 s, acceptance = 50%, proposalStaking = NEST(100)
            await NestVote.setParams(100, 50, NEST(100));
        });

        // check execute func
        it("should execute correctly", async () => {
            
            await NestVote.connect(userA).propose(_C_VoteTest1, 'setParams');

            const list = await NestVote.proposalList(3);

            //console.log("_C_VoteTest1 = ",_C_VoteTest1);
            //console.log("list = ",list);

            await NestVote.connect(userA).vote(3, NEST(300));

            await MockNestMining.mock.minedNestAmount.withArgs().returns(NEST(400));

            await advanceTime(provider, 110);

            await NestVote.releaseGovTo(NestVote.address);

            const gov = await NestVote.governance();
            //console.log("gov = ", gov);
            //console.log("NestVote.address = ", NestVote.address);

            const voteDuration_pre = await NestVote.voteDuration();
            const acceptance_pre = await NestVote.acceptance();
            const proposalStaking_pre = await NestVote.proposalStaking();

            //console.log("voteDuration_pre = ", voteDuration_pre);
            //console.log("acceptance_pre = ", acceptance_pre);
            //console.log("proposalStaking_pre = ", proposalStaking_pre.toString());

            await NestVote.connect(userA).execute(3);
            const voteDuration_pos = await NestVote.voteDuration();
            const acceptance_pos = await NestVote.acceptance();
            const proposalStaking_pos = await NestVote.proposalStaking();

            //console.log("voteDuration_pos = ", voteDuration_pos);
            //console.log("acceptance_pos = ", acceptance_pos);
            //console.log("proposalStaking_pos = ", proposalStaking_pos.toString());
        });

        // check execute func
        it("should execute correctly", async () => {

            await NestPool.setGovernance(NestVote.address);

            const gov_pre = await NestPool.governance();
            //console.log("gov_pre = ", gov_pre);
            //console.log("NestVote.address = ", NestVote.address);
            expect(gov_pre).to.equal(NestVote.address);

            await NestVote.connect(userA).propose(_C_VoteTest2, 'setGovernance');

            await NestVote.connect(userA).vote(4, NEST(300));

            await MockNestMining.mock.minedNestAmount.withArgs().returns(NEST(400));

            await advanceTime(provider, 12);

            await NestVote.connect(userA).execute(4);

            const gov_pos = await NestPool.governance();
            //console.log("gov_pos = ", gov_pos);
        })
    


    });
});