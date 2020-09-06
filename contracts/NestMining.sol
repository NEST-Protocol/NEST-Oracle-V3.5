// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./iface/IBonusPool.sol";
import "./iface/INToken.sol";

contract NestMining {
    
    using SafeMath for uint256;

    event Log(string msg);
    event LogUint(string msg, uint256 v);
    event LogAddress(string msg, address a);

    // size: (4 x 256B)
    struct PriceSheetData {    
        address miner;       //  miner who posted the price
    
        // The balances of assets can increase or decrease if others take them on either side
        // They can be withdrawn if the owner closes the sheet
        uint128 ethAmount;   //  the balance of eth
        uint128 tokenAmount; //  the balance of token 
 
        // The balances of assets that can be bitten, they can only decrease
        // Note that (dealEthAmount:dealTokenAmount) is equal to the original (ethAmount:tokenAmount)
        uint128 dealEthAmount;  
        uint128 dealTokenAmount;

        // uint128 originalEthAmount;
        // uint128 originalTokenAmount;

        uint128 ethFee;      // a small percentage of fee paid to that bonus pool
        uint64  atHeight;    // the block height when the price goes into effect 
        uint8   deviated;    // is deviated too much
        uint56  _padding;    // padding for alignment   
    }

    INestPool private _C_NestPool;
    ERC20 private _C_NestToken;
    IBonusPool private _C_BonusPool;
    // IPriceOracle private _C_PriceOracle;

    address private _developer_address;
    address private _NN_address;
    uint256 private _latest_mining_height;
    uint256[10] private _mining_nest_yield_per_block_amount;

    // 
    uint128 private _temp_eth_fee;
    uint128 private _temp_eth_pool;


    // uint256 constant c_mining_nest_genesis_block_height = 6236588;
    uint256 constant c_mining_nest_genesis_block_height = 1; // for testing

    uint256 constant c_mining_nest_yield_cutback_period = 2400000;
    uint256 constant c_mining_nest_yield_cutback_rate = 80;
    uint256 constant c_mining_nest_yield_off_period_amount = 40 ether;
    uint256 constant c_mining_nest_yield_per_block_base = 400 ether;

    // the minimum mining fee (ethers)
    uint256 constant c_mining_eth_minimum = 10 ether;
    uint256 constant c_mining_eth_unit = 10 ether;
    uint256 constant c_mining_price_deviateion_factor = 10;
    uint256 constant c_mining_fee_thousandth = 10; 
    uint256 constant c_team_reward_percentage = 5;
    uint256 constant c_NN_reward_percentage = 15;
    uint256 constant c_bidder_reward_percentage = 5;

    uint256 constant c_price_deviation_rate = 10;
    uint256 constant c_price_duration_block = 25;

    uint256 constant c_bite_amount_factor = 2;
    uint256 constant c_bite_fee_thousandth = 1; 


    // We use mapping (from `token_address` to an array of `priceSheetData`) to remove the owner field 
    // from the PriceSheetData so that to save 256b. The idea is from Fei.
    mapping(address => PriceSheetData[]) _prices_map;

    // The following two mappings collects all of the nest mined and eth fee 
    // paid at each height, such that the distribution can be calculated

    // _mined_nest_at_height: block height => nest amount
    mapping(uint256 => uint256) _mined_nest_at_height;
    // _eth_fee_at_height: block height => eth amount 
    mapping(uint256 => uint256) _eth_fee_at_height;
    // _mined_ntoken_at_height: ntoken => block height => ntoken amount
    mapping(address => mapping(uint256 => uint256)) _mined_ntoken_at_height;
    // _eth_fee_ntoken_at_height: ntoken => block height => eth amount
    mapping(address => mapping(uint256 => uint256)) _eth_fee_ntoken_at_height;

    event PostPrice(address miner, address token, uint256 index, uint256 ethAmount, uint256 tokenAmount, uint256 isDeviated);
    event ClosePrice(address miner, address token, uint256 index);
    event Deposit(address miner, address token, uint256 amount);
    event Withdraw(address miner, address token, uint256 amount);
    event BiteEth(address miner, uint256 biteEthAmount, uint256 biteTokenAmount, address token, uint256 index);
    event BiteToken(address miner, uint256 biteEthAmount, uint256 biteTokenAmount, address token, uint256 index);


    constructor(address NestToken, address NestPool, address BonusPool) public {
        _C_NestToken = ERC20(NestToken);
        _C_NestPool = INestPool(NestPool);
        _C_BonusPool = IBonusPool(BonusPool);
        _latest_mining_height = block.number;
        uint256 amount = c_mining_nest_yield_per_block_base;
        for (uint i =0; i < 10; i++) {
            _mining_nest_yield_per_block_amount[i] = amount;
            amount = amount.mul(c_mining_nest_yield_cutback_rate).div(100);
        }
    }

    receive() external payable {
    }

    function setAddresses(address developer_address, address NN_address) public {
        _developer_address = developer_address;
        _NN_address = NN_address;
    }

    function postPriceSheet(uint256 ethAmount, uint256 tokenAmount, address token, bool isNToken) 
        public payable returns (uint256) // noContract
    {
        // check parameters 
        require(token != address(0x0)); 
        // TODO: more checking

        // load ntoken
        address nestNToken;
        if (!isNToken) {
            // require(_token_allowed_list[token], "token is not listed");
            nestNToken = address(_C_NestToken);
        } else {
            nestNToken = _C_NestPool.getNTokenFromToken(token);  
        }

        uint256 ethFee;

        // 判断价格是否偏离
        // If the price is too far off from the latest effective price

        uint256 isDeviated = isPriceDeviated(ethAmount, tokenAmount, token, c_price_deviation_rate);
        // calculate mining fee (eth)
        if (isDeviated == 0x1) {
            require(ethAmount >= c_mining_eth_minimum * c_mining_price_deviateion_factor, "ethAmount should > 10 * x_mining_eth_minimum");
            ethFee = (c_mining_eth_minimum * c_mining_fee_thousandth / 1000);
        } else {
            ethFee = ethAmount.mul(c_mining_fee_thousandth).div(1000);
        }
    
        // save the changes into miner's virtual account
        // 将矿工支付的多余 eth 计入矿工账户
        // if (msg.value.sub(ethAmount.add(ethFee)) > 0) {
        _C_NestPool.depositEthMiner(address(msg.sender), msg.value.sub(ethFee));
        // }
        emit LogUint("postPriceSheet> msg.value", msg.value);
        emit LogUint("postPriceSheet> ethFee", ethFee);
        emit LogUint("postPriceSheet> this.balance", address(this).balance);
        // TODO: un-optimized version 
        TransferHelper.safeTransferETH(address(_C_NestPool), msg.value.sub(ethFee));
        _C_BonusPool.pumpinEth{value:ethFee}(address(_C_NestToken), ethFee);
    
        // Bookkeep eth and token onto the nest pool
        _C_NestPool.freezeEthAndToken(msg.sender, ethAmount, token, tokenAmount);
        // token 充值到矿池，如果 token 足够，则不发生转账，否则 NestPool 会调用 transferFrom，把不足的 token 转移到 NestPool，并记录新的余额 
        // append a new price sheet (100,000 GAS, est.)
        _prices_map[token].push(PriceSheetData(msg.sender, 
            uint128(ethAmount), uint128(tokenAmount), 
            uint128(ethAmount), uint128(tokenAmount), 
            // uint128(ethAmount), uint128(tokenAmount), 
            uint128(ethFee), uint64(block.number), uint8(isDeviated), uint56(0)));
        //     
        // 产生一条价格记录 （1.5 万 GAS）
        // _C_PriceOracle.addPrice(ethAmount, tokenAmount, block.number.add(x_price_duration), token, address(msg.sender));
    
    
        // TODO: Optimization
        // _temp_eth_fee = _temp_eth_fee.add(ethFee);
        // _temp_eth_pool = _temp_eth_pool.add(msg.value.sub(ethFee));
    
        // 挖矿 (4.5 万 GAS)
        if (!isNToken) { // 挖 nest 矿
            if (_mined_nest_at_height[block.number] == 0) {
                uint256 nestAmount = mineNest();  
                emit LogUint("mineNest()", nestAmount);
                uint256 dev = nestAmount.mul(c_team_reward_percentage).div(100);
                uint256 NN = nestAmount.mul(c_NN_reward_percentage).div(100);
                uint256 remain = nestAmount.sub(dev).sub(NN);
                emit LogUint("postPriceSheet> nestAmount", nestAmount);
                emit LogUint("postPriceSheet> dev", dev);
                emit LogUint("postPriceSheet> NN", NN);
                emit LogUint("postPriceSheet> remain", remain);
                _C_NestPool.increaseNestReward(_developer_address, dev);
                _C_NestPool.increaseNestReward(_NN_address, NN);
                _mined_nest_at_height[block.number] = remain; 
            }
            _eth_fee_at_height[block.number] = _eth_fee_at_height[block.number].add(ethFee);
        } else { // 挖 nToken 矿
            if (_mined_ntoken_at_height[nestNToken][block.number] == 0) {
                uint256 ntokenAmount = mineNToken(nestNToken);  
                uint256 bidderCake = ntokenAmount.mul(c_bidder_reward_percentage).div(100);
                _C_NestPool.increaseNTokenReward(INToken(nestNToken).checkBidder(), nestNToken, bidderCake);
                _C_NestPool.increaseNTokenReward(msg.sender, nestNToken, ntokenAmount.sub(bidderCake));
                _mined_ntoken_at_height[nestNToken][block.number] = ntokenAmount.sub(bidderCake);
            }
            _eth_fee_ntoken_at_height[nestNToken][block.number] = _eth_fee_ntoken_at_height[nestNToken][block.number].add(ethFee);
    
        }
        // choose
        // if (block.number % 50 == 0) {  // 被选中
            // TransferHelper.safeTransferETH(_C_NestPool, _temp_eth_pool);
            // TransferHelper.safeTransferETH(_C_BonusPool, _temp_eth_fee);
            // _temp_eth_fee = 0;
            // _temp_eth_pool = 0;
        _C_NestPool.distributeRewards(_developer_address);
        _C_NestPool.distributeRewards(_NN_address);
        // }
        // 160 token-address + 96bit index
        uint256 index = PriceSheetData[](_prices_map[token]).length - 1;
        // uint256 priceIndex = (uint256(token) >> 96) << 96 + uint256(index);

        emit PostPrice(msg.sender, token, index, ethAmount, tokenAmount, isDeviated); 
        return index; 

    }

    function closePriceSheet(address token, uint256 index) public 
    {
        PriceSheetData storage price = _prices_map[token][index];
        require(price.atHeight + c_price_duration_block < block.number, "Price sheet isn't in effect");  // safe_math: untainted values
    
        uint256 ethAmount = uint256(price.ethAmount);
        uint256 tokenAmount = uint256(price.tokenAmount);
        uint256 fee = uint256(price.ethFee);
        emit LogUint("closePriceSheet> ethAmount", ethAmount);
        emit LogUint("closePriceSheet> tokenAmount", tokenAmount);
        emit LogUint("closePriceSheet> fee", fee);
        price.ethAmount = 0;
        price.tokenAmount = 0;

        _C_NestPool.unfreezeEthAndToken(address(msg.sender), ethAmount, token, tokenAmount);

        if (fee > 0) {
            uint256 h = price.atHeight;
            emit LogUint("closePriceSheet> atHeight", h);
            uint256 reward = fee.mul(_mined_nest_at_height[h]).div(_eth_fee_at_height[h]);
            emit LogUint("closePriceSheet> reward", reward);
            emit LogAddress("closePriceSheet> miner", price.miner);
            _C_NestPool.increaseNestReward(price.miner, reward);
            price.ethFee = 0;
        }
    }

    function biteTokens(uint256 ethAmount, uint256 tokenAmount, uint256 biteEthAmount, uint256 biteTokenAmount, address token, uint256 index)
        public payable returns (uint256)//noContract
    {
        // check parameters 
        uint256 ethFee = biteEthAmount.mul(c_bite_fee_thousandth).div(1000);
        require(msg.value >= ethAmount.add(biteEthAmount).add(ethFee), "Insufficient msg.value");
        require(biteEthAmount % c_mining_eth_unit == 0, "biteEthAmount should be k*10");
        require(biteEthAmount > 0, "biteEthAmount should >0");
        //TODO: checking (ethAmount, tokenAmount)

        address nToken = _C_NestPool.getNTokenFromToken(token);
        require (nToken != address(0x0), "No such token-ntoken");
        // check bitting conditions
        PriceSheetData memory price = _prices_map[token][index]; 
        require(block.number.sub(price.atHeight) < c_price_duration_block, "Price sheet is expired");
        require(price.dealEthAmount >= biteEthAmount, "Insufficient trading eth");
        require(price.dealTokenAmount >= biteTokenAmount, "Insufficient trading token");
        // check if the (bitEthAmount:biteTokenAmount) ?= (ethAmount:tokenAmount)
        require(biteTokenAmount == price.dealTokenAmount * biteEthAmount / price.dealEthAmount, "Wrong token amount");

        emit LogAddress("biteTokens> msg.sender", msg.sender);
        emit LogUint("biteTokens> ethAmount", ethAmount);
        emit LogUint("biteTokens> tokenAmount", tokenAmount);
        emit LogUint("biteTokens> biteEthAmount", biteEthAmount);
        emit LogUint("biteTokens> biteTokenAmount", biteTokenAmount);


        { // scope for pushing PriceSheet, avoids `stack too deep` errors
        // check if the old/new price is deviated  
        uint256 thisDeviated = 0;
        if (uint256(price.deviated) == 0x1) {
            require(ethAmount >= biteEthAmount.mul(c_bite_amount_factor), "EthAmount needs to be no less than 2 times of transaction scale");
        } else {
            thisDeviated = isPriceDeviated(ethAmount, tokenAmount,token, c_price_deviation_rate);
            if (thisDeviated == 0x1) {
                require(ethAmount >= biteEthAmount.mul(c_mining_price_deviateion_factor), "EthAmount needs to be no less than 10 times of transaction scale");
            } else {
                require(ethAmount >= biteEthAmount.mul(c_bite_amount_factor), "EthAmount needs to be no less than 2 times of transaction scale");
            }
        }
        emit LogUint("biteTokens> thisDeviated", thisDeviated);

        // update price sheet
        price.ethAmount = uint128(uint256(price.ethAmount).add(biteEthAmount));
        price.tokenAmount = uint128(uint256(price.tokenAmount).sub(biteTokenAmount));
        price.dealEthAmount = uint128(uint256(price.dealEthAmount).sub(biteEthAmount));
        price.dealTokenAmount = uint128(uint256(price.dealTokenAmount).sub(biteTokenAmount));
        _prices_map[token][index] = price;
    
        // create a new price sheet (ethAmount, tokenAmount, token, 0, thisDeviated);
        _prices_map[token].push(PriceSheetData(
            msg.sender, uint128(ethAmount), uint128(tokenAmount), uint128(ethAmount), uint128(tokenAmount), 
            // uint128(ethAmount), uint128(tokenAmount), 
            uint128(ethFee), uint64(block.number), uint8(thisDeviated), uint56(0x0)));
        }

        emit LogUint("biteTokens> ethFee", ethFee);
        emit LogUint("biteTokens> msg.value", msg.value);

        { // scope for NestPool calls, avoids `stack too deep` errors
            _C_NestPool.depositEthMiner(address(msg.sender), msg.value.sub(ethFee));

            TransferHelper.safeTransferETH(address(_C_NestPool), msg.value.sub(ethFee));
        
            // freeze ethers and tokens (note that nestpool only freezes the difference)
            if (tokenAmount > biteTokenAmount) {
                _C_NestPool.freezeEthAndToken(address(msg.sender), ethAmount.add(biteEthAmount), token, tokenAmount.sub(biteTokenAmount));
                //TODO: TransferHelper.
            } else { 
                // for the case rather rare
                _C_NestPool.freezeEthAndToken(address(msg.sender), ethAmount.add(biteEthAmount), token, 0);
                _C_NestPool.unfreezeEthAndToken(address(msg.sender), 0, token, biteTokenAmount.sub(tokenAmount));
            }
    
        }

        // generate an event 
        emit BiteToken(address(msg.sender), biteEthAmount, biteTokenAmount, address(token), index);

        // transfer eth to bonus pool 
        // TODO: here it can be optimized by a batched transfer, so that to amortize the tx-fee    
        _C_BonusPool.pumpinEth{value:ethFee}(nToken, ethFee);

        return (PriceSheetData[](_prices_map[token]).length - 1); 
    }

    function biteEths(uint256 ethAmount, uint256 tokenAmount, uint256 biteEthAmount, uint256 biteTokenAmount, address token, uint256 index)
        public payable returns (uint256) //noContract 
    {
        // check parameters 
        uint256 ethFee = biteEthAmount.mul(c_bite_fee_thousandth).div(1000);
        require(msg.value >= ethAmount.sub(biteEthAmount).add(ethFee), "Insufficient msg.value");
        require(biteEthAmount % c_mining_eth_unit == 0, "Transaction size does not meet asset span");
        require(biteEthAmount > 0, "biteEthAmount % c_mining_eth_unit = 0");
        //TODO: checking (ethAmount, tokenAmount)

        address nToken = _C_NestPool.getNTokenFromToken(token);
        require (nToken != address(0x0), "No such (token, ntoken)");
        // check bitting conditions
        PriceSheetData memory price = _prices_map[token][index]; 
        require(block.number.sub(price.atHeight) < c_price_duration_block, "Price sheet is expired");
        require(price.dealEthAmount >= biteEthAmount, "Insufficient trading eth");
        require(price.dealTokenAmount >= biteTokenAmount, "Insufficient trading token");
        // check if the (bitEthAmount:biteTokenAmount) ?= (ethAmount:tokenAmount)
        require(biteTokenAmount == price.dealTokenAmount * biteEthAmount / price.dealEthAmount, "Wrong token amount");
  
        { // scope for pushing PriceSheet, avoids `stack too deep` errors
        // check if the old/new price is deviated  
        uint256 thisDeviated = 0x0;
        if (uint256(price.deviated) == 0x1) {
            require(ethAmount >= biteEthAmount.mul(c_bite_amount_factor), "EthAmount needs to be no less than 2 times of transaction scale");
        } else {
            thisDeviated = isPriceDeviated(ethAmount, tokenAmount,token, c_price_deviation_rate);
            if (thisDeviated == 0x1) {
                require(ethAmount >= biteEthAmount.mul(c_mining_price_deviateion_factor), "EthAmount needs to be no less than 10 times of transaction scale");
            } else {
                require(ethAmount >= biteEthAmount.mul(c_bite_amount_factor), "EthAmount needs to be no less than 2 times of transaction scale");
            }
        }

        // update price sheet
        price.ethAmount = uint128(uint256(price.ethAmount).sub(biteEthAmount));
        price.tokenAmount = uint128(uint256(price.tokenAmount).add(biteTokenAmount));
        price.dealEthAmount = uint128(uint256(price.dealEthAmount).sub(biteEthAmount));
        price.dealTokenAmount = uint128(uint256(price.dealTokenAmount).sub(biteTokenAmount));
        _prices_map[token][index] = price;
    
        // create a new price sheet (ethAmount, tokenAmount, token, 0, thisDeviated);
        _prices_map[token].push(PriceSheetData(
            msg.sender, uint128(ethAmount), uint128(tokenAmount), uint128(ethAmount), uint128(tokenAmount), 
            // uint128(ethAmount), uint128(tokenAmount), 
            uint128(ethFee), uint64(block.number), uint8(thisDeviated), uint56(0x0)));
        }

        { // scope for pushing PriceSheet, avoids `stack too deep` errors
            _C_NestPool.depositEthMiner(address(msg.sender), msg.value.sub(ethFee));

            TransferHelper.safeTransferETH(address(_C_NestPool), msg.value.sub(ethFee));

            // freeze ethers and tokens (note that nestpool only freezes the difference)
            if (ethAmount > biteEthAmount) { // TODO: Here the condition can be removed since it holds always
                _C_NestPool.freezeEthAndToken(address(msg.sender), ethAmount.sub(biteEthAmount), token, tokenAmount.add(biteTokenAmount));
            }
        }

        // generate an event 
        emit BiteEth(address(msg.sender), biteEthAmount, biteTokenAmount, address(token), index);

        // transfer eth to bonus pool 
        // TODO: here it can be optimized by a batched transfer, so that to amortize the tx-fee    
        _C_BonusPool.pumpinEth{value:ethFee}(nToken, ethFee);

        return (PriceSheetData[](_prices_map[token]).length - 1); 
    }


    // Get the latest effective price for a token
    function lookupTokenPrice(address token) internal view returns(uint256 ethAmount, uint256 tokenAmount, address miner) 
    {
        PriceSheetData[] storage tp = _prices_map[token];
        uint256 len = tp.length;
        // emit LogUint("lookupTokenPrice> len", len);
        PriceSheetData memory p;
        if (len == 0) {
            return (0, 0, address(0x0));
        }

        uint256 first = 0;
        // p = tp[len-1];
        // ethAmount = p.dealEthAmount;
        // tokenAmount = p.dealTokenAmount;
        for (uint i = 1; i <= len; i++) {
            p = tp[len-i];
            if (first == 0 && p.atHeight < block.number) {
                first = p.atHeight;
                ethAmount = p.dealEthAmount;
                tokenAmount = p.dealTokenAmount;
                miner = p.miner;
            } else if (first == uint256(p.atHeight)) {
                ethAmount = ethAmount.add(p.dealEthAmount);
                tokenAmount = tokenAmount.add(p.dealTokenAmount);
            } else if (first > uint256(p.atHeight)) {
                break;
            }
        }
    }

    uint256 _x; 
    function queryPrice(address token) public {
        (uint256 ethAmount, uint256 tokenAmount, address miner) = lookupTokenPrice(token);
        emit LogUint("queryPrice> ethAmount", ethAmount);
        emit LogUint("queryPrice> tokenAmount", tokenAmount);
        emit LogAddress("queryPrice> miner", miner);
        _x = _x + 1;
    }
    
    function mineNest() private returns (uint256) {
        uint256 period = block.number.sub(c_mining_nest_genesis_block_height).div(c_mining_nest_yield_cutback_period);
        uint256 nestPerBlock;
        if (period > 9) {
            nestPerBlock = c_mining_nest_yield_off_period_amount;
        } else {
            nestPerBlock = _mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = nestPerBlock.mul(block.number.sub(_latest_mining_height));
        _latest_mining_height = block.number; 
        return yieldAmount;
    }

    function mineNToken(address ntoken) private view returns (uint256) {
        // TODO:
        return (100 ether);

        // Nest_NToken miningToken = Nest_NToken(ntoken);
        // (uint256 genesis, uint256 latest) = miningToken.checkBlockInfo();
        // uint256 period = block.number.sub(genesis).div(_ntoken_yield_cutback_period);  //gy: _blockAttenuation = 240万  衰减时间
        // uint256 ntokenPerBlock;
        // if (period > 9) {  
        //     ntokenPerBlock = _ntoken_yield_off_period_amount; //gy: afterMiningAmount   区块平稳期出矿量，默认为 0.4eth; 
        // } else {
        //     ntokenPerBlock = _ntoken_yield_per_block_amount[period]; // gy: 计算 单位区块的出矿量
        // }
        // yieldAmount = ntokenPerBlock.mul(block.number.sub(latest));
        // miningToken.increaseTotal(yieldAmount);  //minting
        // emit MiningNToken(block.number, yieldAmount, ntoken); 
        // return yieldAmount; 
    }

    function isPriceDeviated(uint256 ethAmount, uint256 tokenAmount, 
        address token, uint256 deviateRate) private view returns (uint256) 
    {
        (uint256 ethAmount0, uint256 tokenAmount0, address miner) = lookupTokenPrice(token);
        if (ethAmount0 == 0) {
            return 0x0;
        }
        uint256 maxTokenAmount = ethAmount.mul(tokenAmount0).mul(100 + deviateRate).div(ethAmount0.mul(100));
        if (tokenAmount <= maxTokenAmount) {
            uint256 minTokenAmount = ethAmount.mul(tokenAmount0).mul(100 - deviateRate).div(ethAmount0.mul(100));
            if (tokenAmount >= minTokenAmount) {
                return 0x0;
            }
        }
        return 0x1;
    }

    function withdrawEthAndToken(uint256 ethAmount, address token, uint256 tokenAmount) 
        public 
    {
        _C_NestPool.withdrawEthAndToken(address(msg.sender), ethAmount, token, tokenAmount); 
    }

    function claimAllNToken(address ntoken) public {
        if (ntoken == address(0x0) || ntoken == address(_C_NestToken)){
            _C_NestPool.distributeRewards(address(msg.sender)); 
        } else {
            uint256 amount = _C_NestPool.withdrawNToken(address(msg.sender), ntoken);
        }
    }

    function getPriceSheetLength(address token) view public 
        returns (uint)
    {
        return _prices_map[token].length;
    }

    function getPriceSheet(address token, uint256 index) view public 
        returns (address miner, uint128 ethAmount,uint128 tokenAmount, 
        uint128 dealEthAmount, uint128 dealTokenAmount, 
        uint128 ethFee, uint64  atHeight, uint8 deviated) 
    {
        uint256 len = _prices_map[token].length;
        require (index < len, "index out of bound");
        PriceSheetData memory price = _prices_map[token][index];
        return (price.miner, price.ethAmount, price.tokenAmount, price.dealEthAmount, price.dealTokenAmount, price.ethFee,
            price.atHeight, price.deviated);

    }
}
