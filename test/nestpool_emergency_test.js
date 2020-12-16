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

    describe('testing emergency function', function () {
        
        //=======================================  NestPool  =======================================//
        //==========================================================================================//

        /*
        //=============================  drainEth in nestpool  ===========================//
        it('should transfer funds correctly!', async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);
            const balance = await CNWBTC.balanceOf(NToken);

            // post 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            const uesrC_eth_in_exaddress_pre = await provider.getBalance(userC.address);

            const total_eth_in_nestpool_pre = await provider.getBalance(_C_NestPool);

            // drainEth
            await NestPool.drainEth(userC.address, total_eth_in_nestpool_pre);

            const uesrC_eth_in_exaddress_pos = await provider.getBalance(userC.address);

            const total_eth_in_nestpool_pos = await provider.getBalance(_C_NestPool);

            await goBlocks(provider, priceDurationBlock);
            const index = await NestMining.lengthOfPriceSheets(token);
            
            await expect(NestMining.connect(userA).closeAndWithdraw(token, index.sub(1))).to.be.reverted;

            expect(uesrC_eth_in_exaddress_pre.add(total_eth_in_nestpool_pre)).to.equal(uesrC_eth_in_exaddress_pos);
           
            expect(total_eth_in_nestpool_pos).to.equal(0);

        });

        */
       /*
        //=============================  drainNest in nestpool  ===========================//
        it('should transfer funds correctly!', async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            // post 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            const balanceOfNest_in_nestpool = await NestToken.balanceOf(_C_NestPool);
            const userC_balanceOfNest_pre = await NestToken.balanceOf(userC.address);

            // drainEth
            await NestPool.drainNest(userC.address, balanceOfNest_in_nestpool);
            
            const balanceOfNest_in_nestpool_pos = await NestToken.balanceOf(_C_NestPool);
            const userC_balanceOfNest_pos = await NestToken.balanceOf(userC.address);

            await goBlocks(provider, priceDurationBlock);
            const index = await NestMining.lengthOfPriceSheets(token);
            
           
            await expect(NestMining.connect(userA).closeAndWithdraw(token, index.sub(1))).to.be.reverted;

            expect(userC_balanceOfNest_pre.add(balanceOfNest_in_nestpool)).to.equal(userC_balanceOfNest_pos);
           
            expect(balanceOfNest_in_nestpool_pos).to.equal(0);

        });

        */
        /*
        //=============================  drainToken in nestpool  ===========================//
        it('should transfer funds correctly!', async () => {
            const token = _C_WBTC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);
            const balance = await CNWBTC.balanceOf(NToken);

            // post 
            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });

            const balanceOfToken_in_nestpool = await CWBTC.balanceOf(_C_NestPool);
            const userC_balanceOfToken_pre = await CWBTC.balanceOf(userC.address);

            // drainToken
            await NestPool.drainToken(token, userC.address, balanceOfToken_in_nestpool);
            
            const balanceOfToken_in_nestpool_pos = await CWBTC.balanceOf(_C_NestPool);
            const userC_balanceOfToken_pos = await CWBTC.balanceOf(userC.address);

            await goBlocks(provider, priceDurationBlock);
            const index = await NestMining.lengthOfPriceSheets(token);
            
           
            await expect(NestMining.connect(userA).closeAndWithdraw(token, index.sub(1))).to.be.reverted;

            expect(userC_balanceOfToken_pre.add(balanceOfToken_in_nestpool)).to.equal(userC_balanceOfToken_pos);
           
            expect(balanceOfToken_in_nestpool_pos).to.equal(0);

        });
        */

    });

});