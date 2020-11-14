// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
// pragma experimental ABIEncoderV2;

import "./MiningData.sol";

import "../lib/SafeMath.sol";
import "../lib/SafeERC20.sol";
import '../lib/TransferHelper.sol';
import "../lib/ABDKMath64x64.sol";
import "hardhat/console.sol";
import "../iface/INestPool.sol";

library MiningOp {

    using SafeMath for uint256;

    uint256 constant c_price_eth_unit = 1;
    uint256 constant c_price_deviation_rate = 10;
    uint256 constant c_price_duration_block = 25;
    uint256 constant c_sheet_duration_block = 4 * 60 * 6;

    function _clear(
            MiningData.State storage state, 
            address _token, 
            uint256 _chunkSize, 
            uint256 _tokenChunkSize, 
            MiningData.Taker memory _t
        ) 
        internal  
    {
        INestPool _C_NestPool = INestPool(state._C_NestPool);

        if (_t.ethChunk > 0) {
            _C_NestPool.freezeEth(address(msg.sender), _chunkSize.mul(_t.ethChunk));
            _C_NestPool.unfreezeEth(address(_t.takerAddress), _chunkSize.mul(_t.ethChunk));
        } else if (_t.tokenChunk > 0) {
            _C_NestPool.freezeToken(address(msg.sender), _token, _tokenChunkSize.mul(_t.tokenChunk));
            _C_NestPool.unfreezeToken(address(_t.takerAddress), _token, _tokenChunkSize.mul(_t.tokenChunk));
        }
    }

    function clear(MiningData.State storage state, address token, uint256 index, uint256 num) external 
    {
        // check parameters 
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        MiningData.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        require(uint256(_sheet.miner) == uint256(msg.sender), "Nest:Mine:!(miner)");
        require(_sheet.height + c_price_duration_block < block.number, "Nest:Mine:!EFF(sheet)");  // safe_math
        require(_sheet.height + c_sheet_duration_block > block.number, "Nest:Mine:!EFF(sheet)");  // safe_math
        
        INestPool _C_NestPool = INestPool(state._C_NestPool);

        uint256 _state = uint256(_sheet.state);
        if (_state == 0x2) { // non-bitten price sheet
            require(state._takers[token][index].length == 0, "Nest:Mine:!(takers)");
            _sheet.state = uint8(1);
            state.priceSheetList[token][index] = _sheet;
            if (msg.value > 0) {
                _C_NestPool.depositEth{value:msg.value}(address(msg.sender));
            }
            return;
        }
        require(_state == 0x3, "Nest:Mine:!BITTEN(sheet)");
        
        uint256 _ethChunkAmount = uint256(_sheet.chunkSize);
        uint256 _tokenChunkAmount = uint256(_sheet.tokenPrice).mul(_ethChunkAmount);

        if (msg.value > 0) { 
            _C_NestPool.depositEth{value:msg.value}(address(msg.sender));
        }

        MiningData.Taker[] storage _ts = state._takers[token][index];
        uint256 _len = _ts.length;
        for (uint i = 0; i < num; i++) {
            MiningData.Taker memory _t = _ts[_len - 1 - i];
            _clear(state, token, _ethChunkAmount, _tokenChunkAmount, _t);
            _ts.pop();
        }

        if (_ts.length == 0) { 
            _sheet.state = uint8(1);
            state.priceSheetList[token][index] = _sheet;
        }
    }

    function clearAll(MiningData.State storage state, address token, uint256 index) external 
    {
        // check parameters 
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        MiningData.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        require(_sheet.height + c_price_duration_block < block.number, "Nest:Mine:!EFF(sheet)");  // safe_math: untainted values
        require(_sheet.height + c_sheet_duration_block > block.number, "Nest:Mine:!VALID(sheet)");  // safe_math: untainted values
        require(uint256(_sheet.miner) == uint256(msg.sender), "Nest:Mine:!(miner)");
        
        INestPool _C_NestPool = INestPool(state._C_NestPool);

        uint256 _state = uint256(_sheet.state);
        if (_state == 0x2) { // non-bitten price sheet
            require(state._takers[token][index].length == 0, "Nest:Mine:!(takers)");
            _sheet.state = uint8(1);
            state.priceSheetList[token][index] = _sheet;
            _C_NestPool.depositEth{value:msg.value}(address(msg.sender));
            return;
        }
        require(_state == 0x3, "Nest:Mine:!BITTEN(sheet)");

        uint256 _ethChunkAmount = uint256(_sheet.chunkSize);
        uint256 _tokenChunkAmount = uint256(_sheet.tokenPrice).mul(_ethChunkAmount);

        _C_NestPool.depositEth{value:msg.value}(address(msg.sender));

        MiningData.Taker[] storage _ts = state._takers[token][index];
        uint256 _len = _ts.length;
        for (uint i = 0; i < _len; i++) {
            MiningData.Taker memory _t = _ts[_len - 1 - i];
            _clear(state, token, _ethChunkAmount, _tokenChunkAmount, _t);
            _ts.pop();
        }

        _sheet.state = uint8(1);
        state.priceSheetList[token][index] = _sheet;
    }

    function refute(MiningData.State storage state, address token, uint256 index, uint256 takeIndex) external  
    {
        MiningData.PriceSheet storage _sheet = state.priceSheetList[token][index]; 
        require(_sheet.state == 0x3,  "Nest:Mine:!(state)");

        MiningData.Taker memory _taker = state._takers[token][index][takeIndex];
        require(_taker.takerAddress == uint160(msg.sender), "Nest:Mine:!(taker)");
        require(_sheet.height + c_sheet_duration_block < block.number, "Nest:Mine:VALID(sheet)");  // safe_math: untainted values
        
        INestPool _C_NestPool = INestPool(state._C_NestPool);

        uint256 _chunkSize = _sheet.chunkSize;
        if (_taker.ethChunk > 0) {  // sellToken
            uint256 _chunkNum = _taker.ethChunk;
            uint256 _tokenAmount = uint256(_sheet.tokenPrice).mul(_chunkNum).mul(_chunkSize);
            _C_NestPool.unfreezeToken(address(msg.sender), token, _tokenAmount);
            _C_NestPool.unfreezeEth(address(msg.sender), _chunkNum.mul(_chunkSize).mul(1 ether));
            _taker.ethChunk = 0;
        } else if (_taker.tokenChunk > 0) { // buyToken
            uint256 _chunkNum = _taker.ethChunk;
            uint256 _ethAmount = _chunkNum.add(_chunkNum).mul(_chunkSize).mul(1 ether);
            _C_NestPool.unfreezeEth(address(msg.sender), _ethAmount);
            _taker.tokenChunk = 0;
        }
        _taker.takerAddress = 0;
        state._takers[token][index][takeIndex] = _taker;
        _sheet.state = uint8(0x4);
    }

}