const { expect } = require('chai');
require('chai').should();
const IBNEST = artifacts.require("IBNEST");
const IterableMapping = artifacts.require("IterableMapping");
const { BN, time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const UERC20 = artifacts.require("test/UERC20");
const DAO = artifacts.require("DAO");
const NestPool = artifacts.require("NestPool");

// const BonusPool = artifacts.require("BonusPool");
const NestStaking = artifacts.require("NestStaking");

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
        NestMiningContract = await NestMining.deployed();
        USDTContract = await UERC20.deployed();

        NestStakingContract = await NestStaking.new(NestTokenContract.address);

        _C_NestToken = NestTokenContract.address;
        _C_USDT = USDTContract.address;
        _C_NestStaking = NestStakingContract.address;
        _C_NestPool = NestPoolContract.address;
        _C_NestMining = NestMiningContract.address;
        // _C_NNToken = NNTokenContract.address;
        // _C_NNRewardPool = NNRewardPoolContract.address;
        // _C_BonusPool = BonusPoolContract.address;

        console.log(`- - - - - - - - - - - - - - - - - - `);
        console.log(`> [INIT] deployer = `, deployer);
        console.log(`> [INIT] userA = `, userA);
        console.log(`> [INIT] userB = `, userB);
        console.log(`> [INIT] userC = `, userC);
        console.log(`> [INIT] userD = `, userD);
        console.log(`> [INIT] NestToken.address = `, _C_NestToken);
        console.log(`> [INIT] NestStaking.address = `, _C_NestStaking);
        console.log(`> [INIT] USDT.address = `, _C_USDT);

        let rs = await NestPoolContract.setNTokenToToken(_C_USDT, _C_NestToken);
        console.log(`> [INIT] deployer: NestPool.setNTokenToToken(token=${_C_USDT}, ntoken=${_C_NestToken}), gasUsed: ${rs.receipt.gasUsed}`);
        console.log(`> [INIT] deployer: SET USDT ==> NestToken`);

        rs = await NestPoolContract.setContracts(_C_NestMining, _C_NestToken);
        console.log(`> [INIT] deployer: NestPool.setContracts(_C_NestMining=${NestMiningContract.address}, _C_NestToken=${_C_NestToken})`);

        rs = await NestMiningContract.setAddresses(dev, NN);
        console.log(`> [INIT] deployer: NestMining.setAddresses(dev=${dev}, NN=${NN})`);

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

        it("should approve correctly", async () => {
            let approved_val = web3.utils.toWei("10000000000", 'ether');
            console.log(`>> [CALL] userA: NestToken.approve(${_C_NestStaking}, amount=${approved_val/ethdec})`);
            let tx = await NestTokenContract.approve(_C_NestStaking, approved_val, { from: userA});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            let rs = await NestTokenContract.allowance(userA, _C_NestStaking);
            console.log(`>> [VIEW] deployer: NestToken.allowance(owner=${userA}, spender=${_C_NestStaking}) = `, rs.div(ethdec).toString(10));
        })

        it("should approve correctly", async () => {
            let approved_val = web3.utils.toWei("10000000000", 'ether');
            console.log(`>> [CALL] userB: NestToken.approve(${_C_NestStaking}, amount=${approved_val/ethdec})`);
            let tx = await NestTokenContract.approve(_C_NestStaking, approved_val, { from: userB});
            console.log(`  >> gasUsed: ${tx.receipt.gasUsed}`);

            let rs = await NestTokenContract.allowance(userB, _C_NestStaking);
            console.log(`>> [VIEW] deployer: NestToken.allowance(owner=${userB}, spender=${_C_NestStaking}) = `, rs.div(ethdec).toString(10));
        })
    });

    describe('NestStaking', function () {
        it("should have correct settings", async () => {
            let gov = await NestStakingContract.governance();
            expect(gov).to.equal(deployer);
        });

        it ("should add rewards correctly", async () => {
            const amount = web3.utils.toWei('100', 'ether');
            let tx = await NestStakingContract.addETHReward(_C_NestToken, {value: amount});
            let blncs = await NestStakingContract.rewardsTotal(_C_NestToken);
            expect(blncs).to.bignumber.equal(amount);
        });

        it("should stake correctly", async () => {
            const amount = web3.utils.toWei('100', 'ether');
            let tx = await NestStakingContract.stake(_C_NestToken, amount,{from: userA});
            const blncs = await NestStakingContract.stakedBalanceOf(_C_NestToken, userA);
            expect(blncs).to.bignumber.equal(new BN(amount));

            const total = await NestStakingContract.totalStaked(_C_NestToken);
            expect(total).to.bignumber.equal(amount);
        });

        it("should calculate reward correctly", async () => {
            const total = web3.utils.toWei('100', 'ether');
            const staked = await NestStakingContract.stakedBalanceOf(_C_NestToken, userA);
            console.log(`[VIEW] staked(Nest, userA)=${staked}`);
            const reward_per_ntoken = await NestStakingContract.rewardPerToken(_C_NestToken);
            console.log(`[VIEW] reward_per_ntoken(Nest)=${reward_per_ntoken}`);
            expect(reward_per_ntoken).to.bignumber.equal(new BN(50).mul(ethdec).mul(ethdec).div(staked));
            const accrued = await NestStakingContract.accrued(_C_NestToken);
            console.log(`[VIEW] accrued(Nest)=${accrued}`);
            expect(accrued).to.bignumber.equal(total);
            const earned = await NestStakingContract.earned(_C_NestToken, userA);
            console.log(`[VIEW] earned(Nest, userA)=${earned}`);
            expect(earned).to.bignumber.equal(accrued.mul(new BN(50)).div(new BN(100)));
            const reward = await NestStakingContract.rewardBalances(_C_NestToken, userA);
            console.log(`[VIEW] reward(Nest, userA)=${reward}`);
            expect(reward).to.bignumber.equal(new BN(0));
        });

        it("should claim rewards correctly", async () => {
            const amount = web3.utils.toWei('100', 'ether');
            const reward = new BN(amount).mul(new BN(50)).div(new BN(100));
            let total_pre = await NestStakingContract.rewardsTotal(_C_NestToken);
            let ethA_pre = await balance.current(userA);
            let reward_A_pre = await NestStakingContract.rewardBalances(_C_NestToken, userA);
            let tx = await NestStakingContract.claim(_C_NestToken, {from: userA});
            let ethA_post = await balance.current(userA);

            let ev = tx.logs.find(v => v.event == 'RewardClaimed').args;
            expect(ev["user"]).equal(userA);
            expect(ev["reward"]).to.bignumber.equal(reward);
            
            let total_post = await NestStakingContract.rewardsTotal(_C_NestToken);
            expect(total_pre.sub(total_post)).to.bignumber.equal(reward);
            let reward_A_post = await NestStakingContract.rewardBalances(_C_NestToken, userA);
            expect(reward_A_pre).to.bignumber.equal(reward_A_post);

            let lastRewardsTotal = await NestStakingContract.lastRewardsTotal(_C_NestToken);
            expect(lastRewardsTotal).to.bignumber.equal(total_post);
        });    

        it("should unstake correctly", async () => {
            const amount = web3.utils.toWei('100', 'ether');
            let tx = await NestStakingContract.unstake(_C_NestToken, amount,{from: userA});
            const blncs = await NestStakingContract.stakedBalanceOf(_C_NestToken, userA);
            expect(blncs).to.bignumber.equal(new BN('0'));
            const total = await NestStakingContract.totalStaked(_C_NestToken);
            expect(total).to.bignumber.equal(new BN('0'));
        });

        // it("should unstake correctly", async () => {
        //     const amount = web3.utils.toWei('100', 'ether');
        //     let tx = await NestStakingContract.unstake(_C_NestToken, amount,{from: userA});
        //     const blncs = await NestStakingContract.stakedBalanceOf(_C_NestToken, userA);
        //     expect(blncs).to.bignumber.equal(new BN('0'));
        //     const total = await NestStakingContract.totalStaked(_C_NestToken);
        //     expect(total).to.bignumber.equal(new BN('0'));
        // });

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

    // describe('Staking.claim', function () {
    //     it("can claim bonus after staking", 
    //     async () => {
    //         console.log(` TEST stake and claim`);
    //         let _msg_value = web3.utils.toWei("1.9", 'ether');
    //         const _C_NestToken = NestTokenContract.address;
    //         // const _C_USDT = ERC20Contract.address;

    //         let blncsA = await balance.current(userA);
    //         console.log(`>> userA has ${blncsA.div(ethdec).toString(10)} ethers`);

    //         let blncsB = await balance.current(userB);
    //         console.log(`>> userB has ${blncsB.div(ethdec).toString(10)} ethers`);

    //         let balanceOfUserA = await NestTokenContract.balanceOf(userA);
    //         let blncs = balanceOfUserA.div((new BN('10')).pow(new BN('18')));
    //         console.log('>> depolyer calls NestToken.balanceOf(userA) = ', blncs);

    //         const approved_val = web3.utils.toWei("10000000000", 'ether');
    //         const re = await NestTokenContract.approve(BonusPoolContract.address, approved_val, { from: userA});
    //         console.log(`>> userA call NestToken.approve(BonusPool ${approved_val/ethdec}) = ${re}`);
            
    //         const allowance_val = await NestTokenContract.allowance(userA, BonusPoolContract.address);
    //         console.log(`>> deployer call NestToken.allowance(userA, BonusPool) = `, allowance_val.div(ethdec).toString(10));

    //         let ntoken_amount = await BonusPoolContract.getNTokenAmount(_C_NestToken, userA);
    //         console.log(`>> userA staked ntoken = ${ntoken_amount.div(ethdec).toString(10)}`);

    //         let stake_value = web3.utils.toWei("1000000000", 'ether');
    //         const tx = await StakingContract.stake(_C_NestToken, stake_value, {from: userA});
    //         console.log(`>> userA call Staking.stake(${stake_value/ ethdec}), ${ntoken_amount.div(ethdec).toString(10)})`);

    //         _msg_value = web3.utils.toWei("20000", 'ether');
    //         await BonusPoolContract.pumpinEth(_C_NestToken, _msg_value, { from: userB, value: _msg_value });
    //         console.log(`>> userB call BonusPool.pumpinEth(${_C_NestToken}, ${ _msg_value/(10**18)})`);

    //         blncsB = await balance.current(userB);
    //         console.log(`>> userB has ${blncsB.div(ethdec).toString(10)} ethers`);
    //         // console.log("tx", tx.logs.map((v, i)=> {
    //         //     const v1 = v.args[0];
    //         //     const v2 = v.args[1];
    //         //     if (typeof(v2) == 'object') {
    //         //         return {s:v1, v:v2.toString(10)};
    //         //     }
    //         //     return {s:v1, v:v2};
    //         // }));

    //         ntoken_amount = await BonusPoolContract.getNTokenAmount(_C_NestToken, userA);
    //         console.log(`>> userA staked ntoken = ${ntoken_amount.div(ethdec).toString(10)}`);

    //         // await time.increaseTo(time.duration.days(3));
    //         // await time.increaseTo(1598773968);
    //         // await time.advanceBlock();
    //         console.log(`>> time.increase to Sun, Aug30, 2020 3:52':48'' PM`);

    //         blncsA = await balance.current(userA);
    //         console.log(`>> userA has ${blncsA.div(ethdec).toString(10)} ethers`);
    //         const tx2 = await StakingContract.claim(_C_NestToken, {from: userA});
    //         console.log(`>> userA call Staking.claim(${ntoken_amount.div(ethdec).toString(10)})`);
    //         console.log(">> tx2 = ", tx2.logs.map((v, i)=> {
    //                 const v1 = v.args[0];
    //                 const v2 = v.args[1];
    //                 if (typeof(v2) == 'object') {
    //                     return {s:v1, v:v2.toString(10)};
    //                 }
    //                 return {s:v1, v:v2};
    //             }));

    //         blncsA = await balance.current(userA);
    //         console.log(`>> userA has ${blncsA.div(ethdec).toString(10)} ethers`);

    //         ntoken_amount = await BonusPoolContract.getNTokenAmount(_C_NestToken, userA);
    //         console.log(`>> userA staked ntoken = ${ntoken_amount.div(ethdec).toString(10)}`);


    //         // expect(_balance).equal(_msg_value);
    //     });
    // });
})