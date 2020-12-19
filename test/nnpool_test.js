const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN, goBlocks,
    show_eth, show_usdt, show_64x64} = require("../scripts/utils.js");

const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol, 
    printContracts,
    setupNest} = require("../scripts/deploy.js");

let provider = ethers.provider;

describe("NNRewardPool contract", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    let owner;
    let userA;
    let userB;
    let userC;
    let userD;
    let ghost;

    before(async function () {

        [owner, userA, userB, userC, userD, ghost] = await ethers.getSigners();

        CUSDT = await deployUSDT();
        CWBTC = await deployWBTC();
        [NestToken, IterableMapping] = await deployNEST();
        NNToken = await deployNN();
        let contracts = {
            USDT: CUSDT, 
            WBTC: CWBTC, 
            NEST: NestToken, 
            IterableMapping: IterableMapping,
            NN: NNToken}; 
        const addrOfNest = await deployNestProtocol(owner, contracts);
        await printContracts("", addrOfNest);
        await setupNest(owner, addrOfNest);

        NestPool = contracts.NestPool;
        MiningV1Calc = contracts.MiningV1Calc;
        MiningV1Op = contracts.MiningV1Op;
        NestMining = contracts.NestMining;
        NestStaking = contracts.NestStaking;
        NNRewardPool = contracts.NNRewardPool;
        NTokenController = contracts.NTokenController;
        NestQuery = contracts.NestQuery;
        NestDAO = contracts.NestDAO;

        _C_USDT = CUSDT.address;
        _C_WBTC = CWBTC.address;
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_NestStaking = NestStaking.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;
        _C_NestDAO = NestDAO.address;

        await NNToken.setContracts(_C_NNRewardPool);
        console.log(`> [INIT]: NNToken.setContracts()`);

        tx = await NestPool.setContracts(NestToken.address, 
            ghost.address, // fake NestMining
            NestStaking.address, NTokenController.address, NNToken.address, 
            NNRewardPool.address, NestQuery.address, NestDAO.address);
        await tx.wait();
        console.log(`> [INIT] NestPool.setContracts()`);

        await NNRewardPool.start();
        tx = await NNRewardPool.loadContracts();
        await tx.wait();
        console.log(`> [INIT] NNRewardPool.loadContracts() ...... OK`);

    });

    describe('USDT Token', function () {

        it("should transfer USDT(1,000,000) [1 million] | deployer===> userA", async () => {
            await CUSDT.transfer(userA.address, USDT('1000000'));
        });

        it("should transfer USDT(1000000) [1 million] | deployer ===> userB", async () => {
            await CUSDT.transfer(userB.address, USDT('1000000'));
        });

        it("should (userA) approve to NestPool USDT(1000000)", async () => {
            await CUSDT.connect(userA).approve(_C_NestPool, USDT("1000000"));
            const allowed_a = await CUSDT.allowance(userA.address, _C_NestPool);
            expect(allowed_a).to.equal(USDT("1000000"));
        });

        it("should (userB) approve to NestPool USDT(1000000)", async () => {
            await CUSDT.connect(userB).approve(_C_NestPool, USDT("1000000"));        
            const allowed_b = await CUSDT.allowance(userB.address, _C_NestPool);
            expect(allowed_b).to.equal(USDT("1000000"));
        });

    });

    describe("Deployment", function () {

        it("should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await NestToken.balanceOf(owner.address);
            expect(await NestToken.totalSupply()).to.equal(ownerBalance);
        });

        it("should transfer all NEST to NestPool", async function () {
            const ownerBalance = await NestToken.balanceOf(owner.address);
            await NestToken.transfer(_C_NestPool, NEST(2000000000));
        });

    });

    describe('NEST Token', function () {
        it("should have correct totalSupply, NEST(10,000,000,000)", async () => {
            const expectedTotalSupply = NEST('10000000000');
            let totalSupply = await NestToken.totalSupply();
            const amount = NEST("200000");
            await NestPool.initNestLedger(amount);
            expect(totalSupply).to.equal(expectedTotalSupply);
        });

        it("should transfer correctly, NEST(2,000,000,000) [Owner => userA]", async () => {
            const amount = NEST("2000000000");
            await NestToken.connect(owner).transfer(userA.address, amount);
            const userA_balance = await NestToken.balanceOf(userA.address);
            expect(userA_balance).to.equal(amount);
        });

        it("should transfer correctly, NEST(2,000,000,000) [Owner => userB]", async () => {
            const amount = NEST("2000000000");
            await NestToken.connect(owner).transfer(userB.address, amount);
            const userB_balance = await NestToken.balanceOf(userB.address);
            expect(userB_balance).to.equal(amount);
        });

        it("should transfer fail", async () => {
            const amount = NEST("10000000001");
            expect(
                NestToken.connect(owner).transfer(userA.address, amount)
            ).to.be.reverted;
        });

        it("should approve correctly, ETH(10,000,000,000) [userA -> _C_NestStaking]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestStaking, amount);
            const approved = await NestToken.allowance(userA.address, _C_NestStaking);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, ETH(10,000,000,000) [userB -> _C_NestStaking]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userB).approve(_C_NestStaking, amount);
            const approved = await NestToken.allowance(userB.address, _C_NestStaking);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, ETH(10,000,000,000) [userA -> _C_NestPool]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestPool, amount);
            const approved = await NestToken.allowance(userA.address, _C_NestPool);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, ETH(10,000,000,000) [userB -> _C_NestPool]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userB).approve(_C_NestPool, amount);
            const approved = await NestToken.allowance(userB.address, _C_NestPool);
            expect(approved).to.equal(amount);
        });
        
    });

    describe('NNRewardPool', function () {

        it("can transfer NNToken to userC and userD", async () => {
            await NNToken.transfer(userC.address, 500);
            await NNToken.transfer(userD.address, 1000);
        });


        it("can check NEST unclaimed rewards", async () => {
            await NNRewardPool.connect(ghost).addNNReward(NEST(300));
            const amount = await NNRewardPool.connect(userD).unclaimedNNReward();
            expect(amount).to.equal(NEST(200));
        });
        

         // check claimNNReward function
         it("can claim NEST rewards", async () => {         
            const blnc_C = await NNToken.balanceOf(userC.address);
            const blnc_D = await NNToken.balanceOf(userD.address);         
            const total = BigN(blnc_C).add(blnc_D);
            
            // sum = NEST(1980);
            const sum = await NNRewardPool.rewardSum();
            const userD_checkpoint_pre = await NNRewardPool.rewardSumCheckpoint(userD.address);
            
            // reward = NEST(1980);
            const reward = sum.sub(userD_checkpoint_pre);
            const share = reward.mul(blnc_D).div(total);

            // record funds before claimNNReward
            const userD_balance_pre = await NestToken.balanceOf(userD.address);

            // Charge to the nestpool to prevent insufficient funds from being transferred
            await NestPool.connect(ghost).addNest(_C_NNRewardPool, NEST(3000));
            const nest_NNRewardPool_pre = await NestPool.balanceOfNestInPool(_C_NNRewardPool);

            // claimNNReward
            await NNRewardPool.connect(userD).claimNNReward();

            // record funds before claimNNReward
            const nest_NNRewardPool_pos = await NestPool.balanceOfNestInPool(_C_NNRewardPool);

            const userD_balance_pos = await NestToken.balanceOf(userD.address);
            const userD_checkpoint_pos = await NNRewardPool.rewardSumCheckpoint(userD.address);

            // check data
            expect(nest_NNRewardPool_pre.sub(share)).to.equal(nest_NNRewardPool_pos);
            expect(userD_checkpoint_pre).to.equal(0);
            expect(userD_checkpoint_pos).to.equal(sum);
            expect(userD_balance_pre.add(share)).to.equal(userD_balance_pos);
        });
 
        // check nodeCount function (fromAdd)
        it("can settle rewards when tranferring", async () => {
            const blnc_C = await NNToken.balanceOf(userC.address); // NN[C]=500
            const blnc_D = await NNToken.balanceOf(userD.address); // NN[D]=1000
            const total = BigN(blnc_C).add(blnc_D);
            const nest_a_pre = await NestToken.balanceOf(userA.address);  
            const nest_d_pre = await NestToken.balanceOf(userD.address);
            const sum_pre = await NNRewardPool.rewardSum();
        
            // Charge to the nestpool to prevent insufficient funds from being transferred
            const reward =  NEST(1200);
            await NestPool.connect(ghost).addNest(_C_NNRewardPool, reward);
            await NNRewardPool.connect(ghost).addNNReward(reward);
            // run nodeCount function by transfer 
            // userD (1000) => userA (0)
            await NNToken.connect(userD).transfer(userA.address, 500);

            const nest_a_post = await NestToken.balanceOf(userA.address);
            const nest_d_post = await NestToken.balanceOf(userD.address);
            const sum_post = await NNRewardPool.rewardSum();
            expect(sum_post.sub(sum_pre)).to.equal(NEST(1200));

            const fromReward = sum_post.sub(sum_pre).mul(blnc_D).div(total);
            expect(nest_d_post.sub(nest_d_pre)).to.equal(fromReward);
            expect(nest_a_post.sub(nest_a_pre)).to.equal(NEST(0));
        });

        // check nodeCount function (toAdd)
        it("can settle rewards again when tranferring", async () => {       
            const blnc_A_pre = await NNToken.balanceOf(userA.address);
            const blnc_C_pre = await NNToken.balanceOf(userC.address);   
            const blnc_D_pre = await NNToken.balanceOf(userD.address);
            const total = BigN(blnc_A_pre).add(blnc_C_pre).add(blnc_D_pre);
            
            const nest_A_pre = await NestToken.balanceOf(userA.address);
            const nest_D_pre = await NestToken.balanceOf(userD.address);

            const sum_pre = await NNRewardPool.rewardSum(); 

            // Charge to the nestpool to prevent insufficient funds from being transferred
            const reward = NEST(3000);
            await NestPool.connect(ghost).addNest(_C_NNRewardPool, reward);
            await NNRewardPool.connect(ghost).addNNReward(reward);
            // userA (500) => userD (500)
            await NNToken.connect(userA).transfer(userD.address, 500);

            // record funds after transfer
            const sum_post = await NNRewardPool.rewardSum();
            const nest_A_post = await NestToken.balanceOf(userA.address);
            const nest_D_post = await NestToken.balanceOf(userD.address);

            const fromReward = sum_post.sub(sum_pre).mul(blnc_A_pre).div(total);
            const toReward = sum_post.sub(sum_pre).mul(blnc_D_pre).div(total);

            // fromReward
            expect(nest_A_post.sub(nest_A_pre)).to.equal(fromReward);
            // toREward
            expect(nest_D_post.sub(nest_D_pre)).to.equal(toReward);
        });

        // set gov
        it("should set gov correctly", async () => {

            // now the nestpool's gov is userD
            await NestPool.setGovernance(userD.address);

            const gov = await NestPool.governance();

            // now the NNRewardPool's gov is userD
            await NNRewardPool.loadGovernance();

            expect(gov).to.equal(userD.address);

            await expect(NNRewardPool.connect(userD).resume()).to.be.reverted;

            await NNRewardPool.connect(userD).pause();

            await expect(NNRewardPool.connect(userD).pause()).to.be.reverted;

            await NNRewardPool.connect(userD).resume();
        });

    });

});