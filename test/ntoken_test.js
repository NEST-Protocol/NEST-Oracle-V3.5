const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64} = require("../scripts/utils.js");

const {deployUSDT, deployWBTC, deployNN, deployERC20,
    deployNEST, 
    deployNestProtocol, 
    printContracts,
    setupNest} = require("../scripts/deploy.js");

describe("NestToken contract", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    let owner;
    let userA;
    let userB;
    let userC;
    let userD;

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
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_NestStaking = NestStaking.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;
        _C_NestDAO = NestDAO.address;

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

        it("Should assign the total supply of tokens to the owner", async function () {
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
            expect(NestToken.connect(owner).transfer(userA.address, amount)).to.be.reverted;
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

    describe('NTokenController', function () {

        let _C_NWBTC;

        it("can open a new NToken correctly", async () => {
            await CWBTC.transfer(userB.address, WBTC(5));
            await NTokenController.start(10);
            await CWBTC.connect(userB).approve(_C_NTokenController, WBTC(1000));
            await NestToken.connect(userB).approve(_C_NTokenController, NEST(1000000));
            const tx = await NTokenController.connect(userB).open(_C_WBTC);
            const receipt = await tx.wait();
            const ev = receipt.events.find((ev) => {
                if (ev.event == "NTokenOpened") {
                    return true;
                }
            });
            expect(ev.args.token).to.equal(_C_WBTC);
            expect(ev.args.owner).to.equal(userB.address);
            _C_NWBTC = await NestPool.getNTokenFromToken(_C_WBTC);
            expect(_C_NWBTC).to.equal(ev.args.ntoken);

            CNWBTC = await ethers.getContractAt("NToken",  _C_NWBTC);
            console.log(` NToken.name=${await CNWBTC.name()}, symbol=${await CNWBTC.symbol()}`);
            // expect(await NTokenController.balanceNest()).to.equal(NEST(100_000));
        });

        it("cannot open an existing ntoken", async () => {
            await expect(NTokenController.connect(userB).open(_C_NWBTC))
                .to.be.reverted;
        });

        it("cannot open a disabled ntoken", async () => {
            CWETH = await deployERC20(100000000, "WETH", "WETH", 18);
            await NTokenController.disable(CWETH.address);
            await expect(NTokenController.connect(userB).open(CWETH.address))
                .to.be.reverted;
        });

        it("can open an enabled ntoken", async () => {
            CWETH = await deployERC20("10000000000000000000000000000", "WETH", "WETH", 18);
            console.log("CWETH.total=", (await CWETH.totalSupply()).toString());
            await CWETH.transfer(userB.address, ETH(10));

            await CWETH.connect(userB).approve(_C_NTokenController, ETH(1000));
            await NTokenController.disable(CWETH.address);
            await NTokenController.enable(CWETH.address);


            await NTokenController.connect(userB).open(CWETH.address);
            _C_NWETH = await NestPool.getNTokenFromToken(CWETH.address);
            CNWETH = await ethers.getContractAt("NToken",  _C_NWETH);
            expect(await CNWETH.name()).to.equal("NToken0011");
        });

        it("cannot open ntoken after shutdown ", async () => {
            CWETH = await deployERC20(100000000, "WETH", "WETH", 18);
            await NTokenController.pause();
            await expect(NTokenController.connect(userB).open(CWETH.address))
                .to.be.reverted;
        });

    });

});