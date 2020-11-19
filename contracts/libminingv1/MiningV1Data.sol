// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;


import "../iface/INestPool.sol";
import "../iface/INestStaking.sol";
import "../iface/INToken.sol";
import "../iface/INNRewardPool.sol";

import "../lib/SafeERC20.sol";


/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author 0x00  - <0x00@nestprotocol.org>
library MiningV1Data {

    /* ========== CONSTANTS ========== */

    uint256 constant PRICE_DURATION_BLOCK = 25;

    uint256 constant BITE_AMOUNT_INFLATE_FACTOR  = 2;


    // uint256 constant MINING_NEST_GENESIS_BLOCK_HEIGHT = 6236588;
    uint256 constant MINING_NEST_GENESIS_BLOCK_HEIGHT = 1; // for testing    

    uint256 constant MINING_NEST_YIELD_CUTBACK_PERIOD = 2400000; // ~ 1 years 
    uint256 constant MINING_NEST_YIELD_CUTBACK_RATE = 80;     // percentage = 80%

    // yield amount (per block) after the first ten years
    uint256 constant MINING_NEST_YIELD_OFF_PERIOD_AMOUNT = 40 ether;  
    // yield amount (per block) in the first year, it drops to 80% in the following nine years
    uint256 constant MINING_NEST_YIELD_PER_BLOCK_BASE = 400 ether;  

    uint256 constant MINING_NTOKEN_YIELD_CUTBACK_RATE = 80;
    uint256 constant MINING_NTOKEN_YIELD_OFF_PERIOD_AMOUNT = 0.4 ether;
    uint256 constant MINING_NTOKEN_YIELD_PER_BLOCK_BASE = 4 ether;



    // uint256[10] private _mining_ntoken_yield_per_block_amount;

    uint256 constant c_mining_eth_unit = 10;  // 10 ether
    // uint256 constant c_mining_price_deviateion_factor = 10; // removed
    uint256 constant c_mining_fee_thousandth = 10; 

    uint256 constant DEV_REWARD_PERCENTAGE = 5;
    uint256 constant NN_REWARD_PERCENTAGE = 15;
    uint256 constant MINER_NEST_REWARD_PERCENTAGE = 80;

    uint8 constant PRICESHEET_STATE_CLOSED = 0;
    uint8 constant PRICESHEET_STATE_POSTED = 1;
    uint8 constant PRICESHEET_STATE_BITTEN = 2;

    uint8 constant PRICESHEET_TYPE_USD     = 1;
    uint8 constant PRICESHEET_TYPE_NEST    = 2;
    uint8 constant PRICESHEET_TYPE_TOKEN   = 3;
    uint8 constant PRICESHEET_TYPE_NTOKEN  = 4;
    uint8 constant PRICESHEET_TYPE_BITTING = 8;

    uint8 constant MAX_BITE_NESTED_LEVEL  = 3;

    uint8 constant STATE_FLAG_UNINITIALIZED    = 0;
    uint8 constant STATE_FLAG_ACTIVE           = 1;
    uint8 constant STATE_FLAG_MINING_STOPPED   = 2;
    uint8 constant STATE_FLAG_CLOSING_STOPPED  = 3;
    uint8 constant STATE_FLAG_WITHDRAW_STOPPED = 4;
    uint8 constant STATE_FLAG_PRICE_STOPPED    = 5;
    uint8 constant STATE_FLAG_SHUTDOWN         = 127;


    /// @dev size: (2 x 256 byte)
    struct PriceSheet {    
        uint160 miner;       //  miner who posted the price (most significant bits, or left-most)
        uint32  height;
        uint32  ethNum;   
        uint32  remainNum;    

        uint8   level;           // the level of bitting, 1-4: eth-doubling | 5 - 127: nest-doubling
        uint8   typ;             // 1: USD | 2: NEST | 3: TOKEN | 4: NTOKEN(Not Available)
        uint8   state;           // 0: closed | 1: posted | 2: bitten
        uint8   _reserved; 
        uint32  ethNumBal;
        uint32  tokenNumBal;
        uint32  nestNum1k;
        uint128 tokenAmountPerEth;
    }
    
    /// @dev size: (3 x 256 bit)
    struct PriceInfo {
        uint32  index;
        uint32  height;
        uint32  ethNum;         //  the balance of eth
        uint32  _reserved;
        uint128 tokenAmount;    //  the balance of token 
        int128  volatility_sigma_sq;
        int128  volatility_ut_sq;
        int128  avgTokenAmount;
        uint128 _reserved2;     
    }


    /// @dev The struct is for public data in a price sheet, so as to protect prices from being read
    struct PriceSheetPub {
        uint160 miner;       //  miner who posted the price (most significant bits, or left-most)
        uint32  height;
        uint32  ethNum;   

        uint8   typ;             // 1: USD | 2: NEST | 3: TOKEN | 4: NTOKEN(Not Available)
        uint8   state;           // 0: closed | 1: posted | 2: bitten
        uint32  ethNumBal;
        uint32  tokenNumBal;
    }

    /* ========== EVENTS ========== */

    event PricePosted(address miner, address token, uint256 index, uint256 ethAmount, uint256 tokenAmount);
    event PriceClosed(address miner, address token, uint256 index);
    event Deposit(address miner, address token, uint256 amount);
    event Withdraw(address miner, address token, uint256 amount);
    event TokenBought(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);
    event TokenSold(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);

    event VolaComputed(uint32 h, uint32 pos, uint32 ethA, uint128 tokenA, int128 sigma_sq, int128 ut_sq);
    
    /* ========== STATE VARIABLES ========== */

    struct State {

        uint8  flag;                // =0: initialized
                                    // =1: active 
                                    // =2: stop mining, 
                                    // =3: stop sheet closing
                                    // =4: stop assets withdrawing
                                    // =5: stop price querying
                                    // =127: shutdown completely
        
        uint8    version;           // = 2
        uint8    miningEthUnit;     // = 10;
        uint32   nestStakedNum1k;   // = 1;
        uint8    biteFeeRate;       // = 1; 
        uint8    miningFeeRate;     // = 10;


        uint128  latestMiningHeight;
        uint128  minedNestAmount;   

        address governance;

        address  _developer_address;
        address  _NN_address;

        address     C_NestPool;
        address     C_NestToken;
        address     C_NestStaking;
        address     C_NNRewardPool;
        address     C_NestQuery;

        uint256[10] _mining_nest_yield_per_block_amount;
        uint256[10] _mining_ntoken_yield_per_block_amount;

        // A mapping (from token(address) to an array of PriceSheet)
        mapping(address => PriceSheet[]) priceSheetList;

        // from token(address) to Price
        mapping(address => PriceInfo) priceInfo;

        mapping(address => mapping(uint256 => uint256)) minedAtHeight;

    }

}