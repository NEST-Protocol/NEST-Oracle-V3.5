const { expect } = require('chai');
require('chai').should();
const IBNEST = artifacts.require("IBNEST");
const IterableMapping = artifacts.require("IterableMapping");
const { BN, time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
// const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
// const IBNEST = contract.fromArtifact("IBNEST");
// const IterableMapping = contract.fromArtifact("IterableMapping");

const UERC20 = artifacts.require("test/UERC20");
const WBTC = artifacts.require("test/UERC20");

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
        WBTCContract = await WBTC.deployed();
        
        NNRewardPoolContract = await NNRewardPool.deployed();
        NNTokenContract = await NNToken.deployed();

        NestPriceContract = await NestPrice.deployed();
        NTokenAuctionContract = await NTokenAuction.deployed();

    
        _C_DAO = DAOContract.address;
        _C_NestToken = NestTokenContract.address;
        _C_USDT = USDTContract.address;
        _C_WBTC = WBTCContract.address;

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

        await WBTCContract.transfer(userC, new BN('20000').mul(usdtdec));
        console.log(`> [TRAN] WBTC(20000) [20 kilo] | deployer ===> userC`);

        // await NestTokenContract.transfer(userC, new BN('90000').mul(ethdec));
        // console.log(`> [TRAN] Nest(90000) [90 kilo] | deployer ===> userC`);
        /* -----------------------
         * approve 
         */
        rs = await USDTContract.approve(_C_NestPool, new BN("1000000").mul(usdtdec), { from: userA});
        console.log(`> [CALL] userA: _C_USDT.approve(NestPool, 1000000)`);
        
        rs = await USDTContract.allowance(userA, _C_NestPool);
        console.log(`> [VIEW] deployer: _C_USDT.allowance(owner=userA, spender=NestPool) = ${rs.div(usdtdec).toString(10)}`);

        rs = await USDTContract.approve(_C_NestPool, new BN("1000000").mul(usdtdec), { from: userB});
        console.log(`> [CALL] userB: _C_USDT.approve(NestPool, 1000000)`);
        
        rs = await USDTContract.allowance(userB, _C_NestPool);
        console.log(`> [VIEW] deployer: _C_USDT.allowance(owner=userB, spender=NestPool) = ${rs.div(usdtdec).toString(10)}`);

        rs = await WBTCContract.approve(_C_NTokenAuction, new BN("10000").mul(usdtdec), { from: userC});
        console.log(`> [CALL] userC: _C_WBTC.approve(NTokenAuction, 10000)`);
        
        rs = await WBTCContract.allowance(userC, _C_NTokenAuction);
        console.log(`> [VIEW] deployer: _C_WBTC.allowance(owner=userC, spender=NTokenAuction) = ${rs.div(usdtdec).toString(10)}`);

        // rs = await NestTokenContract.approve(_C_NTokenAuction, new BN("90000").mul(ethdec), { from: userC});
        // console.log(`> [CALL] userC: NestToken.approve(NTokenAuction, 10000)`);
        
        // rs = await NestTokenContract.allowance(userC, _C_NTokenAuction);
        // console.log(`> [VIEW] deployer: NestToken.allowance(owner=userC, spender=NTokenAuction) = ${rs.div(ethdec).toString(10)}`);

    });

    describe('NEST Token', function () {
        it("should have correct totalSupply", async () => {
            const expectedTotalSupply = web3.utils.toWei(new BN("10000000000"), 'ether');
            let totalSupply = await NestTokenContract.totalSupply();
            expect(totalSupply).to.bignumber.equal(expectedTotalSupply);
        })

        it("should transfer correctly", async () => {
            let amount = web3.utils.toWei(new BN("800000"), 'ether');
            console.log(`>> [TRAN] NEST(${amount.div(ethdec)}) | deployer ==> userC`);
            let result = await NestTokenContract.transfer(userC, amount, { from: deployer });
            console.log(`  >> gasUsed: ${result.receipt.gasUsed}`);
            let balanceOfUserC = await NestTokenContract.balanceOf(userC);
            expect(balanceOfUserC).to.bignumber.equal(amount);
        })

        it("should transfer correctly", async () => {
            let amount = web3.utils.toWei(new BN("800000"), 'ether');
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
            console.log(`>> [CALL] userC: NestToken.approve(${_C_NTokenAuction}, amount=${approved_val/ethdec})`);
            let tx = await NestTokenContract.approve(_C_NTokenAuction, approved_val, { from: userC});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            let rs = await NestTokenContract.allowance(userC, _C_NTokenAuction);
            console.log(`>> [VIEW] deployer: NestToken.allowance(owner=${userC}, spender=${_C_NestPrice}) = `, rs.div(ethdec).toString(10));
        })

        it("should approve correctly", async () => {
            let approved_val = web3.utils.toWei("10000000000", 'ether');
            console.log(`>> [CALL] userD: NestToken.approve(${_C_NTokenAuction}, amount=${approved_val/ethdec})`);
            let tx = await NestTokenContract.approve(_C_NTokenAuction, approved_val, { from: userD});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            let rs = await NestTokenContract.allowance(userD, _C_NTokenAuction);
            console.log(`>> [VIEW] deployer: NestToken.allowance(owner=${userC}, spender=${_C_NTokenAuction}) = `, rs.div(ethdec).toString(10));
        })

    });

    describe('TEST NToken Auction', function () {
        it("should start an auction correcly", async () => {

            console.log(`- - - - - - - - - - - - - - - - - - `);
            console.log(`>> [TEST] NToken Auction`);
            let e_token;
            let e_bid;
            let e_bidder;

            let C_wbtc_bal = await WBTCContract.balanceOf(userC);
            let C_nest_bal = await NestTokenContract.balanceOf(userC);

            let amount = web3.utils.toWei("100000", 'ether');

            console.log(`>> [CALL] userC: NTokenAuction.startAuction(token=${_C_WBTC}, bidAmount=${amount})`);
            let tx = await NTokenAuctionContract.startAuction(_C_WBTC, amount, {from: userC});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                if (v.event == "AuctionStart") {
                    e_token = v.args["token"];
                    e_bid = v.args["bid"];
                    e_bidder = v.args["e_bidder"];
                }
                if (v.event == "LogUint") {
                    return {s:v.args[0], v:v.args[1].toString(10)};
                }
                return;
            }));

            let C_wbtc_bal_2 = await WBTCContract.balanceOf(userC);
            let C_nest_bal_2 = await NestTokenContract.balanceOf(userC);

            expect(e_token).equal(_C_WBTC);
            expect(C_wbtc_bal_2).to.bignumber.equal(C_wbtc_bal);
            expect(C_nest_bal.sub(C_nest_bal_2)).to.bignumber.equal(new BN(amount));
            
            let rs = await NTokenAuctionContract.auctionOf(_C_WBTC);
            expect(rs["winner"]).equal(userC);
            expect(rs["latestBid"]).to.bignumber.equal(new BN(amount));
            expect(rs["nestBurnedAmount"]).to.bignumber.equal(new BN(amount));
            expect(rs["disabled"]).to.bignumber.equal(new BN(0));

        });

        it("should bid an auction correcly", async () => {

            await show_nest_ntoken_ledger();

            let e_token;
            let e_bid;
            let e_bidder;

            let D_wbtc_bal = await WBTCContract.balanceOf(userD);
            let D_nest_bal = await NestTokenContract.balanceOf(userD);
            let C_nest_bal = await NestTokenContract.balanceOf(userC);

            let rs0 = await NTokenAuctionContract.auctionOf(_C_WBTC);

            let amount = web3.utils.toWei("200000", 'ether');

            console.log(`>> [CALL] userD: NTokenAuction.bidAuction(token=${_C_WBTC}, bidAmount=${amount})`);
            let tx = await NTokenAuctionContract.bidAuction(_C_WBTC, amount, {from: userD});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                if (v.event == "AuctionStart") {
                    e_token = v.args["token"];
                    e_bid = v.args["bid"];
                    e_bidder = v.args["e_bidder"];
                } else if (v.event == "AuctionBid") {
                    e_token = v.args["token"];
                    e_bid = v.args["bid"];
                    e_bidder = v.args["e_bidder"];
                } 
                if (v.event == "LogUint") {
                    return {s:v.args[0], v:v.args[1].toString(10)};
                }
                return;
            }));

            await show_nest_ntoken_ledger();

            let D_wbtc_bal_2 = await WBTCContract.balanceOf(userD);
            let D_nest_bal_2 = await NestTokenContract.balanceOf(userD);
            let C_nest_bal_2 = await NestTokenContract.balanceOf(userC);
            let _C_NTokenAuction_nest = await NestTokenContract.balanceOf(_C_NTokenAuction);
            let cashback = new BN(amount).sub(new BN(rs0["latestBid"])).div(new BN(2));

            expect(e_token).equal(_C_WBTC);
            expect(D_wbtc_bal_2).to.bignumber.equal(D_wbtc_bal);
            expect(D_nest_bal.sub(D_nest_bal_2)).to.bignumber.equal(new BN(amount));
            expect(C_nest_bal_2.sub(C_nest_bal)).to.bignumber.equal(new BN(rs0["latestBid"]).add(cashback));
            
            let rs = await NTokenAuctionContract.auctionOf(_C_WBTC);
            expect(rs["winner"]).equal(userD);
            expect(rs["latestBid"]).to.bignumber.equal(new BN(amount));
            expect(rs["nestBurnedAmount"]).to.bignumber.equal(new BN(rs0["nestBurnedAmount"]).add(cashback));
            expect(rs["disabled"]).to.bignumber.equal(new BN(0));
            console.log(`nest=${_C_NTokenAuction_nest}, nestBurnedAmount=${rs["nestBurnedAmount"]}`);

        });

        it("should close an auction correcly", async () => {

            await show_nest_ntoken_ledger();

            let e_token;
            let e_bid;
            let e_bidder;
            let e_ntoken;
            let e_winner;

            let D_wbtc_bal = await WBTCContract.balanceOf(userD);
            let D_nest_bal = await NestTokenContract.balanceOf(userD);

            let auc = await NTokenAuctionContract.auctionOf(_C_WBTC);
            let burn_addr = await NestPoolContract.addressOfBurnNest();
            let burnt_nest = await NestTokenContract.balanceOf(burn_addr);
            let ntoken_i = await NTokenAuctionContract.ntokenCounter();

            await time.increase(time.duration.days(7));

            console.log(`>> [CALL] userD: NTokenAuction.closeAuction(token=${_C_WBTC})`);
            let tx = await NTokenAuctionContract.closeAuction(_C_WBTC, {from: userD});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                if (v.event == "AuctionStart") {
                    e_token = v.args["token"];
                    e_bid = v.args["bid"];
                    e_bidder = v.args["e_bidder"];
                } else if (v.event == "AuctionBid") {
                    e_token = v.args["token"];
                    e_bid = v.args["bid"];
                    e_bidder = v.args["e_bidder"];
                } else if (v.event == "AuctionClose") {
                    e_token = v.args["token"];
                    e_ntoken = v.args["ntoken"];
                    e_winner = v.args["e_winner"];
                } 
                
                if (v.event == "LogUint") {
                    return {s:v.args[0], v:v.args[1].toString(10)};
                }
                return;
            }));

            await show_nest_ntoken_ledger();

            let D_wbtc_bal_2 = await WBTCContract.balanceOf(userD);
            let D_nest_bal_2 = await NestTokenContract.balanceOf(userD);
            expect(D_wbtc_bal_2).to.bignumber.equal(D_wbtc_bal);
            expect(D_nest_bal_2).to.bignumber.equal(D_nest_bal);


            let auc2 = await NTokenAuctionContract.auctionOf(_C_WBTC);
            expect(auc2["disabled"]).equal(auc["disabled"]);
            expect(auc2["latestBid"]).equal(auc["latestBid"]);
            expect(auc2["winner"]).equal(auc["winner"]);
            expect(auc2["winner"]).equal(userD);

            let burnt_nest_2 = await NestTokenContract.balanceOf(burn_addr);
            expect(burnt_nest_2.sub(burnt_nest)).to.bignumber.equal(auc["nestBurnedAmount"]);
            expect(auc2["nestBurnedAmount"]).to.bignumber.equal(new BN(0));

            let ntoken = await NestPoolContract.getNTokenFromToken(_C_WBTC);
            expect(ntoken).equal(e_ntoken);

            let ntoken_i_2 = await NTokenAuctionContract.ntokenCounter();
            expect(new BN(ntoken_i_2).sub(new BN(1))).to.bignumber.equal(ntoken_i);

            // let total = await ntoken.totalSupply();
            // console.log(`>> [VIEW] ntoken.totalSupply() = ${total}`);

        });

        it("lookup price posted", 
        async () => {
            // let tx = await NestMiningContract.queryPrice(_C_USDT, {from: userB});
            // console.log(`>> [CALL] userB: NestMining.queryPrice(token=${_C_USDT})`);
            // console.log(">> [INFO] tx = ", tx.logs.map((v, i)=> {
            //     const v1 = v.args[0];
            //     const v2 = v.args[1];
            //     if (typeof(v2) == 'object') {
            //         return {s:v1, v:v2.toString(10)};
            //     }
            //     return {s:v1, v:v2};
            // }));
        });

    });
})