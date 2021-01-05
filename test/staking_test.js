const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const { usdtdec, wbtcdec, nestdec, ethdec,
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN, goBlocks,
    show_eth, show_usdt, show_64x64 } = require("../scripts/utils.js");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNestProtocol,
    printContracts,deployNWBTC,
    setupNest } = require("../scripts/deploy.js");

let provider = ethers.provider;

const nwbtc = BigNumber.from(10).pow(18);

NWBTC = function (amount) {
    return BigNumber.from(amount).mul(nwbtc);
}

describe("NestStaking contract", function () {
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
        CNWBTC = await deployNWBTC(owner);
        let contracts = {
            USDT: CUSDT,
            WBTC: CWBTC,
            NEST: NestToken,
            IterableMapping: IterableMapping,
            NN: NNToken,
            NWBTC: CNWBTC
        };
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
        _C_NWBTC = CNWBTC.address;
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_NestStaking = NestStaking.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;
        _C_NestDAO = NestDAO.address;

        await NestPool.setNTokenToToken(_C_WBTC, _C_NWBTC);
        await CNWBTC.setOfferMain(_C_NestMining);
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
        it("should have correct totalSupply, NEST(10,000,000,000)", async () => {
            const expectedTotalSupply = NEST('10000000000');
            let totalSupply = await NestToken.totalSupply();
            const amount = NEST("20000000");
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
            let amount = NEST("10000000001");
            expect(
                NestToken.connect(owner).transfer(userA.address, amount)
            ).to.be.reverted;
        });

        it("should approve correctly, NEST(10,000,000,000) [userA -> _C_NestStaking]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestStaking, amount);
            await NestToken.connect(userA).approve(_C_NestPool, amount);
            await NestToken.connect(userA).approve(_C_NTokenController, NEST('100000'));
            const approved = await NestToken.allowance(userA.address, _C_NestStaking);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000) [userB -> _C_NestStaking]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userB).approve(_C_NestStaking, amount);
            await NestToken.connect(userB).approve(_C_NestPool, amount);
            await NestToken.connect(userB).approve(_C_NTokenController, NEST('100000'));
            const approved = await NestToken.allowance(userB.address, _C_NestStaking);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000) [userA -> _C_NestPool]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestPool, amount);
            const approved = await NestToken.allowance(userA.address, _C_NestPool);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000) [userB -> _C_NestPool]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userB).approve(_C_NestPool, amount);
            const approved = await NestToken.allowance(userB.address, _C_NestPool);
            expect(approved).to.equal(amount);
        });

    });

    describe('WBTC Token', function () {

        it("userA should approve correctly", async () => {
            await CWBTC.transfer(userA.address, WBTC('10000'));
            await CWBTC.connect(userA).approve(_C_NestPool, WBTC(10000));
            await CWBTC.connect(userA).approve(_C_NTokenController, WBTC(1));
        })

        it("userB should approve correctly", async () => {
            await CWBTC.transfer(userB.address, WBTC('10000'));
            await CWBTC.connect(userB).approve(_C_NestPool, WBTC(10000));
            await CWBTC.connect(userB).approve(_C_NTokenController, WBTC(1));
        })
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

    describe('NestStaking', function () {

        const dividend_share_percentage = BigN(100);

        //==================  addETHReward function  ==========================//
        //=====================================================================//

        it("should add rewards correctly", async () => {
            const amount = ETH(100);
            let tx = await NestStaking.addETHReward(_C_NestToken, { value: amount });
            let blncs = await NestStaking.rewardsTotal(_C_NestToken);
            expect(blncs).to.equal(amount);
        });

        
        //================  stake and stakedBalanceOf function  ===============//
        //=====================================================================//

        it("should stake correctly", async () => {
            const amount = NEST(100);
            let tx = await NestStaking.connect(userA).stake(_C_NestToken, amount);
            const blncs = await NestStaking.stakedBalanceOf(_C_NestToken, userA.address);
            expect(blncs).to.equal(amount);

            const total = await NestStaking.totalStaked(_C_NestToken);
            expect(total).to.equal(amount);
        });


        //======================  calculate reward  ================================//
        //==========================================================================//

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

        //==========================  claim reward  ================================//
        //==========================================================================//
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

        //==========================  unstake reward  ==============================//
        //==========================================================================//
        // check unstake function
        it("should unstake correctly!", async () => {
            const ntoken = _C_NestToken;
            const amount = ETH(50);

            // record funds before unstake
            const totalStaked_pre = await NestStaking.totalStaked(ntoken);
            const staked_balance_pre = await NestStaking.stakedBalanceOf(ntoken, userA.address);

            // unstaked 
            await NestStaking.connect(userA).unstake(ntoken, amount);

            // record funds after unstake
            const totalStaked_now = await NestStaking.totalStaked(ntoken);
            const staked_balance_now = await NestStaking.stakedBalanceOf(ntoken, userA.address);

            // check data
            expect(totalStaked_pre.sub(amount)).to.equal(totalStaked_now);
            expect(staked_balance_pre.sub(amount)).to.equal(staked_balance_now);

        });

        //==========================  claim reward  ================================//
        //==========================================================================//
        // check claim function when there has one user (userA)
        it("should claim correctly!", async () => {
            const ntoken = _C_NestToken;
            const ethFee = ETH(100);
            const reward = ethFee.mul(dividend_share_percentage).div(100);
            const total = await NestStaking.totalStaked(ntoken);

            // add ethFee to change accured
            await NestStaking.addETHReward(_C_NestToken, { value: ethFee });

            const accrued1 = await NestStaking.accrued(ntoken);
            const earn = await NestStaking.stakedBalanceOf(ntoken, userA.address);

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
            await NestStaking.addETHReward(_C_NestToken, { value: ethFee });

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

         /* this function has removed
        //========================  withdrawSavingByGov  ===========================//
        //==========================================================================//
        // transfer funds from the saving 
        it("should transfer correctly", async () => {
            const ntoken = _C_NestToken;
            const amount = ETH(30);

            const dividendShareRate = 50;
            await NestStaking.setParams(dividendShareRate);

            const amountA = NEST(100);
            const amountB = NEST(50);

            const ethFee = ETH(1000);
            const rewardA = ETH(BigN(150).mul(100).mul(dividend_share_percentage).div(100).div(200));
            const rewardB = ETH(BigN(50).mul(100).mul(dividend_share_percentage).div(100).div(200));

            // add ethFee to change accured
            await NestStaking.addETHReward(_C_NestToken, { value: ethFee });

            await NestStaking.connect(userA).stake(ntoken, amountA);
            await NestStaking.connect(userB).stake(ntoken, amountB);
    
            const totalSaving = await NestStaking.totalSaving(ntoken);
            console.log("totalSaving = ",totalSaving.toString());

            // record funds before transfer
            const fund_pre = await provider.getBalance(userB.address);
            const rewardsTotal_pre = await NestStaking.totalRewards(ntoken);

            await NestStaking.pause();
            await NestStaking.connect(owner).withdrawSavingByGov(ntoken, userB.address, amount);
            await NestStaking.resume();

            // record funds after transfer
            const fund_pos = await provider.getBalance(userB.address);
            const rewardsTotal_pos = await NestStaking.totalRewards(ntoken);

            // check data
            expect(rewardsTotal_pre.sub(amount)).to.equal(rewardsTotal_pos);
            expect(fund_pre.add(amount)).to.equal(fund_pos);

        });
        */

        //=======================  check boundary conditions  ======================//
        //==========================================================================//  
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


        //===========================  check  stakeFromNestPool  function  =============================//
        //==============================================================================================//

        // ntoken generated by mining ntoken  (post function)
        it("should transfer nest from nestpool to staking correctly!", async () => {
            //=======================  preparation  ==================//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);
    
            // post (in order to calculate reward)
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            // to calculate this post reward
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
           
            const index = await NestMining.lengthOfPriceSheets(token);
            
            await goBlocks(provider, priceDurationBlock);

            // close priceSheet 
            await NestMining.connect(userA).close(token, index.sub(1));
            //==========================================//

            // record funds before stakeFromNestPool
            const totalStaked_ntoken_pre = await  NestStaking.totalStaked(NToken);
            const uesrA_stakedBanlance_pre = await  NestStaking.stakedBalanceOf(NToken, userA.address);
             
            // ntoken generated by mining token
            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);

            await NestStaking.connect(userA).stakeFromNestPool(NToken, userA_NToken_pool_pre);

            // record funds before stakeFromNestPool
            const totalStaked_ntoken_pos = await  NestStaking.totalStaked(NToken);
            const uesrA_stakedBanlance_pos = await  NestStaking.stakedBalanceOf(NToken, userA.address);
             
            // ntoken generated by mining token
            const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);

            // check funds
            expect(totalStaked_ntoken_pre.add(userA_NToken_pool_pre)).to.equal(totalStaked_ntoken_pos);

            expect(uesrA_stakedBanlance_pre.add(userA_NToken_pool_pre)).to.equal(uesrA_stakedBanlance_pos);

            expect(userA_NToken_pool_pos).to.equal(0);

        });


        // ntoken generated by unfreezing ntoken and mining ntoken
        it("should transfer nest from nestpool to staking correctly!", async () => {
            //=======================  preparation  ==================//
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;   
            const tokenAmountPerEth = USDT(500);
            const NTokenAmountPerEth = NEST(500);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);
        
            // post2 (in order to calculate reward)
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            

            // to calculate this post reward
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
           
            await goBlocks(provider, BigN(priceDurationBlock).add(1));

            const index_token = await NestMining.lengthOfPriceSheets(token);
            const index_ntoken = await NestMining.lengthOfPriceSheets(NToken);
            
            // close priceSheet 
            await NestMining.connect(userA).close(token, index_token.sub(1));
            await NestMining.connect(userA).close(NToken, index_ntoken.sub(1));
            //==========================================//

            // record funds before stakeFromNestPool
            const totalStaked_ntoken_pre = await  NestStaking.totalStaked(NToken);
            const uesrA_stakedBanlance_pre = await  NestStaking.stakedBalanceOf(NToken, userA.address);
             
            // ntoken generated by mining token
            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);

            await NestStaking.connect(userA).stakeFromNestPool(NToken, userA_NToken_pool_pre);
            
            const totalStaked_ntoken_pos = await  NestStaking.totalStaked(NToken);
            const uesrA_stakedBanlance_pos = await  NestStaking.stakedBalanceOf(NToken, userA.address);
             
            // ntoken generated by mining token
            const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);

            // check funds
            expect(totalStaked_ntoken_pre.add(userA_NToken_pool_pre)).to.equal(totalStaked_ntoken_pos);

            expect(uesrA_stakedBanlance_pre.add(userA_NToken_pool_pre)).to.equal(uesrA_stakedBanlance_pos);

            expect(userA_NToken_pool_pos).to.equal(0);
        });

        // check gov
        it("should load gov correctly", async () => {
            // now the nestpool's gov is userD
            await NestPool.setGovernance(userD.address);

            const gov = await NestPool.governance();

            // now the NestStaking's gov is userD
            await NestStaking.loadGovernance();

            expect(gov).to.equal(userD.address);

            // check pause
            await NestStaking.connect(userD).pause();
            
            await expect(NestStaking.connect(userA).stake(_C_NestToken, NEST(100))).to.be.reverted;

            // check resume
            await NestStaking.connect(userD).resume();

            NestStaking.connect(userA).stake(_C_NestToken, NEST(100));

        })
    });

});