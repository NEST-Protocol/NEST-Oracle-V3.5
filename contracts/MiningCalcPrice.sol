// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./MiningData.sol";


import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./lib/ABDKMath64x64.sol";
import "hardhat/console.sol";

library MiningCalcPrice {

    using SafeMath for uint256;

    event PriceComputed(
        uint32 h, 
        uint32 pos, 
        uint32 ethA, 
        uint128 tokenA, 
        int128 sigma_sq, 
        int128 ut_sq
    );

    function _calcEWMA(
        uint256 ethA0, 
        uint256 tokenA0, 
        uint256 ethA1, 
        uint256 tokenA1, 
        int128 _sigma_sq, 
        int128 _ut_sq,
        uint256 _interval
        ) 
        private 
        pure 
        returns (int128, int128)
    {
        int128 _ut_sq_2 = ABDKMath64x64.div(_ut_sq, 
            ABDKMath64x64.fromUInt(_interval));
            // ABDKMath64x64.fromUInt(_interval * MiningData.c_ethereum_block_interval));

        int128 _new_sigma_sq = ABDKMath64x64.add(
            ABDKMath64x64.mul(ABDKMath64x64.divu(95, 100), _sigma_sq), 
            ABDKMath64x64.mul(ABDKMath64x64.divu(5,100), _ut_sq_2));

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

    function _calcAvg(uint256 ethA, uint256 tokenA, int128 _avg) 
        private 
        // pure
        returns(int128)
    {
        int128 _newP = ABDKMath64x64.div(ABDKMath64x64.fromUInt(tokenA), 
                                        ABDKMath64x64.fromUInt(ethA));
        int128 _newAvg;

        if (_avg == 0) {
            _newAvg = _newP;
        } else {
            _newAvg = ABDKMath64x64.add(
                ABDKMath64x64.mul(ABDKMath64x64.divu(95, 100), _avg), 
                ABDKMath64x64.mul(ABDKMath64x64.divu(5,100), _newP));
        }
        return _newAvg;

    }

    function _moveAndCalc(
        MiningData.Price memory p0,
        MiningData.PriceSheet[] storage pL
        ) 
        private 
        // view 
        returns (MiningData.Price memory p1)
    {   
        uint256 i = p0.index + 1;
        if (i >= pL.length) {
            // if: the next priceSheet doesn't exist
            return (MiningData.Price(0,0,0,0,int128(0),int128(0), int128(0), 0));
        }

        uint256 h = uint256(pL[i].height);
        if (h + MiningData.c_price_duration_block >= block.number) {
            // if: the next priceSheet is not EFFECTIVE
            return (MiningData.Price(0,0,0,0,int128(0),int128(0), int128(0), 0));
        }
        
        // else: the next priceSheets with the same block height need to be calculated
        uint256 ethA1 = 0;
        uint256 tokenA1 = 0;
        while (i < pL.length && pL[i].height == h)
                            // QUES: redundant condition ?
                            // && pL[i].height + MiningData.c_price_duration_block < block.number) 
        {
            uint256 _remain = uint256(pL[i].remainChunk);
            if (_remain == 0) {
                continue;
            }
            ethA1 = ethA1 + _remain.mul(pL[i].chunkSize);
            tokenA1 = tokenA1 + _remain.mul(pL[i].chunkSize).mul(pL[i].tokenPrice);
            i = i + 1;
        } //loop: sheets[i].height = h
        i = i - 1;
        if (ethA1 == 0 || tokenA1 == 0) {
            return (MiningData.Price(
                    uint32(i),  // index
                    uint32(0),  // height
                    uint32(0),  // ethNum
                    uint128(0),  // tokenAmount
                    int128(0),  // volatility_sigma_sq
                    int128(0),  // volatility_ut_sq
                    int128(0),  // avgTokenAmount
                    0           // _reserved2
            ));
        }
        // (int128 new_sigma_sq, int128 new_ut_sq) = (1, 1);
        (int128 new_sigma_sq, int128 new_ut_sq) = _calcEWMA(
            p0.ethNum, p0.tokenAmount, 
            ethA1, tokenA1, 
            p0.volatility_sigma_sq, p0.volatility_ut_sq, 
            i - p0.index);
        // int128 _newAvg = 415; 
        int128 _newAvg = _calcAvg(ethA1, tokenA1, p0.avgTokenAmount); 
        return(MiningData.Price(uint32(i), uint32(h), uint32(ethA1), uint128(tokenA1), 
            new_sigma_sq, new_ut_sq, _newAvg, uint32(0)));
    }

    function _stat(MiningData.State storage state, address token) external 
    {
        MiningData.Price memory p0 = state._priceInEffect[token];
        MiningData.PriceSheet[] storage pL = state.priceSheetList[token];
        MiningData.Price memory p1;
        if (pL.length < 2) {
            emit PriceComputed(0,0,0,0,int128(0),int128(0));
            return;
        }
        while (uint256(p0.index) < pL.length && uint256(p0.height) + MiningData.c_price_duration_block < block.number){
            p1 = _moveAndCalc(p0, pL);
            if (p1.index <= p0.index) {   // bootstraping
                break;
            } else if (p1.ethNum == 0) {  // jump cross a block with bitten prices
                p0.index = p1.index; 
            } else {                      // calculate one more block
                p0 = p1;
            }    
        }

        if (p0.index > state._priceInEffect[token].index) {
            state._priceInEffect[token] = p0;
            // console.log("new index = %s", p0.index);
            emit PriceComputed(p0.height, p0.index, uint32(p0.ethNum), uint128(p0.tokenAmount), 
                p0.volatility_sigma_sq, p0.volatility_ut_sq);
        }
        return;
    }

    function _statOneBlock(MiningData.State storage state, address token) external 
    {
        MiningData.Price memory p0 = state._priceInEffect[token];
        MiningData.PriceSheet[] storage pL = state.priceSheetList[token];
        if (pL.length < 2) {
            emit PriceComputed(0,0,0,0,int128(0),int128(0));
            return;
        }
        (MiningData.Price memory p1) = _moveAndCalc(p0, state.priceSheetList[token]);
        if (p1.index > p0.index) {
            state._priceInEffect[token] = p1;
            emit PriceComputed(p1.height, p1.index, uint32(p1.ethNum), uint128(p1.tokenAmount), 
                p1.volatility_sigma_sq, p1.volatility_ut_sq);
        }
        return;
    }


    //TODO: REMOVE it!
    function volatility(MiningData.State storage state, address token) 
        external view returns (MiningData.Price memory p) 
    {
        // TODO: no contract allowed
        return state._priceInEffect[token];
    }
}
