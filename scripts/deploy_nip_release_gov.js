// const {ethers} = require("ethers");

const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest, 
    load_contracts, save_contracts} = require("./deploy.js");

const {usdtdec, wbtcdec, nestdec, ethdec, 
        ETH, USDT, WBTC, MBTC, NEST, BigNum, 
        show_eth, show_usdt, show_64x64, timeConverter} = require("./utils.js");

const fs = require('fs');

const {
    assertUpgradeSafe,
    assertStorageUpgradeSafe,
    getStorageLayout,
    fetchOrDeploy,
    getVersion,
    getUnlinkedBytecode,
    getImplementationAddress,
    getAdminAddress } = require('@openzeppelin/upgrades-core');

async function main() {

    let tx;
    let receipt;
    

    [deployer, userA, userB, userC] = await ethers.getSigners();
    console.log(`> [INFO] Load accounts ... OK`);

    let filename = `.contracts_${network.name}.json`;

    let contracts = await load_contracts(filename);

    if (contracts.length <= 0) {
        console.log(`> [FATAL] Load ${filename} ... FAILED`);
        return
    }

    // 1. setup NestVote as the new governance 

    const NIPReleaseGovContract = await ethers.getContractFactory("NIPReleaseGov");
    NIP = await NIPReleaseGovContract.deploy();
    await NIP.deployTransaction.wait();
    console.log(`> [DPLY] NIPReleaseGov deployed, address=${NIP.address} ✅`);

    contracts.NIPReleaseGov = NIP;

    // 2. propose 

    /*
    const abiCoder = new ethers.utils.AbiCoder();
    const calldata = abiCoder.encode(['address'], [userA.address]);
    console.log(`> [INFO] proposer(userA).address=${userA.address}`);

    const staked = await contracts.NestVote.proposalStakingAmount();
    console.log(`> [INFO] NestVoteProxy.proposalStakingAmount = ${staked}`);

    tx = await (contracts.NEST).connect(userA).approve(contracts.NestVote.address, staked);
    tx.wait();
    console.log(`> [INFO] userA: NestToken.approve(NestVote, ${staked})`);

    const id = await contracts.NestVote.propsalNextId();
    tx = await contracts.NestVote.connect(userA).propose(NIP.address, calldata, 'NIP-001-ReleaseGov');
    tx.wait();
    console.log(`> [INFO] proposal id=${id}, calldata=${calldata}, NIP.address=${NIP.address}`);
    
    const proposal = await contracts.NestVote.proposalById(id);
    console.log(`> [INFO] proposal=${proposal}`);
    */

    await save_contracts(contracts, filename);

    console.log(`> [INFO] Update file ${filename} ... OK `);


}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });
