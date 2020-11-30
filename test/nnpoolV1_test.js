const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64} = require("../scripts/utils.js");

const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol, 
    setupNest} = require("../scripts/deploy.js");


const advanceBlock = async (provider) => {
    await provider.send("evm_mine");
};

const goBlocks = async function (provider, num) {
    let block_h;
    for (i = 0; i < num; i++) {
        await advanceBlock(provider);
    }
    const h = await provider.getBlockNumber();
    console.log(`>> [INFO] block mined +${num}, height=${h}`);
};

let provider = ethers.provider;

describe("NNRewardPool contract", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    let owner;
    let userA;
    let userB;
    let userC;
    let userD;
    let dev;
    let NNodeA;
    let NNodeB;

    before(async function () {

        [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

        CUSDT = await deployUSDT();
        CWBTC = await deployWBTC();
        [NestToken, IterableMapping] = await deployNEST();
        NNToken = await deployNN();
        let contracts = {
            CUSDT: CUSDT, 
            CWBTC: CWBTC, 
            NEST: NestToken, 
            IterableMapping: IterableMapping,
            NN: NNToken}; 
        let CNest = await deployNestProtocol(owner, contracts);
        
        NestPool = CNest.NestPool;
        MiningV1Calc = CNest.MiningV1Calc;
        MiningV1Op = CNest.MiningV1Op;
        NestMining = CNest.NestMining;
        NestStaking = CNest.NestStaking;
        NNRewardPool = CNest.NNRewardPool;
        NTokenController = CNest.NTokenController;
        NestQuery = CNest.NestQuery;
    
        let contractsOfNest = {
            USDT: CUSDT.address,
            WBTC: CWBTC.address,
            NEST: NestToken.address, 
            IterableMapping: IterableMapping.address,
            NN: NNToken.address,
            NestPool: NestPool.address,
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address,
            NestMining: NestMining.address,
            NestStaking: NestStaking.address, 
            NNRewardPool: NNRewardPool.address,
            NTokenController: NTokenController.address,
            NestQuery: NestQuery.address
        }

        await setupNest(owner, contractsOfNest);


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

        it("can set NNRewardSum by the governer", async () => {
            const amount = NEST(300);
            await NNRewardPool.setNNRewardSum(amount);
            const h = await NNRewardPool.NN_reward_sum();
            console.log("h =",h.toString());
            expect(await NNRewardPool.NN_reward_sum()).to.equal(amount);
        });

        it("can set setNNRewardSumCheckpoint by the governer", async () => {
            const amount = NEST(300);
            await NNRewardPool.setNNRewardSumCheckpoint(userC.address, amount);
            expect(await NNRewardPool.NN_reward_sum_checkpoint(userC.address)).to.equal(amount);
        });

        it("can set NNRewardSumCheckpoint by the governer", async () => {
            const amount = NEST(300);
            await NNRewardPool.setNNRewardSumCheckpoint(userC.address, amount);
            expect(await NNRewardPool.NN_reward_sum_checkpoint(userC.address)).to.equal(amount);
        });

        it("can check NEST unclaimed rewards", async () => {
            const amount = await NNRewardPool.connect(userD).unclaimedNNReward();
            expect(amount).to.equal(NEST(200));
        });
        
        // check updateNNReward function
        it("should updateNNReward correctly!", async () =>{
            const token = _C_USDT;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const msgValue = ETH(BigN(50));

            await NestToken.transfer(userA.address, NEST('1000000'));
            await NestToken.connect(userA).approve(_C_NTokenController, NEST('100000'));
            await NestToken.connect(userA).approve(_C_NestPool, NEST('10000000'));

            await CWBTC.transfer(userA.address, WBTC('10000'));
            await CWBTC.connect(userA).approve(_C_NestPool, WBTC(10000));
            await CWBTC.connect(userA).approve(_C_NTokenController, WBTC(1));

            // post2 (in oreder to getting nest)
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            const NNRewardSum = await NNRewardPool.NN_reward_sum();
            console.log("NNRewardSum =",NNRewardSum.toString());
            
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            
            await NNRewardPool.updateNNReward();

        });

         // check claimNNReward function
         it("can claim NEST rewards", async () => {         
            const blnc_C = await NNToken.balanceOf(userC.address);
            const blnc_D = await NNToken.balanceOf(userD.address);         
            const total = BigN(blnc_C).add(blnc_D);
            
            // sum = NEST(1980);
            const sum = await NNRewardPool.NN_reward_sum();
            
            const userD_checkpoint_pre = await NNRewardPool.NN_reward_sum_checkpoint(userD.address);
            
            // reward = NEST(1980);
            const reward = sum.sub(userD_checkpoint_pre);
            
            const share = reward.mul(blnc_D).div(total);

            // record funds before claimNNReward
            const userD_balance_pre = await NestToken.balanceOf(userD.address);

            // Charge to the nestpool to prevent insufficient funds from being transferred
            await NestPool.addNest(_C_NNRewardPool, NEST(3000));
            const nest_NNRewardPool_pre = await NestPool.balanceOfNestInPool(_C_NNRewardPool);

            // claimNNReward
            await NNRewardPool.connect(userD).claimNNReward();

            // record funds before claimNNReward
            const nest_NNRewardPool_pos = await NestPool.balanceOfNestInPool(_C_NNRewardPool);
            console.log("nest_NNRewardPool_pos =",nest_NNRewardPool_pos.toString());

            const userD_balance_pos = await NestToken.balanceOf(userD.address);

            const userD_checkpoint_pos = await NNRewardPool.NN_reward_sum_checkpoint(userD.address);

            
            // check data
            expect(nest_NNRewardPool_pre.sub(share)).to.equal(nest_NNRewardPool_pos);

            expect(userD_checkpoint_pre).to.equal(0);

            expect(userD_checkpoint_pos).to.equal(sum);

            expect(userD_balance_pre.add(share)).to.equal(userD_balance_pos);
        });
 
        // check nodeCount function (fromAdd)
        it("can settle rewards when tranferring", async () => {
            //===============preparation====================//
            const token = _C_USDT;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const msgValue = ETH(BigN(50));

            // post2 (in oreder to getting nest)
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            //================================================//


            const blnc_C = await NNToken.balanceOf(userC.address);
            const blnc_D = await NNToken.balanceOf(userD.address);         
            const total = BigN(blnc_C).add(blnc_D);
            const nest_a_pre = await NestToken.balanceOf(userA.address);  
            const nest_d_pre = await NestToken.balanceOf(userD.address);
            const sum_pre = await NNRewardPool.NN_reward_sum();
        
            // Charge to the nestpool to prevent insufficient funds from being transferred
            await NestPool.addNest(_C_NNRewardPool, NEST(1000));

            // run nodeCount function by transfer 
            // userD (1000) => userA (0)
            await NNToken.connect(userD).transfer(userA.address, 500);

            const nest_a_post = await NestToken.balanceOf(userA.address);
            const nest_d_post = await NestToken.balanceOf(userD.address);
            const sum_pos = await NNRewardPool.NN_reward_sum();
            const fromReward = sum_pos.sub(sum_pre).mul(blnc_D).div(total);

            expect(nest_d_post.sub(nest_d_pre)).to.equal(fromReward);
            expect(nest_a_post.sub(nest_a_pre)).to.equal(NEST(0));
        });

        // check nodeCount function (toAdd)
        it("can settle rewards again when tranferring", async () => {       
            //===============preparation====================//
            const token = _C_USDT;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const msgValue = ETH(BigN(50));

            // post2 (in oreder to getting nest)
            await goBlocks(provider, 50);
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            //=====================================================//
            
            // Charge to the nestpool to prevent insufficient funds from being transferred
            const reward = NEST(3000);
            await NestPool.addNest(_C_NNRewardPool, reward);
            const sum_pre = await NNRewardPool.NN_reward_sum(); 
            const blnc_A_pre = await NNToken.balanceOf(userA.address);
            console.log("blnc_A_pre =",blnc_A_pre);
            const blnc_C_pre = await NNToken.balanceOf(userC.address);   
            const blnc_D_pre = await NNToken.balanceOf(userD.address);
            const total = BigN(blnc_A_pre).add(blnc_C_pre).add(blnc_D_pre);
            
            const nest_A_pre = await NestToken.balanceOf(userA.address);
            const nest_D_pre = await NestToken.balanceOf(userD.address);


            // userA (500) => userD (500)
            await NNToken.connect(userA).transfer(userD.address, 500);

            // record funds after transfer
            const sum_pos = await NNRewardPool.NN_reward_sum();
            const nest_A_pos = await NestToken.balanceOf(userA.address);
            const nest_D_pos = await NestToken.balanceOf(userD.address);

            const fromReward = sum_pos.sub(sum_pre).mul(blnc_A_pre).div(total);
            const toReward = sum_pos.sub(sum_pre).mul(blnc_D_pre).div(total);

            // fromReward
            expect(nest_A_pos.sub(nest_A_pre)).to.equal(fromReward);
            
            // toREward
            expect(nest_D_pos.sub(nest_D_pre)).to.equal(toReward);
        });

        // check unclaimedNNReward function 
        it("should unclaimedNNReward correctly!", async () =>{
            await NNRewardPool.updateNNReward();

            // record funds
            const blnc_C = await NNToken.balanceOf(userC.address);
            const sum = await NNRewardPool.NN_reward_sum();
            const total = await NNRewardPool.NN_total_supply();
            const userC_checkpoint_pos = await NNRewardPool.NN_reward_sum_checkpoint(userC.address);
            const reward = sum.sub(userC_checkpoint_pos).mul(blnc_C).div(total);

            const amountA = await NNRewardPool.connect(userA).unclaimedNNReward();

            const amountC = await NNRewardPool.connect(userC).unclaimedNNReward();

            const amountD = await NNRewardPool.connect(userD).unclaimedNNReward();
            
            expect(amountA).to.equal(0);

            expect(amountC).to.equal(reward);
            
            expect(amountD).to.equal(0);

        });

    });

});