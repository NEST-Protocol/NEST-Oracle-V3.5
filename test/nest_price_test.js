
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
const DeFiMock = artifacts.require("test/DeFiMock");

const ethdec = (new BN('10')).pow(new BN('18'));
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


    const show_eth = function (amount){
        const ethskip = (new BN('10')).pow(new BN('13'));
        const ethdec = (new BN('10')).pow(new BN('18'));
        return (new BN(amount).div(ethdec).toString(10) + '.' + new BN(amount).mod(ethdec).div(ethskip).toString(10, 5));
    };

    const show_usdt = function (amount){
        const usdtskip = (new BN('10')).pow(new BN('3'));
        const usdtdec = (new BN('10')).pow(new BN('6'));
        return (new BN(amount).div(usdtdec).toString(10) + '.' + new BN(amount).mod(usdtdec).div(usdtskip).toString(10, 5));
    };

    const show_client_list = async function () {
        function Record(monthly, start, end, height, seed) {
            this.monthly = monthly;
            this.start = start;
            this.end = end;
            this.height = height;
            this.seed = seed;
        }
        var records = {};

        let rs = await NestPriceContract.infoOfClient(userC);
        records.userC = new Record(rs["monthlyFee"], timeConverter(rs["startTime"]), timeConverter(rs["endTime"]), rs["lastHeight"],rs["lastSeed"].toString(16));
        rs = await NestPriceContract.infoOfClient(userD);
        records.userD = new Record(rs["monthlyFee"], timeConverter(rs["startTime"]), timeConverter(rs["endTime"]), rs["lastHeight"],rs["lastSeed"].toString(16));
        console.table(records);
    }

    const show_defi_price_list = async function () {
        function Record(token, eth, usdt, bn) {
            this.token = token;
            this.eth = eth;
            this.usdt = usdt;
            this.bn = bn;
        }
        var records = {};

        rs = await DeFiMockContract.lengthOfPrices();
        let n = rs.toNumber();
        for (var i=0; i<n; i++) {
            rs = await DeFiMockContract.priceByIndex(new BN(i));
            records[i.toString()] = new Record(rs["token"], rs["ethAmount"], rs["tokenAmount"], rs["atHeight"].toString());
        }
        console.table(records);
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
                show_usdt(rs["dealTokenAmount"]), show_eth(rs["ethFee"]), rs["atHeight"].toString());
        }
        let h = await time.latestBlock();
        records[n.toString()] = new Record("block.height", " ", " ", " ", " ", " ", h.toString(10), "0");

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
        let A_usdt = rs.div(usdtdec).toString(10);
        rs = await USDTContract.balanceOf(userB);
        let B_usdt = rs.div(usdtdec).toString(10);

        rs = await USDTContract.balanceOf(_C_NestPool);
        let Pool_usdt = rs.div(usdtdec).toString(10);
    
        rs = await balance.current(userA);
        let A_eth = rs.div(ethdec).toString(10);
        rs = await balance.current(userB);
        let B_eth = rs.div(ethdec).toString(10);

        rs = await balance.current(_C_NestPool);
        let Pool_eth = rs.div(ethdec).toString(10);
        
        rs = await NestPoolContract.getMinerEthAndToken(userA, _C_USDT);
        let A_pool_eth = show_eth(rs["ethAmount"]);
        let A_pool_usdt = rs["tokenAmount"].div(usdtdec).toString(10);
    
        rs = await NestPoolContract.getMinerEthAndToken(userB, _C_USDT);
        let B_pool_eth = show_eth(rs["ethAmount"]);
        let B_pool_usdt = rs["tokenAmount"].div(usdtdec).toString(10);
    
        rs = await NestPoolContract.getMinerEthAndToken(constants.ZERO_ADDRESS, _C_USDT);
        let pool_pool_eth = show_eth(rs["ethAmount"]);
        let pool_pool_usdt = rs["tokenAmount"].div(usdtdec).toString(10);

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
        USDTContract = await UERC20.deployed();
        NNRewardPoolContract = await NNRewardPool.deployed();
        NNTokenContract = await NNToken.deployed();

        NestPriceContract = await NestPrice.deployed();
        NTokenAuctionContract = await NTokenAuction.deployed();
        DeFiMockContract = await DeFiMock.deployed();

    
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
        _C_DeFi = DeFiMockContract.address;


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

        rs = await NestPriceContract.setAddresses(dev);
        console.log(`> [INIT] deployer: NestPrice.setAddresses(developer_address=${dev})`);


        /* -----------------------
         * transfer tokens
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


        /* -----------------------
         * post FIVE price sheets
         */

        let eth_amount = web3.utils.toWei("20", 'ether');
        let usdt_amount = new BN('1000').mul(usdtdec);
        let msg_value = web3.utils.toWei("22", 'ether');

        console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${msg_value/ethdec}`);
        let tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
        console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

        for (i = 0; i < 5; i++) {
            await time.advanceBlock();
            block_h = await time.latestBlock();
            console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
        }

        console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${msg_value/ethdec}`);
        tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
        console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

        for (i = 0; i < 5; i++) {
            await time.advanceBlock();
            block_h = await time.latestBlock();
            console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
        }

        console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${msg_value/ethdec}`);
        tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
        console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

        for (i = 0; i < 5; i++) {
            await time.advanceBlock();
            block_h = await time.latestBlock();
            console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
        }

        console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${msg_value/ethdec}`);
        tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
        console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

        for (i = 0; i < 5; i++) {
            await time.advanceBlock();
            block_h = await time.latestBlock();
            console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
        }

        console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${msg_value/ethdec}`);
        tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
        console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

        await show_price_sheet_list();

        console.log(`>> [INFO] height=${(await time.latestBlock()).toString(10)}`);

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

    describe('TEST NestPrice', function () {
        /*
            miners: userA, userB

            clients: userC, userD
        */

       it("can set query fee", 
       async () => {

           console.log(`>> [CALL] userC: NestPrice.activateClient()`);
           let tx = await NestPriceContract.setFee({from: deployer});
           console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
       });


        it("can perform client activation", 
        async () => {
            await show_nest_ntoken_ledger();
            await show_client_list();

            let nestAmount = await NestTokenContract.balanceOf(userC);
            let burn_nest1 = await NestTokenContract.balanceOf(burnNest);

            console.log(`>> [CALL] userC: NestPrice.activateClient()`);
            let tx = await NestPriceContract.activateClient(constants.ZERO_ADDRESS, {from: userC});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            await show_client_list();
            await show_nest_ntoken_ledger();
            let nestAmount2 = await NestTokenContract.balanceOf(userC);

            let burn_nest2 = await NestTokenContract.balanceOf(burnNest);
            expect(nestAmount.sub(nestAmount2)).to.bignumber.equal(web3.utils.toWei("10000", "ether"));
            expect(burn_nest2.sub(burn_nest1)).to.bignumber.equal(web3.utils.toWei("10000", "ether"));
        });

        it("can perform defi-client activation", 
        async () => {
            await show_nest_ntoken_ledger();
            await show_client_list();

            let nestAmount = await NestTokenContract.balanceOf(userC);
            let burn_nest1 = await NestTokenContract.balanceOf(burnNest);

            console.log(`>> [CALL] userC: NestPrice.activateClient()`);
            let tx = await NestPriceContract.activateClient(_C_DeFi, {from: userC});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            await show_client_list();
            await show_nest_ntoken_ledger();
            let nestAmount2 = await NestTokenContract.balanceOf(userC);

            let burn_nest2 = await NestTokenContract.balanceOf(burnNest);
            expect(nestAmount.sub(nestAmount2)).to.bignumber.equal(web3.utils.toWei("10000", "ether"));
            expect(burn_nest2.sub(burn_nest1)).to.bignumber.equal(web3.utils.toWei("10000", "ether"));
        });

        it("can perform monthly-client registration", 
        async () => {
            console.log(` TEST stake and claim`);

            await show_nest_ntoken_ledger();
            await show_client_list();

            console.log(`>> [CALL] userD: NestPrice.registerClient(monthlyFee=${1})`);
            let tx = await NestPriceContract.registerClient(1, {from: userD});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> event = ", tx.logs.map((v, i)=> {
                if (v.event == "ClientActivation") {
                    return {s:"ClientActivation", v: `ClientActivation(${v.args[0]}, start=${v.args[1]}, end=${v.args[2]})`}
                }
            }));


            await show_client_list();
            await show_nest_ntoken_ledger();
            // expect(_balance).equal(_msg_value);
        });

        it("can perform monthly-client renewal", 
        async () => {
            await show_nest_ntoken_ledger();
            await show_client_list();

            console.log(`>> [CALL] userD: NestPrice.renewalClient(months=${2})`);
            let tx = await NestPriceContract.renewalClient(2, {from: userD, value: web3.utils.toWei("2.1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            await show_client_list();
            await show_nest_ntoken_ledger();
            // expect(_balance).equal(_msg_value);
        });

        it("can query price for one client", 
        async () => {
            await show_nest_ntoken_ledger();
            await show_client_list();

            let time0 = await time.latest();
            await time.increase(time.duration.days(1));
            await time.advanceBlock();
            let time1 = await time.latest();
            console.log(`>> [INFO] change time from ${timeConverter(time0)} to ${timeConverter(time1)}`);

            let eth_amount;
            let token_amount;
            let h;
            console.log(`>> [CALL] userC: NestPrice.queryPrice()`);
            let tx = await NestPriceContract.queryPrice(_C_USDT, userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx =", tx.logs);
            tx.logs.forEach((v, i, arr)=> {
                console.log("v.event=", v.event);
                if (v.event == "PriceOracle") {
                    eth_amount = v.args["ethAmount"];
                    token_amount = v.args["tokenAmount"];
                    h = v.args["atHeight"];
                }
            });
            console.log(`  >> [DEBG] eth=${eth_amount}, token=${token_amount}, bn=${h}`);
            await show_client_list();
            await show_nest_ntoken_ledger();
            await show_price_sheet_list();
            // expect(_balance).equal(_msg_value);
        });


        it("can query price when two price sheets are in the same block", 
        async () => {
            await show_nest_ntoken_ledger();
            await show_client_list();
            await show_price_sheet_list();


            let time0 = await time.latest();
            await time.increase(time.duration.days(1));
            await time.advanceBlock();
            let time1 = await time.latest();
            console.log(`>> [INFO] change time from ${timeConverter(time0)} to ${timeConverter(time1)}`);

            let eth_amount = web3.utils.toWei("20", 'ether');
            let usdt_amount = new BN('1000').mul(usdtdec);
            let msg_value = web3.utils.toWei("22", 'ether');

            let rs = await NestMiningContract.lengthOfPriceSheets(_C_USDT);
            console.log(`>> [INFO] len(PriceSheets)=${rs.toString(10)}`);
            let index = rs;
            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${msg_value/ethdec}`);
            let tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${web3.utils.toWei("20", 'ether')}, tokenAmount=${new BN('960').mul(usdtdec)}, token=${_C_USDT}, 0), value:${msg_value/ethdec}`);
            tx = await NestMiningContract.postPriceSheet(web3.utils.toWei("20", 'ether'), new BN('960').mul(usdtdec), _C_USDT, { from: userA, value: msg_value });
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            let bn = await NestMiningContract.atHeightOfPriceSheet(_C_USDT, index);
            tx = await NestMiningContract.setAtHeightOfPriceSheet(_C_USDT, index.add(new BN(1)), bn);
            console.log(`>> [INFO] deployer: set priceSheet[${index.add(new BN(1))}].atHeight = priceSheet[${index}].atHeight = ${bn}`);


            for (i = 0; i < 25; i++) {
                await time.advanceBlock();
                block_h = await time.latestBlock();
                console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
            }

            console.log(`>> [CALL] userC: NestPrice.queryPrice()`);
            tx = await NestPriceContract.queryPrice(_C_USDT, userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            // console.log("  >> [DEBG] tx =", tx.logs);
            tx.logs.forEach((v, i, arr)=> {
                console.log("v.event=", v.event);
                if (v.event == "PriceOracle") {
                    console.log(` >> [INFO] prizer=${v.args["prizer"]}, prize=${v.args["prize"]}, level=${v.args["level"]}`);
                }
                if (v.event == "PriceOracle") {
                    eth_amount = v.args["ethAmount"];
                    usdt_amount = v.args["tokenAmount"];
                    h = v.args["atHeight"];
                }
            });
            console.log(`  >> [DEBG] eth=${eth_amount}, token=${usdt_amount}, bn=${h}`);
            await show_client_list();
            await show_nest_ntoken_ledger();
            await show_price_sheet_list();
            // expect(_balance).equal(_msg_value);
        });

        it("can get prize of price queries", 
        async () => {
            await show_nest_ntoken_ledger();
            await show_client_list();
            await show_price_sheet_list();

            let eth_amount;
            let usdt_amount;
            let h;

            console.log(`>> [CALL] userC: NestPrice.queryPrice()`);
            tx = await NestPriceContract.queryPrice(_C_USDT, userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx.logs = ", tx.logs);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object' && v.args[0] == 'hash') {
                    return {s:v1, v:v2.toString(16)};
                }
                if (typeof(v2) == 'object' && v.event == 'LogUint') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));
            tx.logs.forEach((v, i, arr)=> {
                console.log("v.event=", v.event);
                if (v.event == "OraclePrize") {
                    console.log(` >> [INFO] prizer=${v.args["prizer"]}, prize=${v.args["prize"]}, level=${v.args["level"]}`);
                }
                if (v.event == "OraclePrize") {
                    eth_amount = v.args["ethAmount"];
                    usdt_amount = v.args["tokenAmount"];
                    h = v.args["atHeight"];
                }
            });
            console.log(`  >> [DEBG] eth=${eth_amount}, token=${usdt_amount}, bn=${h}`);

            console.log(`>> [CALL] userC: NestPrice.queryPrice()`);
            tx = await NestPriceContract.queryPrice(_C_USDT, userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object' && v.args[0] == 'hash') {
                    return {s:v1, v:v2.toString(16)};
                }
                if (typeof(v2) == 'object' && v.event == 'LogUint') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));
            tx.logs.forEach((v, i, arr)=> {
                console.log("v.event=", v.event);
                if (v.event == "OraclePrize") {
                    console.log(` >> [INFO] prizer=${v.args["prizer"]}, prize=${v.args["prize"]}, level=${v.args["level"]}`);
                }
                if (v.event == "PriceOracle") {
                    eth_amount = v.args["ethAmount"];
                    usdt_amount = v.args["tokenAmount"];
                    h = v.args["atHeight"];
                }
            });
            console.log(`  >> [DEBG] eth=${eth_amount}, token=${usdt_amount}, bn=${h}`);

            console.log(`>> [CALL] userC: NestPrice.queryPrice()`);
            tx = await NestPriceContract.queryPrice(_C_USDT, userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object' && v.args[0] == 'hash') {
                    return {s:v1, v:v2.toString(16)};
                }
                if (typeof(v2) == 'object' && v.event == 'LogUint') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));

            tx.logs.forEach((v, i, arr)=> {
                console.log("v.event=", v.event);
                if (v.event == "OraclePrize") {
                    console.log(` >> [INFO] prizer=${v.args["prizer"]}, prize=${v.args["prize"]}, level=${v.args["level"]}`);
                }
                if (v.event == "PriceOracle") {
                    eth_amount = v.args["ethAmount"];
                    usdt_amount = v.args["tokenAmount"];
                    h = v.args["atHeight"];
                }
            });
            console.log(`  >> [DEBG] eth=${eth_amount}, token=${usdt_amount}, bn=${h}`);

            console.log(`>> [CALL] userC: NestPrice.queryPrice()`);
            tx = await NestPriceContract.queryPrice(_C_USDT, userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object' && v.args[0] == 'hash') {
                    return {s:v1, v:v2.toString(16)};
                }
                if (typeof(v2) == 'object' && v.event == 'LogUint') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));
            tx.logs.forEach((v, i, arr)=> {
                console.log("v.event=", v.event);
                if (v.event == "OraclePrize") {
                    console.log(` >> [INFO] prizer=${v.args["prizer"]}, prize=${v.args["prize"]}, level=${v.args["level"]}`);
                }
                if (v.event == "PriceOracle") {
                    eth_amount = v.args["ethAmount"];
                    usdt_amount = v.args["tokenAmount"];
                    h = v.args["atHeight"];
                }
            });
            console.log(`  >> [DEBG] eth=${eth_amount}, token=${usdt_amount}, bn=${h}`);

            console.log(`>> [CALL] userC: NestPrice.queryPrice()`);
            tx = await NestPriceContract.queryPrice(_C_USDT, userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object' && v.args[0] == 'hash') {
                    return {s:v1, v:v2.toString(16)};
                }
                if (typeof(v2) == 'object' && v.event == 'LogUint') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));
            tx.logs.forEach((v, i, arr)=> {
                console.log("v.event=", v.event);
                if (v.event == "OraclePrize") {
                    console.log(` >> [INFO] prizer=${v.args["prizer"]}, prize=${v.args["prize"]}, level=${v.args["level"]}`);
                }
                if (v.event == "PriceOracle") {
                    eth_amount = v.args["ethAmount"];
                    usdt_amount = v.args["tokenAmount"];
                    h = v.args["atHeight"];
                }
            });
            console.log(`  >> [DEBG] eth=${eth_amount}, token=${usdt_amount}, bn=${h}`);

            console.log(`>> [CALL] userC: NestPrice.queryPrice()`);
            tx = await NestPriceContract.queryPrice(_C_USDT, userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object' && v.args[0] == 'hash') {
                    return {s:v1, v:v2.toString(16)};
                }
                if (typeof(v2) == 'object' && v.event == 'LogUint') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));
            tx.logs.forEach((v, i, arr)=> {
                console.log("v.event=", v.event);
                if (v.event == "OraclePrize") {
                    console.log(` >> [INFO] prizer=${v.args["prizer"]}, prize=${v.args["prize"]}, level=${v.args["level"]}`);
                }
                if (v.event == "PriceOracle") {
                    eth_amount = v.args["ethAmount"];
                    usdt_amount = v.args["tokenAmount"];
                    h = v.args["atHeight"];
                }
            });
            console.log(`  >> [DEBG] eth=${eth_amount}, token=${usdt_amount}, bn=${h}`);

            console.log(`>> [CALL] userC: NestPrice.queryPrice()`);
            tx = await NestPriceContract.queryPrice(_C_USDT, userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object' && v.event == 'LogUint') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));            
            tx.logs.forEach((v, i, arr)=> {
                console.log("v.event=", v.event);
                if (v.event == "OraclePrize") {
                    console.log(` >> [INFO] prizer=${v.args["prizer"]}, prize=${v.args["prize"]}, level=${v.args["level"]}`);
                }
                if (v.event == "PriceOracle") {
                    eth_amount = v.args["ethAmount"];
                    usdt_amount = v.args["tokenAmount"];
                    h = v.args["atHeight"];
                }
            });
            console.log(`  >> [DEBG] eth=${eth_amount}, token=${usdt_amount}, bn=${h}`);

            await show_client_list();
            await show_nest_ntoken_ledger();
            await show_price_sheet_list();
            // expect(_balance).equal(_msg_value);
        });

        it("can query price LIST for a user", 
        async () => {
            console.log("-----------------------------------------");

            let time0 = await time.latest();
            await time.increase(time.duration.days(1));
            await time.advanceBlock();
            let time1 = await time.latest();
            console.log(`>> [INFO] change time from ${timeConverter(time0)} to ${timeConverter(time1)}`);
            await show_nest_ntoken_ledger();
            await show_client_list();
            await show_price_sheet_list();
            let eth_amount;
            let token_amount;
            let h;
            console.log(`>> [CALL] userC: NestPrice.queryPriceList()`);
            let tx = await NestPriceContract.queryPriceList(_C_USDT, new BN("4"), userC, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx =", tx);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object' && v.event == 'LogUint') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));            
            // tx.logs.forEach((v, i, arr)=> {
            //     console.log("v.event=", v.event);
            //     if (v.event == "PriceOracle") {
            //         eth_amount = v.args["ethAmount"];
            //         token_amount = v.args["tokenAmount"];
            //         h = v.args["atHeight"];
            //     }
            // });
            // console.log(`  >> [DEBG] eth=${eth_amount}, token=${token_amount}, bn=${h}`);
            // await show_defi_price_list();
            // expect(_balance).equal(_msg_value);
        });

        it("can query price LIST for DeFi", 
        async () => {
            console.log("------------------------------------------");
            console.log(">> [TEST] it can query price LIST for DeFi");

            let time0 = await time.latest();
            await time.increase(time.duration.days(1));
            await time.advanceBlock();
            let time1 = await time.latest();
            console.log(`>> [INFO] change time from ${timeConverter(time0)} to ${timeConverter(time1)}`);
            await show_nest_ntoken_ledger();
            await show_client_list();
            await show_price_sheet_list();
            let eth_amount;
            let token_amount;
            let h;
            console.log(`>> [CALL] userC: DeFiMockContract.queryOracle()`);
            let tx = await DeFiMockContract.queryOracle(_C_USDT, {from: userC, value: web3.utils.toWei("1", 'ether')});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log("  >> [DEBG] tx =", tx);
            console.log("  >> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object' && v.event == 'LogUint') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));            
            // tx.logs.forEach((v, i, arr)=> {
            //     console.log("v.event=", v.event);
            //     if (v.event == "PriceOracle") {
            //         eth_amount = v.args["ethAmount"];
            //         token_amount = v.args["tokenAmount"];
            //         h = v.args["atHeight"];
            //     }
            // });
            // console.log(`  >> [DEBG] eth=${eth_amount}, token=${token_amount}, bn=${h}`);
            await show_defi_price_list();
            // expect(_balance).equal(_msg_value);
        });


    });
})