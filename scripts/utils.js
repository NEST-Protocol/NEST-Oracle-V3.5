const { WeiPerEther, BigNumber, ethers } = require("ethers");
const { BN } = require('@openzeppelin/test-helpers');

const usdtdec = BigNumber.from(10).pow(6);
const wbtcdec = BigNumber.from(10).pow(8);
const ethdec = ethers.constants.WeiPerEther;

exports.ethdec = ethdec;
exports.nestdec = ethdec;
exports.usdtdec = usdtdec;
exports.wbtcdec = wbtcdec;

const ethTwei = BigNumber.from(10).pow(12);
exports.ethTwei = ethTwei;


exports.ETH = function (amount) {
    return BigNumber.from(amount).mul(ethdec);
}

exports.USDT = function (amount) {
    return BigNumber.from(amount).mul(usdtdec);
}

exports.WBTC = function (amount) {
    return BigNumber.from(amount).mul(wbtcdec);
}

exports.MBTC = function (amount) {
    return BigNumber.from(amount).mul(BigNumber.from(10).pow(5));
}

exports.NEST = function (amount) {
    return BigNumber.from(amount).mul(ethdec);
}

exports.BigN = function (n) {
    return BigNumber.from(n);
}

const BigNum = function (n) {
    return BigNumber.from(n);
}

exports.show_eth = function (amount){
    const ethskip = (new BN('10')).pow(new BN('13'));
    const ethdec = (new BN('10')).pow(new BN('18'));
    return (amount.div(ethdec).toString(10) + '.' + amount.mod(ethdec).div(ethskip).toString(10, 5));
}

exports.show_usdt = function (amount){
    const usdtskip = (new BN('10')).pow(new BN('3'));
    const usdtdec = (new BN('10')).pow(new BN('6'));
    return (amount.div(usdtdec).toString(10) + '.' + amount.mod(usdtdec).div(usdtskip).toString(10, 5));
}

const toBN = function (value) {
    const hex = BigNumber.from(value).toHexString();
    if (hex[0] === "-") {
        return (new BN("-" + hex.substring(3), 16));
    }
    return new BN(hex.substring(2), 16);
}

exports.show_64x64 = function (s) {
    const sep = BigNum(2).pow(BigNum(64));
    const prec = BigNum(10).pow(BigNum(8));
    const s1 = BigNum(s).div(sep);
    const s2 = BigNum(s).mod(sep);
    const s3 = s2.mul(prec).div(sep);
    return (s1 + '.' + toBN(s3).toString(10, 8));
}

exports.advanceTime = async (provider, seconds) => {
    await provider.send("evm_increaseTime", [seconds]);
}
  
exports.advanceBlock = async (provider) => {
    await provider.send("evm_mine");
}

exports.goBlocks = async function (provider, num) {
    let block_h;
    for (i = 0; i < num; i++) {
        await provider.send("evm_mine");
    }
    const h = await provider.getBlockNumber();
    console.log(`>>> [INFO] block mined +${num}, height=${h}`);
}

exports.waitBlocks = async function (provider, num) {
    let block_h;
    process.stdout.write(">>> [PROC] waiting blocks ");
    for (i = 0; i < num; i++) {
        provider.on("block", (blockNumber) => {
            process.stdout.write(".");
        })
    }
    process.stdout.write(">\n");
    const h = await provider.getBlockNumber();
    console.log(`>>> [INFO] block mined +${num}, height=${h}`);
}

exports.timeConverter = function (UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);

    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = a.getMonth() + 1;
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = year + "-" + month + "-" + date + " " + hour + ":" + min + ":" + sec;
    return time;
}


exports.showPriceSheetList = async function () {

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

    rs = await NestMiningContract.lengthOfPriceSheets(_C_USDT);
    let n = rs.toNumber();
    for (var i=0; i<n; i++) {
        rs = await NestMiningContract.contentOfPriceSheet(_C_USDT, new BN(i));
        records[i.toString()] = new Record(rs["miner"].toString(16), show_eth(rs["ethAmount"]), show_usdt(rs["tokenAmount"]), show_eth(rs["dealEthAmount"]), 
            show_usdt(rs["dealTokenAmount"]), rs["ethFee"].toString(10), rs["atHeight"].toString());
    }

    console.table(records);
}

