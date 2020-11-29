const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64} = require("./utils.js");

const {deployUSDT, deployWBTC, deployNN, deployNEST, deployNestProtocol, setupNest} = require("./deploy.js");

let provider = ethers.provider;

describe("NestToken contract", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    let owner;
    let userA;
    let userB;
    let userC;
    let userD;


    before(async function () {

        [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

        CUSDT = await deployUSDT();
        CWBTC = await deployWBTC();
        NestToken = await deployNEST();
        NNToken = await deployNN();
        let contracts = {CUSDT: CUSDT, CWBTC: CWBTC, NestToken: NestToken, NN: NNToken}; 
        let CNest = await deployNestProtocol(owner, contracts);
        CNest.CUSDT = CUSDT;
        CNest.CWBTC = CWBTC;
        CNest.NestToken = NestToken;
        CNest.NNToken = NNToken;
        await setupNest(owner, CNest);

        NestPool = CNest.NestPool;
        NestMining = CNest.NestMining;
        NestStaking = CNest.NestStaking;
        NNRewardPool = CNest.NNRewardPool;
        NTokenController = CNest.NTokenController;
        NestQuery = CNest.NestQuery;
    
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

    describe("Deployment", function () {

        // // If the callback function is async, Mocha will `await` it.
        // it("Should set the right owner", async function () {
        //   // Expect receives a value, and wraps it in an assertion objet. These
        //   // objects have a lot of utility methods to assert values.

        //   // This test expects the owner variable stored in the contract to be equal
        //   // to our Signer's owner.
        //   expect(await NestToken.owner()).to.equal(owner.address);
        // });

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
            const amount = NEST(900);
            await NNRewardPool.setNNRewardSum(amount);
            expect(await NNRewardPool.NN_reward_sum()).to.equal(amount);
        });

        it("can set setNNRewardSumCheckpoint by the governer", async () => {
            const amount = NEST(900);
            await NNRewardPool.setNNRewardSumCheckpoint(userC.address, amount);
            expect(await NNRewardPool.NN_reward_sum_checkpoint(userC.address)).to.equal(amount);
        });

        it("can add NEST as rewards", async () => {
            const amount = NEST(300);
            const sum = await NNRewardPool.NN_reward_sum();
            await expect(NNRewardPool.addNNReward(amount))
                .to.emit(NNRewardPool, 'NNRewardAdded')
                .withArgs(amount, amount.add(sum));
            expect(await NNRewardPool.NN_reward_sum()).to.equal(amount.add(sum));
        });

        it("can set NNRewardSumCheckpoint by the governer", async () => {
            const amount = NEST(300);
            await NNRewardPool.setNNRewardSumCheckpoint(userC.address, amount);
            expect(await NNRewardPool.NN_reward_sum_checkpoint(userC.address)).to.equal(amount);
        });

        it("can check NEST unclaimed rewards", async () => {
            const amount = await NNRewardPool.connect(userD).unclaimedNNReward();
            expect(amount).to.equal(NEST(800));
        });
        
        it("can claim NEST rewards", async () => {
            await NestPool.addNest(_C_NNRewardPool, NEST(1200));
            await NNRewardPool.connect(userD).claimNNReward();
            expect(await NNRewardPool.connect(userD).NN_reward_sum_checkpoint(userD.address)).to.equal(NEST(1200));
            expect(await NestToken.balanceOf(userD.address)).to.equal(NEST(800));
        });

        it("can settle rewards when tranferring", async () => {
            const nest_a_pre = await NestToken.balanceOf(userA.address);
            const nest_d_pre = await NestToken.balanceOf(userD.address);
            await NNRewardPool.addNNReward(NEST(1200));
            await NestPool.addNest(_C_NNRewardPool, NEST(1200));
            await NNToken.connect(userD).transfer(userA.address, 500);
            const nest_a_post = await NestToken.balanceOf(userA.address);
            const nest_d_post = await NestToken.balanceOf(userD.address);
            expect(nest_d_post.sub(nest_d_pre)).to.equal(NEST(800));
            expect(nest_a_post.sub(nest_a_pre)).to.equal(NEST(0));
        });

        it("can settle rewards again when tranferring", async () => {
            const NN_total_supply = await NNRewardPool.NN_total_supply();
            const nest_a_pre = await NestToken.balanceOf(userA.address);
            const nest_d_pre = await NestToken.balanceOf(userD.address);
            const nn_a_pre = await NNToken.balanceOf(userA.address);
            const nn_d_pre = await NNToken.balanceOf(userD.address);
            const sum = await NNRewardPool.NN_reward_sum();
            const cp_a = await NNRewardPool.NN_reward_sum_checkpoint(userA.address);
            const cp_d = await NNRewardPool.NN_reward_sum_checkpoint(userD.address);
            console.log(`pre a=${nest_a_pre.div(ethdec)}, d=${nest_d_pre.div(ethdec)}`);
            
            const reward = NEST(2400);
            await NNRewardPool.addNNReward(reward);
            await NestPool.addNest(_C_NNRewardPool, reward);

            await NNToken.connect(userA).transfer(userD.address, 500);
            const nest_a_post = await NestToken.balanceOf(userA.address);
            const nest_d_post = await NestToken.balanceOf(userD.address);
            const nn_a_post = await NNToken.balanceOf(userA.address);
            const nn_d_post = await NNToken.balanceOf(userD.address);
            console.log(`post a=${nest_a_post.div(ethdec)}, d=${nest_d_post.div(ethdec)}`);
            const reward_d = reward.add(sum).sub(cp_d).mul(nn_d_pre).div(NN_total_supply);
            const reward_a= reward.add(sum).sub(cp_a).mul(nn_a_pre).div(NN_total_supply);
            expect(nest_d_post.sub(nest_d_pre)).to.equal(reward_d);
            expect(nest_a_post.sub(nest_a_pre)).to.equal(reward_a);
        });
    });

});