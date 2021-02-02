const { expect } = require('chai');
const { WeiPerEther, BigNumber } = require("ethers");

const { usdtdec, wbtcdec, nestdec, ethdec,
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_nest, show_usdt, show_64x64 } = require("../scripts/utils.js");

const { deployUSDT, deployWBTC, deployNWBTC, deployNN, deployNEST,
    deployNestProtocol, printContracts, setupNest } = require("../scripts/deploy.js");
const { ethers } = require('hardhat');

const show_token_in_nestpool = async function (TokenContract, userA, nameA, userB, nameB, userC, nameC, userD, nameD) {
    let rs;
    // let rs = await NestToken.balanceOf(userA);
    // let A_nest = rs.div(ethdec).toString(10);

    // rs = await NestToken.balanceOf(userB);
    // let B_nest = rs.div(ethdec).toString(10);

    // rs = await NestToken.balanceOf(userC);
    // let C_nest = rs.div(ethdec).toString(10);

    // rs = await NestToken.balanceOf(userD);
    // let D_nest = rs.div(ethdec).toString(10);

    // rs = await NestToken.balanceOf(_C_NestPool);
    // let Pool_nest = rs.div(ethdec).toString(10);

    // rs = await NestToken.balanceOf(dev);
    // let dev_nest = rs.div(ethdec).toString(10);        

    // rs = await NestToken.balanceOf(NN);
    // let NN_nest = rs.div(ethdec).toString(10);

    // rs = await NestToken.balanceOf(burnNest);
    // let burn_nest = show_eth(rs);

    // nest pool

    let tokenAddr = TokenContract.address
    let tokenSym = await TokenContract.Symbol();

    rs = await userA.getBalance();
    let A_eth = rs.div(ethdec).toString();

    rs = await userB.getBalance();
    let B_eth = rs.div(ethdec).toString();

    rs = await userC.getBalance();
    let C_eth = rs.div(ethdec).toString();

    rs = await NestPoolContract.balanceOfEthInPool(userA.address);
    let A_pool_eth = rs.div(ethdec).toString();

    rs = await NestPoolContract.balanceOfEthInPool(userB.address);
    let B_pool_eth = rs.div(ethdec).toString();

    rs = await NestPoolContract.balanceOfEthInPool(userC.address);
    let C_pool_eth = rs.div(ethdec).toString();


    rs = await NestPoolContract.balanceOfNestInPool(userA.address);
    let A_pool_nest = rs.div(nestdec).toString();
    rs = await NestToken.balanceOf(userA.address);
    let A_nest = rs.div(nestdec).toString();

    rs = await NestPoolContract.balanceOfNestInPool(userB.address);
    let B_pool_nest = rs.div(nestdec).toString();
    rs = await NestToken.balanceOf(userB.address);
    let B_nest = rs.div(nestdec).toString();

    rs = await NestPoolContract.balanceOfNestInPool(userC.address);
    let C_pool_nest = rs.div(nestdec).toString();
    rs = await NestToken.balanceOf(userC.address);
    let C_nest = rs.div(nestdec).toString();


    rs = await NestPoolContract.balanceOfTokenInPool(userA.address, tokenAddr);
    let A_pool_token = rs.div(nestdec).toString();
    rs = await TokenContract.balanceOf(userA.address);
    let A_token = rs.div(nestdec).toString();

    rs = await NestPoolContract.balanceOfTokenInPool(userB.address, tokenAddr);
    let B_pool_token = rs.div(nestdec).toString();
    rs = await TokenContract.balanceOf(userB.address);
    let B_token = rs.div(nestdec).toString();

    rs = await NestPoolContract.balanceOfTokenInPool(userC.address, tokenAddr);
    let C_pool_token = rs.div(nestdec).toString();
    rs = await TokenContract.balanceOf(userC.address);
    let C_token = rs.div(nestdec).toString();

    function Record(NEST, POOL_NEST, ETH, POOL_ETH, TOKEN, POOL_TOKEN) {
        this.NEST = NEST;
        this.POOL_NEST = POOL_NEST;
        this.ETH = ETH;
        this.POOL_ETH = POOL_ETH;
        this.TOKEN = TOKEN;
        this.POOL_TOKEN = POOL_TOKEN;
    }

    function new_record(user_nest, user_pool_nest, user_eth, user_pool_eth, user_token, user_pool_token) {
        let rec = new Record(`NEST(${user_nest})`, `P_NEST(${user_pool_nest})`,
            `ETH(${user_eth})`, `P_ETH(${user_pool_eth})`,
            `${tokenSym}(${user_token})`, `P_${tokenSym}(${user_pool_token})`);
        return rec
    }

    var records = {};

    records.userA = new_record(A_nest, A_pool_nest, A_eth, A_pool_eth, A_token, A_pool_token);
    records.userB = new_record(B_nest, B_pool_nest, B_eth, B_pool_eth, B_token, B_pool_token);
    records.userC = new_record(C_nest, C_pool_nest, C_eth, C_pool_eth, C_token, C_pool_token);
    console.table(records);
}


