// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./MiningData.sol";

import "../lib/SafeMath.sol";
import "../lib/SafeERC20.sol";
import '../lib/TransferHelper.sol';
import "../lib/ABDKMath64x64.sol";

// import "./iface/INestPool.sol";
// import "./iface/INestStaking.sol";
// import "./iface/INToken.sol";
// import "./iface/INNRewardPool.sol";
import "hardhat/console.sol";

/// @title MiningPrice module of NestMining
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author 0x00  - <0x00@nestprotocol.org>
library MiningLookupPrice {

    using SafeMath for uint256;

    function _calcPriceAtHeight(
            MiningData.State storage state, 
            address _token,
            uint256 _height
        )
        external
        view 
        returns(uint256 ethNum, uint256 tokenAmount, uint256 atHeight) 
    {
        MiningData.PriceSheet[] storage _plist = state.priceSheetList[_token];
        uint256 len = _plist.length;
        MiningData.PriceSheet memory _sheet;
        if (len == 0) {
            return (0, 0, 0);
        }

        // algorithm: we traverse from the head of the list. The var `_curr` points to the block 
        //      with effective price sheet. While the var `_prev` points to the block right before the 
        //      `height`. Then we assign `ethNum`, `tokenAmount` and `bn`.
        //      We shall continue to go through the list, and accumulate `ethNum` and `tokenAmount` 
        //      in the sheets where `_sheet.height == _prev`.
        uint256 _curr = 0;
        uint256 _prev = 0;
        for (uint i = 1; i <= len; i++) {
            _sheet = _plist[len-i];
            _curr = uint256(_sheet.height);
            if (_prev == 0) {
                if (_curr <= uint256(_height) && _curr + MiningData.c_price_duration_block < block.number) {
                    ethNum = uint256(_sheet.remainChunk).mul(_sheet.chunkSize);
                    tokenAmount = ethNum.mul(uint256(_sheet.tokenPrice));
                    atHeight = _curr;
                    _prev = _curr;
                }
            } else if (_curr == _prev) {
                uint256 _eth = uint256(_sheet.remainChunk).mul(_sheet.chunkSize);
                ethNum = ethNum.add(_eth);
                tokenAmount = tokenAmount.add(_eth.mul(_sheet.tokenPrice));
            } else if (_prev > _curr) {
                break;
            }
        }
    }

    /// @dev Calculate and return the newest price of the token from the list of price sheets
    // function latestEffectivePrice(
    //         MiningData.State storage state, 
    //         address token
    //     )
    //     external 
    //     view 
    //     returns(uint256 ethNum, uint256 tokenAmount, uint256 atHeight) 
    // {
    //     return priceAtHeight(state, token, block.number);
    // }

/*
    /// @dev Calculate and return the newest price of the token from the list of price sheets
    function latestEffectivePrice(
            MiningData.State storage state, 
            address token
        )
        external 
        view 
        returns(uint256 ethNum, uint256 tokenAmount, uint256 atHeight) 
    {
        MiningData.PriceSheet[] storage _plist = state.priceSheetList[token];
        uint256 len = _plist.length;
        MiningData.PriceSheet memory _sheet;
        if (len == 0) {
            return (0, 0, 0);
        }

        // algorithm: we traverse from the head of the list. The var `_first` is the first block 
        //      with effective price sheet. Then we assign `ethNum`, `tokenAmount` and `atHeight`.
        //      We shall continue to go through the list, and accumulate `ethNum` and `tokenAmount` 
        //      in the sheets where `atHeight==_first`.
        uint256 _first = 0;
        for (uint i = 1; i <= len; i++) {
            _sheet = _plist[len-i];
            if (_first == 0 && _sheet.height + c_price_duration_block < block.number) {
                _first = uint256(_sheet.height);
                ethNum = uint256(_sheet.remainChunk).mul(_sheet.chunkSize);
                tokenAmount = ethNum.mul(uint256(_sheet.tokenPrice));
                atHeight = _first;
            } else if (_first == uint256(_sheet.height)) {
                uint256 _eth = uint256(_sheet.remainChunk).mul(_sheet.chunkSize);
                ethNum = ethNum.add(_eth);
                tokenAmount = tokenAmount.add(_eth.mul(_sheet.tokenPrice));
            } else if (_first > uint256(_sheet.height)) {
                break;  // break the loop if _sheet is beyond `_first`
            }
        }
    }
*/
/*
    /// @dev  Return the effective price right before the height given. 
    ///     Note that there might not be any price sheet posted at the exact height.
    /// @param state The global state
    /// @param token The address of token contract
    /// @param atHeight The block height of a historical price to query
    /// @return The effective price `ethNum`, `tokenAmount`, `bn`
    function priceAtHeight(
            MiningData.State storage state, 
            address token, 
            uint64 atHeight
        ) 
        external 
        view 
        returns(uint256 ethNum, uint256 tokenAmount, uint256 bn)
    {
        MiningData.PriceSheet[] storage _plist = _price_list[token];
        uint256 len = _plist[token].length;
        MiningData.PriceSheet memory _sheet;
        if (len == 0) {
            return (0, 0, 0);
        }

        uint256 _first = 0;
        uint256 _prev = 0;
        for (uint i = 1; i <= len; i++) {
            _sheet = _plist[len-i];
            _first = uint256(_sheet.height);
            if (prev == 0) {
                if (first <= uint256(atHeight) && _first + c_price_duration_block < block.number) {
                    ethNum = uint256(_sheet.remainChunk).mul(_sheet.chunkSize);
                    tokenAmount = ethNum.mul(uint256(_sheet.tokenPrice));
                    bn = _first;
                    prev = _first;
                }
            } else if (first == prev) {
                uint256 _eth = uint256(_sheet.remainChunk).mul(_sheet.chunkSize);
                ethNum = ethNum.add(_eth);
                tokenAmount = tokenAmount.add(_eth.mul(_sheet.tokenPrice));
            } else if (prev > first) {
                break;
            }
        }
    }
*/
/*
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
*/
}