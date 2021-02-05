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

        await NestDAO.start();

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
            const ownerBalance = await NestToken.balanceOf(owner.address);
            const amount = NEST("2000000000");
            await NestPool.initNestLedger(amount);
            await NestToken.connect(owner).transfer(NestPool.address, amount);
            expect(totalSupply).to.equal(expectedTotalSupply);
        })

        it("should transfer correctly", async () => {
            const amount = NEST("20000000");
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
            await NestToken.connect(userA).approve(_C_NestDAO, approved_val);
            await NestToken.connect(userA).approve(_C_NTokenController, NEST('100000'));

            const rs = await NestToken.allowance(userA.address, _C_NestPool);
            expect(rs).to.equal(approved_val);
        })

        it("userB should approve correctly", async () => {
            const approved_val = NEST("10000000000");
            await NestToken.connect(userB).approve(_C_NestPool, approved_val);
            await NestToken.connect(userB).approve(_C_NestDAO, approved_val);
            await NestToken.connect(userB).approve(_C_NTokenController, NEST('100000'));
            const rs = await NestToken.allowance(userB.address, _C_NestPool);
            expect(rs).to.equal(approved_val);
        })
    });

    describe('WBTC Token', function () {

        it("userA should approve correctly", async () => {
            await CWBTC.transfer(userA.address, WBTC('1000000'));
            await CWBTC.connect(userA).approve(_C_NestPool, WBTC(1000000));
            await CWBTC.connect(userA).approve(_C_NTokenController, WBTC(1));
        })

        it("userB should approve correctly", async () => {
            await CWBTC.transfer(userB.address, WBTC('1000000'));
            await CWBTC.connect(userB).approve(_C_NestPool, WBTC(10000));
            await CWBTC.connect(userB).approve(_C_NTokenController, WBTC(1));
        })
    });

    describe('NWBTC NToken', function () {

        it("userA should approve correctly", async () => {
            await CNWBTC.transfer(userA.address, NWBTC('400000'));
            await CNWBTC.connect(userA).approve(_C_NestPool, NWBTC('4000000'));
            await CNWBTC.connect(userA).approve(_C_NestDAO, NWBTC('4000000'));
            await CNWBTC.connect(userA).approve(_C_NTokenController, NWBTC('1000000'));
        })

        it("userB should approve correctly", async () => {
            await CNWBTC.transfer(userB.address, NWBTC('400000'));
            await CNWBTC.connect(userB).approve(_C_NestPool, NWBTC('4000000'));
            await CNWBTC.connect(userB).approve(_C_NestDAO, NWBTC('4000000'));
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

            const NToken = await NestPool.getNTokenFromToken(token);

            // post 
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(490), { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(495), { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(500), { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(496), { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(502), { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(501), { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(499), { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(503), { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NWBTC(500), { value: msgValue });

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

            // post2 
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            
        });


        // check redeem funds
        it("can redeem NWBTC- ETH correctly", async () => {

            const token = _C_NWBTC;
            
            await NestDAO.setParams(NWBTC(10000), 10)
            const price = await NestMining.latestPriceOf(token);
            console.log(`ethAmount=${price[0]} tokenAmount=${price[1]}, blockNum=${price[2]}`);


            // priceAvgAndSigmaOf function
            const p1 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(token);
            console.log(`price=${p1[0]} avg=${p1[1]}, sigma=${show_64x64(p1[2])}, height=${p1[3]}}`);

            await NestDAO.addETHReward(token, { value: ETH(30)});

            const quota_pre = await NestDAO.quotaOf(token);
            //console.log("quota_pre = ",quota_pre.toString());

            await NestDAO.connect(userA).redeem(token, NWBTC(500), {value: ETH(5) , gasPrice: 0});
            
            const quota_pos = await NestDAO.quotaOf(token);
            //console.log("quota_pos = ",quota_pos.toString());

            const total_pre0 = await NestDAO.totalETHRewards(token);

            const nestDAO_eth0 = await provider.getBalance(NestDAO.address);
            //console.log("nestDAO_eth0 = ",nestDAO_eth0.toString());
            

            const eth_A_pre = await userA.getBalance();
            //console.log("eth_A_pre = ", eth_A_pre.toString());
            
            

            const total_pre = await NestDAO.totalETHRewards(token);
            //console.log("total_pre = ", total_pre.toString());

            const nestDAO_eth_pre = await provider.getBalance(NestDAO.address);
            //console.log("nestDAO_eth_pre = ",nestDAO_eth_pre.toString());

            await NestDAO.connect(userA).redeem(token, NWBTC(500), {value: ETH(5) , gasPrice: 0});
            const eth_A_post = await userA.getBalance(); 
            console.log("eth_A_post = ", eth_A_post.toString());

           
            const total_pos = await NestDAO.totalETHRewards(token);
            //console.log("total_pos = ",total_pos.toString());
        
            const nestDAO_eth_pos = await provider.getBalance(NestDAO.address);
            //console.log("nestDAO_eth_pos = ",nestDAO_eth_pos.toString());

        
            expect(eth_A_post.sub(eth_A_pre)).to.equal(ETH(99).div(100));
            expect(total_pre.sub(total_pos)).to.equal(ETH(99).div(100));
            expect(nestDAO_eth_pre.sub(nestDAO_eth_pos)).to.equal(ETH(99).div(100));
        });


         // check redeem funds
         it("can redeem NEST- ETH correctly", async () => {

            const token = _C_NestToken;
            
            await NestDAO.setParams(NWBTC(10000), 10)
            const price = await NestMining.latestPriceOf(token);
            //console.log(`ethAmount=${price[0]} tokenAmount=${price[1]}, blockNum=${price[2]}`);


            // priceAvgAndSigmaOf function
            const p1 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(token);
            //console.log(`price=${p1[0]} avg=${p1[1]}, sigma=${show_64x64(p1[2])}, height=${p1[3]}}`);

            await NestDAO.addETHReward(token, { value: ETH(10)});

            const quota_pre = await NestDAO.quotaOf(token);
            //console.log("quota_pre = ",quota_pre.toString());


            await NestDAO.connect(userA).redeem(token, NEST(1000), {value: ETH(5) , gasPrice: 0});

            const quota_pos = await NestDAO.quotaOf(token);
            //console.log("quota_pos = ",quota_pos.toString());

            const total_pre0 = await NestDAO.totalETHRewards(token);

            const nestDAO_eth0 = await provider.getBalance(NestDAO.address);
            //console.log("nestDAO_eth0 = ",nestDAO_eth0.toString());
            

            const eth_A_pre = await userA.getBalance();
            //console.log("eth_A_pre = ", eth_A_pre.toString());
            
            

            const total_pre = await NestDAO.totalETHRewards(token);
            //console.log("total_pre = ", total_pre.toString());

            const nestDAO_eth_pre = await provider.getBalance(NestDAO.address);
            //console.log("nestDAO_eth_pre = ",nestDAO_eth_pre.toString());

            await NestDAO.connect(userA).redeem(token, NEST(1000), {value: ETH(5) , gasPrice: 0});
            const eth_A_post = await userA.getBalance(); 
            //console.log("eth_A_post = ", eth_A_post.toString());

           
            const total_pos = await NestDAO.totalETHRewards(token);
            //console.log("total_pos = ",total_pos.toString());
        
            const nestDAO_eth_pos = await provider.getBalance(NestDAO.address);
            //console.log("nestDAO_eth_pos = ",nestDAO_eth_pos.toString());

            expect(eth_A_post.sub(eth_A_pre)).to.equal(ETH(99).div(100));
            expect(total_pre.sub(total_pos)).to.equal(ETH(99).div(100));
            expect(nestDAO_eth_pre.sub(nestDAO_eth_pos)).to.equal(ETH(99).div(100));
        });


        // repurchase overflow
        it("should redeem failed!", async () => {
            const token = _C_NWBTC;
            
            await NestDAO.setParams(NWBTC(10000), 10)
            const price = await NestMining.latestPriceOf(token);
            //console.log(`ethAmount=${price[0]} tokenAmount=${price[1]}, blockNum=${price[2]}`);


            // priceAvgAndSigmaOf function
            const p1 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(token);
            //console.log(`price=${p1[0]} avg=${p1[1]}, sigma=${show_64x64(p1[2])}, height=${p1[3]}}`);

            await NestDAO.addETHReward(token, { value: ETH(30)});

            const quota_pre = await NestDAO.quotaOf(token);
            console.log("quota_pre = ",quota_pre.toString());

            await expect(NestDAO.connect(userA).redeem(token, NWBTC(3000), {value: ETH(5) , gasPrice: 0})).to.be.reverted;     
        });


        // repurchase overflow
        it("should redeem failed!", async () => {
            const token = _C_NestToken;
            
            await NestDAO.setParams(NWBTC(10000), 10)
            const price = await NestMining.latestPriceOf(token);
            //console.log(`ethAmount=${price[0]} tokenAmount=${price[1]}, blockNum=${price[2]}`);


            // priceAvgAndSigmaOf function
            const p1 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(token);
            //console.log(`price=${p1[0]} avg=${p1[1]}, sigma=${show_64x64(p1[2])}, height=${p1[3]}}`);

            await NestDAO.addETHReward(token, { value: ETH(400)});

            const quota_pre = await NestDAO.quotaOf(token);
            console.log("quota_pre = ",quota_pre.toString());

            // repurchase <= NEST(300000)
            await expect(NestDAO.connect(userA).redeem(token, NEST(300001), {value: ETH(5) , gasPrice: 0})).to.be.reverted;     
        });

        // isDeviated == true
        it('should redeem failed!', async() => {
            //================preparation==================//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const nestStakedNum1k = params.nestStakedNum1k;
            const miningFeeRate = params.miningFeeRate;
            const tokenAmountPerEth = WBTC(100);
            const NTokenAmountPerEth = NWBTC(100);
            const msgValue = ETH(BigN(50));
 
            const NToken = await NestPool.getNTokenFromToken(token);
 
            // post2 
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
        
            const price = await NestMining.latestPriceOf(_C_NWBTC);
            //console.log(`ethAmount=${price[0]} tokenAmount=${price[1]}, blockNum=${price[2]}`);


            // priceAvgAndSigmaOf function
            const p1 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(_C_NWBTC);
            //console.log(`price=${p1[0]} avg=${p1[1]}, sigma=${show_64x64(p1[2])}, height=${p1[3]}}`);

            await NestDAO.addETHReward(_C_NWBTC, { value: ETH(30)});

            const quota_pre = await NestDAO.quotaOf(_C_NWBTC);
            //console.log("quota_pre = ",quota_pre.toString());

            await expect(NestDAO.connect(userA).redeem(_C_NWBTC, NWBTC(500), {value: ETH(5) , gasPrice: 0})).to.be.reverted;

        });


        it("can redeem correctly !", async () => {
            const token = _C_USDT;
            const ntoken = _C_NestToken;
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

            await NestDAO.setParams(NWBTC(10000), 1);

            const price = await NestMining.latestPriceOf(ntoken);
            console.log(`ethAmount=${price[0]} tokenAmount=${price[1]}, blockNum=${price[2]}`);


            // priceAvgAndSigmaOf function
            const p1 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(ntoken);
            //console.log(`price=${p1[0]} avg=${p1[1]}, sigma=${show_64x64(p1[2])}, height=${p1[3]}}`);

            await NestDAO.addETHReward(ntoken, { value: ETH(30)});

            const quota_pre = await NestDAO.quotaOf(ntoken);
            //console.log("quota_pre = ",quota_pre.toString());

            await NestDAO.connect(userB).redeem(ntoken, NWBTC(500), {value: ETH(5) , gasPrice: 0});
            
            const quota_pos = await NestDAO.quotaOf(ntoken);
            //console.log("quota_pos = ",quota_pos.toString());

            const total_pre0 = await NestDAO.totalETHRewards(ntoken);

            const nestDAO_eth0 = await provider.getBalance(NestDAO.address);
            //console.log("nestDAO_eth0 = ",nestDAO_eth0.toString());

            const total_pre = await NestDAO.totalETHRewards(ntoken);
            //console.log("total_pre = ", total_pre.toString());

            const nestDAO_eth_pre = await provider.getBalance(NestDAO.address);
            //console.log("nestDAO_eth_pre = ",nestDAO_eth_pre.toString());

            await NestDAO.connect(userB).redeem(ntoken, NWBTC(500), {value: ETH(5) , gasPrice: 0});
            const eth_B_post = await userB.getBalance(); 
            //console.log("eth_B_post = ", eth_B_post.toString());

           
            const total_pos = await NestDAO.totalETHRewards(token);
            //console.log("total_pos = ",total_pos.toString());
        
            const nestDAO_eth_pos = await provider.getBalance(NestDAO.address);
            //console.log("nestDAO_eth_pos = ",nestDAO_eth_pos.toString());

            // post2 
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });
            await NestMining.connect(userB).post2(token, 10, tokenAmountPerEth, NEST(500), { value: msgValue });
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NEST(800), { value: msgValue });
            await NestMining.connect(userB).post2(token, 10, tokenAmountPerEth, NEST(400), { value: msgValue });
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NEST(600), { value: msgValue });
            await NestMining.connect(userB).post2(token, 10, tokenAmountPerEth, NEST(900), { value: msgValue });
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NEST(600), { value: msgValue });
            await NestMining.connect(userB).post2(token, 10, tokenAmountPerEth, NEST(800), { value: msgValue });
            await goBlocks(provider, 30);

            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NEST(700), { value: msgValue });


            const price1 = await NestMining.latestPriceOf(ntoken);
            console.log(`ethAmount=${price1[0]} tokenAmount=${price1[1]}, blockNum=${price1[2]}`);


            // priceAvgAndSigmaOf function
            const p2 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(ntoken);
            console.log(`price=${p2[0]} avg=${p2[1]}, sigma=${show_64x64(p2[2])}, height=${p2[3]}}`);

            await expect(NestDAO.connect(userB).redeem(ntoken, NWBTC(500), {value: ETH(5) , gasPrice: 0})).to.be.reverted;


            
        });

    });
});