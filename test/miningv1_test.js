const { expect } = require('chai');
const { WeiPerEther, BigNumber } = require("ethers");
const { BN } = require('@openzeppelin/test-helpers');

const {usdtdec, wbtcdec, nestdec, ethdec, 
        ETH, USDT, WBTC, MBTC, NEST, BigNum, 
        show_eth, show_usdt, show_64x64} = require("../scripts/utils.js");

const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, deployNestProtocol, 
    setupNest} = require("../scripts/deploy.js");

const ethTwei = BigNumber.from(10).pow(12);

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

    let CUSDT;
    let CWBTC;
    let NestToken;
    let NNToken;
    let NestPool;
    let NestMining;
    let NestStaking;
    let NNRewardPool;
    let NTokenController;
    let NestQuery;


    let _C_USDT;
    let _C_NestToken;
    let _C_NestPool;
    let _C_NestMining;
    let _C_NestStaking;
    let _C_NNRewardPool;
    let _C_NTokenController;
    let _C_NestQuery;

    let provider = ethers.provider;

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
        let contracts = {
            CUSDT: CUSDT, 
            CWBTC: CWBTC, 
            NEST: NestToken, 
            IterableMapping: IterableMapping,
            NN: NNToken}; 
        let CNest = await deployNestProtocol(owner, contracts);

        NestPool = CNest.NestPool;
        MiningV1Calc = CNest.MiningV1Calc;
        MiningV1Op = CNest.MiningV1Op;
        NestMining = CNest.NestMining;
        NestStaking = CNest.NestStaking;
        NNRewardPool = CNest.NNRewardPool;
        NTokenController = CNest.NTokenController;
        NestQuery = CNest.NestQuery;
    
        let contractsOfNest = {
            USDT: CUSDT.address,
            WBTC: CWBTC.address,
            NEST: NestToken.address, 
            IterableMapping: IterableMapping.address,
            NN: NNToken.address,
            NestPool: NestPool.address,
            MiningV1Calc: MiningV1Calc.address,
            MiningV1Op: MiningV1Op.address,
            NestMining: NestMining.address,
            NestStaking: NestStaking.address, 
            NNRewardPool: NNRewardPool.address,
            NTokenController: NTokenController.address,
            NestQuery: NestQuery.address
        }

        await setupNest(owner, contractsOfNest);


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

        it("should approve correctly", async () => {
            const approved_val = NEST("10000000000");
            await NestToken.connect(userA).approve(_C_NestPool, approved_val);

            const rs = await NestToken.allowance(userA.address, _C_NestPool);
            expect(rs).to.equal(approved_val);
        })

        it("should approve correctly", async () => {
            const approved_val = NEST("10000000000");
            await NestToken.connect(userB).approve(_C_NestPool, approved_val);
            const rs = await NestToken.allowance(userB.address, _C_NestPool);
            expect(rs).to.equal(approved_val);
        })
    });

    describe('NestMining price sheets', function () {

        it("should be able to post dual price sheets", async () => {
            await NestMining.connect(userA).post2(_C_USDT, 10, USDT(450), NEST(1000), { value: ETH(22) });
        });

        it("should be able to close two price sheets", async () => {
            await goBlocks(provider, 25);

            await NestMining.connect(userA).close(_C_USDT, 0);
            await NestMining.connect(userA).close(_C_NestToken, 0);
        });

        it("should be able to bite (ETH => TOKEN) a price sheet", async () => {
            
            await NestMining.connect(userA).post2(_C_USDT, 20, USDT(450), NEST(1000), { value: ETH(100) });
            await NestMining.connect(userB).biteToken(_C_USDT, 1, 10, USDT(400), {value: ETH(32)});
            await NestMining.connect(userB).biteEth(_C_NestToken, 1, 20, NEST(1100), {value: ETH(32)});

            await goBlocks(provider, 25);

            await NestMining.connect(userB).close(_C_USDT, 2);
            await NestMining.connect(userB).close(_C_NestToken, 2);
        });    

        it("should be able to query a price", async () => {
            await NestMining.connect(userA).post2(_C_USDT, 20, USDT(450), NEST(1000), { value: ETH(100) });
            await goBlocks(provider, 26);
            const price = await NestMining.latestPriceOf(_C_USDT);
            expect(price.ethAmount).to.equal(ETH(20));
            expect(price.tokenAmount).to.equal(USDT(450).mul(20));
        });   

        it("should be able to compute avg and sigma", async () => {
            await NestMining.stat(_C_USDT);
            const price = await NestMining.priceAvgAndSigmaOf(_C_USDT);

            console.log(`[INFO] price=${show_64x64(price[0])} avg=${show_64x64(price[1])}, sigma=${show_64x64(price[2])}, height=${price[3]}}`);
        }); 

        it("should post a price sheet for NWBTC", async () => {
            await NestToken.transfer(userC.address, NEST('1000000'));
            await NestToken.transfer(userD.address, NEST('1000000'));
            await NestToken.connect(userC).approve(_C_NTokenController, NEST('100000'));
            await NestToken.connect(userC).approve(_C_NestPool, NEST('10000000'));
            await NestToken.connect(userC).approve(_C_NestPool, NEST('10000000'));

            await CWBTC.transfer(userC.address, WBTC('10000'));
            await CWBTC.connect(userC).approve(_C_NestPool, WBTC(10000));
            await CWBTC.connect(userC).approve(_C_NTokenController, WBTC(1));
            await CUSDT.transfer(userD.address, WBTC('10000'));
            await CWBTC.connect(userD).approve(_C_NestPool, WBTC(10000));


            await NTokenController.connect(userC).open(_C_WBTC);

            await NestMining.connect(userC).post(_C_WBTC, 10, MBTC(30), {value: ETH(11)});
            await goBlocks(provider, 26);
            await NestMining.connect(userC).close(_C_WBTC, 0);
        }); 

        it("can close 5 price sheets in one single tx", async () => {
            await NestMining.connect(userC).post(_C_WBTC, 10, MBTC(30), {value: ETH(11)});
            await goBlocks(provider, 5);
            await NestMining.connect(userC).post(_C_WBTC, 10, MBTC(34), {value: ETH(11)});
            await goBlocks(provider, 5);
            await NestMining.connect(userC).post(_C_WBTC, 10, MBTC(33), {value: ETH(11)});
            await goBlocks(provider, 5);
            await NestMining.connect(userC).post(_C_WBTC, 10, MBTC(32), {value: ETH(11)});
            await goBlocks(provider, 5);
            await NestMining.connect(userC).post(_C_WBTC, 10, MBTC(34), {value: ETH(11)});
            await goBlocks(provider, 26);
            await NestMining.connect(userC).closeList(_C_WBTC, [1,2,3,4,5]);
        }); 

    });
});
