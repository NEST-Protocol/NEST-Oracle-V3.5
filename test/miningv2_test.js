const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const usdtdec = BigNumber.from(10).pow(6);
const ethdec = ethers.constants.WeiPerEther;

const eth = function (amount) {
    return BigNumber.from(amount).mul(ethdec);
};

const usdt = function (amount) {
    return BigNumber.from(amount).mul(usdtdec);
};

const nest = function (amount) {
    return BigNumber.from(amount).mul(ethdec);
};

const BN = function (n) {
    return BigNumber.from(n);
};

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

    let NestToken;
    let owner;
    let userA;
    let userB;
    let userC;
    let userD;
    let _C_NestStaking;
    let _C_NestToken;
    let _C_NestPool;
    let _C_USDT;
    let _C_NNRewardPool;
    let provider = ethers.provider;

    before(async function () {

        [owner, userA, userB, userC, userD] = await ethers.getSigners();

        ERC20Contract = await ethers.getContractFactory("UERC20");
        USDT = await ERC20Contract.deploy("10000000000000000", "USDT Test Token", "USDT", 6);
        WBTC = await ERC20Contract.deploy("2100000000000000", "WBTC Test Token", "WBTC", 6);

        IterableMappingContract = await ethers.getContractFactory("IterableMapping");
        IterableMapping = await IterableMappingContract.deploy();
        NestTokenContract = await ethers.getContractFactory("IBNEST",
            {
                libraries: {
                    IterableMapping: IterableMapping.address
                }
            });

        NestToken = await NestTokenContract.deploy();

        NestPoolContract = await ethers.getContractFactory("NestPool");
        NestPool = await NestPoolContract.deploy(owner.address); // TODO: arg should be DAOContract

        NestStakingContract = await ethers.getContractFactory("NestStaking");
        NestStaking = await NestStakingContract.deploy(NestToken.address);

        MiningCalcPriceContract = await ethers.getContractFactory("MiningCalcPrice");
        MiningCalcPrice = await MiningCalcPriceContract.deploy();
        MiningLookupPriceContract = await ethers.getContractFactory("MiningLookupPrice");
        MiningLookupPrice = await MiningLookupPriceContract.deploy();
        MiningOpContract = await ethers.getContractFactory("MiningOp");
        MiningOp = await MiningOpContract.deploy();
        NestMiningContract = await ethers.getContractFactory("NestMining",
            {
                libraries: {
                    MiningCalcPrice: MiningCalcPrice.address,
                    MiningLookupPrice: MiningLookupPrice.address,
                    MiningOp: MiningOp.address
                }
            }
        );           
        
        NestMining = await NestMiningContract.deploy();

        await NestMining.init(NestToken.address, NestPool.address, NestStaking.address, );

        NNTokenContract = await ethers.getContractFactory("NNToken");
        NNToken = await NNTokenContract.deploy(1500, "NNT");

        NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
        NNRewardPool = await NNRewardPoolContract.deploy(NestToken.address, NNToken.address);

        _C_NestStaking = NestStaking.address;
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_USDT = USDT.address;
        _C_WBTC = WBTC.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;

        await NestPool.setContracts(_C_NestMining, _C_NestToken);
        await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);
        await NestMining.setContracts(_C_NestToken, _C_NestPool, _C_NestStaking, _C_NNRewardPool, _C_NNRewardPool);
        await NNRewardPool.loadContracts(_C_NestToken, _C_NNToken, _C_NestPool, _C_NestMining);

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

    describe('send usdt Token',function () {
        it("should transfer correctly, usdt(2,000,000,000) [Owner => userA]",async () => {
            const amount = BigNumber.from("2000000000").mul(usdtdec);
            await USDT.connect(owner).transfer(userA.address, amount);
            const userA_balance = await USDT.balanceOf(userA.address);
            console.log('userA_balance = ',userA_balance);
            expect(userA_balance).to.equal(amount);
        });

        it("should transfer correctly, usdt(2,000,000,000) [Owner => userB]",async () => {
            const amount = BigNumber.from("2000000000").mul(usdtdec);
            await USDT.connect(owner).transfer(userB.address, amount);
            const userB_balance = await USDT.balanceOf(userB.address);
            console.log('userB_balance = ',userB_balance);
            expect(userB_balance).to.equal(amount);
        });
    });


    describe('NEST Token', function () {
        it("should have correct totalSupply, ETH(10,000,000,000)", async () => {
            const expectedTotalSupply = eth('10000000000');
            let totalSupply = await NestToken.totalSupply();
            expect(totalSupply).to.equal(expectedTotalSupply);
        });

        it("should transfer correctly, ETH(2,000,000,000) [Owner => userA]", async () => {
            const amount = BigNumber.from("2000000000").mul(ethdec);
            await NestToken.connect(owner).transfer(userA.address, amount);
            const userA_balance = await NestToken.balanceOf(userA.address);
            expect(userA_balance).to.equal(amount);
        });

        it("should transfer correctly, Nest(2,000,000,000) [Owner => userB]", async () => {
            const amount = BigNumber.from("2000000000").mul(ethdec);
            await NestToken.connect(owner).transfer(userB.address, amount);
            const userB_balance = await NestToken.balanceOf(userB.address);
            expect(userB_balance).to.equal(amount);
        });


        it("should transfer fail", async () => {
            let amount = eth("10000000001");
            await expectRevert.unspecified(
                NestToken.connect(owner).transfer(userA.address, amount)
            );
        });

        it("should approve correctly, ETH(10,000,000,000) [userA -> _C_NestStaking]", async () => {
            const amount = eth("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestStaking, amount);
            const approved = await NestToken.allowance(userA.address, _C_NestStaking);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, ETH(10,000,000,000) [userB -> _C_NestStaking]", async () => {
            const amount = eth("10000000000");
            const rs = await NestToken.connect(userB).approve(_C_NestStaking, amount);
            const approved = await NestToken.allowance(userB.address, _C_NestStaking);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, ETH(10,000,000,000) [userA -> _C_NestPool]", async () => {
            const amount = eth("10000000000");
            const rs = await NestToken.connect(userA).approve(_C_NestPool, amount);
            const approved = await NestToken.allowance(userA.address, _C_NestPool);
            expect(approved).to.equal(amount);
        });

        it("should approve correctly, ETH(10,000,000,000) [userB -> _C_NestPool]", async () => {
            const amount = eth("10000000000");
            const rs = await NestToken.connect(userB).approve(_C_NestPool, amount);
            const approved = await NestToken.allowance(userB.address, _C_NestPool);
            expect(approved).to.equal(amount);
        });
        
    });

    describe('NestMining', function () {
        // it("test mine two tx into same block", async () => {
        //     const h = await provider.getBlockNumber();

        //     advanceBlock(provider);
        //     const h2 = await provider.getBlockNumber();
        //     const x = await NestMining.acc(h);
        // });

        it("should be able to post a price sheet correctly", async () => {
            const nestPrice = nest(1000);
            const usdtPrice = usdt(350);
            const chunkSize = 10;
            const ethNum = BigNumber.from(10);
            const msgValue = ethers.utils.parseEther("21.0");
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const tx = await NestMining.connect(userA).post(_C_USDT, usdtPrice, nestPrice, ethNum, { value: msgValue });
            const receipt = await tx.wait();
            // const ev = tx.logs.find(v => v.event == 'PricePosted');
            // const index = function () { if (ev !== undefined) { return ev.args['index'] } }();
            // const token = function () { if (ev !== undefined) { return ev.args['token'] } }();
            
            const sheet = await NestMining.contentOfPriceSheet(_C_USDT, 0);
            expect(sheet.miner).to.equal(userA.address);
            expect(sheet.height).to.equal(receipt.blockNumber);
            expect(sheet.chunkNum).to.equal(1);
            expect(sheet.chunkSize).to.equal(chunkSize);
            expect(sheet.tokenPrice).to.equal(usdtPrice);
            expect(sheet.remainChunk).to.equal(ethNum.div(chunkSize));
            expect(sheet.ethChunk).to.equal(ethNum.div(chunkSize));
            expect(sheet.tokenChunk).to.equal(0);
            expect(sheet.state).to.equal(2);

            // check eth_in_pool
            const eth_pool_post = await NestPool.balanceOfEthInPool(_C_NestPool);

            expect(eth_pool_post.sub(eth_pool_pre)).to.equal(ethNum.mul(2).mul(ethdec));
        });

        // it("should be able to clear a price sheet correctly", async () => {

        //     const ethNum = BN(10);
        //     const chunkNum = BN(1);
        //     const chunkSize = BN(10);

        //     console.log(`provider=`, provider);
        //     const h = await provider.getBlockNumber();
        //     console.log(`height=${h}`);

        //     await goBlocks(provider, 25);
        //     const usdtPrice = usdt(350);

        //     const nest_userA_pre = await NestPool.getMinerNest(userA.address);
        //     const eth_nestpool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
        //     const ethPool_userA_pre = await NestPool.balanceOfEthInPool(userA.address);
        //     const usdtPool_userA_pre = await NestPool.balanceOfTokenInPool(userA.address, _C_USDT);

        //     const tx = await NestMining.connect(userA).clear(_C_USDT, 0, 1);

        //     // G1:
        //     const sheet = await NestMining.contentOfPriceSheet(_C_USDT, 0);
        //     expect(sheet.state).to.equal(1);
        // });

        it("should be able to close a price sheet correctly", async () => {

            const token = _C_USDT;
            const index = 0;
            const ethNum = BN(10);
            const chunkNum = BN(1);
            const chunkSize = BN(10);
            const nestPerChunk = BN(10000);
            const h = await provider.getBlockNumber();

            await goBlocks(provider, 25);

            const usdtPrice = usdt(350);

            const nest_userA_pre = await NestPool.getMinerNest(userA.address);
            const eth_nestpool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const ethPool_userA_pre = await NestPool.balanceOfEthInPool(userA.address);
            const usdtPool_userA_pre = await NestPool.balanceOfTokenInPool(userA.address, _C_USDT);

            await expect(NestMining.connect(userA).close(token, index))
                .to.emit(NestMining, 'PriceClosed')
                .withArgs(userA.address, token, index);

            // G1: reset priceSheet[token][index]
            const sheet = await NestMining.contentOfPriceSheet(_C_USDT, 0);
            expect(sheet.state).to.equal(0);

            // T1: add nest tokens to the miner
            const mined = await NestMining.debugMinedNest(_C_USDT, h);
            // console.log(`mined=`, mined);
            const nest_userA_post = await NestPool.getMinerNest(userA.address);
            const deposit = nest(chunkNum.mul(nestPerChunk));
            const reward = nest_userA_post.sub(nest_userA_pre).sub(deposit);
            expect(reward).to.equal(chunkNum.mul(chunkSize).mul(mined['0']).div(mined['1']));
            
            // T2: eth unfreezing
            const eth_nestpool_post = await NestPool.balanceOfEthInPool(_C_NestPool);
            expect(eth_nestpool_pre.sub(eth_nestpool_post)).to.equal(eth(ethNum));
            const ethPool_userA_post = await NestPool.balanceOfEthInPool(userA.address);
            expect(ethPool_userA_post.sub(ethPool_userA_pre)).to.equal(eth(ethNum));

            // T3: token unfreezing
            // const tokenPool_userA_post = await NestPoolContract.balanceOfTokenInPool(userA, _C_USDT);
            // expect(tokenPool_userA_post).to.equal(tokenPool_userA_pre);

        });

        it("should be buy token correctly !", async ()=> {
            const nestPrice = nest(1000);
            const usdtPrice = usdt(350);
            const chunkSize = 10;
            const ethNum = BigNumber.from(40);
            const nestPerChunk = BN(10000);
            const oneEther = ethers.utils.parseEther("1");
            const msgValue = ethers.utils.parseEther("200.0");

            const takeChunkNum = BigNumber.from(1);
            const newTokenPrice = usdt(300);
 
            //The previous code has already submitted a quotation, _C_USDT has already stacked one, and post index = 1.
            const tx = await NestMining.connect(userA).post(_C_USDT, usdtPrice, nestPrice, ethNum, { value: msgValue });
            
            const receipt = await tx.wait();
            const sheet = await NestMining.contentOfPriceSheet(_C_USDT, 1);
            console.log("sheet = ",sheet);

            // record recent funds
            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const eth_reward_pre = await provider.getBalance(_C_NestStaking);
            //console.log('eth_reward_pre = ',eth_reward_pre);
            
            // give some funds to userB
            const money = await NestToken.balanceOf(userB.address);

            console.log('money = ',money);
            
            const buytoken = await NestMining.connect(userB).buyToken(_C_USDT,1,takeChunkNum,newTokenPrice,{ value: msgValue });
            const re = await buytoken.wait();
            const sheet1 = await NestMining.contentOfPriceSheet(_C_USDT,2);
            
            console.log("sheet1",sheet1);

            //check new sheet
              expect(sheet1.miner).to.equal(userB.address);

        });

        it("should sell token correctly !", async ()=> {
            const token = _C_USDT;
            await USDT.connect(userB).approve(_C_NestPool,usdt(100000000)); 
            const nestPrice = nest(1000);
            const usdtPrice = usdt(350);
            const chunkSize = 10;
            const ethNum = BigNumber.from(40);
            const nestPerChunk = BN(10000);
            const oneEther = ethers.utils.parseEther("1");
            const msgValue = ethers.utils.parseEther("200.0");

            const takeChunkNum = BigNumber.from(1);
            const newTokenPrice = usdt(300);

            const tx = await NestMining.connect(userA).post(token, usdtPrice, nestPrice, ethNum, { value: msgValue });
            
            const receipt = await tx.wait();
            const sheet = await NestMining.contentOfPriceSheet(token, 3);

            // record recent funds
            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            //console.log('token_pool_pre = ',token_pool_pre);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            const sellToken = await NestMining.connect(userB).sellToken(token,3,takeChunkNum,newTokenPrice,{ value: msgValue });

            const Re = await sellToken.wait();
            
            const sellTokenSheet = await NestMining.contentOfPriceSheet(token,4);

            console.log("sellTokenSheet =",sellTokenSheet);

            // check new sheet
            expect(sellTokenSheet.miner).to.equal(userB.address);
            expect(sellTokenSheet.height).to.equal(Re.blockNumber);
            expect(sellTokenSheet.chunkNum).to.equal(takeChunkNum.mul(2));
            expect(sellTokenSheet.chunkSize).to.equal(chunkSize);
            expect(sellTokenSheet.tokenPrice).to.equal(newTokenPrice);
            expect(sellTokenSheet.remainChunk).to.equal(takeChunkNum.mul(2));
            expect(sellTokenSheet.ethChunk).to.equal(takeChunkNum.mul(2));
            expect(sellTokenSheet.tokenChunk).to.equal(0);
            expect(sellTokenSheet.state).to.equal(2);
            expect(sellTokenSheet.level).to.equal(1);

            // check updated sheet
            const remainChunk = sheet.remainChunk;
            const updatedSheet = await NestMining.contentOfPriceSheet(token, 3);
            //console.log("updated sheet = ",updatedSheet);
            const remainChunk2 = updatedSheet.remainChunk;
            
            expect(updatedSheet.miner).to.equal(sheet.miner);
            expect(updatedSheet.height).to.equal(receipt.blockNumber);
            expect(BigNumber.from(remainChunk).sub(BigNumber.from(remainChunk2))).to.equal(takeChunkNum);
            expect(BigNumber.from(updatedSheet.tokenChunk)).to.equal(BigNumber.from(sheet.tokenChunk).add(takeChunkNum));
            expect(updatedSheet.state).to.equal(3);

            //check taker sheet 
            const takerSheet = await NestMining.takerOf(token,3,0);
            //console.log("takerSheet =",takerSheet);
            expect(takerSheet.takerAddress).to.equal(userB.address);
            expect(takerSheet.ethChunk).to.equal(takeChunkNum);

            // check nestpool
            const nest_pool_now = await NestPool.balanceOfNestInPool(_C_NestPool);
            const eth_pool_now = await NestPool.balanceOfEthInPool(_C_NestPool);
            const token_pool_now = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            console.log('token_pool_now = ',token_pool_now);
            //console.log('nest_pool_now = ',nest_pool_now);
            //console.log('nest_pool_pre = ',nest_pool_pre);
            expect(nest_pool_now.sub(nest_pool_pre)).to.equal(nestPerChunk.mul(takeChunkNum).mul(oneEther));
            expect(eth_pool_now.sub(eth_pool_pre)).to.equal(takeChunkNum.mul(2).mul(chunkSize).mul(oneEther));
            expect(token_pool_now.sub(token_pool_pre)).to.equal(takeChunkNum.mul(chunkSize).mul(sheet.tokenPrice));

            //check ethFee
            const eth_reward_now = await provider.getBalance(_C_NestStaking);
            expect(eth_reward_now.sub(eth_reward_pre)).to.equal(takeChunkNum.mul(chunkSize).mul(oneEther).div(1000));
        });



    
    });

});