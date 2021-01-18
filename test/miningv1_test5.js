const { expect } = require('chai');
const { WeiPerEther, BigNumber } = require("ethers");
const { BN, time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const { usdtdec, wbtcdec, nestdec, ethdec,
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64, HBTC, NHBTC } = require("../scripts/utils.js");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployHBTC, deployNHBTC,
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

        CHBTC = await deployHBTC();
        CNHBTC = await deployNHBTC(owner);

        let contracts = {
            USDT: CUSDT,
            WBTC: CWBTC,
            NEST: NestToken,
            IterableMapping: IterableMapping,
            NN: NNToken,
            NWBTC: CNWBTC,
            HBTC: CHBTC,
            NHBTC: CNHBTC
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
        _C_HBTC = CHBTC.address;
        _C_NHBTC = CNHBTC.address;
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

        await NestPool.setNTokenToToken(_C_HBTC, _C_NHBTC);
        await CNHBTC.setOfferMain(_C_NestMining);

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
            expect(totalSupply).to.equal(expectedTotalSupply);
        })

        it("should transfer correctly", async () => {
            const amount = NEST("2000000");
            console.log(`>> [TRAN] NEST(${amount.div(ethdec)}) | deployer ==> userA`);
            await NestToken.transfer(userA.address, amount);
            const balanceOfUserA = await NestToken.balanceOf(userA.address);
            expect(balanceOfUserA).to.equal(amount);
        })

        it("should transfer correctly", async () => {
            const amount = NEST("2000000");
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

    describe('HBTC Token', function () {

        it("userA should approve correctly", async () => {
            await CHBTC.transfer(userA.address, HBTC('1000000'));
            await CHBTC.connect(userA).approve(_C_NestPool, HBTC(1000000));
            await CHBTC.connect(userA).approve(_C_NTokenController, HBTC(1));
        })

        it("userB should approve correctly", async () => {
            await CHBTC.transfer(userB.address, HBTC('1000000'));
            await CHBTC.connect(userB).approve(_C_NestPool, HBTC(1000000));
            await CHBTC.connect(userB).approve(_C_NTokenController, HBTC(1));
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

    describe('test boundary conditions', function () {

        //================ post ETH-HBTC (priceSheet1),then biteToken (priceSheet2),then bite pricesheet2==========//

        it("should post priceSheet correctly", async () => {
            const token = _C_HBTC;
            const params = await NestMining.parameters();
            const nestStakedNum1k = params.nestStakedNum1k;
            const ethNum = params.miningEthUnit;
            const miningFeeRate = params.miningFeeRate;
            const tokenAmountPerEth = HBTC(30);
            const msgValue = ETH(BigN(50));

            const MINING_NTOKEN_FEE_DIVIDEND_RATE = 60;
            const MINING_NTOKEN_FEE_DAO_RATE = 20;
            const MINING_NTOKEN_FEE_NEST_DAO_RATE = 20;

            // address(token) ==> address(NToken)
            // await NTokenController.connect(userA).open(token);

            const NToken = await NestPool.getNTokenFromToken(token);
            const balance = await CNHBTC.balanceOf(owner.address);

            // record funds before posting
            const userA_nest_in_exAddress_pre = await NestToken.balanceOf(userA.address);
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);
            const userA_token_in_exAddress_pre = await CHBTC.balanceOf(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            //const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            const eth_reward_NestStakingOfNToken_pre = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pre = await NestDAO.totalETHRewards(NToken);
            const eth_reward_NestDaoOfNestToken_pre = await NestDAO.totalETHRewards(NestToken.address);

            const owner_ntoken_pool_pre = await NestPool.balanceOfTokenInPool(owner.address, NToken);


            // post 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            // calculate fee
            const ethFee = ETH(BigN(ethNum).mul(miningFeeRate)).div(10000);
            const eth_reward_NestStakingOfNToken = ethFee.mul(MINING_NTOKEN_FEE_DIVIDEND_RATE).div(100);
            const eth_reward_NestDAoOfNToken = ethFee.mul(MINING_NTOKEN_FEE_DAO_RATE).div(100);
            const eth_reward_NestDaoOfNestToken = ethFee.mul(MINING_NTOKEN_FEE_NEST_DAO_RATE).div(100);

            const latestBlockHeight = await NestMining.latestMinedHeight();
            const balance1 = await CNHBTC.balanceOf(owner.address);

            const freezeEthAmount = ETH(BigN(ethNum));
            const freezeTokenAmount = BigN(tokenAmountPerEth).mul(ethNum);
            const freezeNestAmount = NEST(BigN(nestStakedNum1k).mul(1000));

            // record funds after posting
            const userA_nest_in_exAddress_pos = await NestToken.balanceOf(userA.address);
            const userA_nest_pool_pos = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_eth_pool_pos = await NestPool.balanceOfEthInPool(userA.address);
            const userA_token_in_exAddress_pos = await CHBTC.balanceOf(userA.address);
            const owner_ntoken_pool_pos = await NestPool.balanceOfTokenInPool(owner.address, NToken);



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

            expect()

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

        // check bite token level == 1
        it("should bite token correctly", async () => {

            //================preparation============================//
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const token = _C_HBTC;
            const biteNum = 10;
            const tokenAmountPerEth = HBTC(40);
            const newTokenAmountPerEth = HBTC(30);
            const msgValue = ETH(BigN(50));

            // post2 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            // record funds before biting token
            const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pre = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pre = await CHBTC.balanceOf(userB.address);

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
            const newNestNum1k = BigN(postSheet.nestNum1k).mul(biteNum).mul(2).div(postSheet.ethNum);
            const freezeNestAmount = NEST(newNestNum1k.mul(1000));
            const freezeEthAmount = ETH(BigN(biteNum).mul(3));
            const freezeTokenAmount = BigN(biteNum).mul(2).mul(newTokenAmountPerEth)
                .sub(BigN(biteNum).mul(postSheet.tokenAmountPerEth));

            // record funds after biting token
            const userB_nest_in_exAddress_pos = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pos = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pos = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pos = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pos = await CHBTC.balanceOf(userB.address);

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

        // bite token which generated by biteToken
        it("should bite token correctly", async () => {
            //================preparation============================//
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const token = _C_HBTC;
            const biteNum1 = 10;
            const biteNum2 = 20;
            const tokenAmountPerEth = HBTC(35);
            const newTokenAmountPerEth1 = HBTC(30);
            const newTokenAmountPerEth2 = HBTC(40);
            const msgValue = ETH(BigN(100));

            // post2 
            await NestMining.connect(userB).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            const index0 = await NestMining.lengthOfPriceSheets(token);

            await NestMining.connect(userA).biteToken(token, index0.sub(1), biteNum1, newTokenAmountPerEth1, { value: msgValue });


            // record funds before biting token
            const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pre = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pre = await CHBTC.balanceOf(userB.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            // biteToken function
            const index1 = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index1.sub(1));
            //========================================================//

            await NestMining.connect(userB).biteToken(token, index1.sub(1), biteNum2, newTokenAmountPerEth2, { value: msgValue });

            // calculate fee
            const ethFee = ETH(BigN(biteNum2).mul(biteFeeRate)).div(1000);
            const newNestNum1k = BigN(postSheet.nestNum1k).mul(biteNum2).mul(2).div(postSheet.ethNum);
            const freezeNestAmount = NEST(newNestNum1k.mul(1000));
            const freezeEthAmount = ETH(BigN(biteNum2).mul(3));
            const freezeTokenAmount = BigN(biteNum2).mul(2).mul(newTokenAmountPerEth2)
                .sub(BigN(biteNum2).mul(postSheet.tokenAmountPerEth));

            // record funds after biting token
            const userB_nest_in_exAddress_pos = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pos = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pos = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pos = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pos = await CHBTC.balanceOf(userB.address);

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

            const index2 = await NestMining.lengthOfPriceSheets(token);
            const newPostSheet = await NestMining.fullPriceSheet(token, index2.sub(1));
            const updatedpostSheet = await NestMining.fullPriceSheet(token, index2.sub(2));

            expect(newPostSheet.miner).to.equal(userB.address);
            expect(newPostSheet.height).to.equal(h);
            expect(newPostSheet.ethNum).to.equal(BigN(biteNum2).mul(biteInflateFactor));
            expect(newPostSheet.remainNum).to.equal(BigN(biteNum2).mul(biteInflateFactor));
            expect(newPostSheet.level).to.equal(BigN(postSheet.level).add(1));
            expect(newPostSheet.typ).to.equal(postSheet.typ);
            expect(newPostSheet.state).to.equal(1);
            expect(newPostSheet.ethNumBal).to.equal(BigN(biteNum2).mul(biteInflateFactor));
            expect(newPostSheet.tokenNumBal).to.equal(BigN(biteNum2).mul(biteInflateFactor));
            expect(newPostSheet.nestNum1k).to.equal(newNestNum1k);
            expect(newPostSheet.tokenAmountPerEth).to.equal(newTokenAmountPerEth2);

            // check the updated priceSheet
            expect(updatedpostSheet.state).to.equal(2);// bitten
            expect(updatedpostSheet.ethNumBal).to.equal(BigN(postSheet.ethNumBal).add(biteNum2));
            expect(updatedpostSheet.tokenNumBal).to.equal(BigN(postSheet.tokenNumBal).sub(biteNum2));
            expect(updatedpostSheet.remainNum).to.equal(BigN(postSheet.remainNum).sub(biteNum2));
        });

        // check biteToken level == 4
        it("should bite token correctly", async () => {

            //================preparation============================//
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const priceDurationBlock = params.priceDurationBlock;
            const token = _C_HBTC;
            const biteNum1 = 10;
            const biteNum2 = 20;
            const tokenAmountPerEth = HBTC(30);
            const msgValue = ETH(BigN(100));

            // post2 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            const index0 = await NestMining.lengthOfPriceSheets(token);

            await NestMining.connect(userB).biteToken(token, index0.sub(1), biteNum1, HBTC(40), { value: msgValue });

            const index1 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userA).biteToken(token, index1.sub(1), biteNum2, HBTC(35), { value: msgValue });

            const index2 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userB).biteToken(token, index2.sub(1), biteNum2, HBTC(33), { value: msgValue });

            const index3 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userA).biteToken(token, index3.sub(1), biteNum2, HBTC(31), { value: msgValue });

            // record funds before biting token
            const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pre = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pre = await CHBTC.balanceOf(userB.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            // biteToken function
            const index4 = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index4.sub(1));
            //========================================================//

            // newTokenPrice >= oldTokenPrice
            //await expect(NestMining.connect(userB).biteToken(token, index4.sub(1), biteNum2, HBTC(30), { value: msgValue })).to.be.reverted;

            await NestMining.connect(userB).biteToken(token, index4.sub(1), biteNum2, HBTC(40), { value: msgValue })

            // calculate fee
            const ethFee = ETH(BigN(biteNum2).mul(biteFeeRate)).div(1000);
            const newNestNum1k = BigN(postSheet.nestNum1k).mul(biteNum2).mul(2).div(postSheet.ethNum);
            //console.log("newNestNum1k = ",newNestNum1k.toString());
            const freezeNestAmount = NEST(newNestNum1k.mul(1000));
            const freezeEthAmount = ETH(BigN(biteNum2).mul(2));
            const freezeTokenAmount = BigN(biteNum2).mul(HBTC(40))
                .sub(BigN(biteNum2).mul(postSheet.tokenAmountPerEth));

            // record funds after biting token
            const userB_nest_in_exAddress_pos = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pos = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pos = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pos = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pos = await CHBTC.balanceOf(userB.address);

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

            const index5 = await NestMining.lengthOfPriceSheets(token);
            const newPostSheet = await NestMining.fullPriceSheet(token, index5.sub(1));
            const updatedpostSheet = await NestMining.fullPriceSheet(token, index5.sub(2));

            expect(newPostSheet.miner).to.equal(userB.address);
            expect(newPostSheet.height).to.equal(h);
            expect(newPostSheet.ethNum).to.equal(BigN(biteNum2));
            expect(newPostSheet.remainNum).to.equal(BigN(biteNum2));
            expect(newPostSheet.level).to.equal(BigN(postSheet.level).add(1));
            expect(newPostSheet.typ).to.equal(postSheet.typ);
            expect(newPostSheet.state).to.equal(1);
            expect(newPostSheet.ethNumBal).to.equal(BigN(biteNum2));
            expect(newPostSheet.tokenNumBal).to.equal(BigN(biteNum2));
            expect(newPostSheet.nestNum1k).to.equal(newNestNum1k);
            expect(newPostSheet.tokenAmountPerEth).to.equal(HBTC(40));

            // check the updated priceSheet
            expect(updatedpostSheet.state).to.equal(2);// bitten
            expect(updatedpostSheet.ethNumBal).to.equal(BigN(postSheet.ethNumBal).add(biteNum2));
            expect(updatedpostSheet.tokenNumBal).to.equal(BigN(postSheet.tokenNumBal).sub(biteNum2));
            expect(updatedpostSheet.remainNum).to.equal(BigN(postSheet.remainNum).sub(biteNum2));


            // withdraw funds to nestpool
            await goBlocks(provider, priceDurationBlock);

            await NestMining.connect(userA).closeAndWithdraw(token, index5.sub(6));
            await NestMining.connect(userB).closeAndWithdraw(token, index5.sub(5));
            await NestMining.connect(userA).closeAndWithdraw(token, index5.sub(4));
            await NestMining.connect(userB).closeAndWithdraw(token, index5.sub(3));
            await NestMining.connect(userA).closeAndWithdraw(token, index5.sub(2));
            await NestMining.connect(userB).closeAndWithdraw(token, index5.sub(1));

        });


        // bite eth, level == 4
        it("should bite token continuously", async () => {
            //================preparation============================//
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const priceDurationBlock = params.priceDurationBlock;
            const token = _C_HBTC;
            const biteNum1 = 10;
            const biteNum2 = 20;
            const tokenAmountPerEth = HBTC(30);
            const msgValue = ETH(BigN(100));

            // post2 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            const index0 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userB).biteToken(token, index0.sub(1), biteNum1, HBTC(25), { value: msgValue });

            const index1 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userA).biteToken(token, index1.sub(1), biteNum2, HBTC(30), { value: msgValue });

            const index2 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userB).biteToken(token, index2.sub(1), biteNum2, HBTC(35), { value: msgValue });

            const index3 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userA).biteToken(token, index3.sub(1), biteNum2, HBTC(32), { value: msgValue });

            // record funds before biting token
            const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pre = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pre = await CHBTC.balanceOf(userB.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            // biteToken function
            const index4 = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index4.sub(1));

            await NestMining.connect(userB).biteEth(token, index4.sub(1), biteNum2, HBTC(35), { value: msgValue });

            // calculate fee
            const ethFee = ETH(BigN(biteNum2).mul(biteFeeRate)).div(1000);
            const newNestNum1k = BigN(postSheet.nestNum1k).mul(biteNum2).mul(2).div(postSheet.ethNum);
            //console.log("newNestNum1k = ",newNestNum1k.toString());
            const freezeNestAmount = NEST(newNestNum1k.mul(1000));

            // extreme cases
            const freezeEthAmount = ETH(0);
            const freezeTokenAmount = BigN(biteNum2).mul(HBTC(35))
                .add(BigN(biteNum2).mul(postSheet.tokenAmountPerEth));

            // record funds after biting token
            const userB_nest_in_exAddress_pos = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_pos = await NestPool.balanceOfNestInPool(userB.address);
            const userB_token_pool_pos = await NestPool.balanceOfTokenInPool(userB.address, token);
            const userB_eth_pool_pos = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_in_exAddress_pos = await CHBTC.balanceOf(userB.address);

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

            const index5 = await NestMining.lengthOfPriceSheets(token);
            const newPostSheet = await NestMining.fullPriceSheet(token, index5.sub(1));
            const updatedpostSheet = await NestMining.fullPriceSheet(token, index5.sub(2));

            expect(newPostSheet.miner).to.equal(userB.address);
            expect(newPostSheet.height).to.equal(h);
            expect(newPostSheet.ethNum).to.equal(BigN(biteNum2));
            expect(newPostSheet.remainNum).to.equal(BigN(biteNum2));
            expect(newPostSheet.level).to.equal(BigN(postSheet.level).add(1));
            expect(newPostSheet.typ).to.equal(postSheet.typ);
            expect(newPostSheet.state).to.equal(1);
            expect(newPostSheet.ethNumBal).to.equal(BigN(biteNum2));
            expect(newPostSheet.tokenNumBal).to.equal(BigN(biteNum2));
            expect(newPostSheet.nestNum1k).to.equal(newNestNum1k);
            expect(newPostSheet.tokenAmountPerEth).to.equal(HBTC(35));

            // check the updated priceSheet
            expect(updatedpostSheet.state).to.equal(2);// bitten
            expect(updatedpostSheet.ethNumBal).to.equal(BigN(postSheet.ethNumBal).sub(biteNum2));
            expect(updatedpostSheet.tokenNumBal).to.equal(BigN(postSheet.tokenNumBal).add(biteNum2));
            expect(updatedpostSheet.remainNum).to.equal(BigN(postSheet.remainNum).sub(biteNum2));


            // withdraw funds to nestpool
            await goBlocks(provider, priceDurationBlock);

            await NestMining.connect(userA).closeAndWithdraw(token, index5.sub(6));
            await NestMining.connect(userB).closeAndWithdraw(token, index5.sub(5));
            await NestMining.connect(userA).closeAndWithdraw(token, index5.sub(4));
            await NestMining.connect(userB).closeAndWithdraw(token, index5.sub(3));
            await NestMining.connect(userA).closeAndWithdraw(token, index5.sub(2));
            await NestMining.connect(userB).closeAndWithdraw(token, index5.sub(1));

        });


        // check  closeAndWithdraw, remainNum == 0
        it("should closeAndWithdraw correctly", async () => {

            //================preparation============================//
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const priceDurationBlock = params.priceDurationBlock;
            const token = _C_HBTC;
            const biteNum1 = 10;
            const biteNum2 = 20;
            const tokenAmountPerEth = HBTC(30);
            const msgValue = ETH(BigN(100));

            // post2 
            await NestMining.connect(userB).post(token, ethNum, tokenAmountPerEth, { value: msgValue, gasPrice: 0 });


            const index0 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userA).biteToken(token, index0.sub(1), biteNum1, HBTC(25), { value: msgValue, gasPrice: 0 });


            // biteToken function
            const index1 = await NestMining.lengthOfPriceSheets(token);
            
  
            await NestMining.connect(userB).biteEth(token, index1.sub(1), biteNum2, HBTC(30), { value: msgValue, gasPrice: 0 });

            // record funds before biting token
            const userA_nest_in_exAddress_pre = await NestToken.balanceOf(userA.address);
            const userA_token_in_exAddress_pre = await CHBTC.balanceOf(userA.address);
            const userA_eth_in_exAddress_pre = await provider.getBalance(userA.address);

            // await goBlocks(provider, priceDurationBlock);
            const postSheet = await NestMining.fullPriceSheet(token, index1.sub(1));
            await NestMining.connect(userA).closeAndWithdraw(token, index1.sub(1), {gasPrice: 0 });

            // calculate fee

            const unfreezeNestAmount = NEST(postSheet.nestNum1k).mul(1000);
            const unfreezeEthAmount = ETH(postSheet.ethNumBal);
            const unfreezeTokenAmount = BigN(postSheet.tokenNumBal).mul(postSheet.tokenAmountPerEth);
 
            // record funds after biting token
            const userA_nest_in_exAddress_pos = await NestToken.balanceOf(userA.address);
            const userA_token_in_exAddress_pos = await CHBTC.balanceOf(userA.address);
            const userA_eth_in_exAddress_pos = await provider.getBalance(userA.address);

            expect(userA_nest_in_exAddress_pre.add(unfreezeNestAmount)).to.equal(userA_nest_in_exAddress_pos);
            expect(userA_token_in_exAddress_pre.add(unfreezeTokenAmount)).to.equal(userA_token_in_exAddress_pos);
            expect(userA_eth_in_exAddress_pre.add(unfreezeEthAmount)).to.equal(userA_eth_in_exAddress_pos);
        });


        // check closeList, one generated by post, another generated by biting token
        it("should closeList correctly", async () => {
            //================preparation============================//
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const priceDurationBlock = params.priceDurationBlock;
            const token = _C_HBTC;
            const biteNum = 10;
            const tokenAmountPerEth = HBTC(30);
            const MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE = 95;
            const msgValue = ETH(BigN(100));

            const NToken = await NestPool.getNTokenFromToken(token);

            // eliminate mining effects 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            

            // post
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            const index0 = await NestMining.lengthOfPriceSheets(token);
            
            await NestMining.connect(userB).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            const index1 = await NestMining.lengthOfPriceSheets(token);

            await NestMining.connect(userA).biteToken(token, index1.sub(1), biteNum, HBTC(25), { value: msgValue, gasPrice: 0 });
            const index2 = await NestMining.lengthOfPriceSheets(token);

            // 25 blocks
            await goBlocks(provider, priceDurationBlock);

            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            // calculate funds about post from userA
            const userA_post_priceSheet = await NestMining.fullPriceSheet(token, index0.sub(1));
            const userA_biteToken_priceSheet = await NestMining.fullPriceSheet(token, index2.sub(1));

            
            await NestMining.connect(userA).closeList(token, [index0.sub(1), index1.sub(1), index2.sub(1)]);

            const reward_userA = NHBTC(BigN(userA_post_priceSheet.ethNum)
                  .mul(4).mul(MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE))
                  .div(userA_post_priceSheet.ethNum).div(100);

            const unfreezeEthAmount_userA = ETH(BigN(userA_post_priceSheet.ethNumBal).add(userA_biteToken_priceSheet.ethNumBal));

            const unfreezeTokenAmount_userA = BigN(userA_post_priceSheet.tokenNumBal).mul(userA_post_priceSheet.tokenAmountPerEth)
                                              .add(BigN(userA_biteToken_priceSheet.tokenNumBal).mul(userA_biteToken_priceSheet.tokenAmountPerEth));

            const unfreezeNestAmount_userA = NEST(BigN(userA_post_priceSheet.nestNum1k).mul(1000)
                                             .add(BigN(userA_biteToken_priceSheet.nestNum1k).mul(1000)));

            // record funds after closing
            const userA_nest_pool_pos = await NestPool.balanceOfNestInPool(userA.address);

            const userA_token_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pos = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);

            // check funds
            expect(userA_eth_pool_pre.add(unfreezeEthAmount_userA)).to.equal(userA_eth_pool_pos);

            expect(userA_token_pool_pre.add(unfreezeTokenAmount_userA)).to.equal(userA_token_pool_pos);

            expect(userA_nest_pool_pre.add(unfreezeNestAmount_userA)).to.equal(userA_nest_pool_pos);

            expect(userA_NToken_pool_pre.add(reward_userA)).to.equal(userA_NToken_pool_pos);

            // check nestPool
            expect(eth_pool_pre.sub(unfreezeEthAmount_userA)).to.equal(eth_pool_pos);
            expect(token_pool_pre.sub(unfreezeTokenAmount_userA)).to.equal(token_pool_pos);
            expect(nest_pool_pre.sub(unfreezeNestAmount_userA)).to.equal(nest_pool_pos);


            //===================== check price sheet ================//  
            const userA_post_priceSheet_pos = await NestMining.fullPriceSheet(token, index0.sub(1));

            const userA_biteToken_priceSheet_pos = await NestMining.fullPriceSheet(token, index2.sub(1));

            const userB_post_priceSheet_pos = await NestMining.fullPriceSheet(token, index1.sub(1));

            // check the updated userA_post_priceSheet
            expect(userA_post_priceSheet_pos.ethNumBal).to.equal(0);

            expect(userA_post_priceSheet_pos.tokenNumBal).to.equal(0);

            expect(userA_post_priceSheet_pos.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(userA_post_priceSheet_pos.state).to.equal(0);


            // check the updated PriceSheet2
            expect(userA_biteToken_priceSheet_pos.ethNumBal).to.equal(0);

            expect(userA_biteToken_priceSheet_pos.tokenNumBal).to.equal(0);

            expect(userA_biteToken_priceSheet_pos.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(userA_biteToken_priceSheet_pos.state).to.equal(0);

            // post
            expect(userB_post_priceSheet_pos.state).to.equal(2);
            
        });

        // check closeList, two priceSheets generated by posting 
        it("should closeList correctly", async () => {
            //================preparation============================//
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const priceDurationBlock = params.priceDurationBlock;
            const token = _C_HBTC;
            const biteNum = 10;
            const tokenAmountPerEth = HBTC(30);
            const MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE = 95;
            const msgValue = ETH(BigN(100));

            const NToken = await NestPool.getNTokenFromToken(token);

            // eliminate mining effects 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            

            // post
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            const index0 = await NestMining.lengthOfPriceSheets(token);
            
            await NestMining.connect(userB).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            const index1 = await NestMining.lengthOfPriceSheets(token);

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            const index2 = await NestMining.lengthOfPriceSheets(token);

            // 25 blocks
            await goBlocks(provider, priceDurationBlock);

            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            // calculate funds about post from userA
            const userA_post_priceSheet = await NestMining.fullPriceSheet(token, index0.sub(1));
            const userA_biteToken_priceSheet = await NestMining.fullPriceSheet(token, index2.sub(1));

            
            await NestMining.connect(userA).closeList(token, [index0.sub(1), index1.sub(1), index2.sub(1)]);

            const reward_userA = NHBTC(BigN(userA_post_priceSheet.ethNum)
                  .mul(4).mul(MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE))
                  .div(userA_post_priceSheet.ethNum).div(100);

            const unfreezeEthAmount_userA = ETH(BigN(userA_post_priceSheet.ethNumBal).add(userA_biteToken_priceSheet.ethNumBal));

            const unfreezeTokenAmount_userA = BigN(userA_post_priceSheet.tokenNumBal).mul(userA_post_priceSheet.tokenAmountPerEth)
                                              .add(BigN(userA_biteToken_priceSheet.tokenNumBal).mul(userA_biteToken_priceSheet.tokenAmountPerEth));

            const unfreezeNestAmount_userA = NEST(BigN(userA_post_priceSheet.nestNum1k).mul(1000)
                                             .add(BigN(userA_biteToken_priceSheet.nestNum1k).mul(1000)));

            // record funds after closing
            const userA_nest_pool_pos = await NestPool.balanceOfNestInPool(userA.address);
            console.log("userA_nest_pool_pos = ",userA_nest_pool_pos.toString());

            const userA_token_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, token);
            const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            const userA_eth_pool_pos = await NestPool.balanceOfEthInPool(userA.address);

            const nest_pool_pos = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, token);
            const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);

            // check funds
            expect(userA_eth_pool_pre.add(unfreezeEthAmount_userA)).to.equal(userA_eth_pool_pos);

            expect(userA_token_pool_pre.add(unfreezeTokenAmount_userA)).to.equal(userA_token_pool_pos);

            expect(userA_nest_pool_pre.add(unfreezeNestAmount_userA)).to.equal(userA_nest_pool_pos);

            expect(userA_NToken_pool_pre.add(reward_userA.mul(2))).to.equal(userA_NToken_pool_pos);

            // check nestPool
            expect(eth_pool_pre.sub(unfreezeEthAmount_userA)).to.equal(eth_pool_pos);
            expect(token_pool_pre.sub(unfreezeTokenAmount_userA)).to.equal(token_pool_pos);
            expect(nest_pool_pre.sub(unfreezeNestAmount_userA)).to.equal(nest_pool_pos);


            //===================== check price sheet ================//  
            const userA_post_priceSheet_pos = await NestMining.fullPriceSheet(token, index0.sub(1));

            const userA_biteToken_priceSheet_pos = await NestMining.fullPriceSheet(token, index2.sub(1));

            const userB_post_priceSheet_pos = await NestMining.fullPriceSheet(token, index1.sub(1));

            // check the updated userA_post_priceSheet
            expect(userA_post_priceSheet_pos.ethNumBal).to.equal(0);

            expect(userA_post_priceSheet_pos.tokenNumBal).to.equal(0);

            expect(userA_post_priceSheet_pos.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(userA_post_priceSheet_pos.state).to.equal(0);


            // check the updated PriceSheet2
            expect(userA_biteToken_priceSheet_pos.ethNumBal).to.equal(0);

            expect(userA_biteToken_priceSheet_pos.tokenNumBal).to.equal(0);

            expect(userA_biteToken_priceSheet_pos.nestNum1k).to.equal(0);

            // PRICESHEET_STATE_CLOSED == 0
            expect(userA_biteToken_priceSheet_pos.state).to.equal(0);

            // post  state == 1
            expect(userB_post_priceSheet_pos.state).to.equal(1);
            
        });

         // check closeList,
         it("should closeList failed", async () => {

            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const biteFeeRate = params.biteFeeRate;
            const biteInflateFactor = params.biteInflateFactor;
            const priceDurationBlock = params.priceDurationBlock;
            const token = _C_HBTC;
            const biteNum = 10;
            const tokenAmountPerEth = HBTC(30);
            const MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE = 95;
            const msgValue = ETH(BigN(100));

            const NToken = await NestPool.getNTokenFromToken(token);

            // eliminate mining effects 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            

            // post
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            const index0 = await NestMining.lengthOfPriceSheets(token);

            // 25 blocks
            await goBlocks(provider, priceDurationBlock);
            
            await expect(NestMining.connect(userA).closeList(token, [])).to.be.reverted;
            await expect(NestMining.connect(userA).closeList(token, [-1])).to.be.reverted;
        });


    });

});