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

    describe('test boundary conditions about nestmining', function () {

        it('', async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const nestStakedNum1k = params.nestStakedNum1k;
            const priceDurationBlock = params.priceDurationBlock;
            const miningFeeRate = params.miningFeeRate;
            const MINING_LEGACY_NTOKEN_MINER_REWARD_PERCENTAGE = 95;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            const MINING_NTOKEN_FEE_DIVIDEND_RATE = 60;
            const MINING_NTOKEN_FEE_DAO_RATE = 20;
            const MINING_NTOKEN_FEE_NEST_DAO_RATE = 20;

            const NToken = await NestPool.getNTokenFromToken(token);

            // post (in order to calculate reward)
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            // to calculate this post reward
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            await goBlocks(provider, priceDurationBlock);


            // close priceSheet 
            const index = await NestMining.lengthOfPriceSheets(token);
            const postSheet = await NestMining.fullPriceSheet(token, index.sub(1));
            await NestMining.connect(userA).close(token, index.sub(1));
            await NestMining.connect(userA).close(token, index.sub(2));

            //==========================================//
            // record funds before posting

            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const eth_reward_NestStakingOfNToken_pre = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pre = await NestDAO.totalETHRewards(NToken);
            const eth_reward_NestDaoOfNestToken_pre = await NestDAO.totalETHRewards(NestToken.address);
            const eth_reward_NestDao = await provider.getBalance(NestDAO.address);   

            const ethFee = ETH(BigN(ethNum).mul(miningFeeRate)).div(1000);

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: ethFee });

            // calculate fee
            //const ethFee = ETH(BigN(ethNum).mul(miningFeeRate)).div(1000);
            const eth_reward_NestStakingOfNToken = ethFee.mul(MINING_NTOKEN_FEE_DIVIDEND_RATE).div(100);
            const eth_reward_NestDAoOfNToken = ethFee.mul(MINING_NTOKEN_FEE_DAO_RATE).div(100);
            const eth_reward_NestDaoOfNestToken = ethFee.mul(MINING_NTOKEN_FEE_NEST_DAO_RATE).div(100);

            const freezeEthAmount = ETH(BigN(ethNum));

            // record funds after posting

            const userA_eth_pool_pos = await NestPool.balanceOfEthInPool(userA.address);
            const eth_pool_pos = await NestPool.balanceOfEthInPool(_C_NestPool);
            //const eth_reward_pos = await provider.getBalance(_C_NestStaking);

            const eth_reward_NestStakingOfNToken_pos = await NestStaking.totalRewards(NToken);
            const eth_reward_NestDAoOfNToken_pos = await NestDAO.totalETHRewards(NToken);
            const eth_reward_NestDaoOfNestToken_pos = await NestDAO.totalETHRewards(NestToken.address);
           
            const eth_reward_NestDao1 = await provider.getBalance(NestDAO.address);
            
            // check funds
            // check funds about userA
            expect(userA_eth_pool_pre
                .sub(freezeEthAmount))
                .to.equal(userA_eth_pool_pos);

            // check funds about nestPool     
            expect(eth_pool_pre.add(freezeEthAmount)).to.equal(eth_pool_pos);

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
    });

});
