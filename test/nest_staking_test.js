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
        _C_BonusPool = BonusPoolContract.address;

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

        let rs = await NestPoolContract.setNTokenToToken(_C_USDT, _C_NestToken);
        console.log(`> [INIT] deployer: NestPool.setNTokenToToken(token=${_C_USDT}, ntoken=${_C_NestToken}), gasUsed: ${rs.receipt.gasUsed}`);
        console.log(`> [INIT] deployer: SET USDT ==> NestToken`);

        rs = await NestPoolContract.setContracts(NestMiningContract.address, _C_NestToken);
        console.log(`> [INIT] deployer: NestPool.setContracts(_C_NestMining=${NestMiningContract.address}, _C_NestToken=${_C_NestToken})`);

        rs = await NestMiningContract.setAddresses(dev, NN);
        console.log(`> [INIT] deployer: NestMining.setAddresses(dev=${dev}, NN=${NN})`);

        rs = await NNTokenContract.setContracts(_C_NNRewardPool);
        console.log(`> [INIT] deployer: NNTokenContract.setContracts(C_NNRewardPool=${_C_NNRewardPool})`);

        const approved_val = web3.utils.toWei("100000000", 'ether');
        rs = await NestTokenContract.approve(_C_BonusPool, approved_val, { from: userA});
        console.log(`> [CALL] userA: NestToken.approve(BonusPool=${_C_BonusPool}, amount=${approved_val}`);
        console.log(`  > gasUsed: ${tx.receipt.gasUsed}`);

        rs = await NestTokenContract.allowance(userA, BonusPoolContract.address);
        console.log(`> [CALL] deployer: ${rs} = NestToken.allowance(owner=${userA}, BonusPool=${_C_BonusPool})`);
        console.log(`  > gasUsed: ${tx.receipt.gasUsed}`);

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

            let nestA = web3.utils.toWei("20", 'ether');
            console.log(`>> [TRAN] userA: BonusPoolContract.pumpinEth(address=${_C_NestToken}, amount=${(new BN(nestA)).div(ethdec).toString(10)}`);
            let tx = await BonusPoolContract.pumpinEth(_C_NestToken, nestA, {from: userA, value: nestA});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);
            console.log(`  >> [TRAN] userA ==> NNRewardPool ETH(${(new BN(nestA)).div(ethdec).toString(10)}`);

            let _balance = await balance.current(BonusPoolContract.address);
            console.log(`[INFO] _balance = `, _balance.toString(10));
            let balanceOfUserA = await NestTokenContract.balanceOf(userA);

            let blncs = balanceOfUserA.div((new BN('10')).pow(new BN('18')));
            console.log(`====> depolyer call NestToken.balanceOf(userA) `, blncs.toString(10));

            let stake_value = web3.utils.toWei("100", 'ether');
            const tx = await StakingContract.stake(NestTokenContract.address, stake_value, {from: userA});
            console.log("tx", tx.logs.map((v, i)=> {
                const v1 = v.args[0];
                const v2 = v.args[1];
                if (typeof(v2) == 'object') {
                    return {s:v1, v:v2.toString(10)};
                }
                return {s:v1, v:v2};
            }));
            expect(_balance).equal(_msg_value);
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
})