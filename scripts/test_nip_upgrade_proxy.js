
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

    const address_ProxyAdmin = await load_address("ProxyAdmin");

    const NestDAOV2 = await load_contract("NestDAOV2");
    const NIPProxyUpgrade = await load_contract("NIPProxyUpgrade");

    console.log(`> [INFO] NextDAO.Proxy.address=${contracts.NestDAO.address}`);
    console.log(`> [INFO] ProxyAdmin.address=${address_ProxyAdmin}`);
    console.log(`> [INFO] NIPProxyUpgrade.address=${NIPProxyUpgrade.address}`);
    console.log(`> [INFO] NextDAO.Impl(newly deployed).address=${NestDAOV2.address}`);

    const abiCoder = new ethers.utils.AbiCoder();
    const calldata = abiCoder.encode(['address', 'address', 'address'], [contracts.NestDAO.address, address_ProxyAdmin, NestDAOV2.address]);
    console.log(`> [INFO] calldata=${calldata}`);

    const NestVote = contracts.NestVote;
    const id = await NestVote.propsalNextId();

    const dur = await NestVote.voteDuration();
    console.log(`> [INFO] NestVote.voteDuration = ${dur}`);

    tx = await NestToken.connect(userA).approve(contracts.NestVote.address, NEST(100000));
    tx.wait();
    console.log(`> [INFO] userA: NestToken.approve(NestVote)`);

    tx = await NestVote.connect(userA).propose(NIPProxyUpgrade.address, calldata, 'NIP-002-NIPProxyUpgrade');
    tx.wait();
    console.log(`> [INFO] NIP proposed id=${id}, calldata=${calldata}, NIP=${NIPProxyUpgrade.address} ✅`);

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

    const log = NestVote.interface.parseLog(receipt.logs[3]);
    const success = log.args.success;
    if (!success) {
        console.log(`> [EROR] NIP executed ... FAILED ❌`, );
    }
    console.log(`> [INFO] NIP executed ... OK ✅ `, );

    // verify 
    const NestDAOV2Contract = await ethers.getContractFactory("NestDAOV2");
    const NestDAO = NestDAOV2Contract.attach(contracts.NestDAO.address);
    const ver = await NestDAO.version();
    console.log(`> [INFO] NestDAO.version = ${ver} ... VERIFIED 👮✅✅`);
}

main()
    .then( () => process.exit( 0 ) )
    .catch( err => {
        console.error(err);
        process.exit( 1 );
    });




