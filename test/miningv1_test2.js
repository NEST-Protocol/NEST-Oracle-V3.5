const { expect } = require('chai');
const { WeiPerEther, BigNumber } = require("ethers");
const { BN,time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const usdtdec = BigNumber.from(10).pow(6);
const wbtcdec = BigNumber.from(10).pow(8);
const ethdec = ethers.constants.WeiPerEther;
const nestdec = ethdec;

const ethTwei = BigNumber.from(10).pow(12);

function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = a.getMonth();
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = year + "-" + month + "-" + date + " "+hour+":"+min+":"+sec;
    return time;
  }


const ETH = function (amount) {
    return BigNumber.from(amount).mul(ethdec);
};

const USDT = function (amount) {
    return BigNumber.from(amount).mul(usdtdec);
};

const WBTC = function (amount) {
    return BigNumber.from(amount).mul(wbtcdec);
};

const MBTC = function (amount) {
    return BigNumber.from(amount).mul(BigNumber.from(10).pow(5));
};

const NEST = function (amount) {
    return BigNumber.from(amount).mul(ethdec);
};

const BigN = function (n) {
    return BigNumber.from(n);
};

const BigNum = function (n) {
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

const show_eth = function (amount){
    const ethskip = (new BN('10')).pow(new BN('13'));
    const ethdec = (new BN('10')).pow(new BN('18'));
    return (amount.div(ethdec).toString(10) + '.' + amount.mod(ethdec).div(ethskip).toString(10, 5));
};

const show_usdt = function (amount){
    const usdtskip = (new BN('10')).pow(new BN('3'));
    const usdtdec = (new BN('10')).pow(new BN('6'));
    return (amount.div(usdtdec).toString(10) + '.' + amount.mod(usdtdec).div(usdtskip).toString(10, 5));
};

function toBN(value) {
    const hex = BigNumber.from(value).toHexString();
    if (hex[0] === "-") {
        return (new BN("-" + hex.substring(3), 16));
    }
    return new BN(hex.substring(2), 16);
}

const show_64x64 = function (s) {
    const sep = BigNum(2).pow(BigNum(64));
    const prec = BigNum(10).pow(BigNum(8));
    const s1 = BigNum(s).div(sep);
    const s2 = BigNum(s).mod(sep);
    const s3 = s2.mul(prec).div(sep);
    return (s1 + '.' + toBN(s3).toString(10, 8));
}

const show_price_sheet_list = async function () {

    function Record(miner, ethAmount, tokenAmount, dealEthAmount, dealTokenAmount, ethFee, atHeight, deviated) {
        this.miner = miner;
        this.ethAmount = ethAmount;
        this.tokenAmount = tokenAmount;
        this.dealEthAmount = dealEthAmount;
        this.dealTokenAmount = dealTokenAmount;
        this.ethFee = ethFee;
        this.atHeight = atHeight;
        this.deviated = deviated;
    }
    var records = {};

    rs = await NestMiningContract.lengthOfPriceSheets(_C_USDT);
    let n = rs.toNumber();
    for (var i=0; i<n; i++) {
        rs = await NestMiningContract.contentOfPriceSheet(_C_USDT, new BN(i));
        records[i.toString()] = new Record(rs["miner"].toString(16), show_eth(rs["ethAmount"]), show_usdt(rs["tokenAmount"]), show_eth(rs["dealEthAmount"]), 
            show_usdt(rs["dealTokenAmount"]), rs["ethFee"].toString(10), rs["atHeight"].toString());
    }

    console.table(records);
}


const show_nest_ntoken_ledger = async function () {
   
    let rs = await NestToken.balanceOf(userA);
    let A_nest = rs.div(ethdec).toString(10);

    rs = await NestToken.balanceOf(userB);
    let B_nest = rs.div(ethdec).toString(10);
    
    rs = await NestToken.balanceOf(userC);
    let C_nest = rs.div(ethdec).toString(10);

    rs = await NestToken.balanceOf(userD);
    let D_nest = rs.div(ethdec).toString(10);

    rs = await NestToken.balanceOf(_C_NestPool);
    let Pool_nest = rs.div(ethdec).toString(10);
    
    rs = await NestToken.balanceOf(dev);
    let dev_nest = rs.div(ethdec).toString(10);        
    
    rs = await NestToken.balanceOf(NN);
    let NN_nest = rs.div(ethdec).toString(10);

    rs = await NestToken.balanceOf(burnNest);
    let burn_nest = show_eth(rs);

    // nest pool

    rs = await NestPoolContract.balanceOfNestInPool(userA);
    let A_pool_nest = rs.div(ethdec).toString(10);
    
    rs = await NestPoolContract.balanceOfNestInPool(userB);
    let B_pool_nest = rs.div(ethdec).toString(10);

    rs = await NestPoolContract.balanceOfNestInPool(userC);
    let C_pool_nest = rs.div(ethdec).toString(10);

    rs = await NestPoolContract.balanceOfNestInPool(userD);
    let D_pool_nest = rs.div(ethdec).toString(10);

    rs = await NestPoolContract.balanceOfNestInPool(dev);
    let dev_pool_nest = rs.div(ethdec).toString(10);        
    
    rs = await NestPoolContract.balanceOfNestInPool(NN);
    let NN_pool_nest = rs.div(ethdec).toString(10);

    // eth ledger 

    rs = await balance.current(userC);
    let userC_eth = show_eth(rs);
    rs = await balance.current(userD);
    let userD_eth = show_eth(rs);
    rs = await balance.current(_C_BonusPool);
    let bonusPool_eth = show_eth(rs);


    function Record(ETH, NEST, POOL_NEST) {
        this.ETH = ETH;
        this.NEST = NEST;
        this.POOL_NEST = POOL_NEST;
    }

    var records = {};
    records.userA = new Record(`ETH()`, `NEST(${A_nest})`, `POOL_NEST(${A_pool_nest})`);
    records.userB = new Record(`ETH()`, `NEST(${B_nest})`, `POOL_NEST(${B_pool_nest})`);
    records.userC = new Record(`ETH(${userC_eth})`, `NEST(${C_nest})`, `POOL_NEST(${C_pool_nest})`);
    records.userD = new Record(`ETH(${userD_eth})`, `NEST(${D_nest})`, `POOL_NEST(${D_pool_nest})`);
    records.BonusPool = new Record(`ETH(${bonusPool_eth})`, ` `, ` `);
    records.Pool = new Record(`ETH()`, `NEST(${Pool_nest})`, ` `);
    records.dev = new Record(`ETH()`, `NEST(${dev_nest})`, `POOL_NEST(${dev_pool_nest})`);
    records.NN = new Record(`ETH()`, `NEST(${NN_nest})`, `POOL_NEST(${NN_pool_nest})`);
    records.burn = new Record(`ETH()`, `NEST(${burn_nest})`, ` `);
    console.table(records);
}



const show_eth_usdt_ledger = async function () {
    let rs = await USDTContract.balanceOf(userA);
    let A_usdt = show_usdt(rs);
    rs = await USDTContract.balanceOf(userB);
    let B_usdt = show_usdt(rs);

    rs = await USDTContract.balanceOf(_C_NestPool);
    let Pool_usdt = show_usdt(rs);

    rs = await balance.current(userA);
    let A_eth = show_eth(rs);
    rs = await balance.current(userB);
    let B_eth = show_eth(rs);

    rs = await balance.current(_C_NestPool);
    let Pool_eth = show_eth(rs);
    
    rs = await NestPoolContract.getMinerEthAndToken(userA, _C_USDT);
    let A_pool_eth = show_eth(rs["ethAmount"]);
    let A_pool_usdt = rs["tokenAmount"].div(usdtdec).toString(10);

    rs = await NestPoolContract.getMinerEthAndToken(userB, _C_USDT);
    let B_pool_eth = show_eth(rs["ethAmount"]);
    let B_pool_usdt = show_usdt(rs["tokenAmount"]);

    rs = await NestPoolContract.getMinerEthAndToken(constants.ZERO_ADDRESS, _C_USDT);
    let pool_pool_eth = show_eth(rs["ethAmount"]);
    let pool_pool_usdt = show_usdt(rs["tokenAmount"]);

    rs = await BonusPoolContract.getBonusEthAmount(_C_NestToken);
    let bonus_eth = show_eth(rs);
    rs = await BonusPoolContract.getLevelingEthAmount(_C_NestToken);
    let leveling_eth = show_eth(rs);
    
    function Record(ETH, POOL_ETH, USDT, POOL_USDT) {
        this.ETH = ETH;
        this.POOL_ETH = POOL_ETH;
        this.USDT = USDT;
        this.POOL_USDT = POOL_USDT;
    }

    var records = {};
    records.userA = new Record(`ETH(${A_eth})`, `POOL_ETH(${A_pool_eth})`, `USDT(${A_usdt})`, `POOL_USDT(${A_pool_usdt})`);
    records.userB = new Record(`ETH(${B_eth})`, `POOL_ETH(${B_pool_eth})`, `USDT(${B_usdt})`, `POOL_USDT(${B_pool_usdt})`);
    records.Pool = new Record(" ", `ETH(${pool_pool_eth})`, ` `, `USDT(${pool_pool_usdt})`);
    records.Contr = new Record(` `, `ETH(${Pool_eth})`, ` `, `USDT(${Pool_usdt})`);
    records.Bonus = new Record(` `, `ETH(${bonus_eth})`, ` `, ` `);
    records.Level = new Record(` `, `ETH(${leveling_eth})`, ` `, ` `);
    console.table(records);
    // console.table(`>> [VIEW] ETH(${A_eth}) | POOL_ETH(${A_pool_eth}) | USDT(${A_usdt}) | POOL_USDT(${A_pool_usdt})`);
    // console.log(`>> [VIEW] userB: ETH(${B_eth}) | POOL_ETH(${B_pool_eth}) | USDT(${B_usdt}) | POOL_USDT(${B_pool_usdt})`);
    // console.log(`>> [VIEW]  Pool:               | ETH(${pool_pool_eth}),       |                 | USDT(${pool_pool_usdt})`);
    // console.log(`>> [VIEW] contr:               | ETH(${Pool_eth}),       |                 | USDT(${Pool_usdt})`);
}


describe("NestToken contract", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    let NestToken;
    let owner;
    let userA;
    let userB;
    let userC;
    let userD;
    let dev;
    let NNodeA;
    let NNodeB;
    let _C_NestStaking;
    let _C_NestToken;
    let _C_NestPool;
    let _C_USDT;
    let _C_NNRewardPool;
    let provider = ethers.provider;

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

        ERC20Contract = await ethers.getContractFactory("UERC20");
        CUSDT = await ERC20Contract.deploy("10000000000000000", "USDT Test Token", "USDT", 6);
        CWBTC = await ERC20Contract.deploy("2100000000000000", "WBTC Test Token", "WBTC", 6);

        IterableMappingContract = await ethers.getContractFactory("IterableMapping");
        IterableMapping = await IterableMappingContract.deploy();
        NestToken = await ethers.getContractFactory("IBNEST",
            {
                libraries: {
                    IterableMapping: IterableMapping.address
                }
            });

        NestToken = await NestToken.deploy();

        NestPoolContract = await ethers.getContractFactory("NestPool");
        NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract

        NestStakingContract = await ethers.getContractFactory("NestStaking");
        NestStaking = await NestStakingContract.deploy(NestToken.address);

        MiningV1CalcContract = await ethers.getContractFactory("MiningV1Calc");
        MiningV1Calc = await MiningV1CalcContract.deploy();
        NestMiningV1Contract = await ethers.getContractFactory("NestMiningV1",
        {
            libraries: {
                MiningV1Calc: MiningV1Calc.address
                }
        });     
        NestMining = await NestMiningV1Contract.deploy();

        NNTokenContract = await ethers.getContractFactory("NNToken");
        NNToken = await NNTokenContract.deploy(1500, "NNT");

        NNRewardPoolContract = await ethers.getContractFactory("NNRewardPool");
        NNRewardPool = await NNRewardPoolContract.deploy(NestToken.address, NNToken.address);

        NTokenControllerContract = await ethers.getContractFactory("NTokenController");
        NTokenController = await NTokenControllerContract.deploy();

        NestQueryContract = await ethers.getContractFactory("NestQuery");
        NestQuery = await NestQueryContract.deploy();

        _C_NestStaking = NestStaking.address;
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_USDT = CUSDT.address;
        _C_WBTC = CWBTC.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;

        console.log(`- - - - - - - - - - - - - - - - - - `);
        console.log(`> [INIT] owner = `, owner.address);
        console.log(`> [INIT] userA = `, userA.address);
        console.log(`> [INIT] userB = `, userB.address);
        console.log(`> [INIT] userC = `, userC.address);
        console.log(`> [INIT] userD = `, userD.address);
        console.log(`> [INIT] NestStaking.address = `, _C_NestStaking);
        console.log(`> [INIT] NextToken.address = `, _C_NestToken);
        console.log(`> [INIT] NestPool.address = `, _C_NestPool);
        console.log(`> [INIT] NestMining.address = `, _C_NestMining);
        console.log(`> [INIT] USDT.address = `, _C_USDT);
        // console.log(`> [INIT] NestPrice.address = `, NestPriceContract.address);

        await NestMining.init();

        await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);
        console.log(`> [INIT] deployer: set (USDT <-> NEST)`);

        await NestPool.setContracts(_C_NestMining, _C_NestToken, _C_NTokenController, _C_NNRewardPool);

        await NestMining.setAddresses(dev.address, dev.address);
        await NestMining.setContracts(_C_NestToken, _C_NestPool, _C_NestStaking, _C_NestQuery);

        await NTokenController.setContracts(_C_NestToken, _C_NestPool);

        await NestQuery.setContracts(_C_NestToken, _C_NestMining, _C_NestStaking, _C_NestPool);

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

        it("should approve correctly", async () => {
            const approved_val = NEST("10000000000");
            await NestToken.connect(userA).approve(_C_NestPool, approved_val);

            const rs = await NestToken.allowance(userA.address, _C_NestPool);
            expect(rs).to.equal(approved_val);
        })

        it("should approve correctly", async () => {
            const approved_val = NEST("10000000000");
            await NestToken.connect(userB).approve(_C_NestPool, approved_val);
            const rs = await NestToken.allowance(userB.address, _C_NestPool);
            expect(rs).to.equal(approved_val);
        })
    });

    describe('NestMining price sheets', function () {
        
        // calculate funds of post function  
        it("can transfer funds correctly !", async () => {
            const token = _C_WBTC;
            const ethNum = 10;
            const miningFeeRate = 10;
            const tokenAmountPerEth = MBTC(30);
            const msgValue = ETH(BigN(50));

            await NestToken.transfer(userA.address, NEST('1000000'));
            await NestToken.connect(userA).approve(_C_NTokenController, NEST('100000'));
            await NestToken.connect(userA).approve(_C_NestPool, NEST('10000000'));

            await CWBTC.transfer(userA.address, WBTC('10000'));
            await CWBTC.connect(userA).approve(_C_NestPool, WBTC(10000));
            await CWBTC.connect(userA).approve(_C_NTokenController, WBTC(1));

            // address(token) ==> address(NToken)
            await NTokenController.connect(userA).open(token);
            
            // record funds before posting
            const userA_nest_in_exAddress_pre = await NestToken.balanceOf(userA.address); 
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);
            const userA_token_in_exAddress_pre = await CWBTC.balanceOf(userA.address);

            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);

            // post 
            await NestMining.connect(userA).post(token,ethNum,tokenAmountPerEth,{value: msgValue});
            const postSheet = await NestMining.contentOfPriceSheet(token, 0);

            // calculate fee
            const ethFee = ETH(BigN(ethNum).mul(miningFeeRate)).div(1000);
            const freezeEthAmount = ETH(BigN(ethNum));
            const freezeTokenAmount = BigN(tokenAmountPerEth).mul(ethNum);
            const freezeNestAmount = NEST(BigN(1000));

            // record funds after posting
            const userA_nest_in_exAddress_now = await NestToken.balanceOf(userA.address); 
            const userA_nest_pool_now = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_now = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_eth_pool_now = await NestPool.balanceOfEthInPool(userA.address);
            const userA_token_in_exAddress_now = await CWBTC.balanceOf(userA.address);

            const nest_pool_now = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_now = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const eth_pool_now = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_now = await provider.getBalance(_C_NestStaking);
            

            // check funds
            expect(userA_eth_pool_pre.add(msgValue)
                                     .sub(ethFee)
                                     .sub(freezeEthAmount))
                   .to.equal(userA_eth_pool_now);

            expect(userA_token_in_exAddress_pre.add(userA_token_pool_pre)
                                               .sub(freezeTokenAmount))
                  .to.equal(userA_token_in_exAddress_now.add(userA_token_pool_now));

            expect(userA_nest_in_exAddress_pre.add(userA_nest_pool_pre)
                                              .sub(freezeNestAmount))
                  .to.equal(userA_nest_in_exAddress_now.add(userA_nest_pool_now));

            expect(eth_pool_pre.add(freezeEthAmount)).to.equal(eth_pool_now);
            expect(token_pool_pre.add(freezeTokenAmount)).to.equal(token_pool_now);
            expect(nest_pool_pre.add(freezeNestAmount)).to.equal(nest_pool_now);

            expect(eth_reward_pre.add(ethFee)).to.equal(eth_reward_now);
            
        });

        // check the price sheet when address == _C_WBTC and index == 0
        it('should update price sheet correctly !', async () => {
            const token = _C_WBTC;
            const ethNum = 10;
            const tokenAmountPerEth = MBTC(30);
            const h = await provider.getBlockNumber();

            const postSheet = await NestMining.contentOfPriceSheet(token, 0);
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

        });

        // calculate funds of post2 function
        it("can transfer funds correctly !", async () => {
            const token = _C_USDT;
            const ethNum = 10;
            const miningFeeRate = 10;
            const tokenAmountPerEth = USDT(450);
            const NTokenAmountPerEth = NEST(1000);
            const msgValue = ETH(BigN(50));

            const NToken = await NestPool.getNTokenFromToken(token);

            // record funds before posting
            const userA_nest_in_exAddress_pre = await NestToken.balanceOf(userA.address); 
            const userA_nest_pool_pre = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_pool_pre = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_token_in_exAddress_pre = await CUSDT.balanceOf(userA.address);
            const userA_NToken_pool_pre = await NestPool.balanceOfTokenInPool(userA.address,NToken);
            const userA_eth_pool_pre = await NestPool.balanceOfEthInPool(userA.address);
            
 
            const nest_pool_pre = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const NToken_pool_pre = await NestPool.balanceOfTokenInPool(_C_NestPool,NToken);
            const eth_pool_pre = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_pre = await provider.getBalance(_C_NestStaking);
 
            // post 
            await NestMining.connect(userA).post2(token, 10, tokenAmountPerEth, NTokenAmountPerEth, { value: msgValue });

            const postSheet = await NestMining.contentOfPriceSheet(token, 0);
 
            // calculate fee
            const ethFee = ETH(BigN(ethNum).mul(miningFeeRate)).div(1000);
            const freezeEthAmount = ETH(BigN(ethNum));
            const freezeTokenAmount = BigN(tokenAmountPerEth).mul(ethNum);
            const freezeNTokenAmount = BigN(NTokenAmountPerEth).mul(ethNum);
            const freezeNestAmount = NEST(BigN(2000));
 
            // record funds after posting
            const userA_nest_in_exAddress_now = await NestToken.balanceOf(userA.address); 
            const userA_nest_pool_now = await NestPool.balanceOfNestInPool(userA.address);
            const userA_token_in_exAddress_now = await CUSDT.balanceOf(userA.address);
            const userA_token_pool_now = await NestPool.balanceOfTokenInPool(userA.address,token);
            const userA_NToken_pool_now = await NestPool.balanceOfTokenInPool(userA.address,NToken);
            const userA_eth_pool_now = await NestPool.balanceOfEthInPool(userA.address);
           
            const nest_pool_now = await NestPool.balanceOfNestInPool(_C_NestPool);
            const token_pool_now = await NestPool.balanceOfTokenInPool(_C_NestPool,token);
            const NToken_pool_now = await NestPool.balanceOfTokenInPool(_C_NestPool,NToken);
            const eth_pool_now = await NestPool.balanceOfEthInPool(_C_NestPool);
            const eth_reward_now = await provider.getBalance(_C_NestStaking);
            
            // check funds
            // check funds about userA
            expect(userA_eth_pool_pre.add(msgValue)
                                     .sub(ethFee)
                                     .sub(freezeEthAmount)
                                     .sub(freezeEthAmount))
                  .to.equal(userA_eth_pool_now);
            
            expect(userA_token_pool_pre.add(userA_token_in_exAddress_pre)
                                       .sub(freezeTokenAmount))
                   .to.equal(userA_token_pool_now.add(userA_token_in_exAddress_now));

            expect(userA_nest_in_exAddress_pre.add(userA_nest_pool_pre)
                                              .add(userA_NToken_pool_pre)
                                              .sub(freezeNTokenAmount)
                                              .sub(freezeNestAmount))
                    .to.equal(userA_nest_in_exAddress_now.add(userA_nest_pool_now)
                                                         .add(userA_NToken_pool_now));
            
            // check funds about nestPool                                             
            expect(eth_pool_pre.add(freezeEthAmount)
                               .add(freezeEthAmount))
                   .to.equal(eth_pool_now);

            expect(token_pool_pre.add(freezeTokenAmount)).to.equal(token_pool_now);
            
            console.log('NToken_pool_pre = ',NToken_pool_pre.toString());
            console.log('freezeNTokenAmount = ',freezeNTokenAmount.toString());
            console.log('NToken_pool_now = ',NToken_pool_now.toString());
 
            expect(NToken_pool_pre.add(freezeNTokenAmount).add(freezeNestAmount)).to.equal(NToken_pool_now);
           

            // check funds about nestStaking
            expect(eth_reward_pre.add(ethFee)).to.equal(eth_reward_now);

        });

       // check the price sheet when address == _C_WBTC and index == 0
       it('should update price sheet correctly !', async () => {
           const token = _C_USDT;
           const ethNum = 10;
           const tokenAmountPerEth = USDT(450);
           const NTokenAmountPerEth = NEST(1000);
           const h = await provider.getBlockNumber();

           const NToken = await NestPool.getNTokenFromToken(token);

           const postSheet = await NestMining.contentOfPriceSheet(token, 0);
           
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

           const postSheet1 = await NestMining.contentOfPriceSheet(NToken, 0);
           
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

    });
});