/*
const show_nest_ntoken_ledger = async function () {
   
    let rs = await NestToken.balanceOf(userA);
    let A_nest = rs.div(ethdec).toString(10);

    rs = await NestToken.balanceOf(userB);
    let B_nest = rs.div(ethdec).toString(10);
    
    rs = await NestToken.balanceOf(userC);
    let C_nest = rs.div(ethdec).toString(10);

    rs = await NestToken.balanceOf(userD);
    let D_nest = rs.div(ethdec).toString(10);

    rs = await NestToken.balanceOf(_C_NestPool);
    let Pool_nest = rs.div(ethdec).toString(10);
    
    rs = await NestToken.balanceOf(dev);
    let dev_nest = rs.div(ethdec).toString(10);        
    
    rs = await NestToken.balanceOf(NN);
    let NN_nest = rs.div(ethdec).toString(10);

    rs = await NestToken.balanceOf(burnNest);
    let burn_nest = show_eth(rs);

    // nest pool

    rs = await NestPoolContract.balanceOfNestInPool(userA);
    let A_pool_nest = rs.div(ethdec).toString(10);
    
    rs = await NestPoolContract.balanceOfNestInPool(userB);
    let B_pool_nest = rs.div(ethdec).toString(10);

    rs = await NestPoolContract.balanceOfNestInPool(userC);
    let C_pool_nest = rs.div(ethdec).toString(10);

    rs = await NestPoolContract.balanceOfNestInPool(userD);
    let D_pool_nest = rs.div(ethdec).toString(10);

    rs = await NestPoolContract.balanceOfNestInPool(dev);
    let dev_pool_nest = rs.div(ethdec).toString(10);        
    
    rs = await NestPoolContract.balanceOfNestInPool(NN);
    let NN_pool_nest = rs.div(ethdec).toString(10);

    // eth ledger 

    rs = await balance.current(userC);
    let userC_eth = show_eth(rs);
    rs = await balance.current(userD);
    let userD_eth = show_eth(rs);
    rs = await balance.current(_C_BonusPool);
    let bonusPool_eth = show_eth(rs);


    function Record(ETH, NEST, POOL_NEST) {
        this.ETH = ETH;
        this.NEST = NEST;
        this.POOL_NEST = POOL_NEST;
    }

    var records = {};
    records.userA = new Record(`ETH()`, `NEST(${A_nest})`, `POOL_NEST(${A_pool_nest})`);
    records.userB = new Record(`ETH()`, `NEST(${B_nest})`, `POOL_NEST(${B_pool_nest})`);
    records.userC = new Record(`ETH(${userC_eth})`, `NEST(${C_nest})`, `POOL_NEST(${C_pool_nest})`);
    records.userD = new Record(`ETH(${userD_eth})`, `NEST(${D_nest})`, `POOL_NEST(${D_pool_nest})`);
    records.BonusPool = new Record(`ETH(${bonusPool_eth})`, ` `, ` `);
    records.Pool = new Record(`ETH()`, `NEST(${Pool_nest})`, ` `);
    records.dev = new Record(`ETH()`, `NEST(${dev_nest})`, `POOL_NEST(${dev_pool_nest})`);
    records.NN = new Record(`ETH()`, `NEST(${NN_nest})`, `POOL_NEST(${NN_pool_nest})`);
    records.burn = new Record(`ETH()`, `NEST(${burn_nest})`, ` `);
    console.table(records);
}



const show_eth_usdt_ledger = async function () {
    let rs = await USDTContract.balanceOf(userA);
    let A_usdt = show_usdt(rs);
    rs = await USDTContract.balanceOf(userB);
    let B_usdt = show_usdt(rs);

    rs = await USDTContract.balanceOf(_C_NestPool);
    let Pool_usdt = show_usdt(rs);

    rs = await balance.current(userA);
    let A_eth = show_eth(rs);
    rs = await balance.current(userB);
    let B_eth = show_eth(rs);

    rs = await balance.current(_C_NestPool);
    let Pool_eth = show_eth(rs);
    
    rs = await NestPoolContract.getMinerEthAndToken(userA, _C_USDT);
    let A_pool_eth = show_eth(rs["ethAmount"]);
    let A_pool_usdt = rs["tokenAmount"].div(usdtdec).toString(10);

    rs = await NestPoolContract.getMinerEthAndToken(userB, _C_USDT);
    let B_pool_eth = show_eth(rs["ethAmount"]);
    let B_pool_usdt = show_usdt(rs["tokenAmount"]);

    rs = await NestPoolContract.getMinerEthAndToken(constants.ZERO_ADDRESS, _C_USDT);
    let pool_pool_eth = show_eth(rs["ethAmount"]);
    let pool_pool_usdt = show_usdt(rs["tokenAmount"]);

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

*/


// const minedBlocks = function () {
    
//     const NEST = function (amount) {
//         return BigNumber.from(amount).mul(ethdec);
//     }
//     const total = NEST(1e10);
//     let remain = total;
//     let annual = BigNumber.from(2_400_000).mul(NEST(400));
//     console.log(`Y[0]=`, annual.toString());
//     remain = remain.sub(annual);
//     for(var i = 0; i < 9; i++) {
//         annual = annual.mul(4).div(5);
//         console.log(`Y[${i+1}]=`, annual.toString());
//         remain = remain.sub(annual);
//     }
//     console.log(`rest=`, remain.toString());
//     let rb = remain.div(NEST(40));
//     console.log(`remain blocks=`, rb.toString());
//     let lastH = rb.add(6236588).add(2_400_000*10);
//     console.log(`last=`,lastH.toString());
// } ()

// //   6236588
// // 173121489