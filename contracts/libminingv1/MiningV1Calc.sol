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
import "hardhat/console.sol";


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
            uint256 _remain = uint256(pL[i].remainNum);
            if (_remain == 0) {
                i = i + 1;
                continue;
            }
            ethA1 = ethA1 + _remain;
            tokenA1 = tokenA1 + _remain.mul(pL[i].tokenAmountPerEth);
            i = i + 1;
        }
        i = i - 1;

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

    function _stat(MiningV1Data.State storage state, address token)
        external 
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


    function _statOneBlock(MiningV1Data.State storage state, address token) 
        public 
    {
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

    /// @notice Return a consecutive price list for a token 
    /// @dev 
    /// @param token The address of token contract
    /// @param num   The length of price list
    function _priceListOfToken(
            MiningV1Data.State storage state, 
            address token, 
            uint8 num
        )
        public 
        view
        returns (uint128[] memory data, uint256 atHeight) 
    {
        MiningV1Data.PriceSheet[] storage _list = state.priceSheetList[token];
        uint256 len = _list.length;
        uint256 _index = 0;
        data = new uint128[](num * 3);
        MiningV1Data.PriceSheet memory _sheet;
        uint256 _ethNum;

        // loop
        uint256 _curr = 0;
        uint256 _prev = 0;
        for (uint i = 1; i <= len; i++) {
            _sheet = _list[len - i];
            _curr = uint256(_sheet.height);
            if (_prev == 0) {
                if (_curr + MiningV1Data.PRICE_DURATION_BLOCK < block.number) {
                    data[_index] = uint128(_curr);
                    _ethNum = uint256(_sheet.remainNum);
                    data[_index + 1] = uint128(_ethNum.mul(1 ether));
                    data[_index + 2] = uint128(_ethNum.mul(_sheet.tokenAmountPerEth));
                    atHeight = _curr;
                    _prev = _curr;
                }
            } else if (_prev == _curr) {
                _ethNum = uint256(_sheet.remainNum);
                data[_index + 1] += uint128(_ethNum.mul(1 ether));
                data[_index + 2] += uint128(_ethNum.mul(_sheet.tokenAmountPerEth));
            } else if (_prev > _curr) {
                _index += 3;
                if (_index >= uint256(num * 3)) {
                    break;
                }
                data[_index] = uint128(_curr);
                _ethNum = uint256(_sheet.remainNum);
                data[_index + 1] = uint128(_ethNum.mul(1 ether));
                data[_index + 2] = uint128(_ethNum.mul(_sheet.tokenAmountPerEth));
                _prev = _curr;
            }
        } 
        require (data.length == uint256(num * 3), "Incorrect price list length");
    }


    function _priceOfTokenAtHeight(
            MiningV1Data.State storage state, 
            address token, 
            uint64 atHeight
        )
        external 
        view 
        returns(uint256 ethAmount, uint256 tokenAmount, uint256 blockNum) 
    {

        MiningV1Data.PriceSheet[] storage _list = state.priceSheetList[token];
        uint256 len = state.priceSheetList[token].length;
        MiningV1Data.PriceSheet memory _sheet;
        uint256 _ethNum;

        if (len == 0) {
            return (0, 0, 0);
        }

        uint256 _first = 0;
        uint256 _prev = 0;
        for (uint i = 1; i <= len; i++) {
            _sheet = _list[len - i];
            _first = uint256(_sheet.height);
            if (_prev == 0) {
                if (_first <= uint256(atHeight) && _first + MiningV1Data.PRICE_DURATION_BLOCK < block.number) {
                    _ethNum = uint256(_sheet.remainNum);
                    ethAmount = _ethNum.mul(1 ether);
                    tokenAmount = _ethNum.mul(_sheet.tokenAmountPerEth);
                    blockNum = _first;
                    _prev = _first;
                }
            } else if (_first == _prev) {
                _ethNum = uint256(_sheet.remainNum);
                ethAmount = ethAmount.add(_ethNum.mul(1 ether));
                tokenAmount = tokenAmount.add(_ethNum.mul(_sheet.tokenAmountPerEth));
            } else if (_prev > _first) {
                break;
            }
        }
    }

}