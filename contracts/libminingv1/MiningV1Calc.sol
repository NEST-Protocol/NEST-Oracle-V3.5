// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "../lib/SafeMath.sol";
import "../lib/SafeERC20.sol";
import '../lib/TransferHelper.sol';
import "../lib/ABDKMath64x64.sol";

import "../iface/INestPool.sol";
import "../iface/INestStaking.sol";
import "../iface/INToken.sol";
import "../iface/INNRewardPool.sol";
import "../libminingv1/MiningV1Data.sol";


/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author 0x00  - <0x00@nestprotocol.org>
library MiningV1Calc {

    using SafeMath for uint256;

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
        view
        // pure 
        returns (int128, int128)
    {
        int128 _ut_sq_2 = ABDKMath64x64.div(_ut_sq, 
            ABDKMath64x64.fromUInt(_interval));

        int128 _new_sigma_sq = ABDKMath64x64.add(
            ABDKMath64x64.mul(ABDKMath64x64.divu(95, 100), _sigma_sq), 
            ABDKMath64x64.mul(ABDKMath64x64.divu(5,100), _ut_sq_2));

        // console.log("_calcEWMA, tokenA0=%s, ethA0=%s",tokenA0, ethA0 );
        // console.log("_calcEWMA, tokenA1=%s, ethA1=%s",tokenA1, ethA1 );
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
        pure
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
            MiningV1Data.PriceInfo memory p0,
            MiningV1Data.PriceSheet[] storage pL
        ) 
        private
        view 
        returns (MiningV1Data.PriceInfo memory p1)
    {   
        uint256 i = p0.index + 1;
        if (i >= pL.length) {
            return (MiningV1Data.PriceInfo(0,0,0,0,0,int128(0),int128(0), int128(0), 0));
        }

        uint256 h = uint256(pL[i].height);
        if (h + MiningV1Data.PRICE_DURATION_BLOCK >= block.number) {
            return (MiningV1Data.PriceInfo(0,0,0,0,0,int128(0),int128(0), int128(0), 0));
        }
        
        uint256 ethA1 = 0;
        uint256 tokenA1 = 0;
        while (i < pL.length && pL[i].height == h) { 
            // console.log("_moveAndCalc, i=%s, remainNum=%s", i, pL[i].remainNum);
            uint256 _remain = uint256(pL[i].remainNum);
            if (_remain == 0) {
                continue;
            }
            ethA1 = ethA1 + _remain;
            tokenA1 = tokenA1 + _remain.mul(pL[i].tokenAmountPerEth);
            i = i + 1;
        }
        i = i - 1;
        // console.log("_calcEWMA, interval=%s", i - p0.index);
        // console.log("_calcEWMA, p0.index=%s, p0.ethNum=%s, p0.tokenAmount", p0.index, p0.ethNum, p0.tokenAmount);

        if (ethA1 == 0 || tokenA1 == 0) {
            return (MiningV1Data.PriceInfo(
                    uint32(i),  // index
                    uint32(0),  // height
                    uint32(0),  // ethNum
                    uint32(0),  // _reserved
                    uint32(0),  // tokenAmount
                    int128(0),  // volatility_sigma_sq
                    int128(0),  // volatility_ut_sq
                    int128(0),  // avgTokenAmount
                    0           // _reserved2
            ));
        }

        (int128 new_sigma_sq, int128 new_ut_sq) = _calcEWMA(
            p0.ethNum, p0.tokenAmount, 
            ethA1, tokenA1, 
            p0.volatility_sigma_sq, p0.volatility_ut_sq, 
            i - p0.index);
        int128 _newAvg = _calcAvg(ethA1, tokenA1, p0.avgTokenAmount); 

        return(MiningV1Data.PriceInfo(
                uint32(i),          // index
                uint32(h),          // height
                uint32(ethA1),      // ethNum
                uint32(0),          // _reserved
                uint128(tokenA1),   // tokenAmount
                new_sigma_sq,       // volatility_sigma_sq
                new_ut_sq,          // volatility_ut_sq
                _newAvg,            // avgTokenAmount
                uint128(0)          // _reserved2
        ));
    }

    function _stat(MiningV1Data.State storage state, address token) external 
    {
        MiningV1Data.PriceInfo memory p0 = state.priceInfo[token];
        MiningV1Data.PriceSheet[] storage pL = state.priceSheetList[token];
        if (pL.length < 2) {
            return;
        }

        if (p0.height == 0) {
            MiningV1Data.PriceSheet memory _sheet = pL[0];
            p0.ethNum = _sheet.ethNum;
            p0.tokenAmount = uint128(uint256(_sheet.tokenAmountPerEth).mul(_sheet.ethNum));
            p0.height = _sheet.height;
            p0.volatility_sigma_sq = 0;
            p0.volatility_ut_sq = 0;
            p0.avgTokenAmount = ABDKMath64x64.fromUInt(_sheet.tokenAmountPerEth);
            state.priceInfo[token] = p0;
        }
        MiningV1Data.PriceInfo memory p1;

        while (uint256(p0.index) < pL.length && uint256(p0.height) + MiningV1Data.PRICE_DURATION_BLOCK < block.number){
            p1 = _moveAndCalc(p0, pL);
            if (p1.index <= p0.index) {    // bootstraping
                break;
            } else if (p1.ethNum == 0) {   // jump cross a block with bitten prices
                p0.index = p1.index;
                continue;
            } else {                       // calculate one more block
                p0 = p1;
            }
        }

        if (p0.index > state.priceInfo[token].index) {
            state.priceInfo[token] = p0;
        }
        return;
    }


    function _statOneBlock(MiningV1Data.State storage state, address token) public {
        MiningV1Data.PriceInfo memory p0 = state.priceInfo[token];
        MiningV1Data.PriceSheet[] storage pL = state.priceSheetList[token];
        if (pL.length < 2) {
            return;
        }
        (MiningV1Data.PriceInfo memory p1) = _moveAndCalc(p0, state.priceSheetList[token]);
        if (p1.index > p0.index && p1.ethNum != 0) {
            state.priceInfo[token] = p1;
        } else if (p1.index > p0.index && p1.ethNum == 0) {
            p0.index = p1.index;
            state.priceInfo[token] = p1;
        }
        return;
    }

}