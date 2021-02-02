
const { expect } = require("chai");
const { WeiPerEther, BigNumber } = require("ethers");
// const { time, balance, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { deployMockContract } = require('@ethereum-waffle/mock-contract');

const { usdtdec, wbtcdec, nestdec, ethdec,
    ETH, USDT, WBTC, MBTC, NEST, BigNum, BigN,
    show_eth, show_usdt, show_64x64, goBlocks } = require("../scripts/utils.js");

const { deployUSDT, deployWBTC, deployNN, deployERC20,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    printContracts,
    setupNest } = require("../scripts/deploy.js");

const nwbtc = BigNumber.from(10).pow(18);

let provider = ethers.provider;

const advanceTime = async (provider, seconds) => {
    await provider.send("evm_increaseTime", [seconds]);
    console.log(`>> [INFO] time + ${seconds} s`);
};

describe("NestVote contract", function () {

    let deployer;
    let userA;
    let userB;
    let userC;
    let userD;

    let NestDAO;

    before(async function () {

        [deployer, userA, userB, userC, userD] = await ethers.getSigners();

        CUSDT = await deployUSDT();
        CWBTC = await deployWBTC();
        [NestToken, IterableMapping] = await deployNEST();
        NNToken = await deployNN();
        CNWBTC = await deployNWBTC(deployer);

        _C_USDT = CUSDT.address;
        _C_WBTC = CWBTC.address;
        _C_NWBTC = CNWBTC.address;
        _C_NestToken = NestToken.address;

        const NestPoolContract = await ethers.getContractFactory("NestPool");
        NestPool = await NestPoolContract.deploy(); // TODO: arg should be DAOContract
        await NestPool.deployed();
        console.log(`>>> [DPLY] NestPool deployed, address=${NestPool.address}, block=${NestPool.deployTransaction.blockNumber}`);

        _C_NestPool = NestPool.address;

        const NestStakingContract = await ethers.getContractFactory("NestStaking");
        NestStaking = await NestStakingContract.deploy();
        console.log(`>>> [DPLY] NestStaking deployed, address=${NestStaking.address}, block=${NestStaking.deployTransaction.blockNumber}`);

        tx = await NestStaking.initialize(NestPool.address);
        console.log(`>>> [INIT] NestStaking initialized, block=${tx.blockNumber}`);

        const NTokenControllerContract = await ethers.getContractFactory("NTokenController");
        NTokenController = await NTokenControllerContract.deploy(NestPool.address);
        console.log(`>>> [DPLY] NTokenController deployed, address=${NTokenController.address}`);

        const NestQueryContract = await ethers.getContractFactory("NestQuery");
        NestQuery = await NestQueryContract.deploy();
        await NestQuery.deployTransaction.wait();
        console.log(`>>> [DPLY] NestQuery deployed, address=${NestQuery.address}, block=${NestQuery.deployTransaction.blockNumber}`);

        tx = await NestQuery.initialize(NestPool.address);
        await tx.wait();
        console.log(`>>> [INIT] NestMining initialized, block=${tx.blockNumber}`);

        const NestDAOContract = await ethers.getContractFactory("NestDAO");
        NestDAOProxy = await upgrades.deployProxy(NestDAOContract, [NestPool.address], { unsafeAllowCustomTypes: true });
        tx = NestDAOProxy.deployTransaction;
        receipt = await tx.wait();
        ProxyAdmin = await upgrades.admin.getInstance();
        NestDAOImpl = await ProxyAdmin.getProxyImplementation(NestDAOProxy.address)
        console.log(`>>> [DPLY] proxy.admin=${ProxyAdmin.address}`);
        console.log(`>>> [DPLY]: NestDAO deployed with Proxy, proxy=${NestDAOProxy.address}, impl=${NestDAOImpl.address}, block=${NestDAOProxy.deployTransaction.blockNumber}`);

        _C_NestDAO = NestDAOProxy.address;

        const NestVoteContract = await ethers.getContractFactory("NestVote");
        NestVote = await NestVoteContract.deploy();
        tx = NestVote.deployTransaction;
        receipt = await tx.wait();
        console.log(`>>> [DPLY] NestVote deployed, address=${NestVote.address}, block=${tx.blockNumber}`);

        _C_NestVote = NestVote.address;

        const INestMining = require("../artifacts/contracts/iface/INestMining.sol/INestMining");
        MockNestMining = await deployMockContract(deployer, INestMining.abi);

        const INNRewardPool = require("../artifacts/contracts/iface/INNRewardPool.sol/INNRewardPool");
        MockNNRewardPool = await deployMockContract(deployer, INNRewardPool.abi);

        const INestQuery = require("../artifacts/contracts/iface/INestQuery.sol/INestQuery");
        MockNestQuery = await deployMockContract(deployer, INestQuery.abi);

        _C_NestMining = MockNestMining.address;
        _C_NestStaking = NestStaking.address;

        tx = await NestPool.setContracts(NestToken.address, MockNestMining.address,
            NestStaking.address, NTokenController.address, NNToken.address,
            MockNNRewardPool.address, MockNestQuery.address, NestDAOProxy.address);
        await tx.wait();
        console.log(`> [INIT] NestPool.setContracts() ...... OK`);

        await NestDAOProxy.loadContracts();
        console.log(`>>> [STUP] NestDAO.loadContracts() ....... OK `);

        await NestPool.setNTokenToToken(_C_USDT, _C_NestToken);

        await NestVote.initialize(_C_NestPool);
        console.log(`>>> [INIT] NestVote initialized ................ OK`);

        await NestVote.loadContracts();
        console.log(`>>> [LOAD] NestVote loadContracts ................ OK`);

    });


    describe('NEST Token', function () {
        it("should have correct totalSupply, NEST(10,000,000,000)", async () => {
            const expectedTotalSupply = NEST('10000000000');
            let totalSupply = await NestToken.totalSupply();
            const amount = NEST("20000000");
            await NestPool.initNestLedger(amount);
            expect(totalSupply).to.equal(expectedTotalSupply);
        });

        it("should transfer correctly, NEST(2,000,000,000) [Owner => userA]", async () => {
            const amount = NEST("2000000000");
            await NestToken.connect(deployer).transfer(userA.address, amount, { gasPrice: 0 });
            const userA_balance = await NestToken.balanceOf(userA.address);
            expect(userA_balance).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000)", async () => {
            const amount = NEST("10000000000");
            await NestToken.connect(userA).approve(_C_NestDAO, amount, { gasPrice: 0 });
            await NestToken.connect(userA).approve(NestVote.address, amount, { gasPrice: 0 });
            const approved = await NestToken.allowance(userA.address, _C_NestDAO);
            expect(approved).to.equal(amount);
        });

        it("should transfer correctly, NEST(2,000,000,000) [Owner => userB]", async () => {
            const amount = NEST("2000000000");
            await NestToken.connect(deployer).transfer(userB.address, amount, { gasPrice: 0 });
            const userB_balance = await NestToken.balanceOf(userB.address);
            expect(userB_balance).to.equal(amount);
        });

        it("should approve correctly, NEST(10,000,000,000) ", async () => {
            const amount = NEST("10000000000");
            await NestToken.connect(userB).approve(_C_NestDAO, amount, { gasPrice: 0 });
            await NestToken.connect(userB).approve(NestVote.address, amount, { gasPrice: 0 });
            const approved = await NestToken.allowance(userB.address, _C_NestDAO);
            expect(approved).to.equal(amount);
        });

    });


    describe('NestVote', function () {

        // check setParams func
        it("should set parameter correctly", async () => {

            const voteDuration_pre = await NestVote.voteDuration();
            const acceptance_pre = await NestVote.acceptancePercentage();
            const proposalStakingAmount_pre = await NestVote.proposalStakingAmount();
            const minimalVoteAmount_pre = await NestVote.minimalVoteAmount();

            await NestVote.setParam(1, 100);
            await NestVote.setParam(2, 52);
            await NestVote.setParam(3, NEST(100));
            await NestVote.setParam(4, NEST(10));

            const voteDuration_post = await NestVote.voteDuration();
            const acceptance_post = await NestVote.acceptancePercentage();
            const proposalStakingAmount_post = await NestVote.proposalStakingAmount();
            const minimalVoteAmount_post = await NestVote.minimalVoteAmount();

            expect(voteDuration_post).to.equal(100);
            expect(acceptance_post).to.equal(52);
            expect(proposalStakingAmount_post).to.equal(NEST(100));
            expect(minimalVoteAmount_post).to.equal(NEST(10));
        });

        it("should release governance correctly", async () => {

            const gov_old = await NestVote.governance();
            await NestVote.releaseGovTo(userC.address);
            const gov_new = await NestVote.governance();
            expect(gov_old).to.equal(deployer.address);
            expect(gov_new).to.equal(userC.address);

        });

        // userA proposes `NIPNop`
        it("should propose correctly", async () => {

            const nest_pre = await NestToken.balanceOf(NestVote.address);

            const id = await NestVote.propsalNextId();
            const abiCoder = new ethers.utils.AbiCoder();
            const calldata = abiCoder.encode(['address', 'string'], [userA.address, "Hello!"]);
            console.log(`[DBUG] userA.address=${userA.address}`)

            const NIPNopContract = await ethers.getContractFactory("NIPNop");
            NIP = await NIPNopContract.deploy();
            await NIP.deployTransaction.wait();
            console.log(`[DBUG] id=${id}, calldata=${calldata}, NIP=${NIP.address}`);
            await NestVote.connect(userA).propose(NIP.address, calldata, 'NIP-001-SayHi');

            const nest_post = await NestToken.balanceOf(NestVote.address);
            const proposal = await NestVote.proposalById(id);

            expect(proposal.contractAddr).to.equal(NIP.address);
            expect(proposal.proposer).to.equal(userA.address);
            expect(nest_post.sub(nest_pre)).to.equal(proposal.stakedNestAmount);
        });

        // userB votes `NIPNop`
        it("should vote correctly", async () => {

            const id = (await NestVote.propsalNextId()).sub(1);
            console.log(`id=${id}`);
            const min = await NestVote.minimalVoteAmount();
            const voters_pre = await NestVote.numberOfVotersById(id);

            const nest_pre = await NestToken.balanceOf(NestVote.address);
            console.log(`id=${await NestVote.propsalNextId()}`);

            await NestToken.connect(userB).approve(NestVote.address, NEST(100000));
            await NestVote.connect(userB).vote(id, min);
            console.log(`vote!`);

            const voters_post = await NestVote.numberOfVotersById(id);
            expect(voters_post.sub(voters_pre)).to.equal(1);

            const nest_post = await NestToken.balanceOf(NestVote.address);
            expect(nest_post.sub(nest_pre)).to.equal(min);
        });

        // userC votes and then unvotes `NIPNop`
        it("should unvote correctly", async () => {

            const id = (await NestVote.propsalNextId()).sub(1);
            console.log(`id=${id}`);
            const min = await NestVote.minimalVoteAmount();

            await NestToken.transfer(userC.address, NEST(100000));
            await NestToken.connect(userC).approve(NestVote.address, NEST(100000));

            await NestVote.connect(userC).vote(id, min);

            const voters_pre = await NestVote.numberOfVotersById(id);
            const nest_pre = await NestToken.balanceOf(NestVote.address);

            await NestVote.connect(userC).unvote(id);

            const voters_post = await NestVote.numberOfVotersById(id);
            expect(voters_pre.sub(voters_post)).to.equal(1);

            const nest_post = await NestToken.balanceOf(NestVote.address);
            expect(nest_pre.sub(nest_post)).to.equal(min);
        });

        it("should execute correctly", async () => {

            await MockNestMining.mock.minedNestAmount.withArgs().returns(NEST(15));

            const id = (await NestVote.propsalNextId()).sub(1);

            await advanceTime(provider, 110);

            let tx = await NestVote.connect(userD).execute(id);
            let rc = await tx.wait(1);

            const proposal = await NestVote.proposalById(id);
            expect(proposal.state).to.equal(2);
            expect(proposal.executor).to.equal(userD.address);
        });

        // userB withdraw `NIPNop`
        it("should withdraw correctly", async () => {

            const id = (await NestVote.propsalNextId()).sub(1);
            console.log(`id=${id}`);
            const staked_pre = await NestVote.connect(userC).balanceOf(id);
            const nest_pre = await NestToken.balanceOf(NestVote.address);

            await NestVote.connect(userC).withdraw(id);

            const staked_post = await NestVote.connect(userC).balanceOf(id);
            expect(staked_post).to.equal(0);

            const nest_post = await NestToken.balanceOf(NestVote.address);
            expect(nest_pre.sub(nest_post)).to.equal(staked_pre);
        });

        // userB proposes and revokes `NIPNop`
        it("should revoke correctly", async () => {

            const id = await NestVote.propsalNextId();
            const abiCoder = new ethers.utils.AbiCoder();
            const calldata = abiCoder.encode(['address', 'string'], [userB.address, "Another NIP!"]);
            console.log(`[DBUG] userB.address=${userB.address}`)

            const NIPNopContract = await ethers.getContractFactory("NIPNop");
            NIP = await NIPNopContract.deploy();
            await NIP.deployTransaction.wait();
            console.log(`[DBUG] id=${id}, calldata=${calldata}, NIP=${NIP.address}`);
            await NestVote.connect(userB).propose(NIP.address, calldata, 'NIP-001-SayHi');

            const nest_pre = await NestToken.balanceOf(NestVote.address);
            const proposal_pre = await NestVote.proposalById(id);
            expect(proposal_pre.state).to.equal(0);
            await NestVote.connect(userB).revoke(id, 'test');
            const proposal_post = await NestVote.proposalById(id);
            expect(proposal_post.state).to.equal(1);

            const nest_post = await NestToken.balanceOf(NestVote.address);
            expect(nest_post).to.equal(nest_pre);

        });

        // userA proposes `NIPReleaseGov`
        it("should propose NIPReleaseGov correctly", async () => {

            // 1: NestPool.setGovernance(NestVote.address)

            await NestPool.setGovernance(NestVote.address);
            console.log(`> [INFO]: NestPool set governance to NestVote ... OK`);

            // 2: NestVote.loadContracts() & loadGovernance()

            await NestVote.loadContracts();
            await NestVote.loadGovernance();

            // 3: NIPReleaseGovContract.deploy()

            const nest_pre = await NestToken.balanceOf(NestVote.address);

            const id = await NestVote.propsalNextId();
            const abiCoder = new ethers.utils.AbiCoder();
            const calldata = abiCoder.encode(['address'], [userA.address]);
            console.log(`userA.address=${userA.address}`)

            const NIPReleaseGovContract = await ethers.getContractFactory("NIPReleaseGov");
            NIP = await NIPReleaseGovContract.deploy();
            await NIP.deployTransaction.wait();
            console.log(`[DBUG] id=${id}, calldata=${calldata}, NIP=${NIP.address}`);

            // 4: NIPReleaseGovContract.deploy()

            await NestVote.connect(userA).propose(NIP.address, calldata, 'NIP-002-ReleaseGov');

            const nest_post = await NestToken.balanceOf(NestVote.address);
            const proposal = await NestVote.proposalById(id);

            expect(proposal.contractAddr).to.equal(NIP.address);
            expect(proposal.proposer).to.equal(userA.address);
            expect(nest_post.sub(nest_pre)).to.equal(await NestVote.proposalStakingAmount());
        });

        // userB votes `NIPReleaseGov`
        it("should vote NIPReleaseGov correctly", async () => {

            const id = (await NestVote.propsalNextId()).sub(1);
            console.log(`id=${id}`);
            const min = await NestVote.minimalVoteAmount();
            const voters_pre = await NestVote.numberOfVotersById(id);

            const nest_pre = await NestToken.balanceOf(NestVote.address);
            console.log(`id=${await NestVote.propsalNextId()}`);

            await NestToken.connect(userB).approve(NestVote.address, NEST(100000));
            await NestVote.connect(userB).vote(id, min);
            console.log(`vote!`);

            const voters_post = await NestVote.numberOfVotersById(id);
            expect(voters_post.sub(voters_pre)).to.equal(1);

            const nest_post = await NestToken.balanceOf(NestVote.address);
            expect(nest_post.sub(nest_pre)).to.equal(min);
        });

        // userD executes `NIPReleaseGov`
        it("should execute NIPReleaseGov correctly", async () => {

            await MockNestMining.mock.minedNestAmount.withArgs().returns(NEST(15));

            const id = (await NestVote.propsalNextId()).sub(1);

            const proposal = await NestVote.proposalById(id);

            const nest_pre = await NestToken.balanceOf(proposal.proposer);

            await advanceTime(provider, 110);

            await NestVote.connect(userD).execute(id);

            const nest_post = await NestToken.balanceOf(proposal.proposer);
            const proposal_post = await NestVote.proposalById(id);

            expect(proposal_post.state).to.equal(2);
            expect(proposal_post.executor).to.equal(userD.address);
            expect(proposal_post.stakedNestAmount).to.equal(0);
            expect(nest_post.sub(nest_pre)).to.equal(proposal.stakedNestAmount);

            expect(await NestPool.governance()).to.equal(userA.address);
            expect(await NestVote.governance()).to.equal(userA.address);
        });

        // userB proposes `NIPProxyUpgrade`
        it("should propose NIPProxyUpgrade correctly", async () => {

            // 0: ProxyAdmin.transferOwnership

            await ProxyAdmin.transferOwnership(NestVote.address);
            console.log(`> [INFO] proxy.admin.owner=${NestVote.address}`);

            // 1: NestPool.setGovernance(NestVote.address)

            await NestPool.connect(userA).setGovernance(NestVote.address);
            console.log(`> [INFO] NestPool set governance to NestVote ... OK`);

            // 2: NestVote.loadContracts() & loadGovernance()

            await NestVote.loadContracts();
            await NestVote.loadGovernance();
            await NestDAOProxy.loadGovernance();

            // 3: NestDAOV2Contract.deploy()

            const NestDAOV2Contract = await ethers.getContractFactory("NestDAOV2");
            NestDAOV2 = await NestDAOV2Contract.deploy();
            await NestDAOV2.deployTransaction.wait();
            console.log(`> [DPLY] NestDAOV2.address=${NestDAOV2.address}`);
            
            // 4: NIPReleaseGovContract.deploy()


            const NIPProxyUpgradeContract = await ethers.getContractFactory("NIPProxyUpgrade");
            NIP = await NIPProxyUpgradeContract.deploy();
            await NIP.deployTransaction.wait();
            console.log(`> [DPLY] NIPProxyUpgrade.address=${NIP.address}`);

            // 5: calldata = abiCoder.encode(...)

            const abiCoder = new ethers.utils.AbiCoder();
            const calldata = abiCoder.encode(['address', 'address', 'address'], [NestDAOProxy.address, ProxyAdmin.address, NestDAOV2.address]);
            console.log(`> [INFO] calldata=${calldata}`);

            const id = await NestVote.propsalNextId();
            
            // 6: NestVote.propose(...)

            await NestVote.connect(userB).propose(NIP.address, calldata, 'NIP-003-ProxyUpgrade');

            const proposal = await NestVote.proposalById(id);

            expect(proposal.contractAddr).to.equal(NIP.address);
            expect(proposal.proposer).to.equal(userB.address);
        });

        // userA votes `NIPProxyUpgrade`
        it("should vote NIPProxyUpgrade correctly", async () => {

            const id = (await NestVote.propsalNextId()).sub(1);

            await NestToken.connect(userA).approve(NestVote.address, NEST(100000));
            await NestVote.connect(userA).vote(id, NEST(100));

        });

        // userC executes `NIPProxyUpgrade`
        it("should execute NIPProxyUpgrade correctly", async () => {

            const id = (await NestVote.propsalNextId()).sub(1);

            await advanceTime(provider, 110);

            await NestVote.connect(userC).execute(id);

            const proposal_post = await NestVote.proposalById(id);

            expect(proposal_post.state).to.equal(2);
            expect(proposal_post.executor).to.equal(userC.address);
            expect(proposal_post.stakedNestAmount).to.equal(0);

            const NestDAOV2ImplAddress = await ProxyAdmin.getProxyImplementation(NestDAOProxy.address)
            expect(NestDAOV2ImplAddress).to.equal(NestDAOV2.address);

            const NestDAOV2Contract = await ethers.getContractFactory("NestDAOV2");
            const NestDAOV2Proxy = NestDAOV2Contract.attach(NestDAOProxy.address);
            const ver = await NestDAOV2Proxy.version();
            expect(ver).to.equal(2);
        });
    });
});