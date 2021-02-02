
const { deployUSDT, deployWBTC, deployNN,
    deployNEST, deployNWBTC,
    deployNestProtocol,
    deployNestProtocolWithProxy, printContracts,
    setupNest,
    load_contracts, save_contracts} = require("./deploy.js");

const {usdtdec, wbtcdec, nestdec, ethdec, 
        ETH, USDT, WBTC, MBTC, NEST, BigNum, 
        advanceTime, 
        show_eth, show_usdt, show_64x64, show_nest,
        timeConverter} = require("./utils.js");

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

const contracts = require('../.contract_list_localhost.json');

async function main() {

    let tx;
    let receipt;
    
    [deployer, userA, userB, userC, userD] = await ethers.getSigners();
    console.log(`> [INIT] Accounts ... OK`);

    let filename = `.contracts_${network.name}.json`;

    let contracts = await load_contracts(filename);

    if (contracts.length <= 0) {
        console.log(`> [FATAL] Load ${filename} ... FAILED`);
        return
    }

    if (!contracts.NIPReleaseGov) {
        console.log(`> [FATAL] Load NIPReleaseGov from '${filename}' ... FAILED`);
        return
    }

    const abiCoder = new ethers.utils.AbiCoder();
    const calldata = abiCoder.encode(['address'], [deployer.address]);
    console.log(`> [INFO] deployer.address=${deployer.address}`);

    const id = await NestVote.propsalNextId();

    const dur = await NestVote.voteDuration();
    console.log(`> [INFO] NestVote.voteDuration = ${dur}`);

    tx = await NestToken.connect(userA).approve(NestVote.address, NEST(100000));
    tx.wait();
    console.log(`> [INFO] userA: NestToken.approve(NestVote)`);

    tx = await NestVote.connect(userA).propose(contracts.NIPReleaseGov.address, calldata, 'NIP-001-ReleaseGov');
    tx.wait();
    console.log(`> [INFO] proposal id=${id}, calldata=${calldata}, NIP=${contracts.NIPReleaseGov.address}`);

    tx = await NestToken.connect(userB).approve(NestVote.address, NEST(100000));
    await tx.wait(1);
    console.log(`> [INFO] userB: NestToken.approve(NestVote)`);

    const mined = await NestMiningProxy.minedNestAmount();
    console.log(`> [INFO] NestMining.minedNestAmount = ${show_nest(mined)}`);

    tx = await NestVote.connect(userB).vote(id, mined);
    await tx.wait(1);

    await advanceTime(ethers.provider, 110);

    tx = await NestVote.connect(userD).execute(id);
    receipt = await tx.wait(1);
    console.log(`> [INFO] proposal exec!, events=`, receipt.events);

    const new_governance = await NestPool.governance();
    console.log(`> [INFO] governance = ${new_governance}`);
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });




