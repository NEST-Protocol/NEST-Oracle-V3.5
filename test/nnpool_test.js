const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const usdtdec = BigNumber.from(10).pow(6);
const ethdec = ethers.constants.WeiPerEther;

const ETH = function (amount) {
    return BigNumber.from(amount).mul(ethdec);
};

const USDT = function (amount) {
    return BigNumber.from(amount).mul(usdtdec);
};

const WBTC = function (amount) {
    return BigNumber.from(amount).mul(BigNumber.from(10).pow(8));
};

const NEST = function (amount) {
    return BigNumber.from(amount).mul(ethdec);
};

const BigN = function (n) {
    return BigNumber.from(n);
};


describe("NestToken contract", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    let NestToken;
    let owner;
    let userA;
    let userB;
    let userC;
    let userD;
    let _C_NestStaking;
    let _C_NestToken;
    let _C_NestPool;
    let _C_USDT;
    let _C_NNRewardPool;
    let provider = ethers.provider;

    before(async function () {

        [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

        ERC20Contract = await ethers.getContractFactory("UERC20");
        const C_USDT = await ERC20Contract.deploy("10000000000000000", "USDT Test Token", "USDT", 6);
        const C_WBTC = await ERC20Contract.deploy("2100000000000000", "WBTC Test Token", "WBTC", 8);

        IterableMappingContract = await ethers.getContractFactory("IterableMapping");
        IterableMapping = await IterableMappingContract.deploy();
        NestTokenContract = await ethers.getContractFactory("IBNEST",
            {
                libraries: {
                    IterableMapping: IterableMapping.address
                }
            });

        NestToken = await NestTokenContract.deploy();

        NestPoolContract = await ethers.getContractFactory("NestPool");
        NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract

        NestStakingContract = await ethers.getContractFactory("NestStaking");
        NestStaking = await NestStakingContract.deploy(NestToken.address);

        // MiningCalcPriceContract = await ethers.getContractFactory("MiningCalcPrice");
        // MiningCalcPrice = await MiningCalcPriceContract.deploy();
        // MiningLookupPriceContract = await ethers.getContractFactory("MiningLookupPrice");
        // MiningLookupPrice = await MiningLookupPriceContract.deploy();
        // MiningOpContract = await ethers.getContractFactory("MiningOp");
        // MiningOp = await MiningOpContract.deploy();
        // NestMiningContract = await ethers.getContractFactory("NestMining",
        //     {
        //         libraries: {
        //             MiningCalcPrice: MiningCalcPrice.address,
        //             MiningLookupPrice: MiningLookupPrice.address,
        //             MiningOp: MiningOp.address
        //         }
        //     }
        // );

        MiningV1CalcLibrary = await ethers.getContractFactory("MiningV1Calc");
        MiningV1Calc = await MiningV1CalcLibrary.deploy();
        MiningV1OpLibrary = await ethers.getContractFactory("MiningV1Op");
        MiningV1Op = await MiningV1OpLibrary.deploy();
        NestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
        {
            libraries: {
                MiningV1Calc: MiningV1Calc.address,
                MiningV1Op: MiningV1Op.address
                }
        });
        NestMining = await NestMiningV1Contract.deploy();
        
        NNTokenContract = await ethers.getContractFactory("NNToken");
        NNToken = await NNTokenContract.deploy(1500, "NNT");

        NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
        NNRewardPool = await NNRewardPoolContract.deploy(NestToken.address, NNToken.address);

        NTokenControllerContract = await ethers.getContractFactory("NTokenController");
        NTokenController = await NTokenControllerContract.deploy();

        NestQueryContract = await ethers.getContractFactory("NestQuery");
        NestQuery = await NestQueryContract.deploy();

        _C_NestStaking = NestStaking.address;
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_USDT = C_USDT.address;
        _C_WBTC = C_WBTC.address;
        console.log("_C_USDT=", _C_USDT);
        console.log("_C_WBTC=", _C_WBTC);
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;

        await NestMining.init();
        await NestMining.setContracts(_C_NestToken, _C_NestPool, _C_NestStaking, _C_NestQuery);

        await NestPool.setContracts(_C_NestMining, _C_NestToken, _C_NTokenController, _C_NNRewardPool);
        await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);
        await NNRewardPool.loadContracts(_C_NestToken, _C_NNToken, _C_NestPool, _C_NestMining);
        await NTokenController.setContracts(_C_NestToken, _C_NestPool);
        await NNToken.setContracts(_C_NNRewardPool);
        await NestQuery.setContracts(_C_NestToken, _C_NestMining, _C_NestStaking, _C_NestPool, dev.address);

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