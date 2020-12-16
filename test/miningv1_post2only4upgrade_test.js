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
            const amount = NEST("200000");
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

    describe('post2Only4Upgrade function', function () {

        //=============================  post2Only4Upgrade function ===========================//
        //=====================================================================================//

        it("should run correctly!", async () => {
            //================preparation==================//
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);

            const NToken = await NestPool.getNTokenFromToken(token);

            //await NestMining.upgrade();

            //=========================================//

            // post2 
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { gasPrice: 0 });

            const h = await provider.getBlockNumber();
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


        it("can transfer funds correctly !", async () => {
            //================preparation==================//
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const tokenAmountPerEth = WBTC(100);
            const NTokenAmountPerEth = NWBTC(500);

            // address(token) ==> address(NToken)
            //await NTokenController.connect(userA).open(token);

            const NToken = await NestPool.getNTokenFromToken(token);

            // post 
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, tokenAmountPerEth, NTokenAmountPerEth, { gasPrice: 0} );

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


        //===========================  priceAvgAndSigmaOf  function ===========================//
        //=====================================================================================//

        // check priceAvgAndSigmaOf function
        it("should return correct data!", async () => {
            const token = _C_USDT;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const msgValue = ETH(BigN(50));
            const biteNum = ethNum;
            const NTokenAmountPerEth = NEST(500);
            const NToken = await NestPool.getNTokenFromToken(token);

            //await NestMining.upgrade();

            // post 
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(500), NTokenAmountPerEth, { gasPrice: 0 });
            await goBlocks(provider, 26);

            await NestMining.connect(userA).post2(token, ethNum, USDT(400), NTokenAmountPerEth, { value: msgValue });
            await goBlocks(provider, 25);
            
            // priceAvgAndSigmaOf function
            const p1 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(token);
            console.log(`price=${p1[0]} avg=${p1[1]}, sigma=${show_64x64(p1[2])}, height=${p1[3]}}`);



            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(450), NTokenAmountPerEth, { gasPrice: 0 });
            await goBlocks(provider, 25);

            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(350), NTokenAmountPerEth, { gasPrice: 0 });
            await goBlocks(provider, 25);

            // priceAvgAndSigmaOf function
            const p2 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(token);
            console.log(`price=${p2[0]} avg=${p2[1]}, sigma=${show_64x64(p2[2])}, height=${p2[3]}}`);



            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(550), NTokenAmountPerEth, { gasPrice: 0 });
            const index1 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userB).biteToken(token, index1.sub(1), biteNum, USDT(600), { value: msgValue });
        
            await goBlocks(provider, 26);
            await NestMining.stat(token);

            // priceAvgAndSigmaOf function
            const p3 = await NestMining.connect(_C_NestQuery).priceAvgAndSigmaOf(token);
            console.log(`price=${p3[0]} avg=${p3[1]}, sigma=${show_64x64(p3[2])}, height=${p3[3]}}`);



            // post priceSheet
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(550), NTokenAmountPerEth, { gasPrice: 0 });
            //await NestMining.connect(userA).post(token,ethNum,tokenAmountPerEth,{value: msgValue});

            const index2 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userB).biteToken(token, index2.sub(1), biteNum, USDT(600), { value: msgValue });

            await goBlocks(provider, 26);

            // Storing data to a structure
            await NestMining.stat(token);

            // priceAvgAndSigmaOf function
            const p4 = await NestMining.priceAvgAndSigmaOf(token);
            console.log(`price=${p4[0]} avg=${p4[1]}, sigma=${show_64x64(p4[2])}, height=${p4[3]}}`);



            // post priceSheet
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(600), NTokenAmountPerEth, { gasPrice: 0 });
            //await NestMining.connect(userA).post(token,ethNum,tokenAmountPerEth,{value: msgValue});

            //const index3 = await NestMining.lengthOfPriceSheets(token);
            //await NestMining.connect(userB).biteToken(token, index3.sub(1), biteNum, USDT(600), { value: msgValue });

            await goBlocks(provider, 26);

            // Storing data to a structure
            await NestMining.stat(token);

            // priceAvgAndSigmaOf function
            const p5 = await NestMining.priceAvgAndSigmaOf(token);
            console.log(`price=${p5[0]} avg=${p5[1]}, sigma=${show_64x64(p5[2])}, height=${p5[3]}}`);



            // post priceSheet
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(600), NTokenAmountPerEth, { gasPrice: 0 });
            //await NestMining.connect(userA).post(token,ethNum,tokenAmountPerEth,{value: msgValue});

            const index3 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userB).biteToken(token, index3.sub(1), biteNum, USDT(580), { value: msgValue });

            await goBlocks(provider, 26);

            // Storing data to a structure
            await NestMining.stat(token);

            // priceAvgAndSigmaOf function
            const p6 = await NestMining.priceAvgAndSigmaOf(token);
            console.log(`price=${p6[0]} avg=${p6[1]}, sigma=${show_64x64(p6[2])}, height=${p6[3]}}`);



            // post priceSheet
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(600), NTokenAmountPerEth, { gasPrice: 0 });
            //await NestMining.connect(userA).post(token,ethNum,tokenAmountPerEth,{value: msgValue});
 
            const index4 = await NestMining.lengthOfPriceSheets(token);
            await NestMining.connect(userB).biteEth(token, index4.sub(1), biteNum, USDT(580), { value: msgValue });
 
            await goBlocks(provider, 26);
 
            // Storing data to a structure
            await NestMining.stat(token);
 
            // priceAvgAndSigmaOf function
            const p7 = await NestMining.priceAvgAndSigmaOf(token);
            console.log(`price=${p7[0]} avg=${p7[1]}, sigma=${show_64x64(p7[2])}, height=${p7[3]}}`);


            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(600), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userB).post2Only4Upgrade(token, ethNum, USDT(750), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(650), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(600), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(500), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userB).post2Only4Upgrade(token, ethNum, USDT(570), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(560), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(565), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userB).post2Only4Upgrade(token, ethNum, USDT(545), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(550), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userB).post2Only4Upgrade(token, ethNum, USDT(540), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(546), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(560), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userB).post2Only4Upgrade(token, ethNum, USDT(550), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(555), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userB).post2Only4Upgrade(token, ethNum, USDT(550), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(565), NTokenAmountPerEth, { gasPrice: 0 });
            await NestMining.connect(userA).post2Only4Upgrade(token, ethNum, USDT(550), NTokenAmountPerEth, { gasPrice: 0 });

            await goBlocks(provider, 26);


            // Storing data to a structure
            await NestMining.stat(token);
 
           // priceAvgAndSigmaOf function
           const p8 = await NestMining.priceAvgAndSigmaOf(token);
           console.log(`price=${p8[0]} avg=${p8[1]}, sigma=${show_64x64(p8[2])}, height=${p8[3]}}`);

        });

    });

});