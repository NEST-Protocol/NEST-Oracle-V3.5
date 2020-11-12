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
    //console.log(`>> [INFO] block mined +${num}, height=${h}`);
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
            //console.log('userA_balance = ',userA_balance);
            expect(userA_balance).to.equal(amount);
        });

        it("should transfer correctly, usdt(2,000,000,000) [Owner => userB]",async () => {
            const amount = BigNumber.from("2000000000").mul(usdtdec);
            await USDT.connect(owner).transfer(userB.address, amount);
            const userB_balance = await USDT.balanceOf(userB.address);
            //console.log('userB_balance = ',userB_balance);
            expect(userB_balance).to.equal(amount);
        });

        it("should transfer correctly, usdt(2,000,000,000) [Owner => userC]",async () => {
            const amount = BigNumber.from("2000000000").mul(usdtdec);
            await USDT.connect(owner).transfer(userC.address, amount);
            const userC_balance = await USDT.balanceOf(userC.address);
            //console.log('userB_balance = ',userB_balance);
            expect(userC_balance).to.equal(amount);
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
            console.log('userB_balance = ',userB_balance);
            expect(userB_balance).to.equal(amount);
        });

        it("should transfer correctly, Nest(2,000,000,000) [Owner => userC]", async () => {
            const amount = BigNumber.from("2000000000").mul(ethdec);
            await NestToken.connect(owner).transfer(userC.address, amount);
            const userC_balance = await NestToken.balanceOf(userC.address);
            expect(userC_balance).to.equal(amount);
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

        it("should approve correctly, ETH(10,000,000,000) [userC -> _C_NestStaking]", async () => {
            const amount = eth("10000000000");
            const rs = await NestToken.connect(userC).approve(_C_NestStaking, amount);
            const approved = await NestToken.allowance(userC.address, _C_NestStaking);
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

        it("should approve correctly, ETH(10,000,000,000) [userC -> _C_NestPool]", async () => {
            const amount = eth("10000000000");
            const rs = await NestToken.connect(userC).approve(_C_NestPool, amount);
            const approved = await NestToken.allowance(userC.address, _C_NestPool);
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
            //console.log("sheet = ",sheet);

            // record recent funds
            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const eth_reward_pre = await provider.getBalance(_C_NestStaking);
            //console.log('eth_reward_pre = ',eth_reward_pre);
            
            // give some funds to userB
            const money = await NestToken.balanceOf(userB.address);

            //console.log('money = ',money);
            
            const buytoken = await NestMining.connect(userB).buyToken(_C_USDT,1,takeChunkNum,newTokenPrice,{ value: msgValue });
            const re = await buytoken.wait();
            const sheet1 = await NestMining.contentOfPriceSheet(_C_USDT,2);
            
            //console.log("sheet1",sheet1);

            //check new sheet
            expect(sheet1.miner).to.equal(userB.address);
            expect(sheet1.height).to.equal(re.blockNumber);
            expect(sheet1.chunkNum).to.equal(takeChunkNum.mul(2));
            expect(sheet1.chunkSize).to.equal(chunkSize);
            expect(sheet1.tokenPrice).to.equal(newTokenPrice);
            expect(sheet1.remainChunk).to.equal(takeChunkNum.mul(2));
            expect(sheet1.ethChunk).to.equal(takeChunkNum.mul(2));
            expect(sheet1.tokenChunk).to.equal(0);
            expect(sheet1.state).to.equal(2);
            expect(sheet1.level).to.equal(1);

            //check taker sheet 
            const takerSheet = await NestMining.takerOf(_C_USDT,1,0);
            //console.log("takerSheet =",takerSheet);
            expect(takerSheet.takerAddress).to.equal(userB.address);
            expect(takerSheet.tokenChunk).to.equal(takeChunkNum);

            //check updated sheet 
            const remainChunk1 = sheet.remainChunk;
            
            const updatedSheet = await NestMining.contentOfPriceSheet(_C_USDT, 1);
            //console.log("updated sheet = ",updatedSheet);
            const remainChunk2 = updatedSheet.remainChunk;
            
            expect(updatedSheet.miner).to.equal(sheet.miner);
            expect(updatedSheet.height).to.equal(receipt.blockNumber);
            expect(BigNumber.from(remainChunk1).sub(BigNumber.from(remainChunk2))).to.equal(takeChunkNum);
            expect(BigNumber.from(updatedSheet.ethChunk)).to.equal(BigNumber.from(sheet.ethChunk).add(takeChunkNum));
            expect(updatedSheet.state).to.equal(3);

            // check nestpool
            const nest_pool_now = await NestPool.balanceOfNestInPool(_C_NestPool);
            const eth_pool_now = await NestPool.balanceOfEthInPool(_C_NestPool);

            //console.log('nest_pool_now = ',nest_pool_now);
            //console.log('nest_pool_pre = ',nest_pool_pre);

            expect(nest_pool_now.sub(nest_pool_pre)).to.equal(nestPerChunk.mul(takeChunkNum).mul(2).mul(oneEther));
            expect(eth_pool_now.sub(eth_pool_pre)).to.equal(takeChunkNum.mul(3).mul(chunkSize).mul(oneEther));

            //check ethFee
            const eth_reward_now = await provider.getBalance(_C_NestStaking);
            console.log('eth_reward_pre = ',eth_reward_now);
            expect(eth_reward_now.sub(eth_reward_pre)).to.equal(takeChunkNum.mul(chunkSize).mul(oneEther).div(1000));

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

            //console.log("sellTokenSheet =",sellTokenSheet);

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

        it("should clear correctly !", async ()=> {
            const token = _C_USDT;
            await USDT.connect(userA).approve(_C_NestPool,usdt(2000000000)); 
            const msgValue = ethers.utils.parseEther("200.0");
            const num = BN(1);

            const h0 = await provider.getBlockNumber();

            await goBlocks(provider, 25);

            const takerSheetLength_pre = await NestMining.lengthOfTakers(token,1);
            
            // userA's funds 
            const userA_balance_in_nestpool_pre = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_balance_in_exAddress_pre = await USDT.balanceOf(userA.address);

            //userB's funds in nestpool
            const userB_balance_in_nestpool_pre = await NestPool.balanceOfTokenInPool(userB.address,token);

            const takerSheet = await NestMining.takerOf(token,1,0);

            const tx = await NestMining.connect(userA).clear(token,1,num,{ value: msgValue });

            //check taker's length at present
            const takerSheetLength_now = await NestMining.lengthOfTakers(token,1);

            expect(takerSheetLength_pre.sub(takerSheetLength_now)).to.equal(num);

            //check sheet state
            const sheet = await NestMining.contentOfPriceSheet(token, 1);
            expect(sheet.state).to.equal(1);

            //check  userA's funds
            //const token_pool_now = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const freezeToken = await (sheet.tokenPrice).mul(sheet.chunkSize).mul(takerSheet.tokenChunk);
            const userA_balance_in_nestpool_now = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_balance_in_exAddress_now = await USDT.balanceOf(userA.address);
            expect(userA_balance_in_exAddress_pre.sub(userA_balance_in_exAddress_now)).to.equal(freezeToken);

            //userB's funds in nestpool
            const userB_balance_in_nestpool_now = await NestPool.balanceOfTokenInPool(userB.address,token);
            console.log('userB_balance_in_nestpool_now = ',userB_balance_in_nestpool_now);
            expect(userB_balance_in_nestpool_now.sub(userB_balance_in_nestpool_pre)).to.equal(freezeToken);
        });

         // clear all takers lists (there is only one taker, it need to extend.)
         it("should clearAll correctly !", async ()=> {
            const token = _C_USDT;
            await USDT.connect(userA).approve(_C_NestPool,usdt(2000000000)); 
            const msgValue = ethers.utils.parseEther("200.0");

            const takerSheetLength_pre = await NestMining.lengthOfTakers(token,3);
            //const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            
            // userA's funds 
            const userA_balance_in_nestpool_pre = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_balance_in_exAddress_pre = await USDT.balanceOf(userA.address);

            //userB's funds in nestpool
            const userB_balance_in_nestpool_pre = await NestPool.balanceOfTokenInPool(userB.address,token);

            const takerSheet = await NestMining.takerOf(token,3,0);

            const tx = await NestMining.connect(userA).clearAll(token,3,{ value: msgValue });

            //check taker's length at present
            const takerSheetLength_now = await NestMining.lengthOfTakers(token,3);

            expect(takerSheetLength_now).to.equal(0);

            //check sheet state
            const sheet = await NestMining.contentOfPriceSheet(token, 3);
            expect(sheet.state).to.equal(1);

            //check  userA's funds
            //const token_pool_now = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const freezeToken = await (sheet.tokenPrice).mul(sheet.chunkSize).mul(takerSheet.tokenChunk);
            const userA_balance_in_nestpool_now = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_balance_in_exAddress_now = await USDT.balanceOf(userA.address);
            expect(userA_balance_in_exAddress_pre.sub(userA_balance_in_exAddress_now)).to.equal(freezeToken);

            //userB's funds in nestpool
            const userB_balance_in_nestpool_now = await NestPool.balanceOfTokenInPool(userB.address,token);
            //console.log('userB_balance_in_nestpool_now = ',userB_balance_in_nestpool_now);
            expect(userB_balance_in_nestpool_now.sub(userB_balance_in_nestpool_pre)).to.equal(freezeToken);
           
        });

         // set up a new instance
         it("should refute correctly !", async ()=> {
            const token = _C_USDT;
            await USDT.connect(userB).approve(_C_NestPool,usdt(100000000)); 
            const nestPrice = nest(1000);
            const usdtPrice = usdt(350);
            const sheet_duration_block = BN(1440);
            const ethNum = BigNumber.from(40);
            const msgValue = ethers.utils.parseEther("200.0");

            const takeChunkNum = BigNumber.from(1);
            const newTokenPrice = usdt(300);

            const tx = await NestMining.connect(userA).post(token, usdtPrice, nestPrice, ethNum, { value: msgValue });
            const receipt = await tx.wait();
            const sheet = await NestMining.contentOfPriceSheet(token, 5);
            console.log('receipt.blockNumber = ',receipt.blockNumber);
            //console.log('sheet = ',sheet);

            const h0 = await provider.getBlockNumber();
            console.log('h0 = ',h0);
            
            const sellToken = await NestMining.connect(userB).sellToken(token,5,takeChunkNum,newTokenPrice,{ value: msgValue });

            const Re = await sellToken.wait();
            const sellTokenSheet = await NestMining.contentOfPriceSheet(token,6);
            //console.log('sellTokenSheet',sellTokenSheet);

            await goBlocks(provider, sheet_duration_block.sub(1));

            const takerSheet = await NestMining.takerOf(token,5,0);
            //console.log("takerSheet =",takerSheet);

            // Data before update
            const userB_token_balance_in_nestpool_pre = await NestPool.balanceOfTokenInPool(userB.address,token);
            const nestpool_token_balance_in_token_pre = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            
            const userB_eth_balance_in_nestpool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const nestpool_eth_balance_in_token_pre = await NestPool.balanceOfEthInPool(_C_NestPool);

            const tx1 = await NestMining.connect(userB).refute(token,5,0);

            // ======  assume : taker.ethChunk > 0  ======
            // check unfreezeToken in nestpool
            const tokenAmount = (sheet.tokenPrice).mul(takerSheet.ethChunk).mul(sheet.chunkSize);
            //console.log('tokenAmount',tokenAmount);
            const userB_token_balance_in_nestpool_now = await NestPool.balanceOfTokenInPool(userB.address,token);
            const nestpool_token_balance_in_token_now = await NestPool.balanceOfTokenInPool(_C_NestPool,token);

            expect(userB_token_balance_in_nestpool_now.sub(userB_token_balance_in_nestpool_pre)).to.equal(tokenAmount);
            expect(nestpool_token_balance_in_token_now.add(tokenAmount)).to.equal(nestpool_token_balance_in_token_pre);

            // check unfreezeEth in nestpool
            const ethAmount = eth(BN(sheet.chunkSize).mul(takerSheet.ethChunk)); 
            console.log('ethAmount',ethAmount);

            const userB_eth_balance_in_nestpool_now = await NestPool.balanceOfEthInPool(userB.address);
            const nestpool_eth_balance_in_token_now = await NestPool.balanceOfEthInPool(_C_NestPool);

            expect(userB_eth_balance_in_nestpool_now.sub(userB_eth_balance_in_nestpool_pre)).to.equal(ethAmount);
            expect(nestpool_eth_balance_in_token_now.add(ethAmount)).to.equal(nestpool_eth_balance_in_token_pre);

            // check other state
            const takerSheet1 = await NestMining.takerOf(token,5,0);
            const sheet1 = await NestMining.contentOfPriceSheet(token, 5);
            expect(takerSheet1.ethChunk).to.equal(0);
            expect(takerSheet1.takerAddress).to.equal(0);
            expect(sheet1.state).to.equal(4);
            
        });

        // assuming: priceSheet.state == 3 and taker.ethChunk > 0
        it("should close correctly !",async ()=> {
            // === this is preparation ===//
            // By the following operations, the priceSheet's state is 3 
            const token = _C_USDT;
            await USDT.connect(userB).approve(_C_NestPool,usdt(100000000)); 
            const nestPrice = nest(1000);
            const usdtPrice = usdt(350);
            const sheet_duration_block = BN(1440);
            const ethNum = BigNumber.from(40);
            const msgValue = ethers.utils.parseEther("200.0");

            const takeChunkNum = BigNumber.from(1);
            const newTokenPrice = usdt(300);

            const tx = await NestMining.connect(userA).post(token, usdtPrice, nestPrice, ethNum, { value: msgValue });
            
            const sheet = await NestMining.contentOfPriceSheet(token, 7);
            //console.log("sheet = ",sheet);

            const sellToken = await NestMining.connect(userB).sellToken(token,7,takeChunkNum,newTokenPrice,{ value: msgValue });

            const sheet_new = await NestMining.contentOfPriceSheet(token, 7);
            //console.log("sheet_new = ",sheet_new);

            const takerSheet = await NestMining.takerOf(token,7,0);
            //console.log('takerSheet = ',takerSheet);

            await goBlocks(provider, sheet_duration_block.sub(1));

            //  ================================== //
 
             // Data before updating            
             const nestpool_token_balance_in_token_pre = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
             const nestpool_eth_balance_in_token_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
             const nest_balance_in_nestpool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);

             const userA_token_balance_in_nestpool_pre = await NestPool.balanceOfTokenInPool(userA.address,token);
             const userA_eth_balance_in_nestpool_pre = await NestPool.balanceOfEthInPool(userA.address);
             const userA_nest_balance_in_nestpool_pre = await NestPool.balanceOfNestInPool(userA.address);

             const userB_eth_balance_in_nestpool_pre = await NestPool.balanceOfEthInPool(userB.address);
             
             // close the priceSheet from userA
             const closePriceSheet = await NestMining.connect(userA).close(token,7);

             const sheet_new1 = await NestMining.contentOfPriceSheet(token, 7);
              
            
            // if t.ethChunk > 0
            const _recover_freezeEthAmount = eth(BN(sheet_new.chunkSize).mul(takerSheet.ethChunk));
            const _recover_unfreezeEthAmount = eth(BN(sheet_new.chunkSize).mul(2).mul(takerSheet.ethChunk));

            // Read from the NestMining.sol
            const _nestAtHeight = BN(461760);
            const _ethAtHeight = BN(40);
            
            const NestReward = nest(BN(sheet_new1.remainChunk).mul(sheet_new1.chunkSize).mul(_nestAtHeight).div(_ethAtHeight))


            const _close_nestAmount = nest(BN(sheet_new1.chunkNum).mul(10000));
            const _close_ethAmount = eth(BN(sheet_new1.ethChunk).mul(sheet_new1.chunkSize));
            const _close_tokenAmount = BN(sheet_new1.tokenChunk).mul(sheet_new1.chunkSize).mul(sheet_new1.tokenPrice);

            // Data  updated 
            const nestpool_eth_balance_in_token_now = await NestPool.balanceOfEthInPool(_C_NestPool);   
            const nestpool_token_balance_in_token_now = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const nest_balance_in_nestpool_now = await NestPool.balanceOfNestInPool(_C_NestPool);

            const userA_token_balance_in_nestpool_now = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_eth_balance_in_nestpool_now = await NestPool.balanceOfEthInPool(userA.address);
            const userA_nest_balance_in_nestpool_now = await NestPool.balanceOfNestInPool(userA.address);
           
            const userB_eth_balance_in_nestpool_now = await NestPool.balanceOfEthInPool(userB.address);
        

            // check nestpool funds
            // Since there are two operations involved, _recover and _close, you can only calculate the funds changes
            // We can get those information: 
            // about NestPool: 
            expect(nestpool_eth_balance_in_token_pre.add(_recover_freezeEthAmount).sub(_recover_unfreezeEthAmount).sub(_close_ethAmount)).to.equal(nestpool_eth_balance_in_token_now);
            expect(nest_balance_in_nestpool_pre.sub(_close_nestAmount)).to.equal(nest_balance_in_nestpool_now);
            expect(nestpool_token_balance_in_token_pre.sub(_close_tokenAmount)).to.equal(nestpool_token_balance_in_token_now);

            // about userB (who bit the priceSheet):
            expect(userB_eth_balance_in_nestpool_pre.add(_recover_unfreezeEthAmount)).to.equal(userB_eth_balance_in_nestpool_now);
            
            // about userA (who is bitten from userB):
            expect(userA_eth_balance_in_nestpool_pre.sub(_recover_freezeEthAmount).add(_close_ethAmount)).to.equal(userA_eth_balance_in_nestpool_now);
            expect(userA_nest_balance_in_nestpool_pre.add(_close_nestAmount).add(NestReward)).to.equal((userA_nest_balance_in_nestpool_now));
            expect(userA_token_balance_in_nestpool_pre.add(_close_tokenAmount)).to.equal(userA_token_balance_in_nestpool_now);

        });

        // assuming: priceSheet.state == 3 and taker.tokenChunk > 0
        it("should close correctly !",async ()=> {
            // === this is preparation ===//
            // By the following operations, the priceSheet's state is 3 
            const token = _C_USDT;
            await USDT.connect(userB).approve(_C_NestPool,usdt(100000000)); 
            const nestPrice = nest(1000);
            const usdtPrice = usdt(350);
            const sheet_duration_block = BN(1440);
            const ethNum = BigNumber.from(40);
            const msgValue = ethers.utils.parseEther("200.0");

            const takeChunkNum = BigNumber.from(1);
            const newTokenPrice = usdt(300);

            const tx = await NestMining.connect(userA).post(token, usdtPrice, nestPrice, ethNum, { value: msgValue });
            
            const sheet = await NestMining.contentOfPriceSheet(token, 9);

            const buyToken = await NestMining.connect(userB).buyToken(token,9,takeChunkNum,newTokenPrice,{ value: msgValue });

            const sheet_new = await NestMining.contentOfPriceSheet(token, 9);
            //console.log("sheet_new = ",sheet_new);

            const takerSheet = await NestMining.takerOf(token,9,0);
            //console.log('takerSheet = ',takerSheet);

            await goBlocks(provider, sheet_duration_block.sub(1));

            //  ================================== //
 
             // Data before updating            
             const nestpool_token_balance_in_token_pre = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
             const nestpool_eth_balance_in_token_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
             const nest_balance_in_nestpool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);

             const userA_token_balance_in_nestpool_pre = await NestPool.balanceOfTokenInPool(userA.address,token);
             const userA_balance_in_exAddress_pre = await USDT.balanceOf(userA.address); // Transfer from an external address may be required
        
             const userA_eth_balance_in_nestpool_pre = await NestPool.balanceOfEthInPool(userA.address);
             const userA_nest_balance_in_nestpool_pre = await NestPool.balanceOfNestInPool(userA.address);

             const userB_eth_balance_in_nestpool_pre = await NestPool.balanceOfEthInPool(userB.address);
             const userB_token_balance_in_nestpool_pre = await NestPool.balanceOfTokenInPool(userB.address,token);
             
             // close the priceSheet from userA
             const closePriceSheet = await NestMining.connect(userA).close(token,9);

             const sheet_new1 = await NestMining.contentOfPriceSheet(token, 9);
             //console.log('sheet_new1 = ',sheet_new1);
              
            
            // if t.tokenChunk > 0
            const _recover_freezeTokenAmount = BN(sheet_new.tokenPrice).mul(sheet_new.chunkSize).mul(takerSheet.tokenChunk);
            const _recover_unfreezeTokenAmount = BN(sheet_new.tokenPrice).mul(sheet_new.chunkSize).mul(takerSheet.tokenChunk);
            const _recover_unfreezeEthAmount = eth(BN(sheet_new.chunkSize).mul(takerSheet.tokenChunk));

            // Read from the NestMining.sol
            const _nestAtHeight = BN(461760);
            const _ethAtHeight = BN(40);
            
            const NestReward = nest(BN(sheet_new1.remainChunk).mul(sheet_new1.chunkSize).mul(_nestAtHeight).div(_ethAtHeight))


            const _close_nestAmount = nest(BN(sheet_new1.chunkNum).mul(10000));
            const _close_ethAmount = eth(BN(sheet_new1.ethChunk).mul(sheet_new1.chunkSize));
            // because tokenChunk == 0 , _close_tokenAmount == 0
            const _close_tokenAmount = BN(sheet_new1.tokenChunk).mul(sheet_new1.chunkSize).mul(sheet_new1.tokenPrice);

            // Data  updated 
            const nestpool_eth_balance_in_token_now = await NestPool.balanceOfEthInPool(_C_NestPool);   
            const nestpool_token_balance_in_token_now = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const nest_balance_in_nestpool_now = await NestPool.balanceOfNestInPool(_C_NestPool);

            const userA_token_balance_in_nestpool_now = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_balance_in_exAddress_now = await USDT.balanceOf(userA.address);
            const userA_eth_balance_in_nestpool_now = await NestPool.balanceOfEthInPool(userA.address);
            const userA_nest_balance_in_nestpool_now = await NestPool.balanceOfNestInPool(userA.address);
           
            const userB_eth_balance_in_nestpool_now = await NestPool.balanceOfEthInPool(userB.address);
            const userB_token_balance_in_nestpool_now = await NestPool.balanceOfTokenInPool(userB.address,token);
        

            // check nestpool funds
            // Since there are two operations involved, _recover and _close, you can only calculate the funds changes
            // We can get those information: 
            // about NestPool: 
            expect(nestpool_eth_balance_in_token_pre.sub(_recover_unfreezeEthAmount).sub(_close_ethAmount)).to.equal(nestpool_eth_balance_in_token_now);
            expect(nest_balance_in_nestpool_pre.sub(_close_nestAmount)).to.equal(nest_balance_in_nestpool_now);
            expect(nestpool_token_balance_in_token_pre.add(_recover_freezeTokenAmount).sub(_recover_unfreezeTokenAmount).sub(_close_tokenAmount)).to.equal(nestpool_token_balance_in_token_now);

            // about userB (who bit the priceSheet):
            expect(userB_eth_balance_in_nestpool_pre.add(_recover_unfreezeEthAmount)).to.equal(userB_eth_balance_in_nestpool_now);
            expect(userB_token_balance_in_nestpool_pre.add(_recover_unfreezeTokenAmount)).to.equal(userB_token_balance_in_nestpool_now);
            
            // about userA (who is bitten from userB):
            expect(userA_eth_balance_in_nestpool_pre.add(_close_ethAmount)).to.equal(userA_eth_balance_in_nestpool_now);
            expect(userA_nest_balance_in_nestpool_pre.add(_close_nestAmount).add(NestReward)).to.equal((userA_nest_balance_in_nestpool_now));
            expect(userA_token_balance_in_nestpool_pre.add(userA_balance_in_exAddress_pre).sub(_recover_freezeTokenAmount)
                   .add(_close_tokenAmount)).to.equal(userA_token_balance_in_nestpool_now.add(userA_balance_in_exAddress_now));

        });
        
        // create a priceSheet (userA), userB and userC bite this priceSheet; level < 4
        it("should buy token correctly !",async ()=> {
            //========preparation========//
            const token = _C_USDT;
            const nestPrice = nest(1000);
            const usdtPrice = usdt(350);
            const chunkSize = 10;
            const ethNum = BigNumber.from(40);
            const nestPerChunk = BN(10000);
            const oneEther = ethers.utils.parseEther("1");
            const msgValue = ethers.utils.parseEther("200.0");

            const takeChunkNum = BigNumber.from(1);
            const newTokenPrice = usdt(300);
 
            const tx0 = await NestMining.connect(userA).post(token, usdtPrice, nestPrice, ethNum, { value: msgValue });
            
            const receipt0 = await tx0.wait();
            const sheet0 = await NestMining.contentOfPriceSheet(token, 11);
            //===============================//

            // record funds before biting
            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);
            
            const userB_balance_in_exAddress_pre = await NestToken.balanceOf(userB.address); // Transfer from an external address may be required
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);

            const userC_balance_in_exAddress_pre = await NestToken.balanceOf(userC.address); 
            const userC_eth_pool_pre = await NestPool.balanceOfEthInPool(userC.address);
            const userC_nest_pool_pre = await NestPool.balanceOfNestInPool(userC.address);

             // bite         
            const buyToken1 = await NestMining.connect(userB).buyToken(_C_USDT,11,takeChunkNum,newTokenPrice,{ value: msgValue });
            const sheet1 = await NestMining.contentOfPriceSheet(token,11);

            const buyToken2 = await NestMining.connect(userC).buyToken(_C_USDT,11,takeChunkNum,newTokenPrice,{ value: msgValue });
            const sheet2 = await NestMining.contentOfPriceSheet(token,11); 
            
            // record funds after biting
            const _ethFee1 = eth(BN(takeChunkNum).mul(sheet0.chunkSize)).div(1000);
            const _ethFee2 = eth(BN(takeChunkNum).mul(sheet1.chunkSize)).div(1000);
            const freezeNestAmount = nest(nestPerChunk.mul(takeChunkNum).mul(2));

            const freezeEthAmount1 = eth(BN(takeChunkNum).mul(3).mul(sheet0.chunkSize));
            const freezeEthAmount2 = eth(BN(takeChunkNum).mul(3).mul(sheet1.chunkSize));

            const nest_pool_now = await NestPool.balanceOfNestInPool(_C_NestPool);
            const eth_pool_now = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_now = await provider.getBalance(_C_NestStaking);

            const userB_eth_pool_now = await NestPool.balanceOfEthInPool(userB.address);
            const userB_balance_in_exAddress_now = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_now = await NestPool.balanceOfNestInPool(userB.address);

            const userC_eth_pool_now = await NestPool.balanceOfEthInPool(userC.address);
            const userC_balance_in_exAddress_now = await NestToken.balanceOf(userC.address);
            const userC_nest_pool_now = await NestPool.balanceOfNestInPool(userC.address);


            // Inspection of financial transfers 
            expect(userB_eth_pool_pre.add(msgValue).sub(_ethFee1).sub(freezeEthAmount1)).to.equal(userB_eth_pool_now);

            expect(userB_nest_pool_pre.add(userB_balance_in_exAddress_pre).sub(freezeNestAmount)).to.equal(
                   userB_nest_pool_now.add(userB_balance_in_exAddress_now));

            expect(userC_eth_pool_pre.add(msgValue).sub(_ethFee2).sub(freezeEthAmount2)).to.equal(userC_eth_pool_now);
            expect(userC_nest_pool_pre.add(userC_balance_in_exAddress_pre).sub(freezeNestAmount)).to.equal(
                          userC_nest_pool_now.add(userC_balance_in_exAddress_now));

            expect(eth_pool_pre.add(freezeEthAmount1).add(freezeEthAmount2)).to.equal(eth_pool_now);
            expect(nest_pool_pre.add(freezeNestAmount).add(freezeNestAmount)).to.equal(nest_pool_now);

            expect(eth_reward_pre.add(_ethFee1).add(_ethFee2)).to.equal(eth_reward_now);

            // check the updated priceSheet
            expect(sheet2.state).to.equal(3);
            expect(sheet2.ethChunk).to.equal(BN(sheet1.ethChunk).add(takeChunkNum));
            expect(sheet2.remainChunk).to.equal(BN(sheet1.remainChunk).sub(takeChunkNum));
        });

        // create a priceSheet (userA), userB bite this priceSheet by buyToken and userC bite this priceSheet by sellToken; level < 4
        it('should sell token and buy token correctly !',async ()=> {
            //========preparation========//
            const token = _C_USDT;
            const nestPrice = nest(1000);
            const usdtPrice = usdt(350);
            const chunkSize = 10;
            const ethNum = BigNumber.from(40);
            const nestPerChunk = BN(10000);
            const msgValue = ethers.utils.parseEther("200.0");
            await USDT.connect(userC).approve(_C_NestPool,usdt(100000000)); 

            const takeChunkNum = BigNumber.from(1);
            const newTokenPrice = usdt(300);
 
            const tx0 = await NestMining.connect(userA).post(token, usdtPrice, nestPrice, ethNum, { value: msgValue });
            
            const receipt0 = await tx0.wait();
            const sheet0 = await NestMining.contentOfPriceSheet(token, 14);
            //===============================//

            // record funds before biting
            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);
             
            const userB_nest_in_exAddress_pre = await NestToken.balanceOf(userB.address); // Transfer from an external address may be required
            const userB_eth_pool_pre = await NestPool.balanceOfEthInPool(userB.address);
            const userB_nest_pool_pre = await NestPool.balanceOfNestInPool(userB.address);
 
            const userC_nest_in_exAddress_pre = await NestToken.balanceOf(userC.address);
            const userC_token_in_exAddress_pre = await USDT.balanceOf(userC.address);
            const userC_eth_pool_pre = await NestPool.balanceOfEthInPool(userC.address);
            const userC_nest_pool_pre = await NestPool.balanceOfNestInPool(userC.address);
            const userC_token_pool_pre = await NestPool.balanceOfTokenInPool(userC.address,token);
 
            // bite         
            const buyToken = await NestMining.connect(userB).buyToken(_C_USDT,14,takeChunkNum,newTokenPrice,{ value: msgValue });
            const sheet1 = await NestMining.contentOfPriceSheet(token,14);
 
            const sellToken = await NestMining.connect(userC).sellToken(_C_USDT,14,takeChunkNum,newTokenPrice,{ value: msgValue });
            const sheet2 = await NestMining.contentOfPriceSheet(token,14); 

             // record funds after biting
            const ethFee_BT = eth(BN(takeChunkNum).mul(sheet0.chunkSize)).div(1000);
            const freezeNestAmount_BT = nest(nestPerChunk.mul(takeChunkNum).mul(2));
            const freezeEthAmount_BT = eth(BN(takeChunkNum).mul(3).mul(sheet0.chunkSize));
            
            const ethFee_ST = eth(BN(takeChunkNum).mul(sheet1.chunkSize)).div(1000);  
            const freezeNestAmount_ST = nest(nestPerChunk.mul(takeChunkNum)); 
            const freezeEthAmount_ST = eth(BN(takeChunkNum).mul(2).mul(sheet1.chunkSize));
            const freezeTokenAmount_ST = BN(takeChunkNum).mul(sheet1.chunkSize).mul(sheet1.tokenPrice);

            const nest_pool_now = await NestPool.balanceOfNestInPool(_C_NestPool);
            const eth_pool_now = await NestPool.balanceOfEthInPool(_C_NestPool);
            const token_pool_now = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const eth_reward_now = await provider.getBalance(_C_NestStaking);

            const userB_eth_pool_now = await NestPool.balanceOfEthInPool(userB.address);
            const userB_nest_in_exAddress_now = await NestToken.balanceOf(userB.address);
            const userB_nest_pool_now = await NestPool.balanceOfNestInPool(userB.address);

            const userC_eth_pool_now = await NestPool.balanceOfEthInPool(userC.address);
            const userC_nest_in_exAddress_now = await NestToken.balanceOf(userC.address);
            const userC_token_in_exAddress_now = await USDT.balanceOf(userC.address);
            const userC_nest_pool_now = await NestPool.balanceOfNestInPool(userC.address);
            const userC_token_pool_now = await NestPool.balanceOfTokenInPool(userC.address,token);

            // Inspection of financial transfers
            expect(userB_eth_pool_pre.add(msgValue).sub(ethFee_BT).sub(freezeEthAmount_BT)).to.equal(userB_eth_pool_now);
            expect(userB_nest_pool_pre.add(userB_nest_in_exAddress_pre).sub(freezeNestAmount_BT)).to.equal(
                   userB_nest_pool_now.add(userB_nest_in_exAddress_now));

            expect(userC_eth_pool_pre.add(msgValue).sub(ethFee_ST).sub(freezeEthAmount_ST)).to.equal(userC_eth_pool_now);
            expect(userC_token_pool_pre.add(userC_token_in_exAddress_pre).sub(freezeTokenAmount_ST)).to.equal(
                   userC_token_pool_now.add(userC_token_in_exAddress_now));
            expect(userC_nest_pool_pre.add(userC_nest_in_exAddress_pre).sub(freezeNestAmount_ST)).to.equal(
                userC_nest_pool_now.add(userC_nest_in_exAddress_now));

            expect(eth_pool_pre.add(freezeEthAmount_BT).add(freezeEthAmount_ST)).to.equal(eth_pool_now);
            expect(nest_pool_pre.add(freezeNestAmount_BT).add(freezeNestAmount_ST)).to.equal(nest_pool_now);
            expect(token_pool_pre.add(freezeTokenAmount_ST)).to.equal(token_pool_now);

            expect(eth_reward_pre.add(ethFee_BT).add(ethFee_ST)).to.equal(eth_reward_now);

            // check the updated priceSheet
            expect(sheet2.state).to.equal(3);
            expect(sheet2.tokenChunk).to.equal(BN(sheet1.tokenChunk).add(takeChunkNum));
            expect(sheet2.remainChunk).to.equal(BN(sheet1.remainChunk).sub(takeChunkNum));

        });

        // check the priceSheet.state == 2
        it('should clear correctly !',async ()=> {
             //========preparation========//
             const token = _C_USDT;
             const nestPrice = nest(1000);
             const usdtPrice = usdt(350);
             const ethNum = BigNumber.from(40);
             const msgValue = ethers.utils.parseEther("200.0");
             const price_duration_block = BN(25);
 
             const tx0 = await NestMining.connect(userA).post(token, usdtPrice, nestPrice, ethNum, { value: msgValue });

             await goBlocks(provider, price_duration_block);
             //===============================//
             
             // record funds before clearing
             const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);
             
             // clear 
             const tx1 = await NestMining.connect(userA).clear(token,17,1,{ value: msgValue });
             
             const sheet1 = await NestMining.contentOfPriceSheet(token, 17);
             
             // record funds after clearing
             const userA_eth_pool_now = await NestPool.balanceOfEthInPool(userA.address);

             // check updated priceSheet
             expect(sheet1.state).to.equal(1);

             expect(userA_eth_pool_pre.add(msgValue)).to.equal(userA_eth_pool_now);

        });
    
    });

});