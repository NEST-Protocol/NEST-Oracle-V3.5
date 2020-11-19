const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const usdtdec = BigNumber.from(10).pow(6);
const ethdec = ethers.constants.WeiPerEther;
const nestdec = ethdec;

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


describe("NestStaking contract", function () {
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
        CUSDT = await ERC20Contract.deploy("10000000000000000", "USDT Test Token", "USDT", 6);
        CWBTC = await ERC20Contract.deploy("2100000000000000", "WBTC Test Token", "WBTC", 8);

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

        NestStaking = await ethers.getContractFactory("NestStaking");
        NestStaking = await NestStaking.deploy(NestToken.address);

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
        _C_USDT = CUSDT.address;
        _C_WBTC = CWBTC.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;

        await NestMining.init();

        await NestPool.setContracts(_C_NestMining, _C_NestToken, _C_NTokenController, _C_NNRewardPool);
        await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);

        await NestMining.setAddresses(dev.address, dev.address);
        await NestMining.setContracts(_C_NestToken, _C_NestPool, _C_NestStaking, _C_NestQuery);

        await NNRewardPool.loadContracts(_C_NestToken, _C_NNToken, _C_NestPool, _C_NestMining);
        await NTokenController.setContracts(_C_NestToken, _C_NestPool);
        await NestQuery.setContracts(_C_NestToken, _C_NestMining, _C_NestStaking, _C_NestPool);


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

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await NestToken.balanceOf(owner.address);
            expect(await NestToken.totalSupply()).to.equal(ownerBalance);
        });
    });

    describe('NEST Token', function () {
        it("should have correct totalSupply, ETH(10,000,000,000)", async () => {
            const expectedTotalSupply = ETH('10000000000');
            let totalSupply = await NestToken.totalSupply();
            expect(totalSupply).to.equal(expectedTotalSupply);
        });

        it("should transfer correctly, ETH(2,000,000,000) [Owner => userA]", async () => {
            const amount = ETH("2000000000");
            await NestToken.connect(owner).transfer(userA.address, amount);
            const userA_balance = await NestToken.balanceOf(userA.address);
            expect(userA_balance).to.equal(amount);
        });

        it("should transfer correctly, ETH(2,000,000,000) [Owner => userB]", async () => {
            const amount = ETH("2000000000");
            await NestToken.connect(owner).transfer(userB.address, amount);
            const userB_balance = await NestToken.balanceOf(userB.address);
            expect(userB_balance).to.equal(amount);
        });

        it("should transfer fail", async () => {
            let amount = ETH("10000000001");
            expect(
                NestToken.connect(owner).transfer(userA.address, amount)
            ).to.be.reverted;
        });

        it("should approve correctly, ETH(10,000,000,000) [userA -> _C_NestStaking]", async () => {
            const amount = ETH("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestStaking, amount);
            const approved = await NestToken.allowance(userA.address, _C_NestStaking);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, ETH(10,000,000,000) [userB -> _C_NestStaking]", async () => {
            const amount = ETH("10000000000");
            const rs = await NestToken.connect(userB).approve(_C_NestStaking, amount);
            const approved = await NestToken.allowance(userB.address, _C_NestStaking);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, ETH(10,000,000,000) [userA -> _C_NestPool]", async () => {
            const amount = ETH("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestPool, amount);
            const approved = await NestToken.allowance(userA.address, _C_NestPool);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, ETH(10,000,000,000) [userB -> _C_NestPool]", async () => {
            const amount = ETH("10000000000");
            const rs = await NestToken.connect(userB).approve(_C_NestPool, amount);
            const approved = await NestToken.allowance(userB.address, _C_NestPool);
            expect(approved).to.equal(amount);
        });
        
    });

    describe('NestStaking', function () {

        const dividend_share_percentage = BigN(80);

        it("should have correct settings", async () => {
            let gov = await NestStaking.governance();
            expect(gov).to.equal(owner.address);
        });

        it ("should add rewards correctly", async () => {
            const amount = ETH(100);
            let tx = await NestStaking.addETHReward(_C_NestToken, {value: amount});
            let blncs = await NestStaking.rewardsTotal(_C_NestToken);
            expect(blncs).to.equal(amount);
        });

        it("should stake correctly", async () => {
            const amount = NEST(100);
            let tx = await NestStaking.connect(userA).stake(_C_NestToken, amount);
            const blncs = await NestStaking.stakedBalanceOf(_C_NestToken, userA.address);
            expect(blncs).to.equal(amount);

            const total = await NestStaking.totalStaked(_C_NestToken);
            expect(total).to.equal(amount);
        });

        it("should calculate reward correctly", async () => {
            const total = ETH(100);
            const staked = await NestStaking.stakedBalanceOf(_C_NestToken, userA.address);
            console.log(`[VIEW] staked(Nest, userA)=${staked.div(nestdec)}`);
            const reward_per_ntoken = await NestStaking.rewardPerToken(_C_NestToken);
            console.log(`[VIEW] reward_per_ntoken(Nest)=${reward_per_ntoken.div(nestdec)}`);
            expect(reward_per_ntoken).to.equal(total.mul(dividend_share_percentage).div(100).mul(ethdec).div(staked));
            const accrued = await NestStaking.accrued(_C_NestToken);
            console.log(`[VIEW] accrued(Nest)=${accrued}`);
            expect(accrued).to.equal(total);
            const earned = await NestStaking.earned(_C_NestToken, userA.address);
            console.log(`[VIEW] earned(Nest, userA)=${earned}`);
            expect(earned).to.equal(accrued.mul(dividend_share_percentage).div(100));
            const reward = await NestStaking.rewardBalances(_C_NestToken, userA.address);
            console.log(`[VIEW] reward(Nest, userA)=${reward}`);
            expect(reward).to.equal(0);
        });

        it("should claim rewards correctly", async () => {
            const amount = ETH(100);
            const reward = amount.mul(dividend_share_percentage).div(100);
            let total_pre = await NestStaking.rewardsTotal(_C_NestToken);
            let ethA_pre = await userA.getBalance();
            let reward_A_pre = await NestStaking.rewardBalances(_C_NestToken, userA.address);
            let tx = await NestStaking.connect(userA).claim(_C_NestToken);
            let ethA_post = await userA.getBalance();
            let ev = (await tx.wait()).events.find(v => v.event == 'RewardClaimed');
            expect(ev.args["user"]).to.equal(userA.address);
            expect(ev.args["reward"]).to.equal(reward);
            
            let total_post = await NestStaking.rewardsTotal(_C_NestToken);
            expect(total_pre.sub(total_post)).to.equal(reward);
            let reward_A_post = await NestStaking.rewardBalances(_C_NestToken, userA.address);
            expect(reward_A_pre).to.equal(reward_A_post);

            let lastRewardsTotal = await NestStaking.lastRewardsTotal(_C_NestToken);
            expect(lastRewardsTotal).to.equal(total_post);
        });    
/*

        it("should unstake correctly", async () => {
            const amount = web3.utils.toWei('100', 'ether');
            let tx = await NestStaking.unstake(_C_NestToken, amount,{from: userA});
            const blncs = await NestStaking.stakedBalanceOf(_C_NestToken, userA);
            expect(blncs).to.bignumber.equal(new BN('0'));
            const total = await NestStaking.totalStaked(_C_NestToken);
            expect(total).to.bignumber.equal(new BN('0'));
        });
*/
    // describe('NestStaking', function () {

        // let _C_NWBTC;

        // it("can open a new NToken correctly", async () => {
        //     await WBTC.transfer(userB.address, wbtc(5));
        //     await WBTC.connect(userB).approve(_C_NTokenController, wbtc(1000));
        //     await NestToken.connect(userB).approve(_C_NTokenController, nest(1_000_000));
        //     const tx = await NTokenController.connect(userB).open(_C_WBTC);
        //     const receipt = await tx.wait();
        //     const ev = receipt.events.find((ev) => {
        //         if (ev.event == "NTokenOpened") {
        //             return true;
        //         }
        //     });
        //     expect(ev.args.token).to.equal(_C_WBTC);
        //     expect(ev.args.owner).to.equal(userB.address);
        //     _C_NWBTC = await NestPool.getNTokenFromToken(_C_WBTC);
        //     expect(_C_NWBTC).to.equal(ev.args.ntoken);
        //     expect(await NTokenController.balanceNest()).to.equal(nest(100_000));
        // });

        // it("cannot open a ntoken for a NToken", async () => {
        //     expect(NTokenController.connect(userB).open(_C_NWBTC)).to.be.reverted;
        // });

        // it("can withdraw NEST by the governer", async () => {
        //     const nest_userA_pre = await NestToken.balanceOf(userA.address);
        //     const amount = await NTokenController.balanceNest();
        //     await NTokenController.withdrawNest(userA.address, amount);
        //     const nest_userA_post = await NestToken.balanceOf(userA.address);
        //     expect(nest_userA_post.sub(nest_userA_pre)).to.equal(amount);
        // });

        // it("cannot withdraw NEST by anyone other than the governer", async () => {
        //     expect(NTokenController.connect(userB).withdrawNest(userA.address, 1)).to.be.reverted;
        // });

    });

});