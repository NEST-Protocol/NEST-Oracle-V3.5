// this test script complements the previous miningv1

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
        //CNWBTC = await deployNWBTC(owner);

        let contracts = {
            USDT: CUSDT,
            WBTC: CWBTC,
            NEST: NestToken,
            IterableMapping: IterableMapping,
            NN: NNToken,
            //NWBTC: CNWBTC
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
        //_C_NWBTC = CNWBTC.address;
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_NestStaking = NestStaking.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;
        _C_NestDAO = NestDAO.address;

        //await NestPool.setNTokenToToken(_C_WBTC, _C_NWBTC);
        //await CNWBTC.setOfferMain(_C_NestMining);

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

        // check current version
        it("should update version", async () => {

            await NestMining.incVersion();
        })


        // should set parameters correctly
        it("should set parameters correctly" , async () => {
            
            const param = await NestMining.parameters();
            //console.log("current param :", param);
            
            // update params
            await NestMining.setParams({
                miningEthUnit: 15,
                nestStakedNum1k: 1,
                biteFeeRate: 1,
                miningFeeRate: 1,
                priceDurationBlock: 30,
                maxBiteNestedLevel: 3,
                biteInflateFactor: 2,
                biteNestInflateFactor: 2,
            });

            //const param_now = await NestMining.parameters();

            //console.log("now updated params :", param_now);

            // reset params
            await NestMining.setParams({
                miningEthUnit: 10,
                nestStakedNum1k: 1,
                biteFeeRate: 1,
                miningFeeRate: 10,
                priceDurationBlock: 25,
                maxBiteNestedLevel: 3,
                biteInflateFactor: 2,
                biteNestInflateFactor: 2,
            });
        })


        // set gov, set userD as gov
        it("should set gov correctly" , async () => {

            // now the nestpool's gov is userD
            await NestPool.setGovernance(userD.address);

            const gov = await NestPool.governance();
 
            // now the NestMining's gov is userD
            await NestMining.loadGovernance();

            const mining_gov = await NestMining.addrOfGovernance();
 
            expect(gov).to.equal(userD.address);
            expect(gov).to.equal(mining_gov);    
        })

        // should post new token rightly
        it("should post new token correctly" , async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            // address(token) ==> address(NToken)
            await NTokenController.start(10);
            await NTokenController.connect(userA).open(token);

            const NToken = await NestPool.getNTokenFromToken(token);

            // const balance = await CNWBTC.balanceOf(NToken);
            //console.log("NToken = ",NToken);

            await goBlocks(provider, 1000);

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            
            await expect(NestMining.connect(userA).post(NToken, ethNum, tokenAmountPerEth, { value: msgValue })).to.be.reverted;


    
            const index = await NestMining.lengthOfPriceSheets(token);

            await goBlocks(provider, priceDurationBlock);

            await NestMining.connect(userA).close(token, index.sub(1));

            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            //console.log("userA_NToken_pool_pre = ", userA_NToken_pool_pre.toString());

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(100), { value: msgValue });

            const userA_NToken_pool_pos = await NestPool.balanceOfTokenInPool(userA.address, NToken);
            //console.log("userA_NToken_pool_pos = ", userA_NToken_pool_pos.toString());

        })

        // check view function 
        it("check some view function" , async () => {
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const miningFeeRate = params.miningFeeRate;
            const priceDurationBlock = params.priceDurationBlock;
            const nestStakedNum1k = params.nestStakedNum1k;

            const MINING_NEST_FEE_DIVIDEND_RATE = 80;
            const MINING_NEST_FEE_DAO_RATE = 20;

            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);

            // get current total nest which generated by mining 
            const  minedNestAmount_pre = await NestMining.minedNestAmount();
        
            // post2
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            const bn = await ethers.provider.getBlockNumber();

            const index = await NestMining.lengthOfPriceSheets(token);

            // priceSheet, return part inf
            const postSheet = await NestMining.priceSheet(token, index.sub(1));

            await goBlocks(provider, priceDurationBlock);

            // close priceSheet 
            await NestMining.connect(userA).close(token, index.sub(1));

            // get current total nest which generated by mining 
            const minedNestAmount_pos = await NestMining.minedNestAmount();


            // return the new block number which include post / post2
            const latestMiningHeight = await NestMining.latestMinedHeight();
            expect(latestMiningHeight).to.equal(bn);
        })


        // check withdraw funds function
        it("should withdraw funds correctly" , async () => {
            
            const token = _C_USDT;
            await NestMining.connect(userA).withdrawEth(ETH(1));

            await NestMining.connect(userA).withdrawEthAndToken(ETH(1), token, USDT(100));

            await NestMining.connect(userA).withdrawNest(NEST(100));

            await NestMining.connect(userA).withdrawEthAndTokenAndNest(ETH(1), token, USDT(100), NEST(100));

        })

    });

});