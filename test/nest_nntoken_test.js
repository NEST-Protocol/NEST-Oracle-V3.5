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
    const NNodeS = accounts[9];


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


    const show_nntoken_accounts = async function () {

        let rs = await NNTokenContract.balanceOf(NNodeA);
        let nnodeA_NN = rs.toString(10);
        rs = await NNTokenContract.balanceOf(NNodeB);
        let nnodeB_NN = rs.toString(10);
        rs = await NNTokenContract.balanceOf(NNodeS);
        let nnodeS_NN = rs.toString(10);
        rs = await NNTokenContract.balanceOf(deployer);
        let deployer_NN = rs.toString(10);

        rs = await NestTokenContract.balanceOf(_C_NNRewardPool);
        let nnpool_nest = rs.div(ethdec).toString(10);        
        rs = await NestTokenContract.balanceOf(NNodeA);
        let nnodeA_nest = rs.div(ethdec).toString(10);
        rs = await NestTokenContract.balanceOf(NNodeB);
        let nnodeB_nest = rs.div(ethdec).toString(10);
        rs = await NestTokenContract.balanceOf(NNodeS);
        let nnodeS_nest = rs.div(ethdec).toString(10);
        rs = await NestTokenContract.balanceOf(deployer);
        let deployer_nest = rs.div(ethdec).toString(10);


        rs = await NNRewardPoolContract.unclaimedNNReward({from: NNodeA});
        let nnodeA_pool_nest = rs.div(ethdec).toString(10);
        rs = await NNRewardPoolContract.unclaimedNNReward({from: NNodeB});
        let nnodeB_pool_nest = rs.div(ethdec).toString(10);
        rs = await NNRewardPoolContract.unclaimedNNReward({from: NNodeS});
        let nnodeS_pool_nest = rs.div(ethdec).toString(10);
        rs = await NNRewardPoolContract.unclaimedNNReward({from: deployer});
        let deployer_pool_nest = rs.div(ethdec).toString(10);

        function Record(nn, nest, pool_nest) {
            this.NN = nn;
            this.NEST = nest;
            this.POOL_NEST = pool_nest;
        }
        var records = {};
    
        records.userA = new Record(`NN(${nnodeA_NN})`, `NEST(${nnodeA_nest})`, `POOL_NEST(${nnodeA_pool_nest})`);
        records.userB = new Record(`NN(${nnodeB_NN})`, `NEST(${nnodeB_nest})`, `POOL_NEST(${nnodeB_pool_nest})`); 
        records.userS = new Record(`NN(${nnodeS_NN})`, `NEST(${nnodeS_nest})`, `POOL_NEST(${nnodeS_pool_nest})`); 
        records.pool  = new Record(` `, ` `, `NEST(${nnpool_nest})`); 
        records.deployer = new Record(`NN(${deployer_NN})`, `NEST(${deployer_nest})`, `POOL_NEST(${deployer_pool_nest})`); 

        console.table(records);
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

        console.log(`- - - - - - - - - - - - - - - - - - `);
        console.log(`> [INIT] deployer = `, deployer);
        console.log(`> [INIT] userA = `, userA);
        console.log(`> [INIT] userB = `, userB);
        console.log(`> [INIT] NNodeA = `, NNodeA);
        console.log(`> [INIT] NNodeB = `, NNodeB);
        console.log(`> [INIT] NNodeS = `, NNodeS);
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

        let amount = new BN("1500");
        console.log(`>> [TRANS] deployer => NNodeS NNT(${amount})`);
        let tx = await NNTokenContract.transfer(NNodeS, amount, {from: deployer});
        console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);


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


    describe('TEST NNReward', function () {
        it("add rewards, claim rewards", 
        async () => {

            console.log(`- - - - - - - - - - - - - - - - - - `);
            console.log(`>> [TEST] NNReward`);

            await show_nntoken_accounts();

            let amount = new BN("300");
            console.log(`>> [TRANS] NNodeS => NNodeA NNT(${amount})`);
            let tx = await NNTokenContract.transfer(NNodeA, amount, {from: NNodeS});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);

            await show_nntoken_accounts();

            let nest_amount = web3.utils.toWei("20", 'ether');

            console.log(`>> [TRANS] deployer => NNRewardPool NEST(${(new BN(nest_amount)).div(ethdec).toString(10)}`);
            tx = await NestTokenContract.transfer(_C_NNRewardPool, nest_amount, {from: deployer});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);
            console.log(`>> [CALL] deployer: NNRewardPool.addNNReward(amount=${(new BN(nest_amount)).div(ethdec).toString(10)}`);
            tx = await NNRewardPoolContract.addNNReward(nest_amount, {from: deployer});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);

            await show_nntoken_accounts();

            console.log(`>> [CALL] NNodeA: NNRewardPool.claimNNReward(amount=${(new BN(nest_amount)).div(ethdec).toString(10)}`);
            tx = await NNRewardPoolContract.claimNNReward({from: NNodeA});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);



            await show_nntoken_accounts();

            console.log(`>> [TRANS] NNodeS => NNodeB NNT(${600})`);
            tx = await NNTokenContract.transfer(NNodeB, 600, {from: NNodeS});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);

            await show_nntoken_accounts();

            nest_amount = web3.utils.toWei("100", 'ether');
            console.log(`>> [TRANS] deployer => NNRewardPool NEST(${(new BN(nest_amount)).div(ethdec).toString(10)}`);
            tx = await NestTokenContract.transfer(_C_NNRewardPool, nest_amount, {from: deployer});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);
            console.log(`>> [CALL] deployer: NNRewardPool.addNNReward(amount=${(new BN(nest_amount)).div(ethdec).toString(10)}`);
            tx = await NNRewardPoolContract.addNNReward(nest_amount, {from: deployer});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);


            await show_nntoken_accounts();

            console.log(`>> [CALL] NNodeB: NNRewardPool.claimNNReward(amount=${(new BN(nest_amount)).div(ethdec).toString(10)}`);
            tx = await NNRewardPoolContract.claimNNReward({from: NNodeB});
            console.log(`>>>> gasUsed: ${tx.receipt.gasUsed}`);
            
            await show_nntoken_accounts();

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