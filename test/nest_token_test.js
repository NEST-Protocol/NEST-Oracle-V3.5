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

const ethdec = (new BN('10')).pow(new BN('18'));

const usdtdec = (new BN('10')).pow(new BN('6'));


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
    
        rs = await NestMiningContract.getPriceSheetLength(_C_USDT);
        let n = rs.toNumber();
        for (var i=0; i<n; i++) {
            rs = await NestMiningContract.getPriceSheet(_C_USDT, new BN(i));
            records[i.toString()] = new Record(rs["miner"], show_eth(rs["ethAmount"]), show_usdt(rs["tokenAmount"]), show_eth(rs["dealEthAmount"]), 
                show_usdt(rs["dealTokenAmount"]), show_eth(rs["ethFee"]), rs["atHeight"].toString(), rs["deviated"].toString(10));
        }

        console.table(records);
    }


    const show_nest_ntoken_ledger = async function () {
       
        let rs = await NestTokenContract.balanceOf(userA);
        let A_nest = rs.div(ethdec).toString(10);
        rs = await NestTokenContract.balanceOf(userB);
        let B_nest = rs.div(ethdec).toString(10);
        rs = await NestTokenContract.balanceOf(_C_NestPool);
        let Pool_nest = rs.div(ethdec).toString(10);
        rs = await NestTokenContract.balanceOf(dev);
        let dev_nest = rs.div(ethdec).toString(10);        
        rs = await NestTokenContract.balanceOf(NN);
        let NN_nest = rs.div(ethdec).toString(10);

        rs = await NestPoolContract.getMinerNest(userA);
        let A_pool_nest = rs.div(ethdec).toString(10);
        rs = await NestPoolContract.getMinerNest(userB);
        let B_pool_nest = rs.div(ethdec).toString(10);
        rs = await NestPoolContract.getMinerNest(dev);
        let dev_pool_nest = rs.div(ethdec).toString(10);        
        rs = await NestPoolContract.getMinerNest(NN);
        let NN_pool_nest = rs.div(ethdec).toString(10);

        function Record(NEST, POOL_NEST) {
            this.NEST = NEST;
            this.POOL_NEST = POOL_NEST;
        }
    
        var records = {};
        records.userA = new Record(`NEST(${A_nest})`, `POOL_NEST(${A_pool_nest})`);
        records.userB = new Record(`NEST(${B_nest})`, `POOL_NEST(${B_pool_nest})`);
        records.Pool = new Record(`NEST(${Pool_nest})`, ` `);
        records.dev = new Record(`NEST(${dev_nest})`, `POOL_NEST(${dev_pool_nest})`);
        records.NN = new Record(`NEST(${NN_nest})`, `POOL_NEST(${NN_pool_nest})`);
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

        NNRewardPoolContract = await NNRewardPool.deployed();
        NNTokenContract = await NNToken.deployed();

        _C_NestToken = NestTokenContract.address;
        _C_USDT = USDTContract.address;
        _C_NestPool = NestPoolContract.address;
        _C_NNToken = NNTokenContract.address;
        _C_NNRewardPool = NNRewardPoolContract.address;

        let rs = await NestPoolContract.setNTokenToToken(_C_USDT, _C_NestToken);
        console.log(`> [INIT] deployer: NestPool.setNTokenToToken(token=${_C_USDT}, ntoken=${_C_NestToken}), gasUsed: ${rs.receipt.gasUsed}`);
        console.log(`> [INIT] deployer: SET USDT ==> NestToken`);

        rs = await NestPoolContract.setContracts(NestMiningContract.address, _C_NestToken);
        console.log(`> [INIT] deployer: NestPool.setContracts(_C_NestMining=${NestMiningContract.address}, _C_NestToken=${_C_NestToken})`);

        rs = await NestMiningContract.setAddresses(dev, NN);
        console.log(`> [INIT] deployer: NestMining.setAddresses(dev=${dev}, NN=${NN})`);

        rs = await NNTokenContract.setContracts(_C_NNRewardPool);
        console.log(`> [INIT] deployer: NNTokenContract.setContracts(C_NNRewardPool=${_C_NNRewardPool})`);

        console.log(`- - - - - - - - - - - - - - - - - - `);
        console.log(`> [INIT] deployer = `, deployer);
        console.log(`> [INIT] userA = `, userA);
        console.log(`> [INIT] userB = `, userB);
        console.log(`> [INIT] BonusPool.address = `, BonusPoolContract.address);
        console.log(`> [INIT] NextToken.address = `, NestTokenContract.address);
        console.log(`> [INIT] Staking.address = `, StakingContract.address);
        console.log(`> [INIT] NestPool.address = `, NestPoolContract.address);
        console.log(`> [INIT] NestMining.address = `, NestMiningContract.address);
        console.log(`> [INIT] USDT.address = `, USDTContract.address);

    });

    describe('template', function () {
        it("test", async () => {
        });
    });

    describe('NEST Token', function () {
        it("should have correct totalSupply", async () => {
            const expectedTotalSupply = web3.utils.toWei(new BN("10000000000"), 'ether');
            let totalSupply = await NestTokenContract.totalSupply();
            expect(totalSupply).to.bignumber.equal(expectedTotalSupply);
        })

        it("should transfer correctly", async () => {
            let amount = web3.utils.toWei(new BN("2000000000"), 'ether');
            let result = await NestTokenContract.transfer(userA, amount, { from: deployer });
            console.log(`transfer NEST token to a new user, gasUsed: ${result.receipt.gasUsed}`);
            let balanceOfUserA = await NestTokenContract.balanceOf(userA);
            expect(balanceOfUserA).to.bignumber.equal(amount);
        })

        it("should transfer fail", async () => {
            let amount = web3.utils.toWei(new BN("10000000001"), 'ether');
            await expectRevert.unspecified(
                NestTokenContract.transfer(userA, amount, { from: deployer })
            );
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

    describe('BonusPool', function () {
        it("accepts ethers correctly", async () => {

            console.log(`====> test DAO`);
            let _msg_value = web3.utils.toWei("1.9", 'ether');
            console.log(`[INFO] _msg_value = `, new BN(_msg_value));
            
            await BonusPoolContract.pumpinEth(NestTokenContract.address, _msg_value, { from: userA, value: _msg_value });
            
            let _balance = await balance.current(BonusPoolContract.address);
            console.log(`[INFO] _balance = `, _balance.toString(10));
            let balanceOfUserA = await NestTokenContract.balanceOf(userA);

            // let blncs = balanceOfUserA.div((new BN('10')).pow(new BN('18')));
            // console.log(`====> depolyer call NestToken.balanceOf(userA) `, blncs.toString(10));
            // const approved_val = web3.utils.toWei("100000000", 'ether');
            // const re = await NestTokenContract.approve(BonusPoolContract.address, approved_val, { from: userA});
            // console.log(`====> userA call NestTokenContract.approve(BonusPoolContract,`, approved_val,`)=`, re);
            // const allowance_val = await NestTokenContract.allowance(userA, BonusPoolContract.address);
            // console.log(`====> deployer call NestToken.allowance(userA, BonusPool) = `, allowance_val);
            // let stake_value = web3.utils.toWei("100", 'ether');
            // const tx = await StakingContract.stake(NestTokenContract.address, stake_value, {from: userA});
            // console.log("tx", tx.logs.map((v, i)=> {
            //     const v1 = v.args[0];
            //     const v2 = v.args[1];
            //     if (typeof(v2) == 'object') {
            //         return {s:v1, v:v2.toString(10)};
            //     }
            //     return {s:v1, v:v2};
            // }));
            // expect(_balance).equal(_msg_value);
        });
    });

    // describe('Staking', function () {
    //     it("can return staked tokens to the user who staked the same amount tokens", 
    //     async () => {
    //         console.log(`- - - - - - - - - - -  - - - - - - `);
    //         console.log(`====> deployer = `, deployer);
    //         console.log(`====> userA = `, userA);
    //         console.log(`====> userB = `, userB);
    //         console.log(`====> BonusPool.address = `, BonusPoolContract.address);
    //         console.log(`====> NextToken.address = `, NestTokenContract.address);
    //         console.log(`====> Staking.address = `, StakingContract.address);
    //         console.log(`- - - - - - - - - - -  - - - - - - `);
    //         console.log(`====> stake, unstake`);
    //         let _msg_value = web3.utils.toWei("1.9", 'ether');
    //         const _C_NestToken = NestTokenContract.address;

    //         let balanceOfUserA = await NestTokenContract.balanceOf(userA);
    //         let blncs = balanceOfUserA.div((new BN('10')).pow(new BN('18')));
    //         console.log('>> depolyer calls NestToken.balanceOf(userA) = ', blncs);

    //         const approved_val = web3.utils.toWei("100000000", 'ether');
    //         const re = await NestTokenContract.approve(BonusPoolContract.address, approved_val, { from: userA});
    //         console.log(`>> userA call NestToken.approve(BonusPool ${approved_val}) = ${re}`);
            
    //         const allowance_val = await NestTokenContract.allowance(userA, BonusPoolContract.address);
    //         console.log(`====> deployer call NestToken.allowance(userA, BonusPool) = `, allowance_val);

    //         let ntoken_amount = await BonusPoolContract.getNTokenAmount(_C_NestToken, userA);
    //         console.log(`>> userA staked ntoken = ${ntoken_amount.toString(10)}`);

    //         let stake_value = web3.utils.toWei("100", 'ether');
    //         const tx = await StakingContract.stake(_C_NestToken, stake_value, {from: userA});
    //         // console.log("tx", tx.logs.map((v, i)=> {
    //         //     const v1 = v.args[0];
    //         //     const v2 = v.args[1];
    //         //     if (typeof(v2) == 'object') {
    //         //         return {s:v1, v:v2.toString(10)};
    //         //     }
    //         //     return {s:v1, v:v2};
    //         // }));

    //         ntoken_amount = await BonusPoolContract.getNTokenAmount(_C_NestToken, userA);
    //         console.log(`>> userA staked ntoken = ${ntoken_amount.toString(10)}`);

    //         const tx2 = await StakingContract.unstake(_C_NestToken, stake_value, {from: userA});
    //         // console.log(">> tx2 = ", tx2);

    //         ntoken_amount = await BonusPoolContract.getNTokenAmount(_C_NestToken, userA);
    //         console.log(`>> userA staked ntoken = ${ntoken_amount.toString(10)}`);

    //         // expect(_balance).equal(_msg_value);
    //     });
    // });

    describe('Staking.claim', function () {
        it("can claim bonus after staking", 
        async () => {
            console.log(` TEST stake and claim`);
            let _msg_value = web3.utils.toWei("1.9", 'ether');
            const _C_NestToken = NestTokenContract.address;
            // const _C_USDT = ERC20Contract.address;

            let blncsA = await balance.current(userA);
            console.log(`>> userA has ${blncsA.div(ethdec).toString(10)} ethers`);

            let blncsB = await balance.current(userB);
            console.log(`>> userB has ${blncsB.div(ethdec).toString(10)} ethers`);

            let balanceOfUserA = await NestTokenContract.balanceOf(userA);
            let blncs = balanceOfUserA.div((new BN('10')).pow(new BN('18')));
            console.log('>> depolyer calls NestToken.balanceOf(userA) = ', blncs);

            const approved_val = web3.utils.toWei("10000000000", 'ether');
            const re = await NestTokenContract.approve(BonusPoolContract.address, approved_val, { from: userA});
            console.log(`>> userA call NestToken.approve(BonusPool ${approved_val/ethdec}) = ${re}`);
            
            const allowance_val = await NestTokenContract.allowance(userA, BonusPoolContract.address);
            console.log(`>> deployer call NestToken.allowance(userA, BonusPool) = `, allowance_val.div(ethdec).toString(10));

            let ntoken_amount = await BonusPoolContract.getNTokenAmount(_C_NestToken, userA);
            console.log(`>> userA staked ntoken = ${ntoken_amount.div(ethdec).toString(10)}`);

            let stake_value = web3.utils.toWei("1000000000", 'ether');
            const tx = await StakingContract.stake(_C_NestToken, stake_value, {from: userA});
            console.log(`>> userA call Staking.stake(${stake_value/ ethdec}), ${ntoken_amount.div(ethdec).toString(10)})`);

            _msg_value = web3.utils.toWei("20000", 'ether');
            await BonusPoolContract.pumpinEth(_C_NestToken, _msg_value, { from: userB, value: _msg_value });
            console.log(`>> userB call BonusPool.pumpinEth(${_C_NestToken}, ${ _msg_value/(10**18)})`);

            blncsB = await balance.current(userB);
            console.log(`>> userB has ${blncsB.div(ethdec).toString(10)} ethers`);
            // console.log("tx", tx.logs.map((v, i)=> {
            //     const v1 = v.args[0];
            //     const v2 = v.args[1];
            //     if (typeof(v2) == 'object') {
            //         return {s:v1, v:v2.toString(10)};
            //     }
            //     return {s:v1, v:v2};
            // }));

            ntoken_amount = await BonusPoolContract.getNTokenAmount(_C_NestToken, userA);
            console.log(`>> userA staked ntoken = ${ntoken_amount.div(ethdec).toString(10)}`);

            // await time.increaseTo(time.duration.days(3));
            // await time.increaseTo(1598773968);
            // await time.advanceBlock();
            console.log(`>> time.increase to Sun, Aug30, 2020 3:52':48'' PM`);

            blncsA = await balance.current(userA);
            console.log(`>> userA has ${blncsA.div(ethdec).toString(10)} ethers`);
            const tx2 = await StakingContract.claim(_C_NestToken, {from: userA});
            console.log(`>> userA call Staking.claim(${ntoken_amount.div(ethdec).toString(10)})`);
            console.log(">> tx2 = ", tx2.logs.map((v, i)=> {
                    const v1 = v.args[0];
                    const v2 = v.args[1];
                    if (typeof(v2) == 'object') {
                        return {s:v1, v:v2.toString(10)};
                    }
                    return {s:v1, v:v2};
                }));

            blncsA = await balance.current(userA);
            console.log(`>> userA has ${blncsA.div(ethdec).toString(10)} ethers`);

            ntoken_amount = await BonusPoolContract.getNTokenAmount(_C_NestToken, userA);
            console.log(`>> userA staked ntoken = ${ntoken_amount.div(ethdec).toString(10)}`);


            // expect(_balance).equal(_msg_value);
        });
    });

    describe('NestMining.postPriceSheet(), closePriceSheet()', function () {
        it("can post price-sheet", 
        async () => {

            // let show_eth_usdt_ledger = async function () {
            //     let rs = await USDTContract.balanceOf(userA);
            //     let A_usdt = rs.div(usdtdec).toString(10);
            //     rs = await USDTContract.balanceOf(userB);
            //     let B_usdt = rs.div(usdtdec).toString(10);
            //     rs = await USDTContract.balanceOf(_C_NestPool);
            //     let Pool_usdt = rs.div(usdtdec).toString(10);

            //     rs = await balance.current(userA);
            //     let A_eth = rs.div(ethdec).toString(10);
            //     rs = await balance.current(userB);
            //     let B_eth = rs.div(ethdec).toString(10);
            //     rs = await balance.current(_C_NestPool);
            //     let Pool_eth = rs.div(ethdec).toString(10);
                
            //     rs = await NestPoolContract.getMinerEthAndToken(userA, _C_USDT);
            //     let A_pool_eth = rs["ethAmount"].div(ethdec).toString(10);
            //     let A_pool_usdt = rs["tokenAmount"].div(usdtdec).toString(10);

            //     rs = await NestPoolContract.getMinerEthAndToken(userB, _C_USDT);
            //     let B_pool_eth = rs["ethAmount"].div(ethdec).toString(10);
            //     let B_pool_usdt = rs["tokenAmount"].div(usdtdec).toString(10);

            //     rs = await NestPoolContract.getMinerEthAndToken(constants.ZERO_ADDRESS, _C_USDT);
            //     let pool_pool_eth = rs["ethAmount"].div(ethdec).toString(10);
            //     let pool_pool_usdt = rs["tokenAmount"].div(usdtdec).toString(10);

            //     function Record(ETH, POOL_ETH, USDT, POOL_USDT) {
            //         this.ETH = ETH;
            //         this.POOL_ETH = POOL_ETH;
            //         this.USDT = USDT;
            //         this.POOL_USDT = POOL_USDT;
            //     }

            //     var records = {};
            //     records.userA = new Record(`ETH(${A_eth})`, `POOL_ETH(${A_pool_eth})`, `USDT(${A_usdt})`, `POOL_USDT(${A_pool_usdt})`);
            //     records.userB = new Record(`ETH(${B_eth})`, `POOL_ETH(${B_pool_eth})`, `USDT(${B_usdt})`, `POOL_USDT(${B_pool_usdt})`);
            //     records.Pool = new Record(" ", `ETH(${pool_pool_eth})`, ` `, `USDT(${pool_pool_usdt})`);
            //     records.Contr = new Record(` `, `ETH(${Pool_eth})`, ` `, `USDT(${Pool_usdt})`);
            //     console.table(records);
            //     // console.table(`>> [VIEW] ETH(${A_eth}) | POOL_ETH(${A_pool_eth}) | USDT(${A_usdt}) | POOL_USDT(${A_pool_usdt})`);
            //     // console.log(`>> [VIEW] userB: ETH(${B_eth}) | POOL_ETH(${B_pool_eth}) | USDT(${B_usdt}) | POOL_USDT(${B_pool_usdt})`);
            //     // console.log(`>> [VIEW]  Pool:               | ETH(${pool_pool_eth}),       |                 | USDT(${pool_pool_usdt})`);
            //     // console.log(`>> [VIEW] contr:               | ETH(${Pool_eth}),       |                 | USDT(${Pool_usdt})`);
            // }

            console.log(`- - - - - - - - - - - - - - - - - - `);
            console.log(` `);
            console.log(` TEST postPriceSheet`);

            // const _C_NestToken = NestTokenContract.address;

            let _msg_value = web3.utils.toWei("20", 'ether');

            let index = 0;
            let itoken = _C_USDT;
            let rs;

            let result = await NestTokenContract.transfer(NestPoolContract.address, web3.utils.toWei("1000000000", 'ether'), { from: deployer });
            console.log(`>> [TRAN] deployer: NEST(1000000000) ==> NestPool, gasUsed: ${result.receipt.gasUsed}`);

            await USDTContract.transfer(userA, new BN('1000000').mul(usdtdec));
            console.log(`>> [TRAN] depolyer: USDT(1000000) ===> userA`);

            await USDTContract.transfer(userB, new BN('1000000').mul(usdtdec));
            console.log(`>> [TRAN] depolyer: USDT(1000000) ===> userB`);



            const approved_val = new BN("1000000").mul(usdtdec);
            let re = await USDTContract.approve(NestPoolContract.address, approved_val, { from: userA});
            console.log(`>> [CALL] userA: _C_USDT.approve(NestPool ${approved_val/usdtdec}) = ${re}`);
            
            allowance_val = await USDTContract.allowance(userA, NestPoolContract.address);
            console.log(`>> [VIEW] deployer: _C_USDT.allowance(owner=userA, spender=NestPool) = ${allowance_val.div(usdtdec).toString(10)}`);

            re = await USDTContract.approve(NestPoolContract.address, approved_val, { from: userB});
            console.log(`>> [CALL] userB: _C_USDT.approve(NestPool ${approved_val/usdtdec}) = ${re}`);
            
            allowance_val = await USDTContract.allowance(userB, NestPoolContract.address);
            console.log(`>> [VIEW] deployer: _C_USDT.allowance(owner=userB, spender=NestPool) = ${allowance_val.div(usdtdec).toString(10)}`);

            rs = await NestPoolContract.getMinerEthAndToken(userA, _C_USDT);
            console.log(`>> [INFO] Pool(userA)= ETH(${rs["ethAmount"].div(ethdec)}), USDT(${rs["tokenAmount"].div(usdtdec)})`);

            await show_eth_usdt_ledger();

            let eth_amount = web3.utils.toWei("15", 'ether');
            let usdt_amount = new BN('1000').mul(usdtdec);
            _msg_value = web3.utils.toWei("20", 'ether');

            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${_msg_value/ethdec}`);
            let tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, 0, { from: userA, value: _msg_value });
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);
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

            console.log(`>> [INFO] priceSheet.index = ${index}, ${itoken}`);
            
            await show_eth_usdt_ledger();

            await show_price_sheet_list();

            let block_h;
            for (i = 0; i < 26; i++) {
                await time.advanceBlock();
                block_h = await time.latestBlock();
                console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
            }

            tx = await NestMiningContract.closePriceSheet(itoken, index, { from: userA });
            console.log(`>> [CALL] userA: NestMining.closePriceSheet(token=${itoken}$, index=${index}), gasUsed: ${tx.receipt.gasUsed}`);
            console.log(">> [DEBG] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));

            await show_eth_usdt_ledger();

            await show_nest_ntoken_ledger();

            await show_price_sheet_list();

            console.log(`>> [CALL] userA > NestMining.withdrawEthAndToken(ethAmount=${eth_amount}, token=${_C_USDT}, tokenAmount=${usdt_amount})`);
            tx = await NestMiningContract.withdrawEthAndToken(eth_amount, _C_USDT, usdt_amount, {from: userA});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);
            console.log(">> [INFO] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));

            await show_eth_usdt_ledger();
            await show_nest_ntoken_ledger();

            tx = await NestMiningContract.claimAllNToken(_C_NestToken, {from: userA});
            console.log(`>> [CALL] userA: NestMining.claimAllNToken(ntoken=${_C_NestToken}), gasUsed: ${tx.receipt.gasUsed}`);
            console.log(">> [INFO] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));

            await show_eth_usdt_ledger();
            await show_nest_ntoken_ledger();

            _msg_value = web3.utils.toWei("25", 'ether');
            eth_amount = web3.utils.toWei("20", 'ether');
            usdt_amount = new BN('1330').mul(usdtdec);
            tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, 0, { from: userA, value: _msg_value });
            console.log(`>> [CALL] userA call NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${_msg_value/ethdec}, gasUsed: ${tx.receipt.gasUsed}`);
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
            console.log(`>> [INFO] index = ${index}, ${itoken}`);

            await show_eth_usdt_ledger();
            await show_nest_ntoken_ledger();
            await show_price_sheet_list();

            for (i = 0; i < 5; i++) {
                await time.advanceBlock();
                block_h = await time.latestBlock();
                console.log(`>> [INFO] block mined +1, height=${block_h.toString(10)}`);
            }
            

            _msg_value = web3.utils.toWei("15", 'ether');
            eth_amount = web3.utils.toWei("20", 'ether');
            usdt_amount = new BN('1330').mul(usdtdec);
            tx = await NestMiningContract.postPriceSheet(eth_amount, usdt_amount, _C_USDT, 0, { from: userA, value: _msg_value });
            console.log(`>> [CALL] userA: NestMining.postPriceSheet(ethAmount=${eth_amount}, tokenAmount=${usdt_amount}, token=${_C_USDT}, 0), value:${_msg_value/ethdec}, gasUsed: ${tx.receipt.gasUsed}`);
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
            console.log(`>> [DEBG] index = ${index}, ${itoken}`);

            await show_eth_usdt_ledger();
            await show_nest_ntoken_ledger();
            await show_price_sheet_list();


            let B_msg_value = web3.utils.toWei("80", 'ether');
            let B_eth_amount = (new BN(eth_amount)).mul(new BN('2'));
            let B_usdt_amount = new BN('1200').mul(usdtdec).mul(new BN('2'));
            console.log(`>> [CALL] userB: NestMining.biteTokens(ethAmount=${B_eth_amount}, tokenAmount=${B_usdt_amount}, biteEthAmount=${eth_amount}, biteTokenAmount=${usdt_amount}) value: ${B_msg_value/ethdec}`)
            tx = await NestMiningContract.biteTokens(B_eth_amount, B_usdt_amount, eth_amount, usdt_amount, _C_USDT, index, {from: userB, value: B_msg_value});
            console.log(`>>>>  gasUsed: ${tx.receipt.gasUsed}`);
            // console.log(`>> [CALL] userB: NestMining.biteTokens(ethAmount=${B_eth_amount}, tokenAmount=${B_usdt_amount}, biteEthAmount=${ethAmount}, biteTokenAmount=${usdt_amount}, token=${_C_USDT}, index=${index}), value: ${B_msg_value/ethdec}, gasUsed: ${tx.receipt.gasUsed}`);
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
            console.log(`>> [DEBG] index = ${index}, ${itoken}`);

            await show_eth_usdt_ledger();

            await show_nest_ntoken_ledger();
            await show_price_sheet_list();

        });

        it("lookup price posted", 
        async () => {
            let tx = await NestMiningContract.queryPrice(_C_USDT, {from: userB});
            console.log(`>> [CALL] userB: NestMining.queryPrice(token=${_C_USDT})`);
            console.log(">> [INFO] tx = ", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));
        });

    });

    describe('TEST NNReward', function () {
        it("add rewards, claim rewards", 
        async () => {

            console.log(`- - - - - - - - - - - - - - - - - - `);
            console.log(`>> [TEST] NNReward`);

            let amount = new BN("50");
            console.log(`>> [TRANS] deployer => NNodeA NNT(${amount})`);
            let tx = await NNTokenContract.transfer(NNodeA, amount);
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);

            let nest_amount = web3.utils.toWei("20", 'ether');
            console.log(`>> [TRANS] deployer => NNRewardPool NEST(${nest_amunt.div(ethdec).toStrin(10)}`);
            let tx = await NestTokenContract.transfer(_C_NNRewardPool, nest_amount);
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);

            console.log(`>> [CALL] deployer: NNRewardPool.addNNReward(amount=${nest_amunt.div(ethdec).toStrin(10)}`);
            tx = await NNRewardPoolContract.addNNReward(web3.utils.toWei("20", 'ether'), {from: deployer});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);



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