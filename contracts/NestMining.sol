// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./iface/IBonusPool.sol";
import "./iface/INToken.sol";
import "./lib/ABDKMath64x64.sol";

contract NestMining {
    
    using SafeMath for uint256;

    event Log(string msg);
    event LogUint(string msg, uint256 v);
    event LogAddress(string msg, address a);

    /* ========== VARIABLES ========== */

    address public governance;

    INestPool private _C_NestPool;
    ERC20 private _C_NestToken;
    IBonusPool private _C_BonusPool;
    // IPriceOracle private _C_PriceOracle;

    address private _developer_address;
    address private _NN_address;

    uint256 private _latest_mining_height;
    uint256[10] private _mining_nest_yield_per_block_amount;

    // a temp for storing eth_bonus(right-most 128bits) and eth_deposit (left-most 128bits)
    uint256 private _temp_eth_deposit_bonus;

    /* ========== CONSTANTS ========== */

    // uint256 constant c_mining_nest_genesis_block_height = 6236588;
    uint256 constant c_mining_nest_genesis_block_height = 1; // for testing

    uint256 constant c_mining_nest_yield_cutback_period = 2400000;
    uint256 constant c_mining_nest_yield_cutback_rate = 80;
    uint256 constant c_mining_nest_yield_off_period_amount = 40 ether;
    uint256 constant c_mining_nest_yield_per_block_base = 400 ether;

    uint256 constant c_mining_ntoken_yield_cutback_rate = 80;
    uint256 constant c_mining_ntoken_yield_off_period_amount = 0.4 ether;
    uint256 constant c_mining_ntoken_yield_per_block_base = 4 ether;
    uint256[10] private _mining_ntoken_yield_per_block_amount;

    // the minimum mining fee (ethers)
    // uint256 constant c_mining_eth_minimum = 10 ether; // removed
    uint256 constant c_mining_eth_unit = 10 ether;
    // uint256 constant c_mining_price_deviateion_factor = 10; // removed
    uint256 constant c_mining_fee_thousandth = 10; 
    uint256 constant c_mining_gasprice_tax_thousandth = 10; 


    uint256 constant c_team_reward_percentage = 5;
    uint256 constant c_NN_reward_percentage = 15;
    uint256 constant c_nest_reward_percentage = 80;

    uint256 constant c_ntoken_bidder_reward_percentage = 5;
    uint256 constant c_ntoken_miner_reward_percentage = 95;

    uint256 constant c_price_deviation_rate = 10;
    uint256 constant c_price_duration_block = 25;

    // uint256 constant c_bite_amount_price_deviateion_factor = 10; // removed
    uint256 constant c_bite_amount_factor = 2;
    uint256 constant c_bite_fee_thousandth = 1; 

    uint256 constant c_ethereum_block_interval = 14; // 14 seconds per block on average

    // size: (4 x 256 byte)
    struct PriceSheet {    
        uint160 miner;       //  miner who posted the price (most significant bits, or left-most)
        uint64 atHeight;
        uint32 ethFeeTwei;   

        uint128 ethAmount;   //  the balance of eth
        uint128 tokenAmount; //  the balance of token 
        // The balances of assets that can be bitten, they can only decrease
        // Note that (pEthAmount:pTokenAmount) is equal to the original (ethAmount:tokenAmount)
        uint128 dealEthAmount;  
        uint128 dealTokenAmount;
        // The balances of assets can increase or decrease if others take them on either side
        // They can be withdrawn if the owner closes the sheet
    }

    // We use mapping (from `token_address` to an array of `PriceSheet`) to remove the owner field 
    // from the PriceSheet so that to save 256b. The idea is from Fei.
    mapping(address => PriceSheet[]) _price_list;

    // size: (4 x 256 byte)
    struct PriceInfo {
        uint32  position;
        uint32  atHeight;
        uint32  ethAmount;   //  the balance of eth
        uint32  _padding;
        uint128 tokenAmount; //  the balance of token 
        int128  volatility_sigma_sq;
        int128  volatility_ut_sq;
    }

    mapping(address => PriceInfo) private _price_info;


    // The following two mappings collects all of the nest mined and eth fee 
    // paid at each height, such that the distribution can be calculated

    // _mined_nest_to_eth_at_height: block height => nest amount
    mapping(uint256 => uint256) public _mined_nest_to_eth_at_height;
    
    // // _eth_fee_at_height: block height => eth amount
    // mapping(uint256 => uint256) _eth_fee_at_height;
    
    // _mined_ntoken_to_eth_at_height: ntoken => block height => (ntoken amount, eth amount)
    mapping(address => mapping(uint256 => uint256)) _mined_ntoken_to_eth_at_height;

    /* ========== EVENTS ========== */

    event PricePosted(address miner, address token, uint256 index, uint256 ethAmount, uint256 tokenAmount);
    event PriceClosed(address miner, address token, uint256 index);
    event Deposit(address miner, address token, uint256 amount);
    event Withdraw(address miner, address token, uint256 amount);
    event TokenBought(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);
    event TokenSold(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);

    event VolaComputed(uint32 h, uint32 pos, uint32 ethA, uint128 tokenA, int128 sigma_sq, int128 ut_sq);
    // event NTokenMining(uint256 height, uint256 yieldAmount, address ntoken);
    // event NestMining(uint256 height, uint256 yieldAmount);

    /* ========== CONSTRUCTOR ========== */


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

        amount = c_mining_ntoken_yield_per_block_base;
        for (uint i =0; i < 10; i++) {
            _mining_ntoken_yield_per_block_amount[i] = amount;
            amount = amount.mul(c_mining_ntoken_yield_cutback_rate).div(100);
        }
        governance = msg.sender;
    }

    receive() external payable {
    }

    /* ========== MODIFIERS ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest::Mine> !governance");
        _;
    }

    modifier noContract() 
    {
        require(address(msg.sender) == address(tx.origin), "Nest::Mine> X contract");
        _;
    }


    /* ========== GOVERNANCE ========== */

    function setAddresses(address developer_address, address NN_address) public onlyGovernance {
        _developer_address = developer_address;
        _NN_address = NN_address;
    }

    function setContracts(address NestToken, address NestPool, address BonusPool) public onlyGovernance {
        _C_NestToken = ERC20(NestToken);
        _C_NestPool = INestPool(NestPool);
        _C_BonusPool = IBonusPool(BonusPool);
    }

    /* ========== HELPERS ========== */

    function _calcEWMA(
        uint256 ethA0, 
        uint256 tokenA0, 
        uint256 ethA1, 
        uint256 tokenA1, 
        int128 _sigma_sq, 
        int128 _ut_sq,
        uint256 _interval) private pure returns (int128, int128)
    {
        int128 _ut2 = ABDKMath64x64.div(_sigma_sq, 
            ABDKMath64x64.fromUInt(_interval * c_ethereum_block_interval));

        int128 _new_sigma_sq = ABDKMath64x64.add(
            ABDKMath64x64.mul(ABDKMath64x64.divu(95, 100), _sigma_sq), 
            ABDKMath64x64.mul(ABDKMath64x64.divu(5,100), _ut_sq));

        int128 _new_ut_sq;
        if (ethA0 == 0 || tokenA0 == 0) {
            _new_ut_sq = int128(0);
        } else {
            _new_ut_sq = ABDKMath64x64.pow(ABDKMath64x64.sub(ABDKMath64x64.divu(
                    tokenA1 * ethA0, 
                    tokenA0 * ethA1 
                ), ABDKMath64x64.fromUInt(1)), 2);
        }
        
        return (_new_sigma_sq, _new_ut_sq);
    }


    function _moveVolatility(
        PriceInfo memory p0,
        PriceSheet[] memory pL
    ) private returns (PriceInfo memory p1)
    {   
        uint256 i = p0.position + 1;
        if (i >= pL.length) {
            return (PriceInfo(0,0,0,0,0,int128(0),int128(0)));
        }

        uint256 h = uint256(pL[i].atHeight);
        if (h + c_price_duration_block >= block.number) {
            return (PriceInfo(0,0,0,0,0,int128(0),int128(0)));
        }
        
        uint256 ethA1 = 0;
        uint256 tokenA1 = 0;
        while (i < pL.length && pL[i].atHeight == h 
                            && pL[i].atHeight + c_price_duration_block < block.number) {
            ethA1 = ethA1 + uint256(pL[i].dealEthAmount).div(1e18);
            tokenA1 = tokenA1 + uint256(pL[i].dealTokenAmount);
            i = i + 1;
        }
        i = i - 1;
        (int128 new_sigma_sq, int128 new_ut_sq) = _calcEWMA(
            p0.ethAmount, p0.tokenAmount, 
            ethA1, tokenA1, 
            p0.volatility_sigma_sq, p0.volatility_ut_sq, 
            i - p0.position);
        return(PriceInfo(uint32(i), uint32(h), uint32(ethA1), uint32(0), uint128(tokenA1), 
            new_sigma_sq, new_ut_sq));
    }

    function calcMultiVolatilities(address token) public {
        PriceInfo memory p0 = _price_info[token];
        PriceSheet[] memory pL = _price_list[token];
        PriceInfo memory p1;
        if (pL.length < 2) {
            emit VolaComputed(0,0,0,0,int128(0),int128(0));
            return;
        }
        while (uint256(p0.position) < pL.length && uint256(p0.atHeight) + c_price_duration_block < block.number){
            p1 = _moveVolatility(p0, pL);
            if (p1.position <= p0.position) {
                break;
            }
            p0 = p1;
        }

        if (p0.position > _price_info[token].position) {
            _price_info[token] = p0;
            emit VolaComputed(p0.atHeight, p0.position, uint32(p0.ethAmount), uint128(p0.tokenAmount), 
                p0.volatility_sigma_sq, p0.volatility_ut_sq);
        }
        return;
    }

    function calcVolatility(address token) public {
        PriceInfo memory p0 = _price_info[token];
        PriceSheet[] memory pL = _price_list[token];
        if (pL.length < 2) {
            emit VolaComputed(0,0,0,0,int128(0),int128(0));
            return;
        }
        (PriceInfo memory p1) = _moveVolatility(p0, _price_list[token]);
        if (p1.position > p0.position) {
            _price_info[token] = p1;
            emit VolaComputed(p1.atHeight, p1.position, uint32(p1.ethAmount), uint128(p1.tokenAmount), 
                p1.volatility_sigma_sq, p1.volatility_ut_sq);
        } 
        return;
    }

    function volatility(address token) public view returns (PriceInfo memory p) {
        // TODO: no contract allowed
        return _price_info[token];
    }

    /* ========== POST/CLOSE Price Sheets ========== */


    function postPriceSheet(uint256 ethAmount, uint256 tokenAmount, address token) public payable noContract
    {
        // check parameters 
        uint gas = gasleft();
        require(ethAmount % c_mining_eth_unit == 0, "ethAmount should be aligned");
        require(ethAmount > c_mining_eth_unit, "ethAmount should > 0");
        require(tokenAmount > 0, "tokenAmount should > 0");
        require(tokenAmount % (ethAmount.div(c_mining_eth_unit)) == 0, "tokenAmount should be aligned"); // it's really weird
        require(token != address(0x0)); 
        
        emit LogUint("gas remain 10", gas-gasleft());
        gas = gasleft();

        PriceSheet[] storage priceList = _price_list[token];

        // calculate eth fee
        uint256 ethFee = ethAmount.mul(c_mining_fee_thousandth).div(1000);
        require(ethFee / 1e12 < 2**32 && ethFee / 1e12 > 0, "ethFee is too small/large"); 
        ethFee = (ethFee / 1e12) * 1e12;
        emit LogUint("gas remain 20", gas-gasleft()); gas = gasleft();

        emit LogUint("postPriceSheet> msg.value", msg.value);
        emit LogUint("postPriceSheet> ethFee", ethFee);
        emit LogUint("postPriceSheet> ethFee 32b", uint256(uint32(ethFee/1e12)));
        emit LogUint("postPriceSheet> this.balance", address(this).balance);

        { // settle ethers and tokens
            address nestNToken = address(_C_NestToken);
            INestPool C_NestPool = _C_NestPool;
            IBonusPool C_BonusPool = _C_BonusPool;
            uint256 deposit = msg.value.sub(ethFee);
            // save the changes into miner's virtual account
            C_NestPool.depositEthMiner(address(msg.sender), deposit);
            emit LogUint("gas remain 30", gas-gasleft()); gas = gasleft();        

            TransferHelper.safeTransferETH(address(C_NestPool), deposit);
            C_BonusPool.pumpinEth{value:ethFee}(nestNToken, ethFee);       

            // freeze eths and tokens in the nest pool
            C_NestPool.freezeEthAndToken(msg.sender, ethAmount, token, tokenAmount);
            emit LogUint("gas remain 60", gas-gasleft()); gas = gasleft();
        }

        // append a new price sheet
        priceList.push(PriceSheet(
            uint160(uint256(msg.sender) >> 96),  // miner 
            uint64(block.number),                // atHeight
            uint32(ethFee/1e12),                 // ethFee in Twei
            uint128(ethAmount), uint128(tokenAmount), 
            uint128(ethAmount), uint128(tokenAmount)));
        emit LogUint("gas remain 70", gas-gasleft()); gas = gasleft();

        { // mining
            uint256 nestEthAtHeight = _mined_nest_to_eth_at_height[block.number];
            uint256 nestAtHeight = uint256(nestEthAtHeight >> 128);
            uint256 ethAtHeight = uint256(nestEthAtHeight % (1 << 128));
            emit LogUint("gas remain 75", gas-gasleft());
            gas = gasleft();
            if (nestAtHeight == 0) {
                emit LogUint("gas remain 76", gas-gasleft());
                gas = gasleft();
                uint256 nestAmount = mineNest();  
                emit LogUint("gas remain 77", gas-gasleft());
                gas = gasleft();
                emit LogUint("postPriceSheet> minedNest", nestAmount);
                nestAtHeight = nestAmount.mul(c_nest_reward_percentage).div(100); 
            }
            ethAtHeight = ethAtHeight.add(ethFee);
            require(nestAtHeight < (1 << 128) && ethAtHeight < (1 << 128), "nestAtHeight/ethAtHeight error");
            _mined_nest_to_eth_at_height[block.number] = (nestAtHeight * (1<< 128) + ethAtHeight);
            emit LogUint("gas remain 80", gas-gasleft());
            gas = gasleft();
        }

        //　NOTE: leave nest token of dev in the nest pool such that any client can get prizes from the pool
        // _C_NestPool.distributeRewards(_NN_address);
        // }
        // TODO: 160 token-address + 96bit index?
        uint256 index = priceList.length - 1;
        // uint256 priceIndex = (uint256(token) >> 96) << 96 + uint256(index);

        emit PricePosted(msg.sender, token, index, ethAmount, tokenAmount); 
        emit LogUint("gas remain 90", gas-gasleft());
        gas = gasleft();
        return; 

    }

    function closePriceSheet(address token, uint256 index) public noContract 
    {
        PriceSheet storage price = _price_list[token][index];
        require(price.atHeight + c_price_duration_block < block.number, "Price sheet isn't in effect");  // safe_math: untainted values
        require(uint256(price.miner) == uint256(msg.sender) >> 96, "Miner mismatch");
        uint256 ethAmount = uint256(price.ethAmount);
        uint256 tokenAmount = uint256(price.tokenAmount);
        uint256 fee = uint256(price.ethFeeTwei) * 1e12;
        // emit LogUint("closePriceSheet> ethAmount", ethAmount);
        // emit LogUint("closePriceSheet> tokenAmount", tokenAmount);
        // emit LogUint("closePriceSheet> fee", fee);
        price.ethAmount = 0;
        price.tokenAmount = 0;

        _C_NestPool.unfreezeEthAndToken(address(msg.sender), ethAmount, token, tokenAmount);

        if (fee > 0) {
            uint256 h = price.atHeight;
            emit LogUint("closePriceSheet> atHeight", h);
            uint256 nestAtHeight = uint256(_mined_nest_to_eth_at_height[h] / (1 << 128));
            uint256 ethAtHeight = uint256(_mined_nest_to_eth_at_height[h] % (1 << 128));
            uint256 reward = fee.mul(nestAtHeight).div(ethAtHeight);
            emit LogUint("closePriceSheet> nestAtHeight", nestAtHeight);
            emit LogUint("closePriceSheet> ethAtHeight", ethAtHeight);
            emit LogUint("closePriceSheet> reward", reward);
            _C_NestPool.increaseNestReward(address(msg.sender), reward);
        }
        emit PriceClosed(address(msg.sender), token, index);
    }

    function closePriceSheetList(address token, uint64[] memory indices) public 
    {
        uint256 ethAmount;
        uint256 tokenAmount;
        uint256 reward;
        PriceSheet[] storage prices = _price_list[token];
        for (uint i=0; i<indices.length; i++) {
            PriceSheet storage p = prices[indices[i]];
            if (uint256(p.miner) != uint256(msg.sender) >> 96) {
                continue;
            }
            uint256 h = uint256(p.atHeight);
            if (h + c_price_duration_block < block.number) { // safe_math: untainted values
                ethAmount = ethAmount.add(uint256(p.ethAmount));
                tokenAmount = tokenAmount.add(uint256(p.tokenAmount));
                uint256 fee = uint256(p.ethFeeTwei) * 1e12;
                p.ethAmount = 0;
                p.tokenAmount = 0;
                uint256 nestAtHeight = uint256(_mined_nest_to_eth_at_height[h] >> 128);
                uint256 ethAtHeight = uint256(_mined_nest_to_eth_at_height[h] << 128 >> 128);
               
                reward = reward.add(fee.mul(nestAtHeight).div(ethAtHeight));
                emit PriceClosed(address(msg.sender), token, indices[i]);

            }
        }
        if (ethAmount > 0 || tokenAmount >0) {
            _C_NestPool.unfreezeEthAndToken(address(msg.sender), ethAmount, token, tokenAmount);
        }

        if (reward > 0) {
            _C_NestPool.increaseNestReward(address(msg.sender), reward);
        }
    }