describe("Nest Protocol v3.5 contract", function () {
    // Mocha has four functions that let you hook into the the test runner's
    // lifecyle. These are: `before`, `beforeEach`, `after`, `afterEach`.

    let gov;
    let userA;
    let userB;
    let ghost;

    let CUSDT;
    let CWBTC;
    let CNWBTC;
    let NestToken;
    let NNToken;
    let NestPool;
    let NestMining;
    let NestStaking;
    let NNRewardPool;
    let NTokenController;
    let NestQuery;


    let _C_USDT;
    let _C_NestToken;
    let _C_NestPool;
    let _C_NestMining;
    let _C_NestStaking;
    let _C_NNRewardPool;
    let _C_NTokenController;
    let _C_NestQuery;
    let _C_NestDAO;

    let provider = ethers.provider;


    before(async () => {

        [deployer, userA, userB, ghost] = await ethers.getSigners();
        gov = deployer;

        CUSDT = await deployUSDT();
        CWBTC = await deployWBTC();
        CNWBTC = await deployNWBTC(gov);

        [NestToken, IterableMapping] = await deployNEST();
        NNToken = await deployNN();
        let contracts = {
            USDT: CUSDT,
            WBTC: CWBTC,
            NWBTC: CNWBTC,
            NEST: NestToken,
            IterableMapping: IterableMapping,
            NN: NNToken
        };
        const addrOfNest = await deployNestProtocol(gov, contracts);
        await printContracts("", addrOfNest);
        await setupNest(gov, addrOfNest);

        NestPool = contracts.NestPool;
        MiningV1Calc = contracts.MiningV1Calc;
        MiningV1Op = contracts.MiningV1Op;
        NestMining = contracts.NestMining;
        NestStaking = contracts.NestStaking;
        NNRewardPool = contracts.NNRewardPool;
        NTokenController = contracts.NTokenController;
        NestQuery = contracts.NestQuery;
        NestDAO = contracts.NestDAO;

        _C_USDT = CUSDT.address;
        _C_WBTC = CWBTC.address;
        _C_NWBTC = CNWBTC.address;
        _C_NestToken = NestToken.address;
        _C_NestPool = NestPool.address;
        _C_NestMining = NestMining.address;
        _C_NestStaking = NestStaking.address;
        _C_NNRewardPool = NNRewardPool.address;
        _C_NNToken = NNToken.address;
        _C_NTokenController = NTokenController.address;
        _C_NestQuery = NestQuery.address;
        _C_NestDAO = NestDAO.address;

        // NOTE: Some functions in NestPool require `onlyMiningContract`, 
        //     so we set gov as the MiningContract.
        tx = await NestPool.setContracts(NestToken.address,
            ghost.address, // fake NestMining
            NestStaking.address, NTokenController.address, NNToken.address,
            NNRewardPool.address, NestQuery.address, NestDAO.address);
        receipt = await tx.wait();
        console.log(`>>> [STUP] NestPool.setContracts() ..... OK`);

        let amount = NEST('1000000000');
        await NestPool.initNestLedger(amount);

        await NestToken.transfer(NestPool.address, amount);

        let user_eth = await provider.getBalance(userA.address);


        const list_nest = async function (provider, user_list, tokenContract) {

            let tokenAddr;
            let tokenSym = "XXX";
            if (tokenContract != undefined) {
                tokenAddr = TokenContract.address;
                tokenSym = await TokenContract.Symbol();
                user_token = await NestToken.balanceOf(user.address);
                user_pool_nest = await NestPool.balanceOfNestInPool(user.address);
            }

            async function getBalances(user, tokenContract) {
                let user_eth = await provider.getBalance(user.address);
                let user_pool_eth = await NestPool.balanceOfEthInPool(user.address);
                let user_nest = await NestToken.balanceOf(user.address);
                let user_pool_nest = await NestPool.balanceOfNestInPool(user.address);

                let user_token = BigN(0);
                let user_pool_token = BigN(0);
                if (tokenContract != undefined) {
                    let tokenAddr = TokenContract.address;
                    let tokenSym = await TokenContract.Symbol();
                    user_token = await NestToken.balanceOf(user.address);
                    user_pool_nest = await NestPool.balanceOfNestInPool(user.address);
                }
                return {
                    nest: user_nest,
                    pool_nest: user_pool_nest,
                    eth: user_eth,
                    pool_eth: user_pool_eth,
                    token: user_token,
                    pool_token: user_pool_token
                }
            }

            function Record(NEST, POOL_NEST, ETH, POOL_ETH, TOKEN, POOL_TOKEN) {
                this.NEST = NEST;
                this.POOL_NEST = POOL_NEST;
                this.ETH = ETH;
                this.POOL_ETH = POOL_ETH;
                this.TOKEN = TOKEN;
                this.POOL_TOKEN = POOL_TOKEN;
            }

            function new_record_from_bal(bal) {
                let rec = new Record(
                    `NEST(${show_nest(bal.nest)})`, 
                    `P_NEST(${show_nest(bal.pool_nest)})`,
                    `ETH(${show_eth(bal.eth)})`, `P_ETH(${show_eth(bal.pool_eth)})`,
                    `${tokenSym}(${bal.token})`, `P_${tokenSym}(${bal.pool_token})`);
                return rec
            }

            var records = {};

            for (let i = 0; i < user_list.length; i++) {
                [user, nm] = user_list[i];
                bal = await getBalances(user, tokenContract);
                records[nm] = new_record_from_bal(bal);
            }

            console.table(records);
        }


        await list_nest(provider, [[deployer,"deployer"], [userA,"A"], [userB,"B"],
            [NestPool, "NestPool"]]);


        // bn = tx.blockNumber;
        // ts = (await ethers.provider.getBlock(bn)).timestamp;
        // nw = (await ethers.provider.getNetwork()).name;
        // console.log(`>>>       network=${nw}, block=${bn}, time=${timeConverter(ts)} `);

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
            const amount = NEST("200000");
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
            await expect(NestToken.transfer(userA.address, amount)).to.be.reverted;
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

    describe('NestPool', function () {

        it("should be able to setNTokenToToken by gov", async () => {
            await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);
            const ntoken = await NestPool.connect(userA).getNTokenFromToken(_C_USDT);
            expect(ntoken).to.equal(_C_NestToken);
            await expect(NestPool.connect(userA).setNTokenToToken(_C_USDT, _C_NestToken)).to.be.revertedWith("Nest:Pool:!Auth");
        });

        it("should be able to transfer NEST from a miner to another within the pool", async () => {
            const amount = NEST(50);

            await NestPool.connect(ghost).freezeNest(userA.address, NEST(10000));
            await NestPool.connect(ghost).unfreezeNest(userA.address, NEST(10000));
            const nest_A_pre = await NestPool.balanceOfNestInPool(userA.address);
            const nest_B_pre = await NestPool.balanceOfNestInPool(userB.address);

            await NestPool.connect(ghost).transferNestInPool(userA.address, userB.address, amount);

            const nest_A_post = await NestPool.balanceOfNestInPool(userA.address);
            const nest_B_post = await NestPool.balanceOfNestInPool(userB.address);

            expect(nest_A_pre).to.equal(nest_A_post.add(amount));
            expect(nest_B_pre).to.equal(nest_B_post.sub(amount));
        });

        it("should be able to transfer Token from a miner to another within the pool", async () => {
            const amount = WBTC(50);

            await CWBTC.transfer(userA.address, WBTC('1000000'));
            await CWBTC.connect(userA).approve(_C_NestPool, WBTC('1000000'));
            await NestPool.connect(ghost).freezeToken(userA.address, _C_WBTC, WBTC(10000));
            await NestPool.connect(ghost).unfreezeToken(userA.address, _C_WBTC, WBTC(10000));
            const token_A_pre = await NestPool.balanceOfTokenInPool(userA.address, _C_WBTC);
            const token_B_pre = await NestPool.balanceOfTokenInPool(userB.address, _C_WBTC);

            await NestPool.connect(ghost).transferTokenInPool(_C_WBTC, userA.address, userB.address, amount);

            const token_A_post = await NestPool.balanceOfTokenInPool(userA.address, _C_WBTC);
            const token_B_post = await NestPool.balanceOfTokenInPool(userB.address, _C_WBTC);

            expect(token_A_pre).to.equal(token_A_post.add(amount));
            expect(token_B_pre).to.equal(token_B_post.sub(amount));
        });

        it("should be able to freeze/unfreeze ether+token within the pool", async () => {
            const amount = WBTC(50);

            await CWBTC.transfer(userA.address, WBTC('10000'));
            await CWBTC.connect(userA).approve(_C_NestPool, WBTC('10000'));

            await NestPool.connect(ghost).depositEth(userA.address, { value: ETH(10) });

            const token_A_pre = await CWBTC.balanceOf(userA.address);
            const token_A_pool_pre = await NestPool.balanceOfTokenInPool(userA.address, _C_WBTC);
            const eth_A_pool_pre = await NestPool.balanceOfEthInPool(userA.address);

            await NestPool.connect(ghost).freezeEthAndToken(userA.address, ETH(10), _C_WBTC, WBTC(10000));
            await NestPool.connect(ghost).unfreezeEthAndToken(userA.address, ETH(10), _C_WBTC, WBTC(10000));

            const token_A_post = await CWBTC.balanceOf(userA.address);
            const token_A_pool_post = await NestPool.balanceOfTokenInPool(userA.address, _C_WBTC);
            const eth_A_pool_post = await NestPool.balanceOfEthInPool(userA.address);

            expect(token_A_pre.add(token_A_pool_pre)).to.equal(token_A_post.add(token_A_pool_post));
            expect(eth_A_pool_pre).to.equal(eth_A_pool_post);
        });

        it("should be able to add NEST to a miner's internal account", async () => {
            const amount = NEST(50);

            const nest_pre = await NestPool.minedNestAmount();
            const nest_A_pre = await NestPool.balanceOfNestInPool(userA.address);
            await NestPool.connect(ghost).addNest(userA.address, amount);
            const nest_A_post = await NestPool.balanceOfNestInPool(userA.address);
            const nest_post = await NestPool.minedNestAmount();

            expect(nest_A_post.sub(nest_A_pre)).to.equal(amount);
            expect(nest_post.sub(nest_pre)).to.equal(amount);
        });

        it("should be able to add NTOKEN to a miner's internal account", async () => {
            const amount = 50;

            const ntoken_A_pre = await NestPool.balanceOfTokenInPool(userA.address, _C_NWBTC);
            await NestPool.connect(ghost).addNToken(userA.address, _C_NWBTC, amount);
            const ntoken_A_post = await NestPool.balanceOfTokenInPool(userA.address, _C_NWBTC);

            expect(ntoken_A_post.sub(ntoken_A_pre)).to.equal(amount);
        });

        it("should be able to withdraw ETH", async () => {
            const amount = ETH(10);
            await NestPool.connect(ghost).depositEth(userA.address, { value: ETH(40) });
            await NestPool.connect(ghost).freezeEth(userA.address, amount);
            await NestPool.connect(ghost).freezeEth(userA.address, amount);
            const bal_freeze_eth = await NestPool.balanceOfEthFreezed();
            await NestPool.connect(ghost).unfreezeEth(userA.address, amount);
            const eth_A_pre = await userA.getBalance();
            await NestPool.connect(ghost).withdrawEth(userA.address, amount);
            const eth_A_post = await userA.getBalance();

            expect(eth_A_post.sub(eth_A_pre)).to.equal(amount);

            await NestPool.connect(ghost).transferEthInPool(userA.address, userB.address, ETH(1));

            const eth_pool_A = await NestPool.balanceOfEthInPool(userA.address);
            await expect(NestPool.connect(ghost).withdrawEth(userA.address, eth_pool_A.add(1)))
                .to.be.revertedWith("Nest:Pool:!blncs");
        });

        it("should be able to withdraw TOKEN", async () => {
            const amount = USDT(10);
            await CUSDT.connect(userA).approve(_C_NestPool, USDT(10000));
            await NestPool.connect(ghost).freezeToken(userA.address, _C_USDT, amount)
            await NestPool.connect(ghost).unfreezeToken(userA.address, _C_USDT, amount)
            const usdt_A_pre = await CUSDT.balanceOf(userA.address);

            await NestPool.connect(ghost).withdrawToken(userA.address, _C_USDT, amount);


            const bal_freeze_token = await await NestPool.balanceOfTokenFreezed(_C_USDT);

            const usdt_A_post = await CUSDT.balanceOf(userA.address);

            expect(usdt_A_post.sub(usdt_A_pre)).to.equal(amount);
            const usdt_pool_A = await NestPool.balanceOfTokenInPool(userA.address, _C_USDT);
            await expect(NestPool.connect(ghost).withdrawToken(userA.address, _C_USDT, usdt_pool_A.add(1)))
                .to.be.revertedWith("Nest:Pool:!blncs");
        });

        it("should be able to withdraw NEST", async () => {
            const amount = NEST(10);
            await NestToken.connect(userA).approve(_C_NestPool, NEST(10000));
            await NestPool.connect(ghost).freezeToken(userA.address, _C_NestToken, amount)
            await NestPool.connect(ghost).unfreezeToken(userA.address, _C_NestToken, amount)
            const token_A_pre = await NestToken.balanceOf(userA.address);

            await NestPool.connect(ghost).withdrawNest(userA.address, amount);

            const token_A_post = await NestToken.balanceOf(userA.address);

            expect(token_A_post.sub(token_A_pre)).to.equal(amount);
            const token_pool_A = await NestPool.balanceOfNestInPool(userA.address);
            await expect(NestPool.connect(ghost).withdrawNest(userA.address, token_pool_A.add(1)))
                .to.be.revertedWith("Nest:Pool:!blncs");
        });
    });
});
