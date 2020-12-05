const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { BN, time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const {deployMockContract} = require('@ethereum-waffle/mock-contract');

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN, 
    goBlocks, advanceBlock, advanceTime,
    show_eth, show_usdt, show_64x64} = require("../scripts/utils.js");

const {deployUSDT, deployWBTC, deployNN, 
    deployNEST, 
    deployNestProtocol, 
    printContracts,
    setupNest} = require("../scripts/deploy.js");

let provider = ethers.provider;

describe("Nest Protocol", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    let owner;
    let userA;
    let userB;

    before(async function () {

        [owner, userA, userB, userC, userD, dev, NNodeA, NNodeB] = await ethers.getSigners();

        CUSDT = await deployUSDT();
        CWBTC = await deployWBTC();
        [NestToken, IterableMapping] = await deployNEST();
        NNToken = await deployNN();
        let contracts = {
            USDT: CUSDT, 
            WBTC: CWBTC, 
            NEST: NestToken, 
            IterableMapping: IterableMapping,
            NN: NNToken}; 
        const addrOfNest = await deployNestProtocol(owner, contracts);
        await printContracts("json", addrOfNest);
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
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_NestStaking = NestStaking.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;
        _C_NestDAO = NestDAO.address;


        DeFiMockContract = await ethers.getContractFactory("DeFiMock");
        DeFiMock = await DeFiMockContract.deploy(NestQuery.address);

        _C_DeFi = DeFiMock.address;

        const INestMining = require("../artifacts/contracts/iface/INestMining.sol/INestMining");
        MockNestMining = await deployMockContract(owner, INestMining.abi);
        await MockNestMining.mock.loadContracts.returns();

        tx = await NestPool.setContracts(NestToken.address, MockNestMining.address, 
            NestStaking.address, NTokenController.address, NNToken.address, 
            NNRewardPool.address, NestQuery.address, NestDAO.address);
        await tx.wait();
        console.log(`> [INIT] NestPool.setContracts()`);

        tx = await NestPool.setNTokenToToken(CUSDT.address, NestToken.address);

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

        it("should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await NestToken.balanceOf(owner.address);
            expect(await NestToken.totalSupply()).to.equal(ownerBalance);
        });
    });

    describe('NEST Token', function () {
        it("should have correct totalSupply, NEST(10,000,000,000)", async () => {
            const expectedTotalSupply = NEST('10000000000');
            let totalSupply = await NestToken.totalSupply();
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
            await expect(
                NestToken.connect(owner).transfer(userA.address, amount)
            ).to.be.reverted;
        });

        it("should approve correctly, NEST(10,000,000,000) [userA -> _C_NestStaking]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestStaking, amount);
            const approved = await NestToken.allowance(userA.address, _C_NestStaking);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000) [userB -> _C_NestStaking]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userB).approve(_C_NestStaking, amount);
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

    describe('Nest Query', function () {

        it("can activate a client", async () => {
            await NestToken.connect(userA).approve(_C_NestQuery, NEST(1000000));
            await NestQuery.connect(userA).activate(userA.address);
            const op = await NestQuery.clientOp(userA.address);
            expect(op).to.equal(userA.address);
        });

        it("can deactivate a client", async () => {
            await NestQuery.connect(userA).deactivate(userA.address);
            const op = await NestQuery.clientOp(userA.address);
            expect(op).to.equal(BigN(0));
        });

        it("can query from a client", async () => {
            await NestQuery.connect(userA).activate(userA.address);
            await ethers.provider.send("evm_increaseTime", [60 * 1000]);
            await ethers.provider.send("evm_mine");
            await MockNestMining.mock.latestPriceOf
                .withArgs(_C_USDT)
                .returns(ETH("10"), USDT("5750"), BigNumber.from(1002));
            const tx = await NestQuery.connect(userA).query(_C_USDT, userB.address, {value: ETH(1)});
            const rt = await tx.wait();
            const ev = rt.events.find((ev) => {
                if (ev.event == "PriceQueried") {
                    return true;
                }
            });     
            expect(ev.args.ethAmount).to.equal(ETH(10));
            expect(ev.args.tokenAmount).to.equal(USDT(5750));
            expect(ev.args.bn).to.equal(1002);
            await NestQuery.connect(userA).deactivate(userA.address);
        });

        it("can query avg and vola from a client", async () => {
            await NestQuery.connect(userA).activate(userA.address);
            await ethers.provider.send("evm_increaseTime", [60 * 1000]);
            await ethers.provider.send("evm_mine");
            await MockNestMining.mock.latestPriceOf
                .withArgs(_C_USDT)
                .returns(ETH("10"), USDT("5840"), BigNumber.from(1003));

            await MockNestMining.mock.priceAvgAndSigmaOf
                .withArgs(_C_USDT)
                .returns(USDT("587"), USDT("601"), 1234, 1004);

            const tx = await NestQuery.connect(userA).queryPriceAvgVola(_C_USDT, userB.address, {value: ETH(1)});
            const rt = await tx.wait();
            const ev = rt.events.find((ev) => {
                if (ev.event == "PriceAvgVolaQueried") {
                    return true;
                }
            });

            expect(ev.args.client).to.equal(userA.address);
            expect(ev.args.token).to.equal(_C_USDT);
            expect(ev.args.avgPrice).to.equal(USDT("601"));
            expect(ev.args.vola).to.equal(1234);
            expect(ev.args.bn).to.equal(1003);
            await NestQuery.connect(userA).deactivate(userA.address);
        });

        it("can query price list from a client", async () => {
            await NestQuery.connect(userA).activate(userA.address);
            await ethers.provider.send("evm_increaseTime", [60 * 1000]);
            await ethers.provider.send("evm_mine");
            await MockNestMining.mock.priceListOfToken
                .withArgs(_C_USDT, 2)
                .returns([1100, ETH(10), USDT(580), 1105, ETH(10), USDT(587)], 1105);

            await MockNestMining.mock.priceAvgAndSigmaOf
                .withArgs(_C_USDT)
                .returns(USDT("587"), USDT("601"), 1234, 1004);

            const tx = await NestQuery.connect(userA).queryPriceList(_C_USDT, 2, userB.address, {value: ETH(1)});
            const rt = await tx.wait();
            const ev = rt.events.find((ev) => {
                if (ev.event == "PriceListQueried") {
                    return true;
                }
            });

            expect(ev.args.client).to.equal(userA.address);
            expect(ev.args.token).to.equal(_C_USDT);
            expect(ev.args.num).to.equal(2);
            expect(ev.args.bn).to.equal(1105);

            await NestQuery.connect(userA).deactivate(userA.address);

        });

        it("can activate a DeFi client", async () => {
            await NestToken.connect(userA).approve(_C_NestQuery, NEST(1000000));
            await NestQuery.connect(userA).activate(_C_DeFi);
        });

        it("can perform a query by a DeFi client", async () => {
            await ethers.provider.send("evm_increaseTime", [60 * 1000]);
            await ethers.provider.send("evm_mine");
            await DeFiMock.query(_C_USDT, {value:ETH(1).div(10)});
        });

        it("cannot query when paused", async () => {
            await NestQuery.pause();
            await expect(DeFiMock.query(_C_USDT, {value:ETH(1).div(10)})).to.be.reverted;
            await NestQuery.resume();
            await DeFiMock.query(_C_USDT, {value:ETH(1).div(10)});
        });
        
/*
        it("can deactivate a DeFi client", async () => {
            await advanceTime(provider, 10);
            await NestQuery.connect(userA).deactivate(_C_DeFi);
            expect(DeFiMock.query(_C_USDT, {value:ETH(1).div(10)})).to.be.reverted;
        });

        it("can remove a DeFi client by the governer", async () => {
            await NestQuery.remove(_C_DeFi);
            expect(DeFiMock.query(_C_USDT, {value:ETH(1).div(10)})).to.be.reverted;
        });

        it("can query a price", async () => {
            await MockNestMining.mock.latestPriceOf.returns({ethAmount: ETH(10), tokenAmount: USDT(5750), blockNum: 1002});
            const rs = await NestQuery.query(_C_USDT);

        });

        it("can post 7 price sheets", async () => {
            const nestPrice = NEST(1000);
            const usdtPrice = USDT(350);
            const chunkSize = 10;
            const ethNum = BigNumber.from(10);
            const msgValue = ethers.utils.parseEther("21.0");

            await CUSDT.transfer(userA.address, USDT('10000000'));
            await CUSDT.transfer(userB.address, USDT('10000000'));
            await CUSDT.connect(userA).approve(_C_NestPool, USDT(1000000));
            await CUSDT.connect(userB).approve(_C_NestPool, USDT(1000000));

            await NestMining.connect(userA).post2(_C_USDT, 10, USDT(450), NEST(1000), { value: msgValue });
            await goBlocks(provider, 5);
            await NestMining.connect(userA).post2(_C_USDT, 10, USDT(452), NEST(1010), { value: msgValue });
            await goBlocks(provider, 5);
            await NestMining.connect(userA).post2(_C_USDT, 10, USDT(450), NEST(1003), { value: msgValue });
            await goBlocks(provider, 5);            
            await NestMining.connect(userA).post2(_C_USDT, 10, USDT(453), NEST(1005), { value: msgValue });
            await goBlocks(provider, 5);            
            await NestMining.connect(userA).post2(_C_USDT, 10, USDT(451), NEST(1011), { value: msgValue });
            await goBlocks(provider, 5);            
            await NestMining.connect(userA).post2(_C_USDT, 10, USDT(454), NEST(1013), { value: msgValue });
            await goBlocks(provider, 5);            
            await NestMining.connect(userA).post2(_C_USDT, 10, USDT(452), NEST(1002), { value: msgValue });
            await goBlocks(provider, 30);

            expect(await NestMining.lengthOfPriceSheets(_C_USDT)).to.equal(7);
        });

        it("can stat the price", async () => {
            const nestPrice = NEST(1000);
            const usdtPrice = USDT(350);
            const chunkSize = 10;
            const ethNum = BigNumber.from(10);
            const msgValue = ethers.utils.parseEther("21.0");

            const tx = await NestMining.connect(userB).stat(_C_USDT);
            const receipt = await tx.wait();
            // console.log("receipt=", receipt);
            const ev = receipt.events.find((ev) => {
                if (ev.event == "PriceComputed") {
                    return true;
                }
            });
            console.log("event=", ev);
            const rs = await NestMining.latestPriceOf(_C_USDT);
            console.log(`price(USDT){ethNum:${rs.ethNum}, tokenAmount:${rs.tokenAmount.div(usdtdec).toString()},h=${rs.atHeight}}`);
            // console.log("sigma_sq=", show_64x64(vo.volatility_sigma_sq));
            // console.log("tokenAvgPrice=", show_64x64(vo.tokenAvgPrice));
            // console.log("vola=", vo);
            const price = await NestMining.priceAvgAndSigmaOf(_C_USDT);
            console.log("price=", price);
            console.log("sigma=", show_64x64(price[2]));
            console.log("avg=", show_64x64(price[1]));
        });


        it("can post and then stat the price", async () => {
            const msgValue = ETH("21");

            // Get the filter (the second null could be omitted)
            // const filter = NestMining.filters.PriceComputed(null, null, null, null, null);
            // NestMining.queryfilter(filter);
            const tr = await NestMining.connect(userB).post2(_C_USDT, 10, USDT(450), NEST(1000), { value: msgValue });
            let receipt = await tr.wait();
            let ev = receipt.events.find((ev) => {
                if (ev.event == "PricePosted") {
                    console.log("PricePosted=", ev.args);
                    return true;
                }
            });

            // NestMining.on("PricePosted", (x1, x2, x3, x4, x5) => {
            //     console.log("PricePosted=", x1, x2, x3, x4, x5);
            // });
  
            console.log("tr=", (await tr.wait()).logs);
            await goBlocks(provider, 30);

            const tx = await NestMining.connect(userB).stat(_C_USDT);
            receipt = await tx.wait();
            console.log("receipt=", receipt);
            console.log("receipt.log=", receipt.logs);
            ev = receipt.events.find((ev) => {
                if (ev.event == "PriceComputed") {
                    console.log("PriceComputed=", ev.args);
                    return true;
                }
            });
            console.log("event=", ev);
            const rs = await NestMining.latestPriceOf(_C_USDT);
            console.log(`price(USDT){ethNum:${rs.ethNum}, tokenAmount:${rs.tokenAmount.div(usdtdec).toString()},h=${rs.atHeight}}`);
            // const vo = await NestMining.volatility(_C_USDT);
            // console.log("sigma_sq=", show_64x64(vo.volatility_sigma_sq));
            // console.log("tokenAvgPrice=", show_64x64(vo.tokenAvgPrice));
            // console.log("vola=", vo);
            const price = await NestMining.priceAvgAndSigmaOf(_C_USDT);
            console.log("price=", price);
            console.log("sigma=", show_64x64(price[2]));
            console.log("avg=", show_64x64(price[1]));
        });


        it("can withdraw NEST from the contract", async () => {
            const blns = await NestQuery.balanceNest();
            console.log("nest balance=", blns);
            await NestQuery.withdrawNest(userA.address, blns);
        });

        */
        // it("should be able to clear a price sheet correctly", async () => {

        //     const ethNum = BN(10);
        //     const chunkNum = BN(1);
        //     const chunkSize = BN(10);

        //     console.log(`provider=`, provider);
        //     const h = await provider.getBlockNumber();
        //     console.log(`height=${h}`);

        //     await goBlocks(provider, 25);
        //     const usdtPrice = USDT(350);

        //     const nest_userA_pre = await NestPool.getMinerNest(userA.address);
        //     const eth_nestpool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
        //     const ethPool_userA_pre = await NestPool.balanceOfEthInPool(userA.address);
        //     const usdtPool_userA_pre = await NestPool.balanceOfTokenInPool(userA.address, _C_USDT);

        //     const tx = await NestMining.connect(userA).clear(_C_USDT, 0, 1);

        //     // G1:
        //     const sheet = await NestMining.contentOfPriceSheet(_C_USDT, 0);
        //     expect(sheet.state).to.equal(1);
        // });

    });

});