/*
    function postNTokenPriceSheet(uint256 ethAmount, uint256 tokenAmount, address token) 
        public payable // noContract
    {
        uint gas = gasleft();

        // check parameters 
        require(ethAmount % c_mining_eth_unit == 0, "ethAmount should be aligned");
        require(ethAmount > c_mining_eth_unit, "ethAmount should > 0");
        require(tokenAmount > 0, "tokenAmount should > 0");
        require(tokenAmount % (ethAmount.div(c_mining_eth_unit)) == 0, "tokenAmount should be aligned"); // it's really weird
        require(token != address(0x0)); 
        gas = gasleft();
        // emit LogUint("gas remain 10", gas-gasleft()); 

        PriceSheet[] storage priceList = _price_list[token];

        // calculate eth fee
        uint256 ethFee = ethAmount.mul(c_mining_fee_thousandth).div(1000);
        require(ethFee / 1e12 < 2**32 && ethFee / 1e12 > 0, "ethFee is too small/large"); 
        ethFee = (ethFee / 1e12) * 1e12;
        // emit LogUint("gas remain 20", gas-gasleft()); gas = gasleft();

        // emit LogUint("postPriceSheet> msg.value", msg.value);
        // emit LogUint("postPriceSheet> ethFee", ethFee);
        // emit LogUint("postPriceSheet> ethFee 32b", uint256(uint32(ethFee/1e12)));
        // emit LogUint("postPriceSheet> this.balance", address(this).balance);

        INestPool C_NestPool = _C_NestPool;
        address ntoken = C_NestPool.getNTokenFromToken(token);
        require(ntoken != address(_C_NestToken), "Mining:PostN:4");
        
        { // settle ethers and tokens
            IBonusPool C_BonusPool = _C_BonusPool;
            uint256 deposit = msg.value.sub(ethFee);
            // save the changes into miner's virtual account
            C_NestPool.depositEthMiner(address(msg.sender), deposit);
            // emit LogUint("gas remain 30", gas-gasleft()); gas = gasleft();        

            TransferHelper.safeTransferETH(address(C_NestPool), deposit);
            C_BonusPool.pumpinEth{value:ethFee}(ntoken, ethFee);       

            // freeze eths and tokens in the nest pool
            C_NestPool.freezeEthAndToken(msg.sender, ethAmount, token, tokenAmount);
            emit LogUint("gas remain 60", gas-gasleft()); gas = gasleft();
        }

        // append a new price sheet
        priceList.push(PriceSheet(
            uint160(uint256(msg.sender) >> 96),  // miner 
            uint64(block.number),                // atHeight
            uint32(ethFee/1e12),                 // ethFee in Twei
            uint128(ethAmount), uint128(tokenAmount), 
            uint128(ethAmount), uint128(tokenAmount)));
        emit LogUint("gas remain 70", gas-gasleft()); gas = gasleft();

        { // mining
            uint256 ntokenEthAtHeight = _mined_ntoken_to_eth_at_height[ntoken][block.number];
            uint256 ntokenAtHeight = uint256(ntokenEthAtHeight >> 128);
            uint256 ethAtHeight = uint256(ntokenEthAtHeight % (1 << 128));
            // emit LogUint("gas remain 75", gas-gasleft());
            gas = gasleft();
            if (ntokenAtHeight == 0) {
                // emit LogUint("gas remain 76", gas-gasleft()); gas = gasleft();
                uint256 ntokenAmount = mineNToken(ntoken);  
                // emit LogUint("gas remain 77", gas-gasleft()); gas = gasleft();
                uint256 bidderCake = ntokenAmount.mul(c_ntoken_bidder_reward_percentage).div(100);
                emit LogUint("postNTokenPriceSheet> mineNToken", ntokenAmount);
                ntokenAtHeight = ntokenAmount.mul(c_ntoken_miner_reward_percentage).div(100);
                _C_NestPool.increaseNTokenReward(INToken(ntoken).checkBidder(), ntoken, bidderCake);
            }
            ethAtHeight = ethAtHeight.add(ethFee);
            require(ntokenAtHeight < (1 << 128) && ethAtHeight < (1 << 128), "ntokenAtHeight/ethAtHeight error");
            _mined_ntoken_to_eth_at_height[ntoken][block.number] = (ntokenAtHeight * (1<< 128) + ethAtHeight);
            emit LogUint("gas remain 80", gas-gasleft()); gas = gasleft();
        }

        //　NOTE: leave nest token of dev in the nest pool such that any client can get prizes from the pool
        // _C_NestPool.distributeRewards(_NN_address);
        // }
        // TODO: 160 token-address + 96bit index?
        uint256 index = priceList.length - 1;
        // uint256 priceIndex = (uint256(token) >> 96) << 96 + uint256(index);

        emit PricePosted(msg.sender, token, index, ethAmount, tokenAmount); 
        emit LogUint("gas remain 90", gas-gasleft());
        gas = gasleft();
        return; 

    }

    function closeNTokenPriceSheet(address token, uint256 index) public 
    {
        PriceSheet storage price = _price_list[token][index];
        require(price.atHeight + c_price_duration_block < block.number, "Price sheet isn't in effect");  // safe_math: untainted values
        require(uint256(price.miner) == uint256(msg.sender) >> 96, "Miner mismatch");
        uint256 ethAmount = uint256(price.ethAmount);
        uint256 tokenAmount = uint256(price.tokenAmount);
        uint256 fee = uint256(price.ethFeeTwei) * 1e12;
        // emit LogUint("closePriceSheet> ethAmount", ethAmount);
        // emit LogUint("closePriceSheet> tokenAmount", tokenAmount);
        // emit LogUint("closePriceSheet> fee", fee);
        price.ethAmount = 0;
        price.tokenAmount = 0;
            
        INestPool C_NestPool = _C_NestPool;

        C_NestPool.unfreezeEthAndToken(address(msg.sender), ethAmount, token, tokenAmount);

        if (fee > 0) {
            address ntoken = C_NestPool.getNTokenFromToken(token);
            require(ntoken != address(_C_NestToken), "Mining:CloseN:30");

            uint256 h = price.atHeight;
            emit LogUint("closePriceSheet> atHeight", h);
            uint256 ntokenAtHeight = uint256(_mined_ntoken_to_eth_at_height[ntoken][h] / (1 << 128));
            uint256 ethAtHeight = uint256(_mined_ntoken_to_eth_at_height[ntoken][h] % (1 << 128));
            uint256 reward = fee.mul(ntokenAtHeight).div(ethAtHeight);
            emit LogUint("closePriceSheet> nestAtHeight", ntokenAtHeight);
            emit LogUint("closePriceSheet> ethAtHeight", ethAtHeight);
            emit LogUint("closePriceSheet> reward", reward);
            C_NestPool.increaseNTokenReward(address(msg.sender), ntoken, reward);
        }
        emit PriceClosed(address(msg.sender), token, index);
    }
*/
    // buyTokenFromPriceSheet
    function biteTokens(uint256 ethAmount, uint256 tokenAmount, uint256 biteEthAmount, uint256 biteTokenAmount, address token, uint256 index)
        public payable//noContract
    {
        // check parameters 
        require(ethAmount > c_mining_eth_unit, "ethAmount should > 0");
        require(ethAmount % c_mining_eth_unit == 0, "ethAmount should be aligned");
        require(tokenAmount > 0, "tokenAmount should > 0");
        require(tokenAmount % (ethAmount.div(c_mining_eth_unit)) == 0, "tokenAmount should be aligned"); 
        require(token != address(0x0)); 
        require(biteEthAmount > 0, "biteEthAmount should >0");
        require(tokenAmount >= biteTokenAmount.mul(c_bite_amount_factor), "tokenAmount should be 2x");

        uint256 ethFee = biteEthAmount.mul(c_bite_fee_thousandth).div(1000);
        require(ethFee / 1e12 < 2**32 && ethFee / 1e12 > 0, "ethFee is too small/large"); 
        ethFee = (ethFee / 1e12) * 1e12;

        address nToken = _C_NestPool.getNTokenFromToken(token);
        require (nToken != address(0x0), "No such token-ntoken");

        { // scope for pushing PriceSheet, avoids `stack too deep` errors
            // check bitting conditions
            PriceSheet memory price = _price_list[token][index]; 
            require(block.number.sub(price.atHeight) < c_price_duration_block, "Price sheet is expired");
            require(price.dealEthAmount >= biteEthAmount, "Insufficient trading eth");
            require(price.dealTokenAmount >= biteTokenAmount, "Insufficient trading token");
            // check if the (bitEthAmount:biteTokenAmount) ?= (ethAmount:tokenAmount)
            require(biteTokenAmount == price.dealTokenAmount * biteEthAmount / price.dealEthAmount, "Wrong token amount");

 
            // update price sheet
            price.ethAmount = uint128(uint256(price.ethAmount).add(biteEthAmount));
            price.tokenAmount = uint128(uint256(price.tokenAmount).sub(biteTokenAmount));
            price.dealEthAmount = uint128(uint256(price.dealEthAmount).sub(biteEthAmount));
            price.dealTokenAmount = uint128(uint256(price.dealTokenAmount).sub(biteTokenAmount));
            _price_list[token][index] = price;
    
            // create a new price sheet (ethAmount, tokenAmount, token, 0, thisDeviated);
            _price_list[token].push(PriceSheet(
                uint160(uint256(msg.sender) >> 96),  // miner 
                uint64(block.number),                // atHeight
                uint32(ethFee/1e12),                 // ethFee in Twei
                uint128(ethAmount), uint128(tokenAmount), 
                uint128(ethAmount), uint128(tokenAmount)));

            emit PricePosted(msg.sender, address(token), _price_list[token].length - 1, ethAmount, tokenAmount); 
        
        }

        // emit LogUint("biteTokens> ethFee", ethFee);
        // emit LogUint("biteTokens> msg.value", msg.value);

        { // scope for NestPool calls, avoids `stack too deep` errors
            // save the changes into miner's virtual account
            if (msg.value > ethFee) {
                _C_NestPool.depositEthMiner(address(msg.sender), msg.value.sub(ethFee));
            }
            TransferHelper.safeTransferETH(address(_C_NestPool), msg.value.sub(ethFee));
        
            // freeze ethers and tokens (note that nestpool only freezes the difference)
            _C_NestPool.freezeEthAndToken(address(msg.sender), ethAmount.add(biteEthAmount), token, tokenAmount.sub(biteTokenAmount));
        }

        // generate an event 
        emit TokenBought(address(msg.sender), address(token), index, biteEthAmount, biteTokenAmount);

        // transfer eth to bonus pool 
        // TODO: here it can be optimized by a batched transfer, so as to amortize the tx-fee    
        _C_BonusPool.pumpinEth{value:ethFee}(nToken, ethFee);

        return; 
    }

    function biteEths(uint256 ethAmount, uint256 tokenAmount, uint256 biteEthAmount, uint256 biteTokenAmount, address token, uint256 index)
        public payable //noContract 
    {
        // check parameters 
        require(ethAmount > c_mining_eth_unit, "ethAmount should > 0");
        require(ethAmount % c_mining_eth_unit == 0, "ethAmount should be aligned");
        require(tokenAmount > 0, "tokenAmount should > 0");
        require(tokenAmount % (ethAmount.div(c_mining_eth_unit)) == 0, "tokenAmount should be aligned"); 
        require(token != address(0x0)); 
        require(biteTokenAmount > 0, "biteEthAmount should >0");
        require(ethAmount >= biteEthAmount.mul(c_bite_amount_factor), "EthAmount should be 2x");

        uint256 ethFee = biteEthAmount.mul(c_bite_fee_thousandth).div(1000);
        require(ethFee / 1e12 < 2**32 && ethFee / 1e12 > 0, "ethFee is too small/large"); 
        ethFee = (ethFee / 1e12) * 1e12;

        // require(msg.value >= ethAmount.sub(biteEthAmount).add(ethFee), "Insufficient msg.value");

        address nToken = _C_NestPool.getNTokenFromToken(token);
        require (nToken != address(0x0), "No such (token, ntoken)");

        { // scope for pushing PriceSheet, avoids `stack too deep` errors
            // check bitting conditions
            PriceSheet memory price = _price_list[token][index]; 
            require(block.number.sub(uint256(price.atHeight)) < c_price_duration_block, "Price sheet is expired");
            require(price.dealEthAmount >= biteEthAmount, "Insufficient trading eth");
            require(price.dealTokenAmount >= biteTokenAmount, "Insufficient trading token");
            // check if the (bitEthAmount:biteTokenAmount) ?= (ethAmount:tokenAmount)
            require(biteTokenAmount == price.dealTokenAmount * biteEthAmount / price.dealEthAmount, "Wrong token amount");
  

            // update price
            price.ethAmount = uint128(uint256(price.ethAmount).sub(biteEthAmount));
            price.tokenAmount = uint128(uint256(price.tokenAmount).add(biteTokenAmount));
            price.dealEthAmount = uint128(uint256(price.dealEthAmount).sub(biteEthAmount));
            price.dealTokenAmount = uint128(uint256(price.dealTokenAmount).sub(biteTokenAmount));
            _price_list[token][index] = price;
    
            // create a new price sheet (ethAmount, tokenAmount, token, 0, thisDeviated);
            _price_list[token].push(PriceSheet(
                uint160(uint256(msg.sender) >> 96),  // miner 
                uint64(block.number),                // atHeight
                uint32(ethFee/1e12),                 // ethFee in Twei
                uint128(ethAmount), uint128(tokenAmount), 
                uint128(ethAmount), uint128(tokenAmount)));
            
            emit PricePosted(msg.sender, address(token), _price_list[token].length - 1, ethAmount, tokenAmount); 

        }

        { // scope for pushing PriceSheet, avoids `stack too deep` errors

            // save the changes into miner's virtual account
            if (msg.value > ethFee) {
                _C_NestPool.depositEthMiner(address(msg.sender), msg.value.sub(ethFee));
            }

            TransferHelper.safeTransferETH(address(_C_NestPool), msg.value.sub(ethFee));

            // freeze ethers and tokens (note that nestpool only freezes the difference)
            _C_NestPool.freezeEthAndToken(address(msg.sender), ethAmount.sub(biteEthAmount), token, tokenAmount.add(biteTokenAmount));
    
        }

        // generate an event 
        emit TokenSold(address(msg.sender), address(token), index, biteEthAmount, biteTokenAmount);

        // transfer eth to bonus pool 
        // TODO: here it can be optimized by a batched transfer, so that to amortize the tx-fee    
        _C_BonusPool.pumpinEth{value:ethFee}(nToken, ethFee);

        return; 
    }

    /* ========== PRICE QUERIES ========== */

    // Get the latest effective price for a token
    function latestPriceOfToken(address token) public view returns(uint256 ethAmount, uint256 tokenAmount, uint256 bn) 
    {
        PriceSheet[] storage tp = _price_list[token];
        uint256 len = tp.length;
        PriceSheet memory p;
        if (len == 0) {
            return (0, 0, 0);
        }

        uint256 first = 0;
        for (uint i = 1; i <= len; i++) {
            p = tp[len-i];
            if (first == 0 && p.atHeight + c_price_duration_block < block.number) {
                first = uint256(p.atHeight);
                ethAmount = uint256(p.dealEthAmount);
                tokenAmount = uint256(p.dealTokenAmount);
                bn = first;
            } else if (first == uint256(p.atHeight)) {
                ethAmount = ethAmount.add(p.dealEthAmount);
                tokenAmount = tokenAmount.add(p.dealTokenAmount);
            } else if (first > uint256(p.atHeight)) {
                break;
            }
        }
    }

    function priceOfToken(address token) public view returns(uint256 ethAmount, uint256 tokenAmount, uint256 bn) 
    {
        // TODO: no contract allowed
        require(_C_NestPool.getNTokenFromToken(token) != address(0), "Nest::Mine: !token");
        PriceInfo memory pi = _price_info[token];
        return (pi.ethAmount, pi.tokenAmount, pi.atHeight);
    }

    function priceAndSigmaOfToken(address token) public view returns (
        uint256, uint256, uint256, int128) 
    {
        // TODO: no contract allowed
        require(_C_NestPool.getNTokenFromToken(token) != address(0), "Nest::Mine: !token");
        PriceInfo memory pi = _price_info[token];
        // int128 v = 0;
        int128 v = ABDKMath64x64.sqrt(ABDKMath64x64.abs(pi.volatility_sigma_sq));
        return (uint256(pi.ethAmount), uint256(pi.tokenAmount), uint256(pi.atHeight), v);
    }

    function priceOfTokenAtHeight(address token, uint64 atHeight) public view returns(uint256 ethAmount, uint256 tokenAmount, uint64 bn) 
    {
        // TODO: no contract allowed

        PriceSheet[] storage tp = _price_list[token];
        uint256 len = _price_list[token].length;
        PriceSheet memory p;
        
        if (len == 0) {
            return (0, 0, 0);
        }

        uint256 first = 0;
        uint256 prev = 0;
        for (uint i = 1; i <= len; i++) {
            p = tp[len-i];
            first = uint256(p.atHeight);
            if (prev == 0) {
                if (first <= uint256(atHeight) && first + c_price_duration_block < block.number) {
                    ethAmount = uint256(p.dealEthAmount);
                    tokenAmount = uint256(p.dealTokenAmount);
                    bn = uint64(first);
                    prev = first;
                }
            } else if (first == prev) {
                ethAmount = ethAmount.add(p.dealEthAmount);
                tokenAmount = tokenAmount.add(p.dealTokenAmount);
            } else if (prev > first) {
                break;
            }
        }
    }

    function priceListOfToken(address token, uint8 num) public view returns(uint128[] memory data, uint256 atHeight) 
    {
        PriceSheet[] storage tp = _price_list[token];
        uint256 len = tp.length;
        uint256 index = 0;
        data = new uint128[](num * 3);
        PriceSheet memory p;

        // loop
        uint256 curr = 0;
        uint256 prev = 0;
        for (uint i = 1; i <= len; i++) {
            p = tp[len-i];
            curr = uint256(p.atHeight);
            if (prev == 0) {
                if (curr + c_price_duration_block < block.number) {
                    data[index] = uint128(curr);
                    data[index+1] = p.dealEthAmount;
                    data[index+2] = p.dealTokenAmount;
                    atHeight = curr;
                    prev = curr;
                }
            } else if (prev == curr) {
                // TODO: here we should use safeMath  x.add128(y)
                data[index+1] = data[index+1] + (p.dealEthAmount);
                data[index+2] = data[index+2] + (p.dealTokenAmount);
            } else if (prev > curr) {
                index = index + 3;
                if (index >= uint256(num * 3)) {
                    break;
                }
                data[index] = uint128(curr);
                data[index+1] = p.dealEthAmount;
                data[index+2] = p.dealTokenAmount;
                prev = curr;
            }
        } 
        require (data.length == uint256(num * 3), "Incorrect price list length");
    }

    /* ========== MINING ========== */
    
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
        // emit NestMining(block.number, yieldAmount);
        return yieldAmount;
    }

    function yieldAmountAtHeight(uint64 height) public view returns (uint128) {
        uint256 period = uint256(height).sub(c_mining_nest_genesis_block_height).div(c_mining_nest_yield_cutback_period);
        uint256 nestPerBlock;
        if (period > 9) {
            nestPerBlock = c_mining_nest_yield_off_period_amount;
        } else {
            nestPerBlock = _mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = nestPerBlock.mul(uint256(height).sub(_latest_mining_height));
        return uint128(yieldAmount);
    }

    function latestMinedHeight() external view returns (uint64) {
       return uint64(_latest_mining_height);
    }

    function mineNToken(address ntoken) private returns (uint256) {
        (uint256 genesis, uint256 last) = INToken(ntoken).checkBlockInfo();

        uint256 period = block.number.sub(genesis).div(c_mining_nest_yield_cutback_period);
        uint256 ntokenPerBlock;
        if (period > 9) {
            ntokenPerBlock = c_mining_ntoken_yield_off_period_amount;
        } else {
            ntokenPerBlock = _mining_ntoken_yield_per_block_amount[period];
        }
        uint256 yieldAmount = ntokenPerBlock.mul(block.number.sub(last));
        INToken(ntoken).increaseTotal(yieldAmount);
        // emit NTokenMining(block.number, yieldAmount, ntoken);
        return yieldAmount;
    }

    /* ========== MINING ========== */


    function withdrawEthAndToken(uint256 ethAmount, address token, uint256 tokenAmount) public noContract
    {
        _C_NestPool.withdrawEthAndToken(address(msg.sender), ethAmount, token, tokenAmount); 
    }

    function claimAllNToken(address ntoken) public noContract {
        if (ntoken == address(0x0) || ntoken == address(_C_NestToken)){
            _C_NestPool.distributeRewards(address(msg.sender)); 
        } else {
            uint256 amount = _C_NestPool.withdrawNToken(address(msg.sender), ntoken);
        }
    }

    /* ========== MINING ========== */

    function lengthOfPriceSheets(address token) view public 
        returns (uint)
    {
        return _price_list[token].length;
    }

    function contentOfPriceSheet(address token, uint256 index) view public 
        returns (uint160 miner, uint64 atHeight, uint128 ethAmount,uint128 tokenAmount, 
        uint128 dealEthAmount, uint128 dealTokenAmount, 
        uint128 ethFee) 
    {
        uint256 len = _price_list[token].length;
        require (index < len, "index out of bound");
        PriceSheet memory price = _price_list[token][index];
        uint256 ethFee2 = uint256(price.ethFeeTwei) * 1e12;
        return (price.miner, price.atHeight, 
            price.ethAmount, price.tokenAmount, price.dealEthAmount, price.dealTokenAmount, 
            uint128(ethFee2));

    }

    function atHeightOfPriceSheet(address token, uint256 index) view public returns (uint64)
    {
        PriceSheet storage p = _price_list[token][index];
        return p.atHeight;
    }

    /* ========== ENCODING/DECODING ========== */

    function decodeU256Two(uint256 enc) public pure returns (uint128, uint128) {
        return (uint128(enc / (1 << 128)), uint128(enc % (1 << 128)));
    }

    // only for debugging 
    // NOTE: REMOVE it before deployment
    // function debug_SetAtHeightOfPriceSheet(address token, uint256 index, uint64 height) public 
    // {
    //     PriceSheet storage p = _price_list[token][index];
    //     p.atHeight = height;
    //     return;
    // }

    function decode(bytes32 x) internal pure returns (uint64 a, uint64 b, uint64 c, uint64 d) {
        assembly {
            d := x
            mstore(0x18, x)
            a := mload(0)
            mstore(0x10, x)
            b := mload(0)
            mstore(0x8, x)
            c := mload(0)
        }
    }


}
