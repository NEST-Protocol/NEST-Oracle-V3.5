const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

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

        NestStakingContract = await ethers.getContractFactory("NestStaking");
        NestStaking = await NestStakingContract.deploy(NestToken.address, NestPool.address);

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

        await NestPool.setContracts(_C_NestMining, _C_NestToken, _C_NTokenController, _C_NNRewardPool, _C_NestStaking);
        await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);

        await NestMining.setAddresses(dev.address, dev.address);
        await NestMining.setContracts(_C_NestToken, _C_NestPool, _C_NestStaking, _C_NestQuery);

        await NNRewardPool.loadContracts(_C_NestToken, _C_NNToken, _C_NestPool, _C_NestMining);
        await NTokenController.setContracts(_C_NestToken, _C_NestPool);
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
            console.log(`[VIEW] accrued(Wei)=${accrued}`);
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
            //console.log("ev = ",ev);
            expect(ev.args["user"]).to.equal(userA.address);
            expect(ev.args["reward"]).to.equal(reward);
            
            let total_post = await NestStaking.rewardsTotal(_C_NestToken);
            expect(total_pre.sub(total_post)).to.equal(reward);
            let reward_A_post = await NestStaking.rewardBalances(_C_NestToken, userA.address);
            expect(reward_A_pre).to.equal(reward_A_post);

            let lastRewardsTotal = await NestStaking.lastRewardsTotal(_C_NestToken);
            expect(lastRewardsTotal).to.equal(total_post);
        });
        
        // check unstake function
        it("should unstake correctly!", async () => {
            const ntoken = _C_NestToken;
            const amount = ETH(50);

            // record funds before unstake
            const totalStaked_pre = await NestStaking.totalStaked(ntoken);
            const staked_balance_pre = await NestStaking.stakedBalanceOf(ntoken,userA.address);
            
            // unstaked 
            await NestStaking.connect(userA).unstake(ntoken, amount);

            // record funds after unstake
            const totalStaked_now = await NestStaking.totalStaked(ntoken);
            const staked_balance_now = await NestStaking.stakedBalanceOf(ntoken,userA.address);

            // check data
            expect(totalStaked_pre.sub(amount)).to.equal(totalStaked_now);
            expect(staked_balance_pre.sub(amount)).to.equal(staked_balance_now);
            
        });

        // check claim function when there has one user (userA)
        it("should claim correctly!", async () => {
            const ntoken = _C_NestToken;
            const ethFee = ETH(100);
            const reward = ethFee.mul(dividend_share_percentage).div(100);
            const total = await NestStaking.totalStaked(ntoken);

            // add ethFee to change accured
            await NestStaking.addETHReward(_C_NestToken, {value: ethFee});

            const accrued1 = await NestStaking.accrued(ntoken);
            const earn = await NestStaking.stakedBalanceOf(ntoken,userA.address);
    
            // claim to transfer funds
            const tx = await NestStaking.connect(userA).claim(ntoken);

            const total1 = await NestStaking.totalStaked(ntoken);
            let ev = (await tx.wait()).events.find(v => v.event == 'RewardClaimed');

            expect(ev.args["reward"]).to.equal(reward);
            expect(total).to.equal(total1);
        });
        
        // check claim function when there have two users (userA and userB)
        it("should claim correctly", async () => {
            const ntoken = _C_NestToken;
            const amountA = NEST(100);
            const amountB = NEST(50);

            const total_pre = await NestStaking.totalStaked(ntoken);
            await NestStaking.connect(userA).stake(ntoken, amountA);
            await NestStaking.connect(userB).stake(ntoken, amountB);
            const blncsA = await NestStaking.stakedBalanceOf(ntoken, userA.address);
            const blncsB = await NestStaking.stakedBalanceOf(ntoken, userB.address);

            const ethFee = ETH(100);
            const rewardA = ETH(BigN(150).mul(100).mul(dividend_share_percentage).div(100).div(200));
            const rewardB = ETH(BigN(50).mul(100).mul(dividend_share_percentage).div(100).div(200));
            const total_pos = await NestStaking.totalStaked(ntoken);

            // add ethFee to change accured
            await NestStaking.addETHReward(_C_NestToken, {value: ethFee});

            // claim to transfer funds (userA)
            const txA = await NestStaking.connect(userA).claim(ntoken);
            let evA = (await txA.wait()).events.find(v => v.event == 'RewardClaimed');
            expect(evA.args["reward"]).to.equal(rewardA);

            // check dataA
            expect(total_pre.add(amountA).add(amountB)).to.equal(total_pos);
            expect(blncsA.add(blncsB)).to.equal(total_pos);

            // claim to transfer funds (userB)
            const txB = await NestStaking.connect(userB).claim(ntoken);
            let evB = (await txB.wait()).events.find(v => v.event == 'RewardClaimed');
            expect(evB.args["reward"]).to.equal(rewardB);

        });

        // transfer funds from the saving 
        it("should transfer correctly", async () => {
            const ntoken = _C_NestToken;
            const amount = ETH(30);
            const totalSaving = await NestStaking.totalSaving(ntoken);
            //console.log("totalSaving = ",totalSaving.toString());

            // record funds before transfer
            const fund_pre = await provider.getBalance(userB.address);
            const rewardsTotal_pre = await NestStaking.totalRewards(ntoken);

            await NestStaking.connect(owner).withdrawSavingByGov(ntoken,userB.address,amount);

            // record funds after transfer
            const fund_pos = await provider.getBalance(userB.address);
            const rewardsTotal_pos = await NestStaking.totalRewards(ntoken);

            // check data
            expect(rewardsTotal_pre.sub(amount)).to.equal(rewardsTotal_pos);
            expect(fund_pre.add(amount)).to.equal(fund_pos);
            
        });

        // check boundary conditions of stake function
        it("should stake failed!", async () => {
            const ntoken = _C_NestToken;
            const amount = BigN(0);

            await expect(NestStaking.connect(userA).stake(ntoken, amount)).to.be.reverted;
            await expectRevert.unspecified(NestStaking.connect(userA).stake(ntoken, amount));

            const amount1 = NEST(6).div(BigN(4));

            await NestStaking.connect(userA).stake(ntoken, amount1);
        });

        // check boundary conditions of unstake function
        it("should unstake failed!", async () => {
            const ntoken = _C_NestToken;
            const amount = BigN(0);

            await expect(NestStaking.connect(userA).unstake(ntoken, amount)).to.be.reverted;
            await expectRevert.unspecified(NestStaking.connect(userA).unstake(ntoken, amount));

            const amount1 = NEST(6).div(BigN(4));

            await NestStaking.connect(userA).unstake(ntoken, amount1);
        });
    });

});