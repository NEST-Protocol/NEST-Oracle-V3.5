const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const {deployMockContract} = require('@ethereum-waffle/mock-contract');

const {usdtdec, wbtcdec, nestdec, ethdec, 
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64, goBlocks} = require("../scripts/utils.js");

const {deployUSDT, deployWBTC, deployNN, deployERC20,
    deployNEST, deployNWBTC,
    deployNestProtocol, 
    printContracts,
    setupNest} = require("../scripts/deploy.js");

const nwbtc = BigNumber.from(10).pow(18);

let provider = ethers.provider;


NWBTC = function (amount) {
    return BigNumber.from(amount).mul(nwbtc);
}

describe("NestToken contract", function () {
        // Mocha has four functions that let you hook into the the test runner's
        // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.
    
    let owner;
    let userA;
    let userB;
    let userC;
    let userD;

    let NestDAO;
    
    before(async function () {
    
        [owner, userA, userB, userC, userD] = await ethers.getSigners();
    
        CUSDT = await deployUSDT();
        CWBTC = await deployWBTC();
        [NestToken, IterableMapping] = await deployNEST();
        NNToken = await deployNN();
        CNWBTC = await deployNWBTC(owner);


        _C_USDT = CUSDT.address;
        _C_WBTC = CWBTC.address;
        _C_NWBTC = CNWBTC.address;
        _C_NestToken = NestToken.address;

        const NestPoolContract = await ethers.getContractFactory("NestPool");
        NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract
        await NestPool.deployed();
        console.log(`>>> [DPLY]: NestPool deployed, address=${NestPool.address}, block=${NestPool.deployTransaction.blockNumber}`);

        _C_NestPool = NestPool.address;

        const NestStakingContract = await ethers.getContractFactory("NestStaking");
        NestStaking = await NestStakingContract.deploy();
        console.log(`>>> [DPLY]: NestStaking deployed, address=${NestStaking.address}, block=${NestStaking.deployTransaction.blockNumber}`);
    
        tx = await NestStaking.initialize(NestPool.address);
        console.log(`>>> [INIT]: NestStaking initialized, block=${tx.blockNumber}`);

        const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
        const NTokenController = await NTokenControllerContract.deploy(NestPool.address);
        console.log(`>>> [DPLY]: NTokenController deployed, address=${NTokenController.address}`);
    
        const NestQueryContract = await ethers.getContractFactory("NestQuery");
        NestQuery = await NestQueryContract.deploy();
        await NestQuery.deployTransaction.wait();
        console.log(`>>> [DPLY]: NestQuery deployed, address=${NestQuery.address}, block=${NestQuery.deployTransaction.blockNumber}`);
    
        tx = await NestQuery.initialize(NestPool.address);
        await tx.wait();
        console.log(`>>> [INIT]: NestMining initialized, block=${tx.blockNumber}`);

        const NestDAOContract = await ethers.getContractFactory("NestDAO");
        NestDAO = await NestDAOContract.deploy();
        tx = NestDAO.deployTransaction;
        receipt = await tx.wait();
        console.log(`>>> [DPLY]: NestDAO deployed, address=${NestDAO.address}, block=${tx.blockNumber}`);
      
        _C_NestDAO = NestDAO.address;

        const INestMining = require("../artifacts/contracts/iface/INestMining.sol/INestMining");
        MockNestMining = await deployMockContract(owner, INestMining.abi);
        
        const INNRewardPool = require("../artifacts/contracts/iface/INNRewardPool.sol/INNRewardPool");
        MockNNRewardPool = await deployMockContract(owner, INNRewardPool.abi);

        const INestQuery = require("../artifacts/contracts/iface/INestQuery.sol/INestQuery");
        MockNestQuery = await deployMockContract(owner, INestQuery.abi);


        tx = await NestDAO.initialize(NestPool.address);
        console.log(`>>> [INIT]: NestDAO initialized, block=${tx.blockNumber}`);

        _C_NestMining = MockNestMining.address;
        _C_NestStaking = NestStaking.address;

        await NestPool.setNTokenToToken(_C_WBTC, _C_NWBTC);
        await CNWBTC.setOfferMain(_C_NestMining);

        // await MockNestPool.mock.addrOfNestToken.returns(_C_NestToken);
        // await MockNestPool.mock.addrOfNestStaking.returns(_C_NestStaking);
        // await MockNestPool.mock.addrOfNestQuery.returns(_C_NestQuery);
        // await MockNestPool.mock.addrOfNestMining.returns(_C_NestMining);

        tx = await NestPool.setContracts(NestToken.address, MockNestMining.address, 
            NestStaking.address, NTokenController.address, NNToken.address, 
            MockNNRewardPool.address, MockNestQuery.address, NestDAO.address);
        await tx.wait();
        console.log(`> [INIT] NestPool.setContracts() ...... OK`);


        await NestDAO.loadContracts();
        console.log(`>>> [STUP]: NestDAO.loadContracts() ....... OK `);

        await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);
    
    });


    describe('NEST Token', function () {
        it("should have correct totalSupply, NEST(10,000,000,000)", async () => {
            const expectedTotalSupply = NEST('10000000000');
            let totalSupply = await NestToken.totalSupply();
            const amount = NEST("20000000");
            await NestPool.initNestLedger(amount);
            expect(totalSupply).to.equal(expectedTotalSupply);
        });

        it("should transfer correctly, NEST(2,000,000,000) [Owner => userA]", async () => {
            const amount = NEST("2000000000");
            await NestToken.connect(owner).transfer(userA.address, amount, { gasPrice: 0});
            const userA_balance = await NestToken.balanceOf(userA.address);
            expect(userA_balance).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000) [userA -> _C_NestDAO]", async () => {
            const amount = NEST("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestDAO, amount, { gasPrice: 0});
            const approved = await NestToken.allowance(userA.address, _C_NestDAO);
            expect(approved).to.equal(amount);
        });

    });

    describe('NWBTC NToken', function () {

        it("userA should approve correctly", async () => {
            await CNWBTC.transfer(userA.address, NWBTC('400000'));
            await CNWBTC.connect(userA).approve(_C_NestPool, NWBTC('4000000'));
            await CNWBTC.connect(userA).approve(_C_NestDAO, NWBTC('4000000'));
        })

        it("userB should approve correctly", async () => {
            await CNWBTC.transfer(userB.address, NWBTC('400000'));
            await CNWBTC.connect(userB).approve(_C_NestPool, NWBTC('4000000'));
            await CNWBTC.connect(userB).approve(_C_NestDAO, NWBTC('4000000'));
        })

    });


    describe('Nest DAO', function () {

        it("can start", async () => {
            await NestDAO.start();
            expect(await NestDAO.flag()).to.equal(2);
        });

        it("can collect NEST reward", async () => {
            await NestToken.connect(userA).approve(_C_NestPool, NEST("2000000000"), { gasPrice: 0});
            await NestPool.depositNToken(_C_NestDAO, userA.address, _C_NestToken, NEST(100));
            const rs_pre = await NestDAO.ntokenLedger(_C_NestToken);
            await NestDAO.collectNestReward();
            const rs_post = await NestDAO.ntokenLedger(_C_NestToken);
            expect(rs_pre.rewardedAmount.add(NEST(100))).to.equal(NEST(100));
            expect(rs_post.rewardedAmount).to.equal(0);
        });

        it("can collect ETH reward", async () => {
            const bn = await ethers.provider.getBlockNumber();
            await NestToken.transfer(_C_NestDAO, NEST(100));
            await NestDAO.collectETHReward(_C_NestToken);
        });

        it("can redeem", async () => {
            const bn = await ethers.provider.getBlockNumber();
            //await MockNestQuery.mock.priceAvgAndSigmaOf.withArgs(_C_NestToken).returns(ETH(100), NEST(10000), ETH(100), 21, bn);
            //await MockNestQuery.mock.queryPriceAvgVola.returns(ETH(100), NEST(10000), ETH(100), 21, bn);
            await MockNestMining.mock.latestPriceOf.withArgs(_C_NestToken).returns(ETH(100), NEST(10000), bn);
            await MockNestMining.mock.priceAvgAndSigmaOf.withArgs(_C_NestToken).returns(ETH(90), ETH(100), 5, 100);

            await NestDAO.addETHReward(_C_NestToken, { value: ETH(2)});

            const eth_A_pre = await userA.getBalance(); 
            await NestDAO.connect(userA).redeem(_C_NestToken, NEST(100), {value:ETH(1), gasPrice: 0});
            const eth_A_post = await userA.getBalance(); 
            expect(eth_A_post.sub(eth_A_pre)).to.equal(ETH(99).div(100));
        });


        // check addNestReward function
        it("can addNestReward correctly", async () => {
            const amount = NEST(100);

            await NestDAO.addNestReward(amount);
            
            // now the nestpool's gov is userD
            await NestPool.setGovernance(userD.address);

            const gov = await NestPool.governance();

            // now the NestDAO's gov is userD
            await NestDAO.loadGovernance();

            expect(gov).to.equal(userD.address);

            await NestDAO.connect(userD).addNestReward(amount);

            await expect(NestDAO.connect(userB).addNestReward(amount)).to.be.reverted;

        });


        // should initialize failed
        it(" NestDAO shuld initialize failed", async () => {

            // not allowed initialized again
            await expect(NestDAO.initialize(NestPool.address)).to.be.reverted;

        });


        // should start failed
        it(" should start failed ", async () => {

            await expect(NestDAO.connect(userD).start()).to.be.reverted;
        });

  
        // should pause correctly
        it(" should start failed ", async () => {

            // now the gov is userD
            await NestDAO.connect(userD).pause();
            await expect(NestDAO.connect(userB).pause()).to.be.reverted;
        });

        
        // should resume failed
        it(" should resume failed ", async () => {

            // now the gov is userD
            await NestDAO.connect(userD).resume();
            await expect(NestDAO.connect(userB).resume()).to.be.reverted;

        });


        // should collect ETH reward failed
        it(" should collect ETH reward failed ", async () => {

            // USDT is token
            await expect(NestDAO.collectETHReward(_C_USDT)).to.be.reverted;

            // bal == 0
            const bal = await CNWBTC.balanceOf(_C_NestDAO);

            const rewards = await NestDAO.collectETHReward(_C_NWBTC);

            expect(rewards.value).to.equal(bal);

        });

        // should redeem failed 
        it(" should redeem failed ", async () => {

            
            let bn = await ethers.provider.getBlockNumber();
            
            //await MockNestMining.mock.priceAvgAndSigmaOf.withArgs(_C_NWBTC).returns(NWBTC(95), NWBTC(100), 21, bn);
            //await MockNestQuery.mock.queryPriceAvgVola.returns(ETH(100), NWBTC(9500), ETH(100), 21, bn);
            await MockNestMining.mock.latestPriceOf.withArgs(_C_NWBTC).returns(ETH(100), NWBTC(9500), bn);
            await MockNestMining.mock.priceAvgAndSigmaOf.withArgs(_C_NWBTC).returns(NWBTC(95), NWBTC(100), 21, 10);
            

            // require ntoken 
            await expect(NestDAO.connect(userA).redeem(_C_USDT, NEST(100), {value:ETH(1), gasPrice: 0})).to.be.reverted;


            const bal = await NestDAO.totalETHRewards(_C_NWBTC);
            
            expect(bal).to.equal(0);

            // require bal > 0
            await expect(NestDAO.connect(userA).redeem(_C_NWBTC, NWBTC(100), {value:ETH(1), gasPrice: 0})).to.be.reverted;
            
            await NestDAO.addETHReward(_C_NWBTC, { value: ETH(20)});


            // ntokenRepurchaseThreshold = NWBTC(1000000)
            await NestDAO.connect(userD).setParams(NWBTC(1000000), 10);

            // require totalSupply > ntokenRepurchaseThreshold
            await expect(NestDAO.connect(userA).redeem(_C_NWBTC, NWBTC(100), {value:ETH(1), gasPrice: 0})).to.be.reverted;

            const quota = await NestDAO.quotaOf(_C_NWBTC);

            expect(quota).to.equal(0);

            // ntokenRepurchaseThreshold = NWBTC(1000)
            await NestDAO.connect(userD).setParams(NWBTC(10000), 10);

            // require totalSupply > ntokenRepurchaseThreshold
            await expect(NestDAO.connect(userA).redeem(_C_NWBTC, NWBTC(100), {value:ETH(1), gasPrice: 0})).to.be.reverted;

            const quota1 = await NestDAO.quotaOf(_C_NWBTC);

            await goBlocks(provider, 400);

            const quota2 = await NestDAO.quotaOf(_C_NWBTC);
            
            
            //await MockNestMining.mock.priceAvgAndSigmaOf.withArgs(_C_NestToken).returns(NEST(120), NEST(100), 21, bn);
            //await MockNestQuery.mock.queryPriceAvgVola.returns(ETH(100), NEST(12000), ETH(100), 21, bn);
            await MockNestMining.mock.latestPriceOf.withArgs(_C_NestToken).returns(ETH(100), NEST(12000), bn);
            await MockNestMining.mock.priceAvgAndSigmaOf.withArgs(_C_NestToken).returns(NWBTC(95), NEST(100), 21, 10);
       
            // require price deviation < 5%
            await expect(NestDAO.connect(userA).redeem(_C_NestToken, NEST(100), { gasPrice: 0})).to.be.reverted;
            
            // flag = DAO_FLAG_PAUSED;
            await NestDAO.connect(userD).pause();
            
            // require flag == DAO_FLAG_ACTIVE
            await expect(NestDAO.connect(userA).redeem(_C_NestToken, NEST(100), {value:ETH(1), gasPrice: 0})).to.be.reverted;

            await NestDAO.connect(userD).resume();
            
            //await MockNestMining.mock.priceAvgAndSigmaOf.withArgs(_C_NestToken).returns(NEST(100), NEST(100), 21, bn);
            //await MockNestQuery.mock.queryPriceAvgVola.returns(ETH(100), NEST(10000), ETH(100), 21, bn);
            await MockNestMining.mock.latestPriceOf.withArgs(_C_NestToken).returns(ETH(100), NEST(10000), bn);
            await MockNestMining.mock.priceAvgAndSigmaOf.withArgs(_C_NestToken).returns(NWBTC(95), NEST(100), 21, 10);

            
            // require amount < quota
            await expect(NestDAO.connect(userA).redeem(_C_NestToken, NEST(50000), {value:ETH(1), gasPrice: 0})).to.be.reverted;

            // the eth to be redeemed is less than the current remaining eth
            const bal_nestToken = await NestDAO.totalETHRewards(_C_NestToken);

            const withdraw_amount = BigN(bal_nestToken).mul(100).add(NEST(100));
            
            await expect(NestDAO.connect(userA).redeem(_C_NestToken, withdraw_amount, {value:ETH(1), gasPrice: 0})).to.be.reverted;

            await goBlocks(provider, 10);

            // should redeem succeed
            await NestDAO.connect(userA).redeem(_C_NestToken, bal_nestToken, {value:ETH(1), gasPrice: 0});
            
        });

        // check redeem funds
        it("can redeem correctly", async () => {
            const bn = await ethers.provider.getBlockNumber();
            await MockNestMining.mock.latestPriceOf.withArgs(_C_NestToken).returns(ETH(100), NEST(10000), bn);
            await MockNestMining.mock.priceAvgAndSigmaOf.withArgs(_C_NestToken).returns(ETH(90), ETH(100), 5, 100);

            const total_pre0 = await NestDAO.totalETHRewards(_C_NestToken);

            const nestDAO_eth0 = await provider.getBalance(NestDAO.address);
            
            await NestDAO.addETHReward(_C_NestToken, { value: ETH(2)});

            const eth_A_pre = await userA.getBalance();

            const total_pre = await NestDAO.totalETHRewards(_C_NestToken);
            console.log("total_pre = ", total_pre.toString());

            const nestDAO_eth_pre = await provider.getBalance(NestDAO.address);
        

            await NestDAO.connect(userA).redeem(_C_NestToken, NEST(100), {value: ETH(5) , gasPrice: 0});
            const eth_A_post = await userA.getBalance(); 
           
            const total_pos = await NestDAO.totalETHRewards(_C_NestToken);
        
            const nestDAO_eth_pos = await provider.getBalance(NestDAO.address);
        
            expect(eth_A_post.sub(eth_A_pre)).to.equal(ETH(99).div(100));
            expect(total_pre.sub(total_pos)).to.equal(ETH(99).div(100));
            expect(nestDAO_eth_pre.sub(nestDAO_eth_pos)).to.equal(ETH(99).div(100));
        });


        // check quota function
        it("should run correctly", async () => {
            await NestDAO.quotaOf(_C_NestToken);

            // usdt is not ntoken
            await expect(NestDAO.quotaOf(_C_USDT)).to.be.reverted;
        });

    });
});
