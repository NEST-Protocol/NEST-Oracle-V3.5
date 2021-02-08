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
        console.log(`> [INIT] NestPool.setContracts() ...... OK`);

        tx = await NestQuery.loadContracts();
        await tx.wait();
        console.log(`> [INIT] NestQuery.loadContracts() ...... OK`);

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
            const tx = await NestQuery.connect(userA).query(_C_USDT, userB.address, {value: ETH(1), gasPrice:0 });
            const rt = await tx.wait();
            const ev = rt.events.find((ev) => {
                if (ev.event == "PriceQueried") {
                    return true;
                }
            });     
            //console.log("event=", ev);
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


        it("can deactivate a DeFi client", async () => {
            await advanceTime(provider, 10);
            await NestQuery.connect(userA).deactivate(_C_DeFi);
            expect(DeFiMock.query(_C_USDT, {value:ETH(1).div(10)})).to.be.reverted;
        });

        it("can remove a DeFi client by the governer", async () => {
            await NestQuery.remove(_C_DeFi);
            expect(DeFiMock.query(_C_USDT, {value:ETH(1).div(10)})).to.be.reverted;
        });



        it("can load gov correctly", async () => {
           // now the nestpool's gov is userD
           await NestPool.setGovernance(userD.address);

           const gov = await NestPool.governance();

           // now the NestDAO's gov is userD
           await NestQuery.loadGovernance();

           expect(gov).to.equal(userD.address);

           //await NestQuery.connect(userD).setParams(100, 0, NEST(100000));
           await NestQuery.connect(userD).setParam(1, 100);
           await NestQuery.connect(userD).setParam(2, 0);
           await NestQuery.connect(userD).setParam(3, NEST(100000));
           
           // _singleFee is 100 X 1e12 wei
           //await NestQuery.connect(userD).setParams(100, 10, NEST(100000));
           await NestQuery.connect(userD).setParam(1, 100);
           await NestQuery.connect(userD).setParam(2, 10);
           await NestQuery.connect(userD).setParam(3, NEST(100000));

           const params = await NestQuery.params();
    
           expect(params.single).to.equal(1e14);
           expect(params.leadTime).to.equal(10);
           expect(params.nestAmount).to.equal(NEST(100000));

        });

        // check updateAndCheckPriceNow function
        it("should return result", async () => {
            await NestQuery.connect(userA).activate(userA.address);
            await ethers.provider.send("evm_increaseTime", [60 * 1000]);
            await ethers.provider.send("evm_mine");
            await MockNestMining.mock.priceListOfToken
                .withArgs(_C_USDT, 2)
                .returns([1100, ETH(10), USDT(580), 1105, ETH(10), USDT(587)], 1105);

            await MockNestMining.mock.priceAvgAndSigmaOf
                .withArgs(_C_USDT)
                .returns(USDT("587"), USDT("601"), 1234, 1004);

            await NestQuery.connect(userA).updateAndCheckPriceNow(_C_USDT, {value: ETH(1), gasPrice:0 });
        });

        // check priceList function
        it("should get a pricelist", async () => {

            await MockNestMining.mock.priceListOfToken
                .withArgs(_C_USDT, 2)
                .returns([1100, ETH(10), USDT(580), 1105, ETH(10), USDT(587)], 1105);

            await MockNestMining.mock.priceAvgAndSigmaOf
                .withArgs(_C_USDT)
                .returns(USDT("587"), USDT("601"), 1234, 1004);

            await NestQuery.connect(userA).priceList(_C_USDT, 2);
        });

    });

});