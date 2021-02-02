
const { load_contract, save_contract,
    load_address, save_address,
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

const new_vote_duration = 12;

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

    const NIPSetParam = await load_contract("NIPSetParam");

    const abiCoder = new ethers.utils.AbiCoder();
    const calldata = abiCoder.encode(['string', 'uint256', 'uint256'], ["NestVote", 1, 12]);
    console.log(`> [INFO] NestVote.setParam(1, 12)`);
    console.log(`> [INFO] calldata=${calldata}`);

    const NestVote = contracts.NestVote;
    const id = await NestVote.propsalNextId();

    const dur = await NestVote.voteDuration();
    console.log(`> [INFO] NestVote.voteDuration = ${dur}`);

    tx = await NestToken.transfer(userA.address, NEST("200000"));
    await tx.wait();
    console.log(`> [INIT]: transfer Nest to userA about nest ...`);

    tx = await NestToken.connect(userA).approve(contracts.NestVote.address, NEST(100000));
    tx.wait();
    console.log(`> [INFO] userA: NestToken.approve(NestVote)`);

    tx = await NestVote.connect(userA).propose(NIPSetParam.address, calldata, 'NIP-003-NIPSetParam');
    tx.wait();
    console.log(`> [INFO] NIP proposed id=${id}, calldata=${calldata}, NIP=${NIPSetParam.address} ✅`);

    tx = await NestToken.transfer(userB.address, NEST("200000"));
    await tx.wait();
    console.log(`> [INIT]: transfer Nest to userB about nest ...`);

    tx = await NestToken.connect(userB).approve(contracts.NestVote.address, NEST(100000));
    await tx.wait(1);
    console.log(`> [INFO] userB: NestToken.approve(NestVote)`);

    const mined = await NestMiningProxy.minedNestAmount();
    console.log(`> [INFO] NestMining.minedNestAmount = ${show_nest(mined)}`);

    tx = await NestVote.connect(userB).vote(id, mined);
    await tx.wait(1);

    await advanceTime(ethers.provider, 110);

    tx = await NestVote.connect(userD).execute(id);
    receipt = await tx.wait(1);

    // const log = NestVote.interface.parseLog(receipt.logs[3]);
    // const success = log.args.success;
    // if (!success) {
    //     console.log(`> [EROR] NIP executed ... FAILED ❌`, );
    // }
    // console.log(`> [INFO] NIP executed ... OK ✅ `, );

    // verify 
    const newDur = await NestVote.voteDuration();
    if (newDur == new_vote_duration) {
        console.log(`> [INFO] NestVote.voteDuration = ${newDur} ... VERIFIED 👮✅✅`);
    } else {
        console.log(`> [EROR] NestVote.voteDuration(${dur}) != ${newDur} ...  👮❌`);
    }
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });




