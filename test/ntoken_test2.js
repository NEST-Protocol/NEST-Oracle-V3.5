const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64, goBlocks} = require("../scripts/utils.js");

const {deployUSDT, deployWBTC, deployNN, deployERC20,
    deployNEST, deployUSDC,
    deployNestProtocol, 
    printContracts,
    setupNest} = require("../scripts/deploy.js");

const nusdc = BigNumber.from(10).pow(18);

NUSDC = function (amount) {
    return BigNumber.from(amount).mul(nusdc);
}

const usdc = BigNumber.from(10).pow(18);

USDC = function (amount) {
    return BigNumber.from(amount).mul(usdc);
}

let provider = ethers.provider;

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
        CUSDC = await deployUSDC();
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
        _C_USDC = CUSDC.address;
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_NestStaking = NestStaking.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;
        _C_NestDAO = NestDAO.address;


        const NTokenContract = await ethers.getContractFactory("NToken");
        CNUSDC = await NTokenContract.deploy('CNUSDC', '001', owner.address, NestPool.address);
    
        console.log(`>>> [DPLY]: CNUSDC deployed, address=${CNUSDC.address}`);

        await NestPool.setNTokenToToken(_C_USDC, CNUSDC.address);
        //await CNUSDC.setOfferMain(_C_NestMining);

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

    describe('USDC Token', function () {

        it("userA should approve correctly", async () => {
            await CUSDC.transfer(userA.address, USDC('10000'));
            await CUSDC.connect(userA).approve(_C_NestPool, USDC(10000));
            await CUSDC.connect(userA).approve(_C_NTokenController, USDC(1));
        })

        it("userB should approve correctly", async () => {
            await CUSDC.transfer(userB.address, USDC('10000'));
            await CUSDC.connect(userB).approve(_C_NestPool, USDC(10000));
            await CUSDC.connect(userB).approve(_C_NTokenController, USDC(1));
        })
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

    describe('NToken', function () {

        it("should load gov correctly", async () => {
            
            await CNUSDC.loadGovernance();

            await CNUSDC.connect(owner).loadContracts();

            await CNUSDC.connect(owner).resetNestPool(_C_NestPool);

            await expect(CNUSDC.connect(userA).resetNestPool(_C_NestPool)).to.be.reverted;

        });

        // check mint function 
        it("should mint correctly", async () => {

            const totalSupply_pre = await CNUSDC.totalSupply();
            console.log("totalSupply_pre = ", totalSupply_pre.toString());

            const bal_nestpool_pre = await CNUSDC.balanceOf(_C_NestPool);
            console.log("bal_nestpool_pre = ", bal_nestpool_pre.toString());


            const bal_token_pre = await NestPool.balanceOfTokenInPool(_C_NestPool, CNUSDC.address);
            console.log("bal_token_pre = ", bal_token_pre.toString());


            //================preparation==================//
            const token = _C_USDC;
            const params = await NestMining.parameters();
            const ethNum = params.miningEthUnit;
            const priceDurationBlock = params.priceDurationBlock;
            const tokenAmountPerEth = WBTC(30);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);

            await goBlocks(provider, 1000);

            await NestMining.connect(userA).post(token, ethNum, tokenAmountPerEth, { value: msgValue });
            //=========================================//

            const totalSupply_pos = await CNUSDC.totalSupply();
            //console.log("totalSupply_pos = ", totalSupply_pos.toString());

            const bal_nestpool_pos = await CNUSDC.balanceOf(_C_NestPool);
            //console.log("bal_nestpool_pos = ", bal_nestpool_pos.toString());
           
            const bal_token_pos = await NestPool.balanceOfTokenInPool(_C_NestPool, CNUSDC.address);
            //console.log("bal_token_pos = ", bal_token_pos.toString());

            const index = await NestMining.lengthOfPriceSheets(token);

            await goBlocks(provider, priceDurationBlock);

            await NestMining.connect(userA).close(token, index.sub(1));


            const bal_userA_token_pos = await NestPool.balanceOfTokenInPool(userA.address, CNUSDC.address);
            //console.log("bal_userA_token_pos = ", bal_userA_token_pos.toString());

            const userA_eth_pos = await NestPool.balanceOfEthInPool(userA.address);
            //console.log("userA_eth_pos = ", userA_eth_pos.toString());

            await NestMining.connect(userA).withdrawEthAndToken(ETH(1), CNUSDC.address, bal_userA_token_pos);

            const bal_userA_token_pos1 = await NestPool.balanceOfTokenInPool(userA.address, CNUSDC.address);
            //console.log("bal_userA_token_pos1 = ", bal_userA_token_pos1.toString());

            // msg.sender == C_NestMining
            await expect(CNUSDC.mint(USDC(10), userA.address)).to.be.reverted;
    
        });

        // check transfer function 
        it("should transfer correctly", async () => {

            const totalSupply_pre = await CNUSDC.totalSupply();
            //console.log("totalSupply_pre = ", totalSupply_pre.toString());

            const bal_nestpool_pre = await CNUSDC.balanceOf(_C_NestPool);
            //console.log("bal_nestpool_pre = ", bal_nestpool_pre.toString());

            const bal_userA_pre = await CNUSDC.balanceOf(userA.address);
            console.log("bal_userA_pre = ", bal_userA_pre.toString());

            await CNUSDC.connect(userA).transfer(userB.address, 0);

            await CNUSDC.transferFrom(userA.address, userB.address, 0);

            await CNUSDC.connect(userA).transfer(userB.address, 10);

            // no authorisation
            await expect(CNUSDC.transferFrom(userA.address, userB.address, 10)).to.be.reverted;

        });

        // check approve function
        it("should run correctly", async () => {

            await CNUSDC.connect(userA).approve(_C_NestPool, NUSDC(10));

            await CNUSDC.connect(userA).increaseAllowance(_C_NestPool, NUSDC(10));

            await CNUSDC.connect(userA).decreaseAllowance(_C_NestPool, NUSDC(5));

            await CNUSDC.allowance(userA.address, _C_NestPool);

            await expect(CNUSDC.connect(userA).approve('0x0', NUSDC(10))).to.be.reverted;
            await expect(CNUSDC.connect(userA).increaseAllowance('0x0', NUSDC(10))).to.be.reverted;
            await expect(CNUSDC.connect(userA).decreaseAllowance('0x0', NUSDC(5))).to.be.reverted;  
        });


    });
});