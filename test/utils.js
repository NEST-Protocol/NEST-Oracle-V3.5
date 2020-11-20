const { WeiPerEther, BigNumber } = require("ethers");
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
};

exports.show_usdt = function (amount){
    const usdtskip = (new BN('10')).pow(new BN('3'));
    const usdtdec = (new BN('10')).pow(new BN('6'));
    return (amount.div(usdtdec).toString(10) + '.' + amount.mod(usdtdec).div(usdtskip).toString(10, 5));
};

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

exports.deployNest = async () => {
    
}