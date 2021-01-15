const { expect } = require('chai');
const { WeiPerEther, BigNumber } = require("ethers");
const { BN, time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const { usdtdec, wbtcdec, nestdec, ethdec,
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64 } = require("../scripts/utils.js");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    printContracts,
    setupNest } = require("../scripts/deploy.js");


const ethTwei = BigNumber.from(10).pow(12);
const nwbtc = BigNumber.from(10).pow(18);

NWBTC = function (amount) {
    return BigNumber.from(amount).mul(nwbtc);
}

const advanceTime = async (provider, seconds) => {
    await provider.send("evm_increaseTime", [seconds]);
};

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

describe("NestToken contract", function () {
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


    const go_block = async function (num) {
        let block_h;
        for (i = 0; i < num; i++) {
            await time.advanceBlock();
            block_h = await time.latestBlock();
            console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
        }
    }


    before(async () => {


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

    describe('NEST Token', function () {
        it("should have correct totalSupply", async () => {
            const expectedTotalSupply = NEST("10000000000");
            const totalSupply = await NestToken.totalSupply();
            const amount = NEST("20000000");
            await NestPool.initNestLedger(amount);
            expect(totalSupply).to.equal(expectedTotalSupply);
        })

        it("should transfer correctly", async () => {
            const amount = NEST("200000");
            console.log(`>> [TRAN] NEST(${amount.div(ethdec)}) | deployer ==> userA`);
            await NestToken.transfer(userA.address, amount);
            const balanceOfUserA = await NestToken.balanceOf(userA.address);
            expect(balanceOfUserA).to.equal(amount);
        })

        it("should transfer correctly", async () => {
            const amount = NEST("200000");
            console.log(`>> [TRAN] NEST(${amount.div(ethdec)}) | deployer ==> userB`);
            await NestToken.transfer(userB.address, amount);
            const balanceOfUserB = await NestToken.balanceOf(userB.address);
            expect(balanceOfUserB).to.equal(amount);
        })

        it("should transfer fail", async () => {
            const amount = NEST("10000000001");
            expect(NestToken.transfer(userA.address, amount)).to.be.reverted;
        })

        it("userA should approve correctly", async () => {
            const approved_val = NEST("10000000000");
            await NestToken.connect(userA).approve(_C_NestPool, approved_val);
            await NestToken.connect(userA).approve(_C_NTokenController, NEST('100000'));

            const rs = await NestToken.allowance(userA.address, _C_NestPool);
            expect(rs).to.equal(approved_val);
        })

        it("userB should approve correctly", async () => {
            const approved_val = NEST("10000000000");
            await NestToken.connect(userB).approve(_C_NestPool, approved_val);
            await NestToken.connect(userB).approve(_C_NTokenController, NEST('100000'));
            const rs = await NestToken.allowance(userB.address, _C_NestPool);
            expect(rs).to.equal(approved_val);
        })
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

    describe('NWBTC NToken', function () {

        it("userA should approve correctly", async () => {
            await CNWBTC.transfer(userA.address, NWBTC('400000'));
            await CNWBTC.connect(userA).approve(_C_NestPool, NWBTC('4000000'));
            await CNWBTC.connect(userA).approve(_C_NTokenController, NWBTC('1000000'));
        })

        it("userB should approve correctly", async () => {
            await CNWBTC.transfer(userB.address, NWBTC('400000'));
            await CNWBTC.connect(userB).approve(_C_NestPool, NWBTC('4000000'));
            await CNWBTC.connect(userB).approve(_C_NTokenController, NWBTC('1000000'));
        })
    });


    describe('NNToken', function () {

        it("userA should approve correctly", async () => {
            // initialized NNRewardPool.address
            await NNRewardPool.start();
            await NNToken.setContracts(_C_NNRewardPool);

            await NNToken.transfer(userA.address, 700);
            await NNToken.connect(userA).approve(_C_NestPool, 600);
            await NNToken.connect(userA).approve(_C_NTokenController, 100);
        })


        it("userB should approve correctly", async () => {
            await NNToken.transfer(userB.address, 700);
            await NNToken.connect(userB).approve(_C_NestPool, 600);
            await NNToken.connect(userB).approve(_C_NTokenController, 100);
        })

    });

    describe('NestMining price sheets', function () {

        //======================================= post WBTC =========================================//
        //===========================================================================================//

        // calculate funds of post function  
        it("can post ETH-WBTC correctly !", async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const nestStakedNum1k = params.nestStakedNum1k;
            const ethNum = params.miningEthUnit;
            const miningFeeRate = params.miningFeeRate;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            const MINING_NTOKEN_FEE_DIVIDEND_RATE = 60;
            const MINING_NTOKEN_FEE_DAO_RATE = 20;
            const MINING_NTOKEN_FEE_NEST_DAO_RATE = 20;

            // address(token) ==> address(NToken)
            // await NTokenController.connect(userA).open(token);

            const NToken = await NestPool.getNTokenFromToken(token);
            const balance = await CNWBTC.balanceOf(NToken);

            // record funds before posting
            const userA_nest_in_exAddress_pre = await NestToken.balanceOf(userA.address);
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);
            const userA_token_in_exAddress_pre = await CWBTC.balanceOf(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            //const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            const eth_reward_NestStakingOfNToken_pre = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pre = await NestDAO.totalETHRewards(NToken);
            const eth_reward_NestDaoOfNestToken_pre = await NestDAO.totalETHRewards(NestToken.address);

            // post 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            // calculate fee
            const ethFee = ETH(BigN(ethNum).mul(miningFeeRate)).div(1000);
            const eth_reward_NestStakingOfNToken = ethFee.mul(MINING_NTOKEN_FEE_DIVIDEND_RATE).div(100);
            const eth_reward_NestDAoOfNToken = ethFee.mul(MINING_NTOKEN_FEE_DAO_RATE).div(100);
            const eth_reward_NestDaoOfNestToken = ethFee.mul(MINING_NTOKEN_FEE_NEST_DAO_RATE).div(100);

            const freezeEthAmount = ETH(BigN(ethNum));
            const freezeTokenAmount = BigN(tokenAmountPerEth).mul(ethNum);
            const freezeNestAmount = NEST(BigN(nestStakedNum1k).mul(1000));

            // record funds after posting
            const userA_nest_in_exAddress_pos = await NestToken.balanceOf(userA.address);
            const userA_nest_pool_pos = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_eth_pool_pos = await NestPool.balanceOfEthInPool(userA.address);
            const userA_token_in_exAddress_pos = await CWBTC.balanceOf(userA.address);

            const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);
            //const eth_reward_pos = await provider.getBalance(_C_NestStaking);

            const eth_reward_NestStakingOfNToken_pos = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pos = await NestDAO.totalETHRewards(NToken);
            const eth_reward_NestDaoOfNestToken_pos = await NestDAO.totalETHRewards(NestToken.address);


            // check funds
            // check funds about userA
            expect(userA_eth_pool_pre.add(msgValue)
                .sub(ethFee)
                .sub(freezeEthAmount))
                .to.equal(userA_eth_pool_pos);

            expect(userA_token_in_exAddress_pre.add(userA_token_pool_pre)
                .sub(freezeTokenAmount))
                .to.equal(userA_token_in_exAddress_pos.add(userA_token_pool_pos));


            expect(userA_nest_in_exAddress_pre.add(userA_nest_pool_pre)
                .sub(freezeNestAmount))
                .to.equal(userA_nest_in_exAddress_pos.add(userA_nest_pool_pos));

            // check funds about nestPool     
            expect(eth_pool_pre.add(freezeEthAmount)).to.equal(eth_pool_pos);
            expect(token_pool_pre.add(freezeTokenAmount)).to.equal(token_pool_pos);
            expect(nest_pool_pre.add(freezeNestAmount)).to.equal(nest_pool_pos);

            // check funds about reward
            expect(eth_reward_NestStakingOfNToken_pre
                .add(eth_reward_NestStakingOfNToken))
                .to.equal(eth_reward_NestStakingOfNToken_pos);

            expect(eth_reward_NestDAoOfNToken_pre
                .add(eth_reward_NestDAoOfNToken))
                .to.equal(eth_reward_NestDAoOfNToken_pos);

            expect(eth_reward_NestDaoOfNestToken_pre
                .add(eth_reward_NestDaoOfNestToken))
                .to.equal(eth_reward_NestDaoOfNestToken_pos);


            //=======================check pricesheet================//
            const h = await provider.getBlockNumber();
            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            expect(postSheet.miner).to.equal(userA.address);

            expect(postSheet.height).to.equal(h);

            expect(postSheet.ethNum).to.equal(ethNum);

            expect(postSheet.remainNum).to.equal(ethNum);

            expect(postSheet.level).to.equal(0);

            expect(postSheet.typ).to.equal(3);

            expect(postSheet.state).to.equal(1);

            expect(postSheet.nestNum1k).to.equal(1);

            expect(postSheet.ethNumBal).to.equal(ethNum);

            expect(postSheet.tokenNumBal).to.equal(ethNum);

            expect(postSheet.tokenAmountPerEth).to.equal(tokenAmountPerEth);
        });


        //================================= post2 USDT-NEST =========================================//
        //===========================================================================================//

        // post2 USDT-NEST
        it("can post2 USDT-NEST correctly !", async () => {
            //================preparation==================//
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const miningFeeRate = params.miningFeeRate;
            const nestStakedNum1k = params.nestStakedNum1k;


            const MINING_NEST_FEE_DIVIDEND_RATE = 80;
            const MINING_NEST_FEE_DAO_RATE = 20;

            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);

            // record funds before posting
            const userA_nest_in_exAddress_pre = await NestToken.balanceOf(userA.address);
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_token_in_exAddress_pre = await CUSDT.balanceOf(userA.address);
            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);


            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);

            const NToken_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, NToken);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const eth_reward_NestStakingOfNToken_pre = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pre = await NestDAO.totalETHRewards(NToken);

            const eth_reward_NestStaking_pre = await provider.getBalance(_C_NestStaking);
            const eth_reward_NestDao_pre = await provider.getBalance(_C_NestDAO);
            //=========================================//

            // post 
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            //const index0 = await NestMining.lengthOfPriceSheets(token);
            //const postSheet = await NestMining.fullPriceSheet(token, index0.sub(1));

            // calculate fee
            const ethFee = ETH(BigN(ethNum).mul(miningFeeRate)).div(1000);
            const eth_reward_NestStaking = ethFee.mul(MINING_NEST_FEE_DIVIDEND_RATE).div(100);
            const eth_reward_NestDao = ethFee.mul(MINING_NEST_FEE_DAO_RATE).div(100);

            const freezeEthAmount = ETH(BigN(ethNum));
            const freezeTokenAmount = BigN(tokenAmountPerEth).mul(ethNum);
            const freezeNTokenAmount = BigN(NTokenAmountPerEth).mul(ethNum);
            const freezeNestAmount = NEST(BigN(nestStakedNum1k).mul(1000).mul(2));

            // add nest
            const NN_NEST_REWARD_PERCENTAGE = 15;
            const NNRewardPool_nest = NEST(400).mul(NN_NEST_REWARD_PERCENTAGE).div(100);

            const DAO_NEST_REWARD_PERCENTAGE = 5;
            const NestDAO_nest = NEST(400).mul(DAO_NEST_REWARD_PERCENTAGE).div(100);

            // record funds after posting
            const userA_nest_in_exAddress_pos = await NestToken.balanceOf(userA.address);
            const userA_nest_pool_pos = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_in_exAddress_pos = await CUSDT.balanceOf(userA.address);
            const userA_token_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pos = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, token);

            const NToken_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, NToken);
            const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);

            const eth_reward_NestStakingOfNToken_pos = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pos = await NestDAO.totalETHRewards(NToken);

            const eth_reward_NestStaking_pos = await provider.getBalance(_C_NestStaking);
            const eth_reward_NestDao_pos = await provider.getBalance(_C_NestDAO);


            // check funds
            // check funds about userA
            expect(userA_eth_pool_pre.add(msgValue)
                .sub(ethFee)
                .sub(freezeEthAmount)
                .sub(freezeEthAmount))
                .to.equal(userA_eth_pool_pos);

            expect(userA_token_pool_pre.add(userA_token_in_exAddress_pre)
                .sub(freezeTokenAmount))
                .to.equal(userA_token_pool_pos.add(userA_token_in_exAddress_pos));

            expect(userA_nest_in_exAddress_pre.add(userA_nest_pool_pre)
                .add(userA_NToken_pool_pre)
                .sub(freezeNTokenAmount)
                .sub(freezeNestAmount))
                .to.equal(userA_nest_in_exAddress_pos.add(userA_nest_pool_pos)
                    .add(userA_NToken_pool_pos));

            // check funds about nestPool                                             
            expect(eth_pool_pre.add(freezeEthAmount)
                .add(freezeEthAmount))
                .to.equal(eth_pool_pos);

            expect(token_pool_pre.add(freezeTokenAmount)).to.equal(token_pool_pos);

            expect(NToken_pool_pre
                   .add(freezeNTokenAmount)
                   .add(freezeNestAmount))
                   .to.equal(NToken_pool_pos);

            expect(nest_pool_pre
                   .add(freezeNTokenAmount)
                   .add(freezeNestAmount))
                   .to.equal(nest_pool_pos);

            // check reward funds
            expect(eth_reward_NestStaking_pre.add(eth_reward_NestStaking)).to.equal(eth_reward_NestStaking_pos);

            expect(eth_reward_NestDao_pre.add(eth_reward_NestDao)).to.equal(eth_reward_NestDao_pos);

            expect(eth_reward_NestStakingOfNToken_pre
                .add(eth_reward_NestStaking))
                .to.equal(eth_reward_NestStakingOfNToken_pos);

            expect(eth_reward_NestDAoOfNToken_pre
                .add(eth_reward_NestDao))
                .to.equal(eth_reward_NestDAoOfNToken_pos);

        });

        // check the price sheet 
        it('should update price sheet correctly !', async () => {
            const token = _C_USDT;
            const ethNum = 10;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const h = await provider.getBlockNumber();

            const NToken = await NestPool.getNTokenFromToken(token);

            const index0 = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index0.sub(1));

            // check the token priceSheet
            expect(postSheet.miner).to.equal(userA.address);
            expect(postSheet.height).to.equal(h);
            expect(postSheet.ethNum).to.equal(ethNum);
            expect(postSheet.remainNum).to.equal(ethNum);
            expect(postSheet.level).to.equal(0);
            expect(postSheet.typ).to.equal(1);
            expect(postSheet.state).to.equal(1);
            expect(postSheet.nestNum1k).to.equal(1);
            expect(postSheet.ethNumBal).to.equal(ethNum);
            expect(postSheet.tokenNumBal).to.equal(ethNum);
            expect(postSheet.tokenAmountPerEth).to.equal(tokenAmountPerEth);

            const index1 = await NestMining.lengthOfPriceSheets(NToken);
            const postSheet1 = await NestMining.fullPriceSheet(NToken, index1.sub(1));

            // check the token priceSheet
            expect(postSheet1.miner).to.equal(userA.address);
            expect(postSheet1.height).to.equal(h);
            expect(postSheet1.ethNum).to.equal(ethNum);
            expect(postSheet1.remainNum).to.equal(ethNum);
            expect(postSheet1.level).to.equal(0);
            expect(postSheet1.typ).to.equal(2);
            expect(postSheet1.state).to.equal(1);
            expect(postSheet1.nestNum1k).to.equal(1);
            expect(postSheet1.ethNumBal).to.equal(ethNum);
            expect(postSheet1.tokenNumBal).to.equal(ethNum);
            expect(postSheet1.tokenAmountPerEth).to.equal(NTokenAmountPerEth);

        });


        //================================= post2 WBTC-NWBTC ========================================//
        //===========================================================================================//

        // post2 WBTC-NWBTC
        it("can transfer funds correctly !", async () => {
            //================preparation==================//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const nestStakedNum1k = params.nestStakedNum1k;
            const miningFeeRate = params.miningFeeRate;
            const tokenAmountPerEth = WBTC(100);
            const NTokenAmountPerEth = NWBTC(500);
            const msgValue = ETH(BigN(50));

            const MINING_NTOKEN_FEE_DIVIDEND_RATE = 60;
            const MINING_NTOKEN_FEE_DAO_RATE = 20;
            const MINING_NTOKEN_FEE_NEST_DAO_RATE = 20;

            // address(token) ==> address(NToken)
            //await NTokenController.connect(userA).open(token);

            const NToken = await NestPool.getNTokenFromToken(token);


            // record funds before posting
            const userA_nest_in_exAddress_pre = await NestToken.balanceOf(userA.address);
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);

            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_token_in_exAddress_pre = await CWBTC.balanceOf(userA.address);

            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_NToken_in_exAddress_pre = await CNWBTC.balanceOf(userA.address);


            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);

            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);

            const NToken_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, NToken);

            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);


            const eth_reward_NestStaking_pre = await provider.getBalance(_C_NestStaking);
            const eth_reward_NestDao_pre = await provider.getBalance(_C_NestDAO);

            const eth_reward_NestStakingOfNToken_pre = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pre = await NestDAO.totalETHRewards(NToken);
            const eth_reward_NestDaoOfNestToken_pre = await NestDAO.totalETHRewards(NestToken.address);
            //=========================================//

            // post 
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            //const index0 = await NestMining.lengthOfPriceSheets(token);
            //const postSheet = await NestMining.fullPriceSheet(token, index0.sub(1));

            // calculate fee
            const ethFee = ETH(BigN(ethNum).mul(miningFeeRate)).div(1000);
            const eth_reward_NestStakingOfNToken = ethFee.mul(MINING_NTOKEN_FEE_DIVIDEND_RATE).div(100);
            const eth_reward_NestDAoOfNToken = ethFee.mul(MINING_NTOKEN_FEE_DAO_RATE).div(100);
            const eth_reward_NestDaoOfNestToken = ethFee.mul(MINING_NTOKEN_FEE_NEST_DAO_RATE).div(100);

            const freezeEthAmount = ETH(BigN(ethNum));
            const freezeTokenAmount = BigN(tokenAmountPerEth).mul(ethNum);
            const freezeNTokenAmount = BigN(NTokenAmountPerEth).mul(ethNum);
            const freezeNestAmount = NEST(BigN(nestStakedNum1k).mul(1000).mul(2));

            // record funds after posting
            const userA_nest_in_exAddress_pos = await NestToken.balanceOf(userA.address);
            const userA_nest_pool_pos = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_in_exAddress_pos = await CWBTC.balanceOf(userA.address);
            const userA_token_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);

            const userA_NToken_in_exAddress_pos = await CNWBTC.balanceOf(userA.address);

            const userA_eth_pool_pos = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, token);

            const NToken_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, NToken);
            const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);

            const eth_reward_NestStaking_pos = await provider.getBalance(_C_NestStaking);
            const eth_reward_NestDao_pos = await provider.getBalance(_C_NestDAO);

            const eth_reward_NestStakingOfNToken_pos = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pos = await NestDAO.totalETHRewards(NToken);
            const eth_reward_NestDaoOfNestToken_pos = await NestDAO.totalETHRewards(NestToken.address);

            // check funds
            // check funds about userA
            expect(userA_eth_pool_pre.add(msgValue)
                .sub(ethFee)
                .sub(freezeEthAmount)
                .sub(freezeEthAmount))
                .to.equal(userA_eth_pool_pos);

            expect(userA_token_pool_pre.add(userA_token_in_exAddress_pre)
                .sub(freezeTokenAmount))
                .to.equal(userA_token_pool_pos.add(userA_token_in_exAddress_pos));

            expect(userA_NToken_pool_pre.add(userA_NToken_in_exAddress_pre)
                .sub(freezeNTokenAmount))
                .to.equal(userA_NToken_pool_pos.add(userA_NToken_in_exAddress_pos));

            expect(userA_nest_in_exAddress_pre.add(userA_nest_pool_pre)
                .sub(freezeNestAmount))
                .to.equal(userA_nest_in_exAddress_pos.add(userA_nest_pool_pos));

            // check funds about nestPool                                             
            expect(eth_pool_pre.add(freezeEthAmount)
                .add(freezeEthAmount))
                .to.equal(eth_pool_pos);

            expect(token_pool_pre.add(freezeTokenAmount)).to.equal(token_pool_pos);

            expect(NToken_pool_pre.add(freezeNTokenAmount)).to.equal(NToken_pool_pos);

            expect(nest_pool_pre.add(freezeNestAmount)).to.equal(nest_pool_pos);

            // check funds about reward
            expect(eth_reward_NestStaking_pre
                .add(eth_reward_NestStakingOfNToken))
                .to.equal(eth_reward_NestStaking_pos);

            expect(eth_reward_NestDao_pre
                .add(eth_reward_NestDAoOfNToken)
                .add(eth_reward_NestDaoOfNestToken))
                .to.equal(eth_reward_NestDao_pos);

            expect(eth_reward_NestStakingOfNToken_pre
                .add(eth_reward_NestStakingOfNToken))
                .to.equal(eth_reward_NestStakingOfNToken_pos);

            expect(eth_reward_NestDAoOfNToken_pre
                .add(eth_reward_NestDAoOfNToken))
                .to.equal(eth_reward_NestDAoOfNToken_pos);

            expect(eth_reward_NestDaoOfNestToken_pre
                .add(eth_reward_NestDaoOfNestToken))
                .to.equal(eth_reward_NestDaoOfNestToken_pos);

        });
        

        // check the price sheet 
        it('should update price sheet and create price sheet correctly !', async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const tokenAmountPerEth = WBTC(100);
            const NTokenAmountPerEth = NWBTC(500);
            const NToken = await NestPool.getNTokenFromToken(token);
            const h = await provider.getBlockNumber();


            const index0 = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index0.sub(1));

            // check the token priceSheet
            expect(postSheet.miner).to.equal(userA.address);
            expect(postSheet.height).to.equal(h);
            expect(postSheet.ethNum).to.equal(ethNum);
            expect(postSheet.remainNum).to.equal(ethNum);
            expect(postSheet.level).to.equal(0);
            expect(postSheet.typ).to.equal(3);
            expect(postSheet.state).to.equal(1);
            expect(postSheet.nestNum1k).to.equal(1);
            expect(postSheet.ethNumBal).to.equal(ethNum);
            expect(postSheet.tokenNumBal).to.equal(ethNum);
            expect(postSheet.tokenAmountPerEth).to.equal(tokenAmountPerEth);


            const index1 = await NestMining.lengthOfPriceSheets(NToken);
            const postSheet1 = await NestMining.fullPriceSheet(NToken, index1.sub(1));

            // check the token priceSheet
            expect(postSheet1.miner).to.equal(userA.address);
            expect(postSheet1.height).to.equal(h);
            expect(postSheet1.ethNum).to.equal(ethNum);
            expect(postSheet1.remainNum).to.equal(ethNum);
            expect(postSheet1.level).to.equal(0);
            expect(postSheet1.typ).to.equal(4);
            expect(postSheet1.state).to.equal(1);
            expect(postSheet1.nestNum1k).to.equal(1);
            expect(postSheet1.ethNumBal).to.equal(ethNum);
            expect(postSheet1.tokenNumBal).to.equal(ethNum);
            expect(postSheet1.tokenAmountPerEth).to.equal(NTokenAmountPerEth);

        });


        //===========================  biteToken bite USDT(Token)  level <= 3  =============================//
        //==================================================================================================//

        // check biteToken function
        it('should bite token correctly!', async () => {
            //================preparation============================//
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const token = _C_USDT;
            const biteNum = 10;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const newTokenAmountPerEth = USDT(300);
            const msgValue = ETH(BigN(50));

            // post2 
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            // record funds before biting token
            const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pre = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pre = await CUSDT.balanceOf(userB.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            // biteToken function
            const index0 = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index0.sub(1));
            //========================================================//

            await NestMining.connect(userB).biteToken(token, index0.sub(1), biteNum, newTokenAmountPerEth, { value: msgValue });


            // calculate fee
            const ethFee = ETH(BigN(biteNum).mul(biteFeeRate)).div(1000);
            const newNestNum1k = BigN(postSheet.nestNum1k).mul(biteNum).div(postSheet.ethNum).mul(2);
            const freezeNestAmount = NEST(newNestNum1k.mul(1000));
            const freezeEthAmount = ETH(BigN(biteNum).mul(3));
            const freezeTokenAmount = BigN(biteNum).mul(2).mul(newTokenAmountPerEth)
                .sub(BigN(biteNum).mul(postSheet.tokenAmountPerEth));

            // record funds after biting token
            const userB_nest_in_exAddress_pos = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pos = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pos = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pos = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pos = await CUSDT.balanceOf(userB.address);

            const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pos = await provider.getBalance(_C_NestStaking);

            // check funds
            expect(userB_eth_pool_pre.add(msgValue)
                .sub(ethFee)
                .sub(freezeEthAmount))
                .to.equal(userB_eth_pool_pos);

            expect(userB_token_in_exAddress_pre.add(userB_token_pool_pre)
                .sub(freezeTokenAmount))
                .to.equal(userB_token_in_exAddress_pos.add(userB_token_pool_pos));

            expect(userB_nest_in_exAddress_pre.add(userB_nest_pool_pre)
                .sub(freezeNestAmount))
                .to.equal(userB_nest_in_exAddress_pos.add(userB_nest_pool_pos));

            expect(eth_pool_pre.add(freezeEthAmount)).to.equal(eth_pool_pos);
            expect(token_pool_pre.add(freezeTokenAmount)).to.equal(token_pool_pos);
            expect(nest_pool_pre.add(freezeNestAmount)).to.equal(nest_pool_pos);

            expect(eth_reward_pre.add(ethFee)).to.equal(eth_reward_pos);


            // check new priceSheet
            const h = await provider.getBlockNumber();

            const index1 = await NestMining.lengthOfPriceSheets(token);
            const newPostSheet = await NestMining.fullPriceSheet(token, index1.sub(1));
            const updatedpostSheet = await NestMining.fullPriceSheet(token, index1.sub(2));

            expect(newPostSheet.miner).to.equal(userB.address);
            expect(newPostSheet.height).to.equal(h);
            expect(newPostSheet.ethNum).to.equal(BigN(biteNum).mul(biteInflateFactor));
            expect(newPostSheet.remainNum).to.equal(BigN(biteNum).mul(biteInflateFactor));
            expect(newPostSheet.level).to.equal(BigN(postSheet.level).add(1));
            expect(newPostSheet.typ).to.equal(postSheet.typ);
            expect(newPostSheet.state).to.equal(1);
            expect(newPostSheet.ethNumBal).to.equal(BigN(biteNum).mul(biteInflateFactor));
            expect(newPostSheet.tokenNumBal).to.equal(BigN(biteNum).mul(biteInflateFactor));
            expect(newPostSheet.nestNum1k).to.equal(newNestNum1k);
            expect(newPostSheet.tokenAmountPerEth).to.equal(newTokenAmountPerEth);

            // check the updated priceSheet
            expect(updatedpostSheet.state).to.equal(2);// bitten
            expect(updatedpostSheet.ethNumBal).to.equal(BigN(postSheet.ethNumBal).add(biteNum));
            expect(updatedpostSheet.tokenNumBal).to.equal(BigN(postSheet.tokenNumBal).sub(biteNum));
            expect(updatedpostSheet.remainNum).to.equal(BigN(postSheet.remainNum).sub(biteNum));
        });

    
         //==============================  biteToken bite NSET(NToken) level <= 3 ============================//
         //===================================================================================================//
 
         // check biteNToken function
         it('should bite ntoken correctly!', async () => {
             //================preparation==================//
             const token = _C_USDT;
             const params = await NestMining.parameters();
             const ethNum = params.miningEthUnit;
             const biteFeeRate = params.biteFeeRate;
             const biteNum = 10;
             const tokenAmountPerEth = USDT(450);
             const NTokenAmountPerEth = NEST(1000);
             const newNTokenAmountPerEth = NEST(800);
             const msgValue = ETH(BigN(50));
             const NToken = await NestPool.getNTokenFromToken(token);
 
             // post2 
             await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
             //=========================================//
 
             // record funds before biting token
             const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address);
             const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
             const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
 
             const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
             const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
 
             const eth_reward_NestStakingOfNToken_pre = await NestStaking.totalRewards(NToken);
             const eth_reward_pre = await provider.getBalance(_C_NestStaking);
 
             // biteToken function
             const index0 = await NestMining.lengthOfPriceSheets(NToken);
             const postSheet = await NestMining.fullPriceSheet(NToken, index0.sub(1));
 
             await NestMining.connect(userB).biteToken(NToken, index0.sub(1), biteNum, newNTokenAmountPerEth, { value: msgValue });
 
 
             // calculate fee
             const ethFee = ETH(BigN(biteNum).mul(biteFeeRate)).div(1000);
             const newNestNum1k = BigN(postSheet.nestNum1k).mul(biteNum).mul(2).div(postSheet.ethNum);
             const freezeNestAmount = NEST(newNestNum1k.mul(1000));
             const freezeEthAmount = ETH(BigN(biteNum).mul(3));
             const freezeNTokenAmount = BigN(biteNum).mul(2).mul(newNTokenAmountPerEth).sub(BigN(biteNum).mul(postSheet.tokenAmountPerEth));
 
 
             // record funds after biting token
             const userB_nest_in_exAddress_pos = await NestToken.balanceOf(userB.address);
             const userB_nest_pool_pos = await NestPool.balanceOfNestInPool(userB.address);
             const userB_eth_pool_pos = await NestPool.balanceOfEthInPool(userB.address);
             //const userB_token_in_exAddress_pos = await CUSDT.balanceOf(userB.address);
 
             const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
             const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);
             const eth_reward_pos = await provider.getBalance(_C_NestStaking);
             const eth_reward_NestStakingOfNToken_pos = await NestStaking.totalRewards(NToken);
 
 
             // check funds
             expect(userB_eth_pool_pre.add(msgValue)
                 .sub(ethFee)
                 .sub(freezeEthAmount))
                 .to.equal(userB_eth_pool_pos);
 
             expect(userB_nest_in_exAddress_pre.add(userB_nest_pool_pre)
                 .sub(freezeNestAmount).sub(freezeNTokenAmount))
                 .to.equal(userB_nest_in_exAddress_pos.add(userB_nest_pool_pos));
 
             expect(eth_pool_pre.add(freezeEthAmount)).to.equal(eth_pool_pos);
 
             expect(nest_pool_pre.add(freezeNestAmount).add(freezeNTokenAmount)).to.equal(nest_pool_pos);
 
             expect(eth_reward_pre.add(ethFee)).to.equal(eth_reward_pos);
             expect(eth_reward_NestStakingOfNToken_pre.add(ethFee)).to.equal(eth_reward_NestStakingOfNToken_pos);
 
 
             // check new priceSheet
             const h = await provider.getBlockNumber();
 
             const index1 = await NestMining.lengthOfPriceSheets(NToken);
             const newPostSheet = await NestMining.fullPriceSheet(NToken, index1.sub(1));
             const updatedpostSheet = await NestMining.fullPriceSheet(NToken, index1.sub(2));
 
             expect(newPostSheet.miner).to.equal(userB.address);
             expect(newPostSheet.height).to.equal(h);
             expect(newPostSheet.ethNum).to.equal(BigN(biteNum).mul(2));
             expect(newPostSheet.remainNum).to.equal(BigN(biteNum).mul(2));
             expect(newPostSheet.level).to.equal(BigN(postSheet.level).add(1));
             expect(newPostSheet.typ).to.equal(postSheet.typ);
             expect(newPostSheet.state).to.equal(1);
             expect(newPostSheet.ethNumBal).to.equal(BigN(biteNum).mul(2));
             expect(newPostSheet.tokenNumBal).to.equal(BigN(biteNum).mul(2));
             expect(newPostSheet.nestNum1k).to.equal(newNestNum1k);
             expect(newPostSheet.tokenAmountPerEth).to.equal(newNTokenAmountPerEth);
 
             // check the updated priceSheet
             expect(updatedpostSheet.state).to.equal(2);// bitten
             expect(updatedpostSheet.ethNumBal).to.equal(BigN(postSheet.ethNumBal).add(biteNum));
             expect(updatedpostSheet.tokenNumBal).to.equal(BigN(postSheet.tokenNumBal).sub(biteNum));
             expect(updatedpostSheet.remainNum).to.equal(BigN(postSheet.remainNum).sub(biteNum));
 
         });


        //===========================  biteToken bite ETH(Token) level <= 3 ================================//
        //===================================================================================================//

        // check biteToken function
        it('should bite token correctly!', async () => {
            //================preparation============================//
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const biteNestInflateFactor = params.biteNestInflateFactor;
            const token = _C_USDT;
            const biteNum = 10;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const newTokenAmountPerEth = USDT(500);
            const msgValue = ETH(BigN(50));
            const NToken = await NestPool.getNTokenFromToken(token);


            // post2 
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            // record funds before biting token
            const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pre = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pre = await CUSDT.balanceOf(userB.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);
            const eth_reward_NestStakingOfNToken_pre = await NestStaking.totalRewards(NToken);


            // biteToken function
            const index0 = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index0.sub(1));
            //========================================================//

            await NestMining.connect(userB).biteEth(token, index0.sub(1), biteNum, newTokenAmountPerEth, { value: msgValue });


            // calculate fee
            const ethFee = ETH(BigN(biteNum).mul(biteFeeRate)).div(1000);

            const newNestNum1k = BigN(postSheet.nestNum1k)
                                 .mul(params.biteNestInflateFactor)
                                 .mul(biteNum)
                                 .div(postSheet.ethNum);

            const freezeNestAmount = NEST(newNestNum1k.mul(1000));

            const freezeEthAmount = ETH(BigN(params.biteInflateFactor).mul(biteNum).sub(biteNum));

            const freezeTokenAmount = BigN(biteNum).mul(params.biteInflateFactor).mul(newTokenAmountPerEth)
                .add(BigN(biteNum).mul(postSheet.tokenAmountPerEth));

            // record funds after biting token
            const userB_nest_in_exAddress_pos = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pos = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pos = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pos = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pos = await CUSDT.balanceOf(userB.address);

            const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pos = await provider.getBalance(_C_NestStaking);
            const eth_reward_NestStakingOfNToken_pos = await NestStaking.totalRewards(NToken);


            // check funds
            expect(userB_eth_pool_pre.add(msgValue)
                .sub(ethFee)
                .sub(freezeEthAmount))
                .to.equal(userB_eth_pool_pos);

            expect(userB_token_in_exAddress_pre.add(userB_token_pool_pre)
                .sub(freezeTokenAmount))
                .to.equal(userB_token_in_exAddress_pos.add(userB_token_pool_pos));

            expect(userB_nest_in_exAddress_pre.add(userB_nest_pool_pre)
                .sub(freezeNestAmount))
                .to.equal(userB_nest_in_exAddress_pos.add(userB_nest_pool_pos));

            expect(eth_pool_pre.add(freezeEthAmount)).to.equal(eth_pool_pos);
            expect(token_pool_pre.add(freezeTokenAmount)).to.equal(token_pool_pos);
            expect(nest_pool_pre.add(freezeNestAmount)).to.equal(nest_pool_pos);

            expect(eth_reward_pre.add(ethFee)).to.equal(eth_reward_pos);
            expect(eth_reward_NestStakingOfNToken_pre.add(ethFee)).to.equal(eth_reward_NestStakingOfNToken_pos);



            // check new priceSheet
            const h = await provider.getBlockNumber();

            const index1 = await NestMining.lengthOfPriceSheets(token);
            const newPostSheet = await NestMining.fullPriceSheet(token, index1.sub(1));
            const updatedpostSheet = await NestMining.fullPriceSheet(token, index1.sub(2));

            expect(newPostSheet.miner).to.equal(userB.address);
            expect(newPostSheet.height).to.equal(h);
            expect(newPostSheet.ethNum).to.equal(BigN(biteNum).mul(biteInflateFactor));
            expect(newPostSheet.remainNum).to.equal(BigN(biteNum).mul(biteInflateFactor));
            expect(newPostSheet.level).to.equal(BigN(postSheet.level).add(1));
            expect(newPostSheet.typ).to.equal(postSheet.typ);
            expect(newPostSheet.state).to.equal(1);
            expect(newPostSheet.ethNumBal).to.equal(BigN(biteNum).mul(biteInflateFactor));
            expect(newPostSheet.tokenNumBal).to.equal(BigN(biteNum).mul(biteInflateFactor));
            expect(newPostSheet.nestNum1k).to.equal(newNestNum1k);
            expect(newPostSheet.tokenAmountPerEth).to.equal(newTokenAmountPerEth);

            // check the updated priceSheet
            expect(updatedpostSheet.state).to.equal(2);// bitten
            expect(updatedpostSheet.ethNumBal).to.equal(BigN(postSheet.ethNumBal).sub(biteNum));
            expect(updatedpostSheet.tokenNumBal).to.equal(BigN(postSheet.tokenNumBal).add(biteNum));
            expect(updatedpostSheet.remainNum).to.equal(BigN(postSheet.remainNum).sub(biteNum));
        });


        //================== close priceSheeet (level == 0, token = WBTC, timed out) ================//
        //===========================================================================================//

        it("can close priceSheeet correctly !", async () => {

            //=======================  preparation  ==================//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const nestStakedNum1k = params.nestStakedNum1k;
            const priceDurationBlock = params.priceDurationBlock;
            const MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE = 95;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);

            // post (in order to calculate reward)
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            // to calculate this post reward
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });


            // record funds before posting
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            //==========================================//

            await goBlocks(provider, priceDurationBlock);

            // close priceSheet 
            await NestMining.connect(userA).close(token, index.sub(1));

            // calculate fee
            const rate = MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE;
            const reward = NWBTC(BigN(postSheet.ethNum).mul(4).mul(rate)).div(postSheet.ethNum).div(100);

            const unfreezeEthAmount = ETH(BigN(postSheet.ethNumBal));

            const unfreezeTokenAmount = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);

            const unfreezeNestAmount = NEST(BigN(nestStakedNum1k).mul(1000));


            // record funds after posting
            const userA_nest_pool_post = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_post = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_post = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_post = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_post = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_post = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_post = await NestPool.balanceOfEthInPool(_C_NestPool);

            // check funds
            // check userA
            expect(userA_eth_pool_pre.add(unfreezeEthAmount)).to.equal(userA_eth_pool_post);

            expect(userA_token_pool_pre.add(unfreezeTokenAmount)).to.equal(userA_token_pool_post);

            expect(userA_nest_pool_pre.add(unfreezeNestAmount)).to.equal(userA_nest_pool_post);

            expect(userA_NToken_pool_pre.add(reward)).to.equal(userA_NToken_pool_post);

            // check nestPool
            expect(eth_pool_pre.sub(unfreezeEthAmount)).to.equal(eth_pool_post);
            expect(token_pool_pre.sub(unfreezeTokenAmount)).to.equal(token_pool_post);
            expect(nest_pool_pre.sub(unfreezeNestAmount)).to.equal(nest_pool_post);

        });

        // check the updated priceSheet when doing close function
        it('should update priceSheet correctly', async () => {
            const token = _C_WBTC;

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            // check the updated PriceSheet
            expect(postSheet.ethNumBal).to.equal(0);

            expect(postSheet.tokenNumBal).to.equal(0);

            expect(postSheet.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet.state).to.equal(0);

        });


        //========= close priceSheeet (level == 0, token = USDT, Ntoken = nest, timed out) ==========//
        //===========================================================================================//

        it("can close priceSheeet correctly !", async () => {

            //=======================  preparation  ==================//
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const nestStakedNum1k = params.nestStakedNum1k;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const msgValue = ETH(BigN(50));
            const MINER_NEST_REWARD_PERCENTAGE = 80;

            const NToken = await NestPool.getNTokenFromToken(token);
            expect(NToken).to.equal(_C_NestToken);



            // post2 (in order to calculate reward)
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            // to calculate this post reward
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            // record funds before closing
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            //const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            //==========================================//

            await goBlocks(provider, priceDurationBlock);

            // close priceSheet 
            await NestMining.connect(userA).close(token, index.sub(1));

            // calculate fee
            const rate = MINER_NEST_REWARD_PERCENTAGE;
            const reward = NEST(BigN(postSheet.ethNum).mul(400).mul(rate)).div(postSheet.ethNum).div(100);

            const unfreezeEthAmount = ETH(BigN(postSheet.ethNumBal));

            const unfreezeTokenAmount = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);

            const unfreezeNestAmount = NEST(BigN(nestStakedNum1k).mul(1000));


            // record funds after posting
            const userA_nest_pool_post = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_post = await NestPool.balanceOfTokenInPool(userA.address, token);
            //const userA_NToken_pool_post = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_post = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_post = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_post = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_post = await NestPool.balanceOfEthInPool(_C_NestPool);

            // check funds
            // check userA
            expect(userA_eth_pool_pre.add(unfreezeEthAmount)).to.equal(userA_eth_pool_post);

            expect(userA_token_pool_pre.add(unfreezeTokenAmount)).to.equal(userA_token_pool_post);

            expect(userA_nest_pool_pre.add(unfreezeNestAmount).add(reward)).to.equal(userA_nest_pool_post);


            // check nestPool
            expect(eth_pool_pre.sub(unfreezeEthAmount)).to.equal(eth_pool_post);
            expect(token_pool_pre.sub(unfreezeTokenAmount)).to.equal(token_pool_post);
            expect(nest_pool_pre.sub(unfreezeNestAmount)).to.equal(nest_pool_post);


            //====== close priceSheet where ntoken = nest =============//

            // record funds before closing  Ntoken
            const userA_nest_pre = await NestPool.balanceOfNestInPool(userA.address);
            //const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const ntoken_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, NToken);
            const eth_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const index_ntoken = await NestMining.lengthOfPriceSheets(NToken);
            const postSheet_ntoken = await NestMining.fullPriceSheet(NToken, index_ntoken.sub(1));

            // close priceSheet 
            await NestMining.connect(userA).close(NToken, index_ntoken.sub(1));

            // calculate fee
            const unfreezeEthAmount_ntoken = ETH(BigN(postSheet_ntoken.ethNumBal));
 
            const unfreezeNTokenAmount_ntoken = BigN(postSheet_ntoken.tokenNumBal).mul(postSheet_ntoken.tokenAmountPerEth);
 
            const unfreezeNestAmount_ntoken = NEST(BigN(nestStakedNum1k).mul(1000));
 
 
            // record funds after posting
            const userA_nest_pos = await NestPool.balanceOfNestInPool(userA.address);
            //const userA_token_pos = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pos = await NestPool.balanceOfEthInPool(userA.address);
 
            const nest_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
            const ntoken_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, NToken);
            const eth_pos = await NestPool.balanceOfEthInPool(_C_NestPool);
 
            // check funds
            // check userA
            expect(userA_eth_pre.add(unfreezeEthAmount_ntoken)).to.equal(userA_eth_pos);
 
            expect(userA_NToken_pre.add(unfreezeNTokenAmount_ntoken).add(unfreezeNestAmount_ntoken)).to.equal(userA_NToken_pos);
 
            expect(userA_nest_pre.add(unfreezeNestAmount_ntoken).add(unfreezeNTokenAmount_ntoken)).to.equal(userA_nest_pos);
 
            // check nestPool
            expect(eth_pre.sub(unfreezeEthAmount_ntoken)).to.equal(eth_pos);
            expect(ntoken_pre.sub(unfreezeNTokenAmount_ntoken).sub(unfreezeNestAmount_ntoken)).to.equal(ntoken_pos);
            expect(nest_pre.sub(unfreezeNestAmount_ntoken).sub(unfreezeNTokenAmount_ntoken)).to.equal(nest_pos);           
        });

        // check the updated priceSheet when doing close function, token = USDT
        it('should update priceSheet correctly', async () => {
            const token = _C_USDT;
            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            // check the updated PriceSheet
            expect(postSheet.ethNumBal).to.equal(0);

            expect(postSheet.tokenNumBal).to.equal(0);

            expect(postSheet.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet.state).to.equal(0);
        });

         // check the updated priceSheet when doing close function, ntoken = NEST
         it('should update priceSheet correctly', async () => {
            const ntoken = _C_NestToken;
            const index = await NestMining.lengthOfPriceSheets(ntoken);
            const postSheet = await NestMining.fullPriceSheet(ntoken, index.sub(1));

            // check the updated PriceSheet
            expect(postSheet.ethNumBal).to.equal(0);

            expect(postSheet.tokenNumBal).to.equal(0);

            expect(postSheet.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet.state).to.equal(0);
        });

         //======================== close priceSheeet (level == 0, bited out) ========================//
         //===========================================================================================//
 
         it("can close priceSheeet correctly !", async () => {
 
             //=======================  preparation  ==================//
             const token = _C_USDT;
             const params = await NestMining.parameters();
             const ethNum = params.miningEthUnit;
             const nestStakedNum1k = params.nestStakedNum1k;
             const biteNum = ethNum;
             const tokenAmountPerEth = USDT(450);
             const NTokenAmountPerEth = NEST(1000);
             const newTokenAmountPerEth = USDT(300);
             const msgValue = ETH(BigN(50));
             const MINER_NEST_REWARD_PERCENTAGE = 80;
 
             // post2 (in order to calculate reward)
             await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
             
             // to calculate this post reward
             await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
 
             const index = await NestMining.lengthOfPriceSheets(token);
         
             await NestMining.connect(userB).biteToken(token, index.sub(1), biteNum, newTokenAmountPerEth, { value: msgValue });
             
             const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));
             
             // record funds before posting
             const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
             const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
             const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);
 
             const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
             const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
             const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
 
             //==========================================//
 
             // close priceSheet 
             await NestMining.connect(userA).close(token, index.sub(1));
 
             // calculate fee
             const rate = MINER_NEST_REWARD_PERCENTAGE;
             const reward = NEST(BigN(postSheet.ethNum).mul(400).mul(rate)).div(postSheet.ethNum).div(100);
 
             const unfreezeEthAmount = ETH(BigN(postSheet.ethNumBal));
 
             const unfreezeTokenAmount = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);
 
             const unfreezeNestAmount = NEST(BigN(nestStakedNum1k).mul(1000));
 
 
             // record funds after posting
             const userA_nest_pool_post = await NestPool.balanceOfNestInPool(userA.address);
             const userA_token_pool_post = await NestPool.balanceOfTokenInPool(userA.address, token);
             const userA_eth_pool_post = await NestPool.balanceOfEthInPool(userA.address);
 
             const nest_pool_post = await NestPool.balanceOfNestInPool(_C_NestPool);
             const token_pool_post = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
             const eth_pool_post = await NestPool.balanceOfEthInPool(_C_NestPool);
 
             // check funds
             // check userA
             expect(userA_eth_pool_pre.add(unfreezeEthAmount)).to.equal(userA_eth_pool_post);
 
             expect(userA_token_pool_pre.add(unfreezeTokenAmount)).to.equal(userA_token_pool_post);
 
             expect(userA_nest_pool_pre.add(unfreezeNestAmount).add(reward)).to.equal(userA_nest_pool_post);
 
 
             // check nestPool
             expect(eth_pool_pre.sub(unfreezeEthAmount)).to.equal(eth_pool_post);
             expect(token_pool_pre.sub(unfreezeTokenAmount)).to.equal(token_pool_post);
             expect(nest_pool_pre.sub(unfreezeNestAmount)).to.equal(nest_pool_post);
 
         });
 
         // check the updated priceSheet when doing close function
         it('should update priceSheet correctly', async () => {
             const token = _C_USDT;
             const index = await NestMining.lengthOfPriceSheets(token);
             const postSheet = await NestMining.fullPriceSheet(token, index.sub(2));
 
             // check the updated PriceSheet
             expect(postSheet.ethNumBal).to.equal(0);
 
             expect(postSheet.tokenNumBal).to.equal(0);
 
             expect(postSheet.nestNum1k).to.equal(0);
 
             // PRICESHEET_STATE_CLOSED == 0
             expect(postSheet.state).to.equal(0);
         });
         


       //============= close priceSheeet (quotations generated by posting, timed out) ==============//
       //===========================================================================================//

       it("can close priceSheeet correctly !", async () => {

           //=======================  preparation  ==================//
           const token = _C_USDT;
           const params = await NestMining.parameters();
           const ethNum = params.miningEthUnit;
           const priceDurationBlock = params.priceDurationBlock;
           const biteNum = ethNum;
           const tokenAmountPerEth = USDT(450);
           const NTokenAmountPerEth = NEST(1000);
           const newTokenAmountPerEth = USDT(300);
           const msgValue = ETH(BigN(50));
   
           //  post2 
           await NestMining.connect(userB).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

           const index = await NestMining.lengthOfPriceSheets(token);

           // price sheet will be generated here 
           await NestMining.connect(userA).biteToken(token, index.sub(1), biteNum, newTokenAmountPerEth, { value: msgValue });

           // timed out
           await goBlocks(provider, priceDurationBlock);

           // read the new price sheet
           const index1 = await NestMining.lengthOfPriceSheets(token);
           const postSheet = await NestMining.fullPriceSheet(token, index1.sub(1));

           // record funds before posting
           const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
           const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
           const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

           const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
           const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
           const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

           //==========================================//

           // close priceSheet 
           await NestMining.connect(userA).close(token, index1.sub(1));


           // calculate fee
           const unfreezeEthAmount = ETH(BigN(postSheet.ethNumBal));

           const unfreezeTokenAmount = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);

           const unfreezeNestAmount = NEST(BigN(postSheet.nestNum1k).mul(1000));


           // record funds after posting
           const userA_nest_pool_post = await NestPool.balanceOfNestInPool(userA.address);
           const userA_token_pool_post = await NestPool.balanceOfTokenInPool(userA.address, token);
           const userA_eth_pool_post = await NestPool.balanceOfEthInPool(userA.address);

           const nest_pool_post = await NestPool.balanceOfNestInPool(_C_NestPool);
           const token_pool_post = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
           const eth_pool_post = await NestPool.balanceOfEthInPool(_C_NestPool);

           // check funds
           // check userA
           expect(userA_eth_pool_pre.add(unfreezeEthAmount)).to.equal(userA_eth_pool_post);

           expect(userA_token_pool_pre.add(unfreezeTokenAmount)).to.equal(userA_token_pool_post);

           expect(userA_nest_pool_pre.add(unfreezeNestAmount)).to.equal(userA_nest_pool_post);


           // check nestPool
           expect(eth_pool_pre.sub(unfreezeEthAmount)).to.equal(eth_pool_post);
           expect(token_pool_pre.sub(unfreezeTokenAmount)).to.equal(token_pool_post);
           expect(nest_pool_pre.sub(unfreezeNestAmount)).to.equal(nest_pool_post);

       });

       // check the updated priceSheet when doing close function
       it('should update priceSheet correctly', async () => {
           const token = _C_USDT;
           const index = await NestMining.lengthOfPriceSheets(token);
           const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

           // check the updated PriceSheet
           expect(postSheet.ethNumBal).to.equal(0);

           expect(postSheet.tokenNumBal).to.equal(0);

           expect(postSheet.nestNum1k).to.equal(0);

           // PRICESHEET_STATE_CLOSED == 0
           expect(postSheet.state).to.equal(0);
       });
    

        //============= close priceSheeet (bited out the price sheet which generated by posting) ==============//
        //=====================================================================================================//

        it("can close priceSheeet correctly !", async () => {

            //=======================  preparation  ==================//
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteNum = ethNum;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const TokenAmountPerEth1 = USDT(300);
            const msgValue = ETH(BigN(50));
    
            //  post2 
            await NestMining.connect(userB).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            const index = await NestMining.lengthOfPriceSheets(token);

            // price sheet will be generated here 
            await NestMining.connect(userA).biteToken(token, index.sub(1), biteNum, TokenAmountPerEth1, { value: msgValue });
            
            // read the new price sheet
            const index1 = await NestMining.lengthOfPriceSheets(token);
            const postSheet1 = await NestMining.fullPriceSheet(token, index1.sub(1));

            const newBiteNum = postSheet1.remainNum;
            const newTokenAmountPerEth = USDT(200);

            // bite out the new price sheet
            await NestMining.connect(userB).biteToken(token, index1.sub(1), newBiteNum, newTokenAmountPerEth, { value: msgValue });

            const postSheet = await NestMining.fullPriceSheet(token, index1.sub(1));


            // record funds before posting
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            //==========================================//

            // close priceSheet 
            await NestMining.connect(userA).close(token, index1.sub(1));


            // calculate fee
            const unfreezeEthAmount = ETH(BigN(postSheet.ethNumBal));

            const unfreezeTokenAmount = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);

            const unfreezeNestAmount = NEST(BigN(postSheet.nestNum1k).mul(1000));


            // record funds after posting
            const userA_nest_pool_post = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_post = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_eth_pool_post = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_post = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_post = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_post = await NestPool.balanceOfEthInPool(_C_NestPool);

            // check funds
            // check userA
            expect(userA_eth_pool_pre.add(unfreezeEthAmount)).to.equal(userA_eth_pool_post);

            expect(userA_token_pool_pre.add(unfreezeTokenAmount)).to.equal(userA_token_pool_post);

            expect(userA_nest_pool_pre.add(unfreezeNestAmount)).to.equal(userA_nest_pool_post);


            // check nestPool
            expect(eth_pool_pre.sub(unfreezeEthAmount)).to.equal(eth_pool_post);
            expect(token_pool_pre.sub(unfreezeTokenAmount)).to.equal(token_pool_post);
            expect(nest_pool_pre.sub(unfreezeNestAmount)).to.equal(nest_pool_post);

        });

        // check the updated priceSheet when doing close function
        it('should update priceSheet correctly', async () => {
            const token = _C_USDT;
            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(2));

            // check the updated PriceSheet
            expect(postSheet.ethNumBal).to.equal(0);

            expect(postSheet.tokenNumBal).to.equal(0);

            expect(postSheet.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet.state).to.equal(0);
        });


      //======= closeList priceSheeet (two price sheets belong to userA and one price sheet belongs to userB, timed out) ===========//
      //============================================================================================================================//

      it('should closeList priceSheet correctly', async () => {

          //====================================  preparation =======================//

          it('should post ETH-WBTC from userA correctly!', async () => {
              const token = _C_WBTC;
              const params = await NestMining.parameters();
              const ethNum = params.miningEthUnit;
              const tokenAmountPerEth = WBTC(30);
              const msgValue = ETH(BigN(50));
  
              // in order to calculate reward
              await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

              // post
              await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
          });

          it('should post2 ETH-USDT from userA correctly!', async () => {
              const token = _C_WBTC;
              const params = await NestMining.parameters();
              const ethNum = params.miningEthUnit;
              const tokenAmountPerEth = WBTC(30);
              const msgValue = ETH(BigN(50));

              // post
              await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

          });

          it('should post ETH-WBTC from userB correctly!', async () => {

              const token = _C_WBTC;
              const params = await NestMining.parameters();
              const ethNum = params.miningEthUnit;
              const tokenAmountPerEth = WBTC(30);
              const msgValue = ETH(BigN(50));

              // post 
              await NestMining.connect(userB).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

          });

          //======================================================================================//

          it('should colseList price sheet correctly!', async () => {
              const token = _C_WBTC;
              const params = await NestMining.parameters();
              const nestStakedNum1k = params.nestStakedNum1k;

              const priceDurationBlock = params.priceDurationBlock;
              const MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE = 95;
              const index = await NestMining.lengthOfPriceSheets(token);

              const NToken = await NestPool.getNTokenFromToken(token);

              const userA_post_priceSheet = await NestMining.fullPriceSheet(token, index.sub(3));

              const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
              const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
              const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
              const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

              const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
              const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
              const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

              await goBlocks(provider, priceDurationBlock);

              await NestMining.connect(userA).closeList(token, [index.sub(3), index.sub(2), index.sub(1)]);

              // calculate funds about post from userA
              const reward_userA = NWBTC(BigN(userA_post_priceSheet.ethNum)
                  .mul(4).mul(MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE))
                  .div(userA_post_priceSheet.ethNum).div(100);

              const unfreezeEthAmount_userA = ETH(BigN(userA_post_priceSheet.ethNumBal));

              const unfreezeTokenAmount_userA = BigN(userA_post_priceSheet.tokenNumBal).mul(userA_post_priceSheet.tokenAmountPerEth);

              const unfreezeNestAmount_userA = NEST(BigN(nestStakedNum1k).mul(1000));

              // record funds after closing
              const userA_nest_pool_pos = await NestPool.balanceOfNestInPool(userA.address);
              const userA_token_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, token);
              const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);
              const userA_eth_pool_pos = await NestPool.balanceOfEthInPool(userA.address);

              const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
              const token_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
              const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);

              // check funds
              expect(userA_eth_pool_pre.add(unfreezeEthAmount_userA.mul(2))).to.equal(userA_eth_pool_pos);

              expect(userA_token_pool_pre.add(unfreezeTokenAmount_userA.mul(2))).to.equal(userA_token_pool_pos);

              expect(userA_nest_pool_pre.add(unfreezeNestAmount_userA.mul(2))).to.equal(userA_nest_pool_pos);

              expect(userA_NToken_pool_pre.add(reward_userA.mul(2))).to.equal(userA_NToken_pool_pos);

              // check nestPool
              expect(eth_pool_pre.sub(unfreezeEthAmount_userA.mul(2))).to.equal(eth_pool_pos);
              expect(token_pool_pre.sub(unfreezeTokenAmount_userA.mul(2))).to.equal(token_pool_pos);
              expect(nest_pool_pre.sub(unfreezeNestAmount_userA.mul(2))).to.equal(nest_pool_pos);


              //===================== check price sheet ================//  
              const userA_post_priceSheet_pos = await NestMining.fullPriceSheet(token, index.sub(3));

              const userA_post2_priceSheet_pos = await NestMining.fullPriceSheet(token, index.sub(2));

              const userB_post_priceSheet_pos = await NestMining.fullPriceSheet(token, index.sub(1));

              // check the updated userA_post_priceSheet
              expect(userA_post_priceSheet_pos.ethNumBal).to.equal(0);

              expect(userA_post_priceSheet_pos.tokenNumBal).to.equal(0);

              expect(userA_post_priceSheet_pos.nestNum1k).to.equal(0);

              // PRICESHEET_STATE_CLOSED == 0
              expect(userA_post_priceSheet_pos.state).to.equal(0);


              // check the updated PriceSheet2
              expect(userA_post2_priceSheet_pos.ethNumBal).to.equal(0);

              expect(userA_post2_priceSheet_pos.tokenNumBal).to.equal(0);

              expect(userA_post2_priceSheet_pos.nestNum1k).to.equal(0);

              // PRICESHEET_STATE_CLOSED == 0
              expect(userA_post2_priceSheet_pos.state).to.equal(0);
 
            });

        });


        //======= closeList priceSheeet (two price sheets belong to userA, but one is uncertained ) ===========//
        //=====================================================================================================//

        it("can closeList priceSheeet correctly !", async () => {

            //=======================  preparation  ==================//
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const nestStakedNum1k = params.nestStakedNum1k;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const msgValue = ETH(BigN(50));
            const MINER_NEST_REWARD_PERCENTAGE = 80;

            const NToken = await NestPool.getNTokenFromToken(token);


            // post2 (in order to calculate reward)
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            // to calculate this post reward
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            
            await goBlocks(provider, priceDurationBlock);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            // record funds before posting
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            //const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            //==========================================//

            const index = await NestMining.lengthOfPriceSheets(token);

            const postSheet = await NestMining.fullPriceSheet(token, index.sub(2));
            //const postSheet_second = await NestMining.fullPriceSheet(token, index.sub(1));

            // close priceSheet 
            await NestMining.connect(userA).closeList(token, [index.sub(1), index.sub(2)]);

            // calculate fee
            const rate = MINER_NEST_REWARD_PERCENTAGE;
            const reward = NEST(BigN(postSheet.ethNum).mul(400).mul(rate)).div(postSheet.ethNum).div(100);

            const unfreezeEthAmount = ETH(BigN(postSheet.ethNumBal));

            const unfreezeTokenAmount = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);

            const unfreezeNestAmount = NEST(BigN(nestStakedNum1k).mul(1000));


            // record funds after posting
            const userA_nest_pool_post = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_post = await NestPool.balanceOfTokenInPool(userA.address, token);
            //const userA_NToken_pool_post = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_post = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_post = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_post = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_post = await NestPool.balanceOfEthInPool(_C_NestPool);

            // check funds
            // check userA
            expect(userA_eth_pool_pre.add(unfreezeEthAmount)).to.equal(userA_eth_pool_post);

            expect(userA_token_pool_pre.add(unfreezeTokenAmount)).to.equal(userA_token_pool_post);

            expect(userA_nest_pool_pre.add(unfreezeNestAmount).add(reward)).to.equal(userA_nest_pool_post);


            // check nestPool
            expect(eth_pool_pre.sub(unfreezeEthAmount)).to.equal(eth_pool_post);
            expect(token_pool_pre.sub(unfreezeTokenAmount)).to.equal(token_pool_post);
            expect(nest_pool_pre.sub(unfreezeNestAmount)).to.equal(nest_pool_post);
        });

        // check the updated priceSheet when doing close function
        it('should update priceSheet correctly', async () => {
            const token = _C_USDT;
            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(2));

            // check the updated PriceSheet
            expect(postSheet.ethNumBal).to.equal(0);

            expect(postSheet.tokenNumBal).to.equal(0);

            expect(postSheet.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet.state).to.equal(0);
        });


        //======= closeList priceSheeet ( two price sheets belong to userA, but one generated by biting ) =====//
        //=====================================================================================================//

        it("can close priceSheeet correctly !", async () => {

            //=======================  preparation  ==================//
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const biteNum = ethNum;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const newTokenAmountPerEth = USDT(300);
            const msgValue = ETH(BigN(50));
            const MINER_NEST_REWARD_PERCENTAGE = 80;


            //  post2 
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
           
            const index = await NestMining.lengthOfPriceSheets(token);
            
            // price sheet will be generated here 
            await NestMining.connect(userA).biteToken(token, index.sub(1), biteNum, newTokenAmountPerEth, { value: msgValue });

            // updated  postSheet
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            // timed out
            await goBlocks(provider, priceDurationBlock);

            // read the new price sheet
            const index1 = await NestMining.lengthOfPriceSheets(token);
            const postSheet1 = await NestMining.fullPriceSheet(token, index1.sub(1));

            // record funds before posting
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            //==========================================//

            // close priceSheet 
            await NestMining.connect(userA).closeList(token, [index.sub(1), index1.sub(1)]);


            // calculate  post funds
            const unfreezeEthAmount_post = ETH(BigN(postSheet.ethNumBal));

            const unfreezeTokenAmount_post = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);

            const unfreezeNestAmount_post = NEST(BigN(postSheet.nestNum1k).mul(1000));

            // calculate bite funds
            const unfreezeEthAmount_bite = ETH(BigN(postSheet1.ethNumBal));

            const unfreezeTokenAmount_bite = BigN(postSheet1.tokenNumBal).mul(postSheet1.tokenAmountPerEth);

            const unfreezeNestAmount_bite = NEST(BigN(postSheet1.nestNum1k).mul(1000));

            // calculate fee
            const rate = MINER_NEST_REWARD_PERCENTAGE;
            const reward = NEST(BigN(postSheet.ethNum).mul(400).mul(rate)).div(postSheet.ethNum).div(100);


            // calculate total funds
            const unfreezeEthAmount = unfreezeEthAmount_post.add(unfreezeEthAmount_bite);
            const unfreezeTokenAmount = unfreezeTokenAmount_post.add(unfreezeTokenAmount_bite);
            const unfreezeNestAmount = unfreezeNestAmount_post.add(unfreezeNestAmount_bite);


            // record funds after posting
            const userA_token_pool_post = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_eth_pool_post = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_post = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_post = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_post = await NestPool.balanceOfEthInPool(_C_NestPool);

            // check funds
            // check userA
            expect(userA_eth_pool_pre.add(unfreezeEthAmount)).to.equal(userA_eth_pool_post);

            expect(userA_token_pool_pre.add(unfreezeTokenAmount)).to.equal(userA_token_pool_post);


            // check nestPool
            expect(eth_pool_pre.sub(unfreezeEthAmount)).to.equal(eth_pool_post);
            expect(token_pool_pre.sub(unfreezeTokenAmount)).to.equal(token_pool_post);
            expect(nest_pool_pre.sub(unfreezeNestAmount)).to.equal(nest_pool_post);

        });

        // check the updated priceSheet when doing close function
        it('should update priceSheet correctly', async () => {
            const token = _C_USDT;
            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));
            const postSheet1 = await NestMining.fullPriceSheet(token, index.sub(2));

            // check the updated PriceSheet
            expect(postSheet.ethNumBal).to.equal(0);

            expect(postSheet.tokenNumBal).to.equal(0);

            expect(postSheet.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet.state).to.equal(0);

            // check the updated PriceSheet
            expect(postSheet1.ethNumBal).to.equal(0);

            expect(postSheet1.tokenNumBal).to.equal(0);

            expect(postSheet1.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet1.state).to.equal(0);
        });


        //================================== closeList priceSheeet ( ntoken ) =================================//
        //=====================================================================================================//

        it("can close priceSheeet correctly !", async () => {

            //=======================  preparation  ==================//
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const biteNum = ethNum;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const newTokenAmountPerEth = USDT(300);
            const msgValue = ETH(BigN(50));
            const MINER_NEST_REWARD_PERCENTAGE = 80;

            const NToken = await NestPool.getNTokenFromToken(token);



            //  post2 
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
           
            const index = await NestMining.lengthOfPriceSheets(NToken);
            
            // price sheet will be generated here 
            await NestMining.connect(userA).biteToken(NToken, index.sub(1), biteNum, NEST(500), { value: msgValue });

            // updated  postSheet
            const postSheet = await NestMining.fullPriceSheet(NToken, index.sub(1));

            // timed out
            await goBlocks(provider, priceDurationBlock);

            // read the new price sheet
            const index1 = await NestMining.lengthOfPriceSheets(NToken);
            const postSheet1 = await NestMining.fullPriceSheet(NToken, index1.sub(1));

            //==========================================//

            // close priceSheet 
            await NestMining.connect(userA).closeList(NToken, [index.sub(1), index1.sub(1)]);

        });

        //===================================== closeAndWithdraw ETH-WBTC =====================================//
        //=====================================================================================================//

        it("can close priceSheeet correctly !", async () => {

            //=======================  preparation  ==================//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const nestStakedNum1k = params.nestStakedNum1k;
            const priceDurationBlock = params.priceDurationBlock;
            const miningFeeRate = params.miningFeeRate;
            const MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE = 95;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);

            // clear the nestpool funds (espically eth)
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            const h0 = await provider.getBlockNumber();

            const index0 = await NestMining.lengthOfPriceSheets(token);

            await goBlocks(provider, priceDurationBlock);

            await NestMining.connect(userA).closeAndWithdraw(token, index0.sub(1));

            // to calculate this post reward
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue, gasPrice: 0 });

            const h1 = await provider.getBlockNumber();

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);

            const userA_nest_in_exAddress_pre = await NestToken.balanceOf(userA.address);
            const userA_token_in_exAddress_pre = await CWBTC.balanceOf(userA.address);
            const userA_eth_in_exAddress_pre = await provider.getBalance(userA.address);

            //==========================================//

            await goBlocks(provider, priceDurationBlock);

            // close priceSheet 
            await NestMining.connect(userA).closeAndWithdraw(token, index.sub(1), {gasPrice: 0 });

            // calculate fee
            const ethFee = ETH(BigN(ethNum).mul(miningFeeRate)).div(1000);
            const rate = MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE;
            const reward = NWBTC(BigN(postSheet.ethNum).mul(4).mul(rate).mul(BigN(h1).sub(h0))).div(postSheet.ethNum).div(100);
            const unfreezeEthAmount = ETH(BigN(postSheet.ethNumBal));
            const unfreezeTokenAmount = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);
            const unfreezeNestAmount = NEST(BigN(nestStakedNum1k).mul(1000));

            const userA_nest_in_exAddress_pos = await NestToken.balanceOf(userA.address);
            const userA_token_in_exAddress_pos = await CWBTC.balanceOf(userA.address);
            const userA_eth_in_exAddress_pos = await provider.getBalance(userA.address);
            const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);

            expect(userA_eth_in_exAddress_pre.add(unfreezeEthAmount)).to.equal(userA_eth_in_exAddress_pos);
            expect(userA_token_in_exAddress_pre.add(unfreezeTokenAmount)).to.equal(userA_token_in_exAddress_pos);
            expect(userA_nest_in_exAddress_pre.add(unfreezeNestAmount)).to.equal(userA_nest_in_exAddress_pos);
            expect(userA_NToken_pool_pre.add(reward)).to.equal(userA_NToken_pool_pos);

        });

        // check the updated priceSheet when doing close function
        it('should update priceSheet correctly', async () => {
            const token = _C_WBTC;

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            // check the updated PriceSheet
            expect(postSheet.ethNumBal).to.equal(0);

            expect(postSheet.tokenNumBal).to.equal(0);

            expect(postSheet.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet.state).to.equal(0);

        });

    });

});