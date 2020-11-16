// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;


/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author 0x00  - <0x00@nestprotocol.org>
library MiningData {

    /* ========== CONSTANTS ========== */

    // uint256 constant c_mining_nest_genesis_block_height = 6236588;
    uint256 constant c_mining_nest_genesis_block_height = 1; // for testing

    uint256 constant c_mining_nest_yield_cutback_period = 2400000;
    uint256 constant c_mining_nest_yield_cutback_rate = 80;
    uint256 constant c_mining_nest_yield_off_period_amount = 40 ether;
    uint256 constant c_mining_nest_yield_per_block_base = 400 ether;

    // uint256 constant c_mining_ntoken_yield_cutback_rate = 80;
    // uint256 constant c_mining_ntoken_yield_off_period_amount = 0.4 ether;
    // uint256 constant c_mining_ntoken_yield_per_block_base = 4 ether;
    // uint256[10] private _mining_ntoken_yield_per_block_amount;

    uint256 constant c_mining_eth_unit = 10;  // 10 ether
    // uint256 constant c_mining_price_deviateion_factor = 10; // removed
    uint256 constant c_mining_fee_thousandth = 10; 

    uint256 constant c_dev_reward_percentage = 5;
    uint256 constant c_NN_reward_percentage = 15;
    uint256 constant c_nest_reward_percentage = 80;

    // uint256 constant c_ntoken_bidder_reward_percentage = 5;
    // uint256 constant c_ntoken_miner_reward_percentage = 95;

    uint256 constant c_price_eth_unit = 1;
    uint256 constant c_price_deviation_rate = 10;
    uint256 constant c_price_duration_block = 25;

    uint256 constant c_sheet_duration_block = 4 * 60 * 6; // = 1440 (6 hours) if avg. rate of eth-block mining ~ 14 seconds

    // uint256 constant c_bite_amount_price_deviateion_factor = 10; // removed
    uint256 constant c_take_amount_factor = 2;
    uint256 constant c_take_fee_thousandth = 1; 

    uint256 constant c_ethereum_block_interval = 14; // 14 seconds per block on average

    /// @dev size: 2 x 256bit, 11 fields
    struct PriceSheet {    
        uint160 miner;          //  miner who posted the price (most significant bits, or left-most)
        uint32  height;         // the height of block where the sheet was posted
        uint8  chunkNum;        // the amount of chunks deposited

        // TODO: chunkSize ==> ethPerChunk
        uint8  chunkSize;       // ethers per chunk
        uint8  remainChunk;     // the remain chunks of deposits, which decrease if some chunks are biten
        uint8  ethChunk;        // the number of eth chunks
        uint8  tokenChunk;     // the number of token1 chunk, each of which has `tokenPrice` tokens
        // uint8  token2Chunk;     // the number of token2 chunk 
        uint8  state;           // =0: closed | =1: cleared | =2: posted | =3: bitten | =4: refuted
        uint8  level;           // the level of bitting, 1-4: eth-doubling | 5 - 127: nest-doubling
        
        // TODO: ==> nestPerChunk10k
        uint8  _reserved;       // for padding 

        // TODO: tokenPrice ==> tokenPerChunk
        uint128 tokenPrice;     // the amount of (token1 : 1 ether)
        uint8   typ;            // =1: USD sheet | =2: NEST sheet |=3: token sheet |=4: ntoken sheet
        uint120 _reserved2;     // the amount of (token2 : 1 ether)
    }

        /// @dev size: (3 x 256 bit)
    struct Price {
        uint32  index;
        uint32  height;
        uint32  ethNum;   //  the balance of eth
        uint128 tokenAmount; //  the balance of token 
        int128  volatility_sigma_sq;
        int128  volatility_ut_sq;
        int128  avgTokenAmount;
        uint96  _reserved;
    }

    struct Taker {
        uint160 takerAddress;
        uint8 ethChunk;
        uint8 tokenChunk;
        uint80 _reserved;
    }

    /* ========== STATE VARIABLES ========== */

    struct State {

        uint256 id;

        address governance;

        uint256[10] _mining_nest_yield_per_block_amount;
        uint256[10] _mining_ntoken_yield_per_block_amount;

        uint32 ethNumPerChunk;      // 10 ether
        uint32 nestPerChunk;        // 10_000 NEST
        uint32 latestMiningHeight;  // last block whose NEST had been mined
        // NOTE: for NTokens, the `latestMiningHeight` values are written to NToken 
        //  contracts. See NToken.checkBlockInfo() for more info.
        uint8  flag;                // =0: initialized
                                    // =1: active | =2: stop mining, 
                                    // but clear/close/refute are allowed
                                    // =3: only withdrawals are allowed
                                    // =4: shutdown
        uint128 minedNestAmount;   

        // A mapping (from token(address) to an array of PriceSheet)
        mapping(address => PriceSheet[]) priceSheetList;

        // from token(address) to Price
        mapping(address => Price) _priceInEffect;

        // from token(address), index to array of Taker
        mapping(address => mapping(uint256 => Taker[])) _takers;

        // _nest_at_height: block height => (nest amount, ethers amount)
        mapping(uint256 => uint256)                     _nest_at_height;
        // _ntoken_at_height: ntoken => block height => (ntoken amount, eth amount)
        mapping(address => mapping(uint256 => uint256)) _ntoken_at_height;

        address     _C_NestPool;
        address     _C_NestToken;
        address     _C_NestStaking;
        address     _C_NNRewardPool;
        address     _C_NestQuery;
    }

}