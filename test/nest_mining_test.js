const { expect } = require('chai');
require('chai').should();
const IBNEST = artifacts.require("IBNEST");
const IterableMapping = artifacts.require("IterableMapping");
const { BN, time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
// const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
// const IBNEST = contract.fromArtifact("IBNEST");
// const IterableMapping = contract.fromArtifact("IterableMapping");

const UERC20 = artifacts.require("test/UERC20");
const DAO = artifacts.require("DAO");

const NestPool = artifacts.require("NestPool");
const BonusPool = artifacts.require("BonusPool");
const Staking = artifacts.require("Staking");
const NestMining = artifacts.require("NestMining");

const NNToken = artifacts.require("test/NNToken");
const NNRewardPool = artifacts.require("NNRewardPool");

const NestPrice = artifacts.require("NestPrice");
const NTokenAuction = artifacts.require("NTokenAuction");

const ethdec = (new BN('10')).pow(new BN('18'));
const ethTwei = (new BN('10')).pow(new BN('12'));
const usdtdec = (new BN('10')).pow(new BN('6'));

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

// https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
// https://docs.openzeppelin.com/test-environment/0.1/api
// https://docs.openzeppelin.com/test-helpers/0.5/api

contract('NEST V3.5', (accounts) => {
// describe('NEST V3.5', function () {
    // const [deployer, userA, userB] = accounts;
    const deployer = accounts[0];
    const userA = accounts[1];
    const userB = accounts[2];
    const userC = accounts[3];
    const userD = accounts[4];
    const dev = accounts[5];
    const NN = accounts[6];
    const NNodeA = accounts[7];
    const NNodeB = accounts[8];
    const burnNest = accounts[9];


    const go_block = async function (num) {
        let block_h;
        for (i = 0; i < num; i++) {
            await time.advanceBlock();
            block_h = await time.latestBlock();
            console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
        }
    }

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
       
        let rs = await NestTokenContract.balanceOf(userA);
        let A_nest = rs.div(ethdec).toString(10);

        rs = await NestTokenContract.balanceOf(userB);
        let B_nest = rs.div(ethdec).toString(10);
        
        rs = await NestTokenContract.balanceOf(userC);
        let C_nest = rs.div(ethdec).toString(10);

        rs = await NestTokenContract.balanceOf(userD);
        let D_nest = rs.div(ethdec).toString(10);

        rs = await NestTokenContract.balanceOf(_C_NestPool);
        let Pool_nest = rs.div(ethdec).toString(10);
        
        rs = await NestTokenContract.balanceOf(dev);
        let dev_nest = rs.div(ethdec).toString(10);        
        
        rs = await NestTokenContract.balanceOf(NN);
        let NN_nest = rs.div(ethdec).toString(10);

        rs = await NestTokenContract.balanceOf(burnNest);
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

    before(async () => {
        // // for @openzeppelin/test-environment
        // // we can migrate to openzeppelin, if it has completed support for test coverage and gas cost measurement
        // await IBNEST.detectNetwork();
        // iterableMapping = await IterableMapping.new({ from: deployer });
        // IBNEST.link("IterableMapping", iterableMapping.address); // link libraries
        // NestToken = await IBNEST.new({ from: deployer });
        NestTokenContract = await IBNEST.deployed();
        DAOContract = await DAO.deployed();
        NestPoolContract = await NestPool.deployed();
        BonusPoolContract= await BonusPool.deployed();
        StakingContract = await Staking.deployed();
        NestMiningContract = await NestMining.deployed();
        USDTContract = await UERC20.deployed();
        NNRewardPoolContract = await NNRewardPool.deployed();
        NNTokenContract = await NNToken.deployed();

        NestPriceContract = await NestPrice.deployed();
        NTokenAuctionContract = await NTokenAuction.deployed();

    
        _C_DAO = DAOContract.address;
        _C_NestToken = NestTokenContract.address;
        _C_USDT = USDTContract.address;
        _C_NestPool = NestPoolContract.address;
        _C_NNToken = NNTokenContract.address;
        _C_NNRewardPool = NNRewardPoolContract.address;
        _C_BonusPool = BonusPoolContract.address;
        _C_NestPrice = NestPriceContract.address;
        _C_NestMining = NestMiningContract.address;
        _C_NTokenAuction = NTokenAuctionContract.address;
        _C_Staking = StakingContract.address;

        console.log(`- - - - - - - - - - - - - - - - - - `);
        console.log(`> [INIT] deployer = `, deployer);
        console.log(`> [INIT] userA = `, userA);
        console.log(`> [INIT] userB = `, userB);
        console.log(`> [INIT] userC = `, userC);
        console.log(`> [INIT] userD = `, userD);
        console.log(`> [INIT] BonusPool.address = `, BonusPoolContract.address);
        console.log(`> [INIT] NextToken.address = `, NestTokenContract.address);
        console.log(`> [INIT] Staking.address = `, StakingContract.address);
        console.log(`> [INIT] NestPool.address = `, NestPoolContract.address);
        console.log(`> [INIT] NestMining.address = `, NestMiningContract.address);
        console.log(`> [INIT] USDT.address = `, USDTContract.address);
        console.log(`> [INIT] NestPrice.address = `, NestPriceContract.address);

        let rs = await NestPoolContract.setNTokenToToken(_C_USDT, _C_NestToken);
        console.log(`> [INIT] deployer: NestPool.setNTokenToToken(token=${_C_USDT}, ntoken=${_C_NestToken}), gasUsed: ${rs.receipt.gasUsed}`);
        console.log(`> [INIT] deployer: SET USDT ==> NestToken`);

        rs = await NestPoolContract.setContracts(NestMiningContract.address, _C_NestToken);
        console.log(`> [INIT] deployer: NestPool.setContracts(_C_NestMining=${NestMiningContract.address}, _C_NestToken=${_C_NestToken})`);

        rs = await NestMiningContract.setAddresses(dev, NN);
        console.log(`> [INIT] deployer: NestMining.setAddresses(dev=${dev}, NN=${NN})`);

        rs = await NNTokenContract.setContracts(_C_NNRewardPool);
        console.log(`> [INIT] deployer: NNToken.setContracts(C_NNRewardPool=${_C_NNRewardPool})`);

        rs = await NestPriceContract.setContracts(_C_NestToken, _C_NestMining, _C_BonusPool, _C_NestPool, _C_DAO);
        console.log(`> [INIT] deployer: NestPrice.setContracts(C_NestToken=${_C_NestToken}, C_NestMining=${_C_NestMining}, C_BonusPool=${_C_BonusPool}, C_BonusPool=${_C_BonusPool}, C_NestPool=${_C_NestPool})`);

        rs = await NTokenAuctionContract.setContracts(_C_NestToken, _C_NestMining, _C_NestPool, _C_Staking, _C_DAO);
        console.log(`> [INIT] deployer: NTokenAuction.setContracts(C_NestToken=${_C_NestToken}, C_NestMining=${_C_NestMining}, C_NestPool=${_C_NestPool}, C_Staking=${_C_Staking})`);

        rs = await NestPriceContract.setBurnAddr(burnNest);
        console.log(`> [INIT] deployer: NestPrice.setBurnAddr(burnAddr=${burnNest})`);

        /*
         *  Transfer 1,000,000,000 [1 billion], 1/10 nest tokens to NEST-POOL
         */
        console.log(`> [INIT] deployer: NestToken.transfer(to=${_C_NestPool}, 1000000000)`);
        rs = await NestTokenContract.transfer(_C_NestPool, web3.utils.toWei("1000000000", 'ether'), { from: deployer });
        console.log(`  >> gasUsed: ${rs.receipt.gasUsed}`);
        console.log(`> [TRAN] NEST(1,000,000,000) [1 billion] | deployer ===> NestPool`);

        await USDTContract.transfer(userA, new BN('1000000').mul(usdtdec));
        console.log(`> [TRAN] USDT(1,000,000) [1 million] | deployer===> userA`);

        await USDTContract.transfer(userB, new BN('1000000').mul(usdtdec));
        console.log(`> [TRAN] USDT(1000000) [1 million] | deployer ===> userB`);


        rs = await USDTContract.approve(_C_NestPool, new BN("1000000").mul(usdtdec), { from: userA});
        console.log(`> [CALL] userA: _C_USDT.approve(NestPool, 1000000)`);
        
        rs = await USDTContract.allowance(userA, _C_NestPool);
        console.log(`> [VIEW] deployer: _C_USDT.allowance(owner=userA, spender=NestPool) = ${rs.div(usdtdec).toString(10)}`);

        rs = await USDTContract.approve(_C_NestPool, new BN("1000000").mul(usdtdec), { from: userB});
        console.log(`> [CALL] userB: _C_USDT.approve(NestPool, 1000000)`);
        
        rs = await USDTContract.allowance(userB, _C_NestPool);
        console.log(`> [VIEW] deployer: _C_USDT.allowance(owner=userB, spender=NestPool) = ${rs.div(usdtdec).toString(10)}`);


    });

    describe('NEST Token', function () {
        it("should have correct totalSupply", async () => {
            const expectedTotalSupply = web3.utils.toWei(new BN("10000000000"), 'ether');
            let totalSupply = await NestTokenContract.totalSupply();
            expect(totalSupply).to.bignumber.equal(expectedTotalSupply);
        })

        it("should transfer correctly", async () => {
            let amount = web3.utils.toWei(new BN("200000"), 'ether');
            console.log(`>> [TRAN] NEST(${amount.div(ethdec)}) | deployer ==> userC`);
            let result = await NestTokenContract.transfer(userC, amount, { from: deployer });
            console.log(`  >> gasUsed: ${result.receipt.gasUsed}`);
            let balanceOfUserC = await NestTokenContract.balanceOf(userC);
            expect(balanceOfUserC).to.bignumber.equal(amount);
        })

        it("should transfer correctly", async () => {
            let amount = web3.utils.toWei(new BN("200000"), 'ether');
            console.log(`>> [TRAN] NEST(${amount.div(ethdec)}) | deployer ==> userD`);
            let result = await NestTokenContract.transfer(userD, amount, { from: deployer });
            console.log(`  >> gasUsed: ${result.receipt.gasUsed}`);
            let balanceOfUserD = await NestTokenContract.balanceOf(userD);
            expect(balanceOfUserD).to.bignumber.equal(amount);
        })

        it("should transfer fail", async () => {
            let amount = web3.utils.toWei(new BN("10000000001"), 'ether');
            await expectRevert.unspecified(
                NestTokenContract.transfer(userA, amount, { from: deployer })
            );
        })

        it("should approve correctly", async () => {
            let approved_val = web3.utils.toWei("10000000000", 'ether');
            console.log(`>> [CALL] userC: NestToken.approve(${_C_NestPrice}, amount=${approved_val/ethdec})`);
            let tx = await NestTokenContract.approve(_C_NestPrice, approved_val, { from: userC});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            let rs = await NestTokenContract.allowance(userC, _C_NestPrice);
            console.log(`>> [VIEW] deployer: NestToken.allowance(owner=${userC}, spender=${_C_NestPrice}) = `, rs.div(ethdec).toString(10));
        })

        it("should approve correctly", async () => {
            let approved_val = web3.utils.toWei("10000000000", 'ether');
            console.log(`>> [CALL] userD: NestToken.approve(${_C_NestPrice}, amount=${approved_val/ethdec})`);
            let tx = await NestTokenContract.approve(_C_NestPrice, approved_val, { from: userD});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            let rs = await NestTokenContract.allowance(userD, _C_NestPrice);
            console.log(`>> [VIEW] deployer: NestToken.allowance(owner=${userC}, spender=${_C_NestPrice}) = `, rs.div(ethdec).toString(10));
        })

    });
    
    describe('DAO', function () {
        it("set _x correctly", async () => {
            console.log(`====> test DAO`);
            let x_in_dao = await web3.eth.getStorageAt(DAOContract.address, 0);
            let x_in_dao2 = parseInt(x_in_dao, 16);
            console.log(`====> x_in_dao`, x_in_dao);
            let x_from_getX = await DAOContract.getX();
            console.log(`====> x_from_getX`, x_from_getX);
            expect(x_from_getX).to.bignumber.equal(new BN(x_in_dao2));
        });
    });

    describe('NestMining price sheets', function () {
        let index;
        let itoken;
        let block_of_post;
        let rs;
        let yield_of_post;
        let eth_amount = web3.utils.toWei("20", 'ether');
        let usdt_amount = new BN('1000').mul(usdtdec);
        let block_of_1_of_5_posts; 

        it("should be able to post a price sheet", async () => {

            let len1 = await NestMiningContract.lengthOfPriceSheets(_C_USDT);
            let msg_value = web3.utils.toWei("22", 'ether');

            block_of_post = await time.latestBlock();
            yield_of_post = await NestMiningContract.yieldAmountAtHeight(block_of_post.add(new BN(1)));
            console.log(`>> [VIEW] yield at ${block_of_post.add(new BN(1))}: ${yield_of_post}`);

            let userA_nest = await NestTokenContract.balanceOf(userA);
            let userA_usdt = await USDTContract.balanceOf(userA);
            let nestpool_eth = await balance.current(_C_NestPool);
            let bonuspool_eth = await balance.current(_C_BonusPool);
            
            // await show_eth_usdt_ledger();

            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${msg_value/ethdec}`);
            let tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                if (v.event == "PostPrice") {
                    index = v.args["index"];
                    itoken = v.args["token"];
                }
                if (v.event == "LogUint") {
                    return {s:v.args[0], v:v.args[1].toString(10)};
                }
                return;
            }));

            // await show_eth_usdt_ledger();

            block_of_post = await time.latestBlock();

            console.log(`  >> [INFO] priceSheet.index = ${index}, ${itoken}`);
            let len2 = await NestMiningContract.lengthOfPriceSheets(_C_USDT);

            let userA_usdt_2 = await USDTContract.balanceOf(userA);
            let nestpool_eth_2 = await balance.current(_C_NestPool);
            let bonuspool_eth_2 = await balance.current(_C_BonusPool);

            expect(len2.sub(len1)).to.bignumber.equal(new BN(1));
            let sheet = await NestMiningContract.contentOfPriceSheet(itoken, index);
            // expect(sheet["miner"]).to.bignumber.equal(new BN(userA).shrn(96));
            expect(sheet["ethAmount"]).to.bignumber.equal(new BN(eth_amount));
            expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(usdt_amount));
            expect(sheet["dealEthAmount"]).to.bignumber.equal(new BN(eth_amount));
            expect(sheet["dealTokenAmount"]).to.bignumber.equal(new BN(usdt_amount));
            expect(sheet["atHeight"]).to.bignumber.equal(block_of_post);

            let ethfee = new BN(sheet["ethFee"]);
            console.log(`ethfee = ${ethfee}, ethFeeTwei=${sheet["ethFeeTwei"]}`);
            expect(usdt_amount).to.bignumber.equal(new BN(userA_usdt.sub(userA_usdt_2)));
            expect(bonuspool_eth_2.sub(bonuspool_eth)).to.bignumber.equal(ethfee);
            expect(nestpool_eth_2.sub(nestpool_eth)).to.bignumber.equal((new BN(msg_value)).sub(ethfee));
            
            let userA_eth_nestpool = await NestPoolContract.balanceOfEthInPool(userA);
            let userA_token_nestpool = await NestPoolContract.balanceOfTokenInPool(userA, _C_USDT);

            console.log(`msg_value=${msg_value}, eth_amount=${eth_amount}, ethfee=${ethfee}`);
            console.log(`${(new BN(msg_value)).sub(new BN(eth_amount)).sub(new BN(ethfee))}`);
            console.log(`userA_eth_nestpool=${userA_eth_nestpool}`);
            expect(userA_eth_nestpool).to.bignumber.equal((new BN(msg_value)).sub(new BN(eth_amount)).sub(new BN(ethfee)));
            expect(userA_token_nestpool).to.bignumber.equal(new BN(0));

            let eth_nestpool = await NestPoolContract.balanceOfEthFreezed();
            let token_nestpool = await NestPoolContract.balanceOfTokenFreezed(_C_USDT);

            expect(eth_nestpool).to.bignumber.equal(new BN(eth_amount));
            expect(token_nestpool).to.bignumber.equal(new BN(usdt_amount));

            rs =  await NestMiningContract.atHeightOfPriceSheet(_C_USDT, index);
            expect(rs).to.bignumber.equal(block_of_post);

            console.log(`  >> [INFO] priceSheet.ethFee = ${sheet["ethFeeTwei"]}, atHeight=${sheet["atHeight"]}`);

            rs = await NestMiningContract._mined_nest_to_eth_at_height(block_of_post);
            console.log(`  >> [INFO] ethfee[${sheet["atHeight"]}]=${rs.div((new BN(2)).pow(new BN(128)))}, ${rs.mod((new BN(2)).pow(new BN(128)))}`)
            rs = await NestMiningContract.decodeU256Two(rs);
            console.log(`  >> [INFO] ${rs[0]}, ${rs[1]}`);
        });

        it("shouldn't be able to close a price sheet which isn't in effect", async () => {

            let len1 = await NestMiningContract.lengthOfPriceSheets(_C_USDT);

            console.log(`>> [CALL] userA: NestMining.closePriceSheet(token=${itoken}$, index=${index})`);
            await expectRevert(
                NestMiningContract.closePriceSheet(itoken, index, {from: userA}), "Price sheet isn't in effect"
            );
            console.log(`  >> revert`);

         });

        it("should be able to close an EFFECTIVE price sheet", async () => {

            let block_h;
            for (i = 0; i < 26; i++) {
                await time.advanceBlock();
                block_h = await time.latestBlock();
                console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
            }

            let userA_eth_nestpool = await NestPoolContract.balanceOfEthInPool(userA);
            let userA_token_nestpool = await NestPoolContract.balanceOfTokenInPool(userA, _C_USDT);
            let nestpool_usdt = await USDTContract.balanceOf(_C_NestPool);
            let len1 = await NestMiningContract.lengthOfPriceSheets(_C_USDT);
            let sheet = await NestMiningContract.contentOfPriceSheet(itoken, index);
            let eth_amount = sheet["ethAmount"];
            let token_amount = sheet["tokenAmount"];

            console.log(`>> [CALL] userA: NestMining.closePriceSheet(token=${itoken}$, index=${index})`);
            let tx = await NestMiningContract.closePriceSheet(itoken, index, {from: userA});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log(">> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                if (v.event == "PostPrice") {
                    index = v.args["index"];
                    itoken = v.args["token"];
                }
                return {s:v1, v:v2};
            }));

            // GUAR: _price_list'[index].ethAmount = 0; _price_list'[index].tokenAmount = 0;
            let sheet2 = await NestMiningContract.contentOfPriceSheet(itoken, index);
            console.log(`  >> miner=${sheet2["miner"].toString(16)}`);
            console.log(`  >> user =${userA}`);
            expect(sheet2["ethAmount"]).to.bignumber.equal(new BN(0));
            expect(sheet2["tokenAmount"]).to.bignumber.equal(new BN(0));

            let userA_eth_nestpool_2 = await NestPoolContract.balanceOfEthInPool(userA);
            let userA_token_nestpool_2 = await NestPoolContract.balanceOfTokenInPool(userA, _C_USDT);
            let nestpool_usdt_2 = await USDTContract.balanceOf(_C_NestPool);

            // ASSET: ETH'[NestPool.userA] - ETH[NestPool.userA] = eth_amount
            expect((new BN(userA_eth_nestpool_2)).sub(new BN(userA_eth_nestpool))).to.bignumber.equal(new BN(eth_amount));
            // ASSET: USDT'[NestPool.userA] - USDT[NestPool.userA] = token_amount
            expect((new BN(userA_token_nestpool_2)).sub(new BN(userA_token_nestpool))).to.bignumber.equal(new BN(token_amount));

            // ASSET: USDT[NestPool] = USDT[NestPool]
            expect(new BN(nestpool_usdt)).to.bignumber.equal(new BN(nestpool_usdt_2));
            
            // ASSET: Nest[userA] = yield_of_post * 80% 
            let userA_nest_inpool = await NestPoolContract.balanceOfNestInPool(userA);
            console.log(`>> [VIEW] userA: NestPool.balanceOfNestInPool(miner=${userA}) = ${userA_nest_inpool}`)
            expect(yield_of_post.mul(new BN(80)).div(new BN(100))).to.bignumber.equal(userA_nest_inpool);

        });

        it("should be able to withdraw ethers and tokens", async () => {

            let userA_eth = await balance.current(userA);
            let nestpool_eth = await balance.current(_C_NestPool);
            let userA_usdt = await USDTContract.balanceOf(userA);
            let nestpool_usdt = await USDTContract.balanceOf(_C_NestPool);

            console.log(`>> [CALL] userA: NestMining.withdrawEthAndToken(ethAmount=${web3.utils.toWei("20", "ether")/ethdec}$, token=${_C_USDT}, tokenAmount=${new BN("1000").mul(usdtdec)})`);
            let tx = await NestMiningContract.withdrawEthAndToken(web3.utils.toWei("20", "ether"), _C_USDT, new BN("1000").mul(usdtdec), {from: userA, gasPrice: 0});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log(`  >> tx = ${tx.logs.toString()}`);

            console.log(">> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));

            // ASSET: ETH'[userA] - ETH[userA] = ETH[NestPool] - ETH'[NestPool]
            let userA_eth2 = await balance.current(userA);
            let nestpool_eth_2 = await balance.current(_C_NestPool);
            let nestpool_usdt_2 = await USDTContract.balanceOf(_C_NestPool);


            expect(userA_eth2.sub(userA_eth)).to.bignumber.equal(new BN("20").mul(ethdec));
            expect(nestpool_eth.sub(nestpool_eth_2)).to.bignumber.equal(new BN("20").mul(ethdec));

            // ASSET: USDT'[userA] - USDT[userA] = USDT[NestPool] - USDT'[NestPool]
            let userA_usdt2 = await USDTContract.balanceOf(userA);
            expect(userA_usdt2.sub(userA_usdt)).to.bignumber.equal(new BN("1000").mul(usdtdec));
            expect(nestpool_usdt.sub(nestpool_usdt_2)).to.bignumber.equal(usdt_amount);

        });

        it("should be able to claim nest tokens", async () => {

            let userA_nest = await NestTokenContract.balanceOf(userA);
            let userA_nest_inpool = await NestPoolContract.balanceOfNestInPool(userA);

            console.log(`>> [VIEW] userA: NestPool.balanceOfNestInPool(miner=${userA}) = ${userA_nest_inpool}`);
            
            console.log(`>> [CALL] userA: NestMining.claimAllNToken(ntoken=${_C_NestToken})`);
            let tx = await NestMiningContract.claimAllNToken(_C_NestToken, {from: userA});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));

            // ASSET: Nest'[userA] - Nest[userA] = NestInPool[userA]
            // ASSET: NestInPool'[userA] = 0
            let userA_nest_2 = await NestTokenContract.balanceOf(userA);
            let userA_nest_inpool_2 = await NestPoolContract.balanceOfNestInPool(userA);
            expect(new BN(userA_nest_inpool)).to.bignumber.equal(new BN(userA_nest_2.sub(userA_nest)));
            expect(new BN(userA_nest_inpool_2)).to.bignumber.equal(new BN(0));

            console.log(`  >> [INFO] userA: claim nest token = ${userA_nest_2.sub(userA_nest).div(ethdec)}`);
        });

        it("should post 5 price-sheets and close them all in one tx", 
        async () => {

            let len_1 = await NestMiningContract.lengthOfPriceSheets(_C_USDT);

            let eth_amount = web3.utils.toWei("30", 'ether');
            let usdt_amount = new BN('1500').mul(usdtdec);
            let msg_value = web3.utils.toWei("32", 'ether');

            block_of_post = await time.latestBlock();
            let yield_1 = await NestMiningContract.yieldAmountAtHeight(block_of_post.add(new BN(1)));
            console.log(`>> [VIEW] yield at ${block_of_post.add(new BN(1))}: ${yield_1}`);

            // Post #1
            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
            let tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            block_of_1_of_5_posts = await time.latestBlock();

            await go_block(4);

            block_of_post = await time.latestBlock();
            let yield_2 = await NestMiningContract.yieldAmountAtHeight(block_of_post.add(new BN(1)));
            console.log(`>> [VIEW] yield at ${block_of_post.add(new BN(1))}: ${yield_2}`);

            // Post #2
            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
            tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            await go_block(4);

            block_of_post = await time.latestBlock();
            let yield_3 = await NestMiningContract.yieldAmountAtHeight(block_of_post.add(new BN(1)));
            console.log(`>> [VIEW] yield at ${block_of_post.add(new BN(1))}: ${yield_3}`);

            // Post #3
            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
            tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            await go_block(4);

            block_of_post = await time.latestBlock();
            let yield_4 = await NestMiningContract.yieldAmountAtHeight(block_of_post.add(new BN(1)));
            console.log(`>> [VIEW] yield at ${block_of_post.add(new BN(1))}: ${yield_4}`);

            // Post #4
            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
            tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            await go_block(4);


            block_of_post = await time.latestBlock();
            let yield_5 = await NestMiningContract.yieldAmountAtHeight(block_of_post.add(new BN(1)));
            console.log(`>> [VIEW] yield at ${block_of_post.add(new BN(1))}: ${yield_5}`);

            // Post #5
            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
            tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            // INV: 5 price sheets were posted
            let len_2 = await NestMiningContract.lengthOfPriceSheets(_C_USDT);
            expect(len_2.sub(len_1)).to.bignumber.equal(new BN(5));

            await go_block(15);

            // close 1,2,3,4,5
            // 1,2,3 are going to be closed 
            // 4,5 are going to be skipped, since they are not EFFECTIVE
            console.log(`>> [CALL] userA: NestMining.closePriceSheetList(token=${_C_USDT}), index=1,2,3,4,5`);
            tx = await NestMiningContract.closePriceSheetList(_C_USDT, [1,2,3,4,5], {from: userA});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] event: ", tx.logs.map((v, i)=> {
                if (v.event == "closePrice") {
                    return {s: "closePrice", v: `miner=${v.args["miner"]}, index=${v.args["index"]}, token=${v.args["token"]}`}
                }
                if (v.event == "LogUint") {
                    return {s:v.args[0], v:v.args[1].toString(10)};
                }
                return;
            }));

            await show_price_sheet_list();

            let sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 1);
            expect(sheet["ethAmount"]).to.bignumber.equal(new BN(0));
            expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));
            sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 2);
            expect(sheet["ethAmount"]).to.bignumber.equal(new BN(0));
            expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));
            sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 3);
            expect(sheet["ethAmount"]).to.bignumber.equal(new BN(0));
            expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));
            sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 4);
            expect(sheet["ethAmount"]).to.bignumber.equal(new BN(eth_amount));
            expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(usdt_amount));
            sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 5);
            expect(sheet["ethAmount"]).to.bignumber.equal(new BN(eth_amount));
            expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(usdt_amount));

        });

        // it("can post 2 price-sheets in one block", 
        // async () => {

        //     let eth_amount = web3.utils.toWei("60", 'ether');
        //     let usdt_amount = new BN('3120').mul(usdtdec);
        //     let msg_value = web3.utils.toWei("62", 'ether');

        //     // const miner_stop = () => {
        //     //     return new Promise((resolve, reject) => {
        //     //       web3.currentProvider.send({
        //     //         jsonrpc: '2.0',
        //     //         method: 'miner_stop',
        //     //         id: new Date().getTime()
        //     //       }, (err, result) => {
        //     //         if (err) { return reject(err) }
        //     //         return resolve(result)
        //     //       })
        //     //     })
        //     //   }

        //     // const miner_start = () => {
        //     //     return new Promise((resolve, reject) => {
        //     //       web3.currentProvider.send({
        //     //         jsonrpc: '2.0',
        //     //         method: 'miner_start',
        //     //         id: new Date().getTime()
        //     //       }, (err, result) => {
        //     //         if (err) { return reject(err) }
        //     //         return resolve(result)
        //     //       })
        //     //     })
        //     //   }
        //     // //     block_h = ;

        //     // console.log(`>> [INFO] height=${(await time.latestBlock()).toString(10)}`);

        //     // await show_price_sheet_list();
        //     // await miner_stop();

        //     console.log(`>> [async] userA:  NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
        //     tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });

        //     let block_h = await time.latestBlock();

        //     console.log(`>> [async] userA:  NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
        //     tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
        //     console.log(">> [DEBG] tx = ", tx.logs.map((v, i)=> {
        //         const v1 = v.args[0];
        //         const v2 = v.args[1];
        //         if (typeof(v2) == 'object') {
        //             return {s:v1, v:v2.toString(10)};
        //         }
        //         if (v.event == "PostPrice") {
        //             index = v.args["index"];
        //             itoken = v.args["token"];
        //         }
        //         return {s:v1, v:v2};
        //     }));

        //     tx = await NestMiningContract.debug_SetAtHeightOfPriceSheet(_C_USDT, index, block_h);
        //     console.log(`>> [INFO] height=${(await time.latestBlock()).toString(10)}`);

        //     await show_price_sheet_list();

        //     console.log(`>> [CALL] userA > NestMining.withdrawEthAndToken(ethAmount=${eth_amount}, token=${_C_USDT}, tokenAmount=${usdt_amount})`);
        //     tx = await NestMiningContract.withdrawEthAndToken(eth_amount, _C_USDT, usdt_amount, {from: userA});
        //     console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
        //     console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
        //         const v1 = v.args[0];
        //         const v2 = v.args[1];
        //         if (typeof(v2) == 'object') {
        //             return {s:v1, v:v2.toString(10)};
        //         }
        //         return {s:v1, v:v2};
        //     }));

        //     // await show_eth_usdt_ledger();
        //     // await show_nest_ntoken_ledger();

        //     console.log(`>> [CALL] userA: NestMining.claimAllNToken(ntoken=${_C_NestToken})`);
        //     tx = await NestMiningContract.claimAllNToken(_C_NestToken, {from: userA});
        //     console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
        //     console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
        //         const v1 = v.args[0];
        //         const v2 = v.args[1];
        //         if (typeof(v2) == 'object') {
        //             return {s:v1, v:v2.toString(10)};
        //         }
        //         return {s:v1, v:v2};
        //     }));

        //     // await show_eth_usdt_ledger();
        //     // await show_nest_ntoken_ledger();

        // });

        it("should be able to buy TOKENs from a price sheet ", async () => {

            let eth_amount = web3.utils.toWei("20", 'ether');
            let usdt_amount = new BN('1000').mul(usdtdec);
            let msg_value = web3.utils.toWei("2", 'ether');

            // await show_eth_usdt_ledger();
            // await show_price_sheet_list();

            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${msg_value/ethdec}`);
            let tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                if (v.event == "PostPrice") {
                    index = v.args["index"];
                    itoken = v.args["token"];
                }
                return {s:v1, v:v2};
            }));
            console.log(`  >> [DEBG] price sheet index = ${index}, ${itoken}`);

            // await show_eth_usdt_ledger();
            // await show_price_sheet_list();

            let bonuspool_eth = await balance.current(_C_BonusPool);
            let userB_eth_nestpool = await NestPoolContract.balanceOfEthInPool(userB);
            let nestpool_usdt = await NestPoolContract.balanceOfTokenFreezed(_C_USDT);

            let B_msg_value = web3.utils.toWei("62", 'ether');
            let B_eth_amount = (new BN(eth_amount)).mul(new BN('2'));
            let B_usdt_amount = new BN('1100').mul(usdtdec).mul(new BN('2'));
            let nestpool_eth = await NestPoolContract.balanceOfEthFreezed();

            console.log(`>> [CALL] userB: NestMining.biteTokens(ethAmount=${B_eth_amount}, tokenAmount=${B_usdt_amount}, biteEthAmount=${eth_amount}, biteTokenAmount=${usdt_amount}, index=${index}) value: ${B_msg_value/ethdec}`)
            tx = await NestMiningContract.biteTokens(B_eth_amount, B_usdt_amount, eth_amount, usdt_amount, _C_USDT, index, {from: userB, value: B_msg_value});
            console.log(`  >>  gasUsed: ${tx.receipt.gasUsed}`);
            let index_bitten;
            let token_bitten;
            let bite_eth_amount;
            let bite_token_amount;
            let buyer;
            let index_2;
            let itoken_2;
            console.log("  >> [DEBG] tx = ", tx.logs);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (v.event == "PostPrice") {
                    // console.log(`  >> [DEBG] event=${v.args[0]}, ${v.args[1]}, ${v.args[2]}, ${v.args[3]}`);
                    index_2 = v.args["index"];
                    itoken_2 = v.args["token"];
                } else if (v.event == "BiteToken") {
                    // console.log(`  >> [DEBG] BiteToken=${v.args["biteEthAmount"]}, ${v.args["biteTokenAmount"]}, ${v.args["index"]}, ${v.args["token"]}`);
                    index_bitten = v.args["index"];
                    itoken_bitten = v.args["token"];
                    bite_eth_amount = v.args["biteEthAmount"];
                    bite_token_amount = v.args["biteTokenAmount"];
                    buyer = v.args["miner"];
                    return;
                } else if (v.event == "LogUint") {
                    return {s:v.args[0], v:v.args[1].toString(10)};
                }
                return;
            }));

            console.log(`  >> [DEBG] price sheet index = ${index}, ${itoken}`);
            console.log(`  >> [DEBG] bite_eth_amount = ${bite_eth_amount}`);

            expect(bite_eth_amount).to.bignumber.equal(eth_amount);
            expect(bite_token_amount).to.bignumber.equal(usdt_amount);
            expect(index).to.bignumber.equal(index_bitten);
            expect(itoken).to.bignumber.equal(itoken_bitten);

            let sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, index);
            expect(sheet["ethAmount"]).to.bignumber.equal((new BN(eth_amount)).add(new BN(eth_amount)));
            expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));
            expect(sheet["dealEthAmount"]).to.bignumber.equal(new BN(0));
            expect(sheet["dealTokenAmount"]).to.bignumber.equal(new BN(0));

            let sheet_2 = await NestMiningContract.contentOfPriceSheet(_C_USDT, index_2);
            console.log(`>> [VIEW] sheet_2=${sheet_2[0]},${sheet_2[1]},${sheet_2[2]},${sheet_2[3]},${sheet_2[4]}`);
            let ethFee = new BN(sheet_2["ethFee"]);
            let bonuspool_eth_2 = await balance.current(_C_BonusPool);
            expect(bonuspool_eth_2.sub(bonuspool_eth)).to.bignumber.equal(ethFee);
            expect(ethFee).to.bignumber.equal(new BN(eth_amount).div(new BN(1000)));
            
            let userB_eth_nestpool_2 = await NestPoolContract.balanceOfEthInPool(userB);
            let nestpool_usdt_2 = await NestPoolContract.balanceOfTokenFreezed(_C_USDT);
            let nestpool_eth_2 = await NestPoolContract.balanceOfEthFreezed();
            expect(nestpool_eth_2.sub(nestpool_eth)).to.bignumber.equal(new BN(eth_amount).add(new BN(B_eth_amount)))
            expect(userB_eth_nestpool_2.sub(userB_eth_nestpool)).to.bignumber.equal(new BN(B_msg_value).sub(new BN(ethFee)).sub(new BN(eth_amount)).sub(new BN(B_eth_amount)));
            expect(nestpool_usdt_2.sub(nestpool_usdt)).to.bignumber.equal(new BN(B_usdt_amount.sub(usdt_amount)));

        });

        it("should be able to sell TOKENs from a price sheet ", async () => {

            await show_eth_usdt_ledger();
            await show_price_sheet_list();

            let A_msg_value = web3.utils.toWei("22", 'ether');
            let A_eth_amount = web3.utils.toWei("20", 'ether');
            let A_usdt_amount = new BN('800').mul(usdtdec);

            // await show_eth_usdt_ledger();
            // await show_price_sheet_list();

            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${A_eth_amount}, tokenAmount=${A_usdt_amount}, token=${_C_USDT}, 0), value:${A_msg_value/ethdec}`);
            let tx = await NestMiningContract.postPriceSheet(A_eth_amount, A_usdt_amount, _C_USDT, { from: userA, value: A_msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                if (v.event == "PostPrice") {
                    index = v.args["index"];
                    itoken = v.args["token"];
                }
                return {s:v1, v:v2};
            }));
            console.log(`  >> [DEBG] price sheet index = ${index}, ${itoken}`);

            await show_eth_usdt_ledger();

            let B_msg_value = web3.utils.toWei("32", 'ether');
            let B_eth_amount = web3.utils.toWei("20", 'ether');
            let B_usdt_amount = new BN('1000').mul(usdtdec);
            let B_bite_eth_amount = web3.utils.toWei("10", 'ether');
            let B_bite_usdt_amount = new BN('400').mul(usdtdec);

            let bonuspool_eth = await balance.current(_C_BonusPool);
            let userB_eth_nestpool = await NestPoolContract.balanceOfEthInPool(userB);
            let nestpool_usdt = await NestPoolContract.balanceOfTokenFreezed(_C_USDT);
            let nestpool_eth = await NestPoolContract.balanceOfEthFreezed();

            console.log(`>> [CALL] userB: NestMining.biteEths(ethAmount=${B_eth_amount}, tokenAmount=${B_usdt_amount}, biteEthAmount=${B_bite_eth_amount}, biteTokenAmount=${B_bite_usdt_amount}, index=${index}) value: ${B_msg_value/ethdec}`)
            tx = await NestMiningContract.biteEths(B_eth_amount, B_usdt_amount, B_bite_eth_amount, B_bite_usdt_amount, _C_USDT, index, {from: userB, value: B_msg_value});
            console.log(`  >>  gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (v.event == "PostPrice") {
                    index_2 = v.args["index"];
                    itoken_2 = v.args["token"];
                    return;
                } else if (v.event == "BiteEth") {
                    ev_index_bitten = v.args["index"];
                    ev_token_bitten = v.args["token"];
                    ev_bite_eth_amount = v.args["biteEthAmount"];
                    ev_bite_token_amount = v.args["biteTokenAmount"];
                    ev_buyer = v.args["miner"];
                    return;
                }  else if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));
            console.log(`  >> [DEBG] price sheet index = ${index}, ${itoken}`);

            await show_eth_usdt_ledger();

            expect(ev_bite_eth_amount).to.bignumber.equal(B_bite_eth_amount);
            expect(ev_bite_token_amount).to.bignumber.equal(B_bite_usdt_amount);
            expect(index).to.bignumber.equal(ev_index_bitten);
            expect(itoken).to.bignumber.equal(ev_token_bitten);

            // INV: 
            let sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, index);
            expect(sheet["ethAmount"]).to.bignumber.equal((new BN(A_eth_amount)).sub(new BN(B_bite_eth_amount)));
            expect(sheet["tokenAmount"]).to.bignumber.equal((new BN(A_usdt_amount)).add(new BN(B_bite_usdt_amount)));
            expect(sheet["dealEthAmount"]).to.bignumber.equal((new BN(A_eth_amount)).sub(new BN(B_bite_eth_amount)));
            expect(sheet["dealTokenAmount"]).to.bignumber.equal(new BN(A_usdt_amount).sub(new BN(B_bite_usdt_amount)));

            let sheet_2 = await NestMiningContract.contentOfPriceSheet(_C_USDT, index_2);
            // console.log(`>> [VIEW] sheet_2=${sheet_2[0]},${sheet_2[1]},${sheet_2[2]},${sheet_2[3]},${sheet_2[4]}`);
            let ethFee = new BN(sheet_2["ethFee"]);
            let bonuspool_eth_2 = await balance.current(_C_BonusPool);
            expect(bonuspool_eth_2.sub(bonuspool_eth)).to.bignumber.equal(ethFee);
            expect(ethFee).to.bignumber.equal(new BN(B_bite_eth_amount).div(new BN(1000)));
            
            let userB_eth_nestpool_2 = await NestPoolContract.balanceOfEthInPool(userB);
            let nestpool_usdt_2 = await NestPoolContract.balanceOfTokenFreezed(_C_USDT);
            let nestpool_eth_2 = await NestPoolContract.balanceOfEthFreezed();
            expect(nestpool_eth_2.sub(nestpool_eth)).to.bignumber.equal(new BN(A_eth_amount).sub(new BN(B_bite_eth_amount)))
            expect(userB_eth_nestpool_2.sub(userB_eth_nestpool)).to.bignumber.equal(new BN(B_msg_value).sub(new BN(ethFee)).sub(new BN(B_eth_amount)).add(new BN(B_bite_eth_amount)));
            expect(nestpool_usdt_2.sub(nestpool_usdt)).to.bignumber.equal(new BN(B_usdt_amount.add(B_bite_usdt_amount)));

         });

        // it("can close 3 price-sheets", async () => {

        //     await show_price_sheet_list();

        //     let len1 = await NestMiningContract.lengthOfPriceSheets(_C_USDT);
 
        //     let eth_amount = web3.utils.toWei("20", 'ether');
        //     let usdt_amount = new BN('1000').mul(usdtdec);
        //     let msg_value = web3.utils.toWei("22", 'ether');

        //     console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
        //     let tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
        //     console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
        //     console.log("  >> [DEBG] event: ", tx.logs.map((v, i)=> {
        //         if (v.event == "PostPrice") {
        //             index = v.args["index"];
        //             itoken = v.args["token"];
        //         }
        //         if (v.event == "LogUint") {
        //             return {s:v.args[0], v:v.args[1].toString(10)};
        //         }
        //         return;
        //     }));
 
        //     console.log(`>> [CALL] userA: NestMining.closePriceSheet(token=${_C_USDT}), index=${0}`);
        //     tx = await NestMiningContract.closePriceSheet(_C_USDT, 0, {from: userA});
        //     console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
        //     console.log("  >> [DEBG] event: ", tx.logs.map((v, i)=> {
        //         if (v.event == "closePrice") {
        //             return {s: "closePrice", v: `miner=${v.args["miner"]}, index=${v.args["index"]}, token=${v.args["token"]}`}
        //         }
        //         if (v.event == "LogUint") {
        //             return {s:v.args[0], v:v.args[1].toString(10)};
        //         }
        //         return;
        //     }));

        //     let sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 0);
        //     expect(sheet["ethAmount"]).to.bignumber.equal(new BN(0));
        //     expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));

        //     for (i = 0; i < 4; i++) {
        //         await time.advanceBlock();
        //         block_h = await time.latestBlock();
        //         console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
        //     }
 
             
        //     console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
        //     tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
        //     console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
        //     console.log("  >> [DEBG] event: ", tx.logs.map((v, i)=> {
        //         if (v.event == "PostPrice") {
        //             index = v.args["index"];
        //             itoken = v.args["token"];
        //         }
        //         if (v.event == "LogUint") {
        //             return {s:v.args[0], v:v.args[1].toString(10)};
        //         }
        //         return;
        //     }));
 
        //     console.log(`>> [CALL] userA: NestMining.closePriceSheet(token=${_C_USDT}), index=${1}`);
        //     tx = await NestMiningContract.closePriceSheet(_C_USDT, 1, {from: userA});
        //     console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
        //     console.log("  >> [DEBG] event: ", tx.logs.map((v, i)=> {
        //         if (v.event == "closePrice") {
        //             return {s: "closePrice", v: `miner=${v.args["miner"]}, index=${v.args["index"]}, token=${v.args["token"]}`}
        //         }
        //         if (v.event == "LogUint") {
        //             return {s:v.args[0], v:v.args[1].toString(10)};
        //         }
        //         return;
        //     }));

        //     sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 1);
        //     expect(sheet["ethAmount"]).to.bignumber.equal(new BN(0));
        //     expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));

        //     for (i = 0; i < 4; i++) {
        //         await time.advanceBlock();
        //         block_h = await time.latestBlock();
        //         console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
        //     }
 
 
        //     console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
        //     tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
        //     console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
        //     console.log("  >> [DEBG] event: ", tx.logs.map((v, i)=> {
        //         if (v.event == "PostPrice") {
        //             index = v.args["index"];
        //             itoken = v.args["token"];
        //         }
        //         if (v.event == "LogUint") {
        //             return {s:v.args[0], v:v.args[1].toString(10)};
        //         }
        //         return;
        //     }));
  
        //     console.log(`>> [CALL] userA: NestMining.closePriceSheet(token=${_C_USDT}), index=${2}`);
        //     tx = await NestMiningContract.closePriceSheet(_C_USDT, 2, {from: userA});
        //     console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
        //     console.log("  >> [DEBG] event: ", tx.logs.map((v, i)=> {
        //         if (v.event == "closePrice") {
        //             return {s: "closePrice", v: `miner=${v.args["miner"]}, index=${v.args["index"]}, token=${v.args["token"]}`}
        //         }
        //         if (v.event == "LogUint") {
        //             return {s:v.args[0], v:v.args[1].toString(10)};
        //         }
        //         return;
        //     }));
            
        //     sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 2);
        //     expect(sheet["ethAmount"]).to.bignumber.equal(new BN(0));
        //     expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));
 
        //     for (i = 0; i < 4; i++) {
        //         await time.advanceBlock();
        //         block_h = await time.latestBlock();
        //         console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
        //     }
  
        //     await show_price_sheet_list();

        //     await show_eth_usdt_ledger();
        //     await show_nest_ntoken_ledger();
 
        // });

        // it("can close 4 price-sheets in one tx", async () => {

        //     await show_price_sheet_list();
 
        //     console.log(`>> [CALL] userA: NestMining.closePriceSheet(token=${_C_USDT}), index=${0}`);
        //     let tx = await NestMiningContract.closePriceSheetList(_C_USDT, [3,4,5,6], {from: userA});
        //     console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
        //     console.log("  >> [DEBG] event: ", tx.logs.map((v, i)=> {
        //         if (v.event == "closePrice") {
        //             return {s: "closePrice", v: `miner=${v.args["miner"]}, index=${v.args["index"]}, token=${v.args["token"]}`}
        //         }
        //         if (v.event == "LogUint") {
        //             return {s:v.args[0], v:v.args[1].toString(10)};
        //         }
        //         return;
        //     }));

        //     let sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 3);
        //     expect(sheet["ethAmount"]).to.bignumber.equal(new BN(0));
        //     expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));
        //     sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 4);
        //     expect(sheet["ethAmount"]).to.bignumber.equal(new BN(0));
        //     expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));
        //     sheet = await NestMiningContract.contentOfPriceSheet(_C_USDT, 5);
        //     expect(sheet["ethAmount"]).to.bignumber.equal(new BN(0));
        //     expect(sheet["tokenAmount"]).to.bignumber.equal(new BN(0));

        //     await show_price_sheet_list();

        //     await show_eth_usdt_ledger();
        //     await show_nest_ntoken_ledger();
 
        // });

        it("can get price of the lastest EFFECTIVE price sheet", async () => {

            await show_price_sheet_list();

            let eth_amount = web3.utils.toWei("60", 'ether');
            let usdt_amount = new BN('3000').mul(usdtdec);
            let msg_value = web3.utils.toWei("22", 'ether');


            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}), value:${msg_value/ethdec}`);
            let tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] event: ", tx.logs.map((v, i)=> {
                if (v.event == "PostPrice") {
                    index = v.args["index"];
                    itoken = v.args["token"];
                }
                if (v.event == "LogUint") {
                    return {s:v.args[0], v:v.args[1].toString(10)};
                }
                return;
            }));
            let blockh = await time.latestBlock();
            let block_h;
            for (i = 0; i < 26; i++) {
                await time.advanceBlock();
                block_h = await time.latestBlock();
                console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
            }

            let rs = await NestMiningContract.priceOfToken(_C_USDT, {from: userA});
            console.log(`>> [VIEW] userA: NestMining.priceOfToken(token=${_C_USDT}) = (ethAmount=${rs["ethAmount"]}, tokenAmount=${rs["tokenAmount"]}, bn=${rs["bn"]}`);

            expect(rs["ethAmount"]).to.bignumber.equal(eth_amount);
            expect(rs["tokenAmount"]).to.bignumber.equal(usdt_amount);
            expect(rs["bn"]).to.bignumber.equal(blockh);

            // await show_price_sheet_list();
        });

        it("should get price of the SPECIFIC EFFECTIVE price sheet", async () => {

            await show_price_sheet_list();

            let eth_amount = web3.utils.toWei("30", 'ether');
            let usdt_amount = new BN('1500').mul(usdtdec);
            let msg_value = web3.utils.toWei("32", 'ether');

            let rs = await NestMiningContract.priceOfTokenAtHeight(_C_USDT, block_of_1_of_5_posts);
            console.log(`>> [VIEW] NestMiningpriceOfTokenAtHeight(token=${_C_USDT},bn=${block_of_1_of_5_posts})`);
            console.log(`>> [VIEW] rs.ethAmount=${rs["ethAmount"]}, rs.tokenAmount=${rs["tokenAmount"]}, rs.bn=${rs["bn"]}`);
            expect(rs["ethAmount"]).to.bignumber.equal(new BN(eth_amount));
            expect(rs["tokenAmount"]).to.bignumber.equal(new BN(usdt_amount));
            expect(rs["bn"]).to.bignumber.equal(new BN(block_of_1_of_5_posts));

        });

    });

    
})