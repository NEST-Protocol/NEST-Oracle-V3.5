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
        it("can post correctly !", async () => {
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
            // const balance = await CNWBTC.balanceOf(NToken);
            //console.log("NToken = ",NToken);
            // record funds before posting
            const userA_nest_in_exAddress_pre = await NestToken.balanceOf(userA.address);
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);
            const userA_token_in_exAddress_pre = await CWBTC.balanceOf(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

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

            const eth_reward_NestStakingOfNToken_pos = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pos = await NestDAO.totalETHRewards(NToken);
            const eth_reward_NestDaoOfNestToken_pos = await NestDAO.totalETHRewards(NestToken.address);


            // check funds
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

        });

        // check the price sheet when address == _C_WBTC
        it('should update price sheet correctly !', async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const tokenAmountPerEth = WBTC(30);
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


        //=============================== post2 ETH-USDT ETH-NEST ===================================//
        //===========================================================================================//

        // calculate funds of post2 function
        it("can post2 correctly !", async () => {
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
            //console.log("NToken_pool_pre = ", NToken_pool_pre.toString());
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const eth_reward_NestStakingOfNToken_pre = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pre = await NestDAO.totalETHRewards(NToken);

            const eth_reward_NestStaking_pre = await provider.getBalance(_C_NestStaking);
            const eth_reward_NestDao_pre = await provider.getBalance(_C_NestDAO);

            // post 
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            

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

        // check the price sheet when address == _C_WBTC and index == 0
        it('should update price sheet correctly !', async () => {
            const token = _C_USDT;
            const ethNum = 10;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const h = await provider.getBlockNumber();

            const NToken = await NestPool.getNTokenFromToken(token);

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

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


        //================== close priceSheeet (level == 0, token = WBTC, timed out) ================//
        //===========================================================================================//

        // calculate funds and check state about close function 
        it('can close priceSheet correctly !', async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE = 95;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));
            const NToken = await NestPool.getNTokenFromToken(token);
        
            // post (in order to calculate reward)
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            // to calculate this post reward
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            await goBlocks(provider, priceDurationBlock);


            // record funds before closing
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            // close priceSheet 
            await NestMining.connect(userA).close(token, index.sub(1));

            // calculate fee
            const rate = MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE;
            const reward = NWBTC(BigN(postSheet.ethNum).mul(4).mul(rate)).div(postSheet.ethNum).div(100);

            const unfreezeEthAmount = ETH(BigN(postSheet.ethNumBal));
            const unfreezeTokenAmount = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);
            const unfreezeNestAmount = NEST(BigN(1000));


            // record funds after closing
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


        //====================================  closeList price sheet  =======================================//
        //====================================================================================================//

        // calculate funds and check state about closeList function 
        it('can close priceSheet correctly by closeList function !', async () => {
            //============preparation============//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth1 = WBTC(30);
            const tokenAmountPerEth2 = WBTC(20);
            const msgValue = ETH(BigN(50));
            const MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE = 95;
            const NToken = await NestPool.getNTokenFromToken(token);

            
            // in order to calculate reward
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth1, { value: msgValue });

            // post two priceSheet by the same user and token address
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth1, { value: msgValue });
            
            const index1 = await NestMining.lengthOfPriceSheets(token);
            const postSheet1 = await NestMining.fullPriceSheet(token, index1.sub(1));

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth2, { value: msgValue });
            
            const index2 = await NestMining.lengthOfPriceSheets(token);
            const postSheet2 = await NestMining.fullPriceSheet(token, index2.sub(1));

            await goBlocks(provider, priceDurationBlock);
            //===================================//

            // record funds before closing
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            // closeList function
            await NestMining.connect(userA).closeList(token, [index1.sub(1), index2.sub(1)]);

            // calculate fee 
            const reward1 = NWBTC(BigN(postSheet1.ethNum)
                                 .mul(4).mul(MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE))
                                 .div(postSheet1.ethNum).div(100);

            const reward2 = NWBTC(BigN(postSheet2.ethNum)
                                 .mul(4).mul(MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE))
                                 .div(postSheet2.ethNum).div(100);

            const totalReward = reward1.add(reward2);

            const unfreezeEthAmount1 = ETH(postSheet1.ethNumBal);
            const unfreezeEthAmount2 = ETH(postSheet2.ethNumBal);
            const totalUnfreezeEthAmount = unfreezeEthAmount1.add(unfreezeEthAmount2);

            const unfreezeTokenAmount1 = BigN(postSheet1.tokenNumBal).mul(postSheet1.tokenAmountPerEth);
            const unfreezeTokenAmount2 = BigN(postSheet2.tokenNumBal).mul(postSheet2.tokenAmountPerEth);
            const totalUnfreezeTokenAmount2 = unfreezeTokenAmount1.add(unfreezeTokenAmount2);

            const totalUnfreezeNestAmount = NEST(2000);

            // record funds after closing
            const userA_nest_pool_pos = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pos = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);

            // check funds
            expect(userA_eth_pool_pre.add(totalUnfreezeEthAmount)).to.equal(userA_eth_pool_pos);

            expect(userA_token_pool_pre.add(totalUnfreezeTokenAmount2)).to.equal(userA_token_pool_pos);

            expect(userA_nest_pool_pre.add(totalUnfreezeNestAmount)).to.equal(userA_nest_pool_pos);

            expect(userA_NToken_pool_pre.add(totalReward)).to.equal(userA_NToken_pool_pos);

            // check nestPool
            expect(eth_pool_pre.sub(totalUnfreezeEthAmount)).to.equal(eth_pool_pos);
            expect(token_pool_pre.sub(totalUnfreezeTokenAmount2)).to.equal(token_pool_pos);
            expect(nest_pool_pre.sub(totalUnfreezeNestAmount)).to.equal(nest_pool_pos);

        });

        // check the updated priceSheet when doing closeList function
        it('should update priceSheet correctly', async () => {   
            const token = _C_WBTC;
            const index = await NestMining.lengthOfPriceSheets(token);

            const postSheet1 = await NestMining.fullPriceSheet(token, index.sub(2));
            const postSheet2 = await NestMining.fullPriceSheet(token, index.sub(1));

            // check the updated PriceSheet1
            expect(postSheet1.ethNumBal).to.equal(0);

            expect(postSheet1.tokenNumBal).to.equal(0);

            expect(postSheet1.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet1.state).to.equal(0);


            // check the updated PriceSheet2
            expect(postSheet2.ethNumBal).to.equal(0);

            expect(postSheet2.tokenNumBal).to.equal(0);

            expect(postSheet2.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(postSheet2.state).to.equal(0);
        });


        //=======================================  bite token (WBTC) =========================================//
        //====================================================================================================//

        // check biteToken function
        it('should bite token correctly!', async () => {

            //================preparation==================//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteNum = ethNum;
            const tokenAmountPerEth = WBTC(30);
            const newTokenAmountPerEth = WBTC(20);
            const msgValue = ETH(BigN(50));

            // post priceSheet
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));
            //=========================================//
            // record funds before biting token
            const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pre = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pre = await CWBTC.balanceOf(userB.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            // biteToken function
            await NestMining.connect(userB).biteToken(token, index.sub(1), biteNum, newTokenAmountPerEth, { value: msgValue });

            const index1 = await NestMining.lengthOfPriceSheets(token);
            const newPostSheet = await NestMining.fullPriceSheet(token, index1.sub(1));
            const postSheet1 = await NestMining.fullPriceSheet(token, index1.sub(2));

            // calculate fee
            const ethFee = ETH(BigN(biteNum)).div(1000);
            const newNestNum1k = BigN(postSheet.nestNum1k).mul(biteNum).mul(2).div(postSheet.ethNum).mul(2);
            const freezeNestAmount = NEST(newNestNum1k.mul(1000));
            const freezeEthAmount = ETH(BigN(biteNum).mul(3));
            const freezeTokenAmount = BigN(biteNum).mul(2).mul(newTokenAmountPerEth).sub(BigN(biteNum).mul(postSheet.tokenAmountPerEth));

            // record funds after biting token
            const userB_nest_in_exAddress_pos = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pos = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pos = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pos = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pos = await CWBTC.balanceOf(userB.address);

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
            expect(newPostSheet.tokenAmountPerEth).to.equal(newTokenAmountPerEth);

            // check the updated priceSheet
            expect(postSheet1.state).to.equal(2);// bitten
            expect(postSheet1.ethNumBal).to.equal(BigN(postSheet.ethNumBal).add(biteNum));
            expect(postSheet1.tokenNumBal).to.equal(BigN(postSheet.tokenNumBal).sub(biteNum));
            expect(postSheet1.remainNum).to.equal(BigN(postSheet.remainNum).sub(biteNum));

        });


        //=========================================  bite ETH (WBTC) =========================================//
        //====================================================================================================//

        // check biteEth function
        it('should bite eth correctly!', async () => {
            //================preparation==================//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteNum = ethNum;
            const tokenAmountPerEth = WBTC(30);
            const newTokenAmountPerEth = WBTC(20);
            const msgValue = ETH(BigN(50));

            // post priceSheet
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));
            //=========================================//
            // record funds before biting eth
            const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pre = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pre = await CWBTC.balanceOf(userB.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            // biteToken function
            await NestMining.connect(userB).biteEth(token, index.sub(1), biteNum, newTokenAmountPerEth, { value: msgValue });
            
            const index1 = await NestMining.lengthOfPriceSheets(token);
            const newPostSheet = await NestMining.fullPriceSheet(token, index1.sub(1));
            const postSheet1 = await NestMining.fullPriceSheet(token, index.sub(1));

            // calculate fee
            const ethFee = ETH(BigN(biteNum)).div(1000);

            const newNestNum1k = BigN(postSheet.nestNum1k).mul(biteNum).mul(2).div(postSheet.ethNum).mul(2);
            const freezeNestAmount = NEST(newNestNum1k.mul(1000));
            const freezeEthAmount = ETH(BigN(biteNum));
            const freezeTokenAmount = BigN(biteNum).mul(2).mul(newTokenAmountPerEth).add(BigN(biteNum).mul(postSheet.tokenAmountPerEth));

            // record funds after biting eth
            const userB_nest_in_exAddress_pos = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pos = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pos = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pos = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pos = await CWBTC.balanceOf(userB.address);

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

            expect(newPostSheet.miner).to.equal(userB.address);
            expect(newPostSheet.height).to.equal(h);
            expect(newPostSheet.ethNum).to.equal(BigN(biteNum).mul(2));
            expect(newPostSheet.remainNum).to.equal(BigN(biteNum).mul(2));
            expect(newPostSheet.level).to.equal(BigN(postSheet.level).add(1));
            expect(newPostSheet.typ).to.equal(postSheet.typ);
            expect(newPostSheet.state).to.equal(1);// posted
            expect(newPostSheet.ethNumBal).to.equal(BigN(biteNum).mul(2));
            expect(newPostSheet.tokenNumBal).to.equal(BigN(biteNum).mul(2));
            expect(newPostSheet.nestNum1k).to.equal(newNestNum1k);
            expect(newPostSheet.tokenAmountPerEth).to.equal(newTokenAmountPerEth);

            // check the updated priceSheet
            expect(postSheet1.state).to.equal(2);// bitten
            expect(postSheet1.ethNumBal).to.equal(BigN(postSheet.ethNumBal).sub(biteNum));
            expect(postSheet1.tokenNumBal).to.equal(BigN(postSheet.tokenNumBal).add(biteNum));
            expect(postSheet1.remainNum).to.equal(BigN(postSheet.remainNum).sub(biteNum));

        });


        //================================  check latestPriceOf function  =========================================//
        //=========================================================================================================//

        // check latestPriceOf function
        it('should query latestPriceOf function correctly!', async () => {
            //============preparation============//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
        
            const tokenAmountPerEth1 = WBTC(30);
            const tokenAmountPerEth2 = WBTC(20);
            const tokenAmountPerEth3 = WBTC(10);

            const msgValue = ETH(BigN(100));
            const NToken = await NestPool.getNTokenFromToken(token);

            // post two priceSheet by the same user and token address
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth1, { value: msgValue });
            const index1 = await NestMining.lengthOfPriceSheets(token);
            const postSheet1 = await NestMining.fullPriceSheet(token, index1.sub(1));
            
            await NestMining.connect(userB).post(token, ethNum, tokenAmountPerEth2, { value: msgValue });
            const index2 = await NestMining.lengthOfPriceSheets(token);
            const postSheet2 = await NestMining.fullPriceSheet(token, index2.sub(1));
            

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth3, { value: msgValue });
            const index3 = await NestMining.lengthOfPriceSheets(token);
            const postSheet3 = await NestMining.fullPriceSheet(token, index3.sub(1));
          
            await goBlocks(provider, 26);
            //===================================//

            // latestPriceOf function
            const price = await NestMining.latestPriceOf(token);

            // check the result of query
            expect(price.ethAmount).to.equal(ETH(BigN(postSheet3.remainNum)));

            expect(price.tokenAmount).to.equal((postSheet3.tokenAmountPerEth).mul(postSheet3.remainNum));

            expect(price.blockNum).to.equal(BigN(postSheet3.height).add(priceDurationBlock));

        });


        //===================================  check priceOf function  ============================================//
        //=========================================================================================================//
       
        it("should return correct query result", async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(10);

            const msgValue = ETH(BigN(100));

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userB).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userB).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
        
            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            await goBlocks(provider, priceDurationBlock);

            const ethAmount = ETH(postSheet.remainNum);
            const tokenAmount = BigN(postSheet.remainNum).mul(postSheet.tokenAmountPerEth);

            // Storing data to a structure
            await NestMining.stat(token);

            // priceOf function
            const pi = await NestMining.connect(_C_NestQuery).priceOf(token);

            // check data
            expect(pi.ethAmount).to.equal(ethAmount);
            expect(pi.tokenAmount).to.equal(tokenAmount);
            expect(pi.blockNum).to.equal(BigN(postSheet.height).add(priceDurationBlock));
        });


        //===============================  check priceOfTokenAtHeight function  ===================================//
        //=========================================================================================================//

        // Given a block height and token address, query the data from the quotation table in the block 
        // where the previous most recent price for this block was determined.
        it("should return correct result!", async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(10);

            const msgValue = ETH(BigN(100));

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
        
            const h = provider.getBlockNumber();

            await goBlocks(provider, BigN(priceDurationBlock).add(1));


            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            const ethAmount = ETH(BigN(postSheet.remainNum));
            const tokenAmount = BigN(postSheet.remainNum).mul(postSheet.tokenAmountPerEth);
            const blockNum = postSheet.height;

            // priceOf function, in this case, the parameter of atHeight is big enough
            const data = await NestMining.priceOfTokenAtHeight(token, h);

            // check data 
            expect(data.ethAmount).to.equal(ethAmount);
            expect(data.tokenAmount).to.equal(tokenAmount);
            expect(data.height).to.equal(blockNum);

        });


        // Given a block height and token address, query the data from the quotation table in the block 
        // where the previous most recent price for this block was determined.
        it("should return correct result!", async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(10);

            const msgValue = ETH(BigN(100));

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            const index = await NestMining.lengthOfPriceSheets(token);

            await goBlocks(provider, BigN(priceDurationBlock).add(1));
            
            const h = provider.getBlockNumber();
           
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            const ethAmount = ETH(BigN(postSheet.remainNum));
            const tokenAmount = BigN(postSheet.remainNum).mul(postSheet.tokenAmountPerEth);
            const blockNum = postSheet.height;

            // priceOf function, the height of the block where the most recent quote is located is 70
            const data = await NestMining.priceOfTokenAtHeight(token, h);

            // check data 
            expect(data.ethAmount).to.equal(ethAmount);
            expect(data.tokenAmount).to.equal(tokenAmount);
            expect(data.height).to.equal(blockNum);
        });


        //===============================  check priceListOfToken function  ===================================//
        //=========================================================================================================//

        // Return a consecutive price list for a token 
        it("should read data correctly!", async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(10);

            const msgValue = ETH(BigN(100));

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            await goBlocks(provider, BigN(priceDurationBlock).add(1));

            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet1 = await NestMining.fullPriceSheet(token, index.sub(1));
            const height1 = postSheet1.height;
            const ethAmount1 = ETH(BigN(postSheet1.remainNum));
            const tokenAmount1 = BigN(postSheet1.remainNum).mul(postSheet1.tokenAmountPerEth);

            const postSheet2 = await NestMining.fullPriceSheet(token, index.sub(2));
            const height2 = postSheet2.height;
            const ethAmount2 = ETH(BigN(postSheet2.remainNum));
            const tokenAmount2 = BigN(postSheet2.remainNum).mul(postSheet2.tokenAmountPerEth);

            // priceOf function, in this case, the parameter of atHeight is big enough
            const re = await NestMining.priceListOfToken(token, 2);

            // check data 
            expect(re.data[0]).to.equal(BigN(height1).add(priceDurationBlock));
            expect(re.data[1]).to.equal(ethAmount1);
            expect(re.data[2]).to.equal(tokenAmount1);

            expect(re.data[3]).to.equal(BigN(height2).add(priceDurationBlock));
            expect(re.data[4]).to.equal(ethAmount2);
            expect(re.data[5]).to.equal(tokenAmount2);

            expect(re.bn).to.equal(BigN(height1).add(priceDurationBlock));

        });


        //===============================  check unVerifiedSheetList function  ===================================//
        //========================================================================================================//

        // Starting with the most recent block containing a quotation, 
        // find quotations for which the price has not yet been determined 
        // in the direction of decreasing block height and record 
        // check unVerifiedSheetList function
        it('should search correctly!', async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(10);

            const msgValue = ETH(BigN(100));

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            
            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));

            // Only one quotation price is not determined now
            const sheet = await NestMining.unVerifiedSheetList(token);

            expect(sheet.length).to.equal(1);
            expect(postSheet.height).to.equal(sheet[0].height);
            expect(postSheet.miner).to.equal(sheet[0].miner);
            expect(postSheet.tokenAmountPerEth).to.equal(sheet[0].tokenAmountPerEth);

            await goBlocks(provider, BigN(priceDurationBlock).add(1));

            // all prices have been set
            const sheet1 = await NestMining.unVerifiedSheetList(token);

            // the result of search is empty, there are no tables 
            expect(sheet1.length).to.equal(0);

        });

        //===============================  check unClosedSheetListOf function  ===================================//
        //=========================this function must depend on the previous function=============================//

        // this function must depend on the previous function
        it("should return correct result!", async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(10);

            const msgValue = ETH(BigN(100));
        
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userB).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            
            const index = await NestMining.lengthOfPriceSheets(token);
            
            //await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            await goBlocks(provider, BigN(priceDurationBlock).add(1));
           
            await NestMining.connect(userA).close(token, index.sub(5));
            await NestMining.connect(userA).close(token, index.sub(4));
            await NestMining.connect(userA).close(token, index.sub(3));


            // _sheet.miner == miner && 
            // (_sheet.state == MiningV1Data.PRICESHEET_STATE_POSTED 
            //   || _sheet.state == MiningV1Data.PRICESHEET_STATE_BITTEN)
            const sheet = await NestMining.unClosedSheetListOf(userA.address, token, index.sub(1), 5);

            const postSheet1 = await NestMining.fullPriceSheet(token, index.sub(2));

            const postSheet2 = await NestMining.fullPriceSheet(token, index.sub(1));
            //console.log("postSheet2 = ",postSheet2);

            // check data

            // priceSheet.state == 0(closed)
            expect(sheet[0].height).to.equal(0);
            expect(sheet[2].height).to.equal(0);
            expect(sheet[3].height).to.equal(0);
            expect(sheet[4].height).to.equal(0);

            // it depend on the previous operation
            expect(sheet[1].height).to.equal(postSheet1.height);
        
        });


        //=================================  check sheetListOf function  =========================================//
        //=========================this function must depend on the previous function=============================//

        // sheetListOf function
        it("should show the result correctly!", async () => {
            const token = _C_WBTC;
            const index = await NestMining.lengthOfPriceSheets(token);

            // _sheet.miner == miner 
            const sheet = await NestMining.sheetListOf(userA.address, token, index.sub(1), 5);


            const postSheet0 = await NestMining.fullPriceSheet(token, index.sub(5));
            //console.log("postSheet2 = ",postSheet2);
            const postSheet1 = await NestMining.fullPriceSheet(token, index.sub(4));
            const postSheet2 = await NestMining.fullPriceSheet(token, index.sub(3));
            const postSheet3 = await NestMining.fullPriceSheet(token, index.sub(2));

            // this pricesheet belongs to userB
            const postSheet4 = await NestMining.fullPriceSheet(token, index.sub(1));

            // check data

            // meet the conditions 
            expect(sheet[4].height).to.equal(postSheet0.height);
            expect(sheet[3].height).to.equal(postSheet1.height);
            expect(sheet[2].height).to.equal(postSheet2.height);
            expect(sheet[1].height).to.equal(postSheet3.height);

            // because userA != userB
            expect(sheet[0].height).to.equal(0);

        });

        // check view function which located at nestpool
        it("should return result correct", async () => {
            
            // attention : assetsList(uint256 len, address[] memory tokenList)
            // len < = length(tokenList) + 1
            await NestPool.connect(userA).assetsList(2, [_C_USDT, _C_WBTC]);
            
            
            await NestPool.addrOfNTokenController();

            await NestPool.addressOfBurnedNest();

            await NestPool.getMinerEthAndToken(userA.address, _C_USDT);
            
            
            await NestPool.getMinerNest(userA.address);
        })
    });
});