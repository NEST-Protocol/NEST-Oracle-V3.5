// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "../lib/SafeMath.sol";
import "../lib/SafeERC20.sol";
import '../lib/TransferHelper.sol';
import "../lib/ABDKMath64x64.sol";

import "../iface/INestPool.sol";
import "../iface/INestStaking.sol";
import "../iface/INToken.sol";
import "../iface/INNRewardPool.sol";
import "../libminingv1/MiningV1Data.sol";

/// @title  NestMiningV1/MiningV1Calc
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>
library MiningV1Op {

    using SafeMath for uint256;

    /// @notice Call the function to buy TOKEN/NTOKEN from a posted price sheet
    /// @dev bite TOKEN(NTOKEN) by ETH,  (+ethNumBal, -tokenNumBal)
    /// @param token The address of token(ntoken)
    /// @param index The position of the sheet in priceSheetList[token]
    /// @param biteNum The amount of bitting (in the unit of ETH), realAmount = biteNum * newTokenAmountPerEth
    /// @param newTokenAmountPerEth The new price of token (1 ETH : some TOKEN), here some means newTokenAmountPerEth
    function _biteToken(
            MiningV1Data.State storage state, 
            address token, 
            uint256 index, 
            uint256 biteNum, 
            uint256 newTokenAmountPerEth
        )
        external
    {
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        require(newTokenAmountPerEth > 0, "Nest:Mine:(price)=0");
        require(biteNum >= state.miningEthUnit && biteNum % state.miningEthUnit == 0, "Nest:Mine:!(bite)");

        MiningV1Data.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        require(_sheet.height + MiningV1Data.PRICE_DURATION_BLOCK > block.number, "Nest:Mine:!EFF(sheet)");
        require(_sheet.remainNum >= biteNum, "Nest:Mine:!(remain)");

        INestPool _C_NestPool = INestPool(state.C_NestPool);

        uint256 _state = uint256(_sheet.state);
        require(_state == MiningV1Data.PRICESHEET_STATE_POSTED 
             || _state == MiningV1Data.PRICESHEET_STATE_BITTEN,  "Nest:Mine:!(state)");

        {
            address nToken = token;
            
            if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_USD || _sheet.typ == MiningV1Data.PRICESHEET_TYPE_TOKEN) {
                nToken = _C_NestPool.getNTokenFromToken(token);
                require (nToken != address(0x0), "Nest:Mine:!(ntoken)");
            } else if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_NEST || _sheet.typ == MiningV1Data.PRICESHEET_TYPE_NTOKEN) {
                nToken = token;
            }

            uint256 _ethFee = biteNum.mul(1 ether).mul(state.biteFeeRate).div(1000);

            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            INestStaking(state.C_NestStaking).addETHReward{value:_ethFee}(nToken);
        }

        // post a new price sheet
        { 
            // check bitting conditions
            uint256 _newEthNum;
            uint256 _newNestNum1k;
            {
                uint256 _level = uint256(_sheet.level);
                uint256 _newLevel;

                if (_level > MiningV1Data.MAX_BITE_NESTED_LEVEL && _level < 127) { // bitten sheet, nest doubling
                    _newEthNum = biteNum;
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level <= MiningV1Data.MAX_BITE_NESTED_LEVEL) {  // bitten sheet, eth doubling 
                    _newEthNum = biteNum.mul(MiningV1Data.BITE_AMOUNT_INFLATE_FACTOR);
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level >= 127) {
                    _newLevel = _level;
                    _newNestNum1k = uint256(_sheet.nestNum1k);
                }

                MiningV1Data.PriceSheet[] storage _sheetOfToken = state.priceSheetList[token];
                // append a new price sheet
                _sheetOfToken.push(MiningV1Data.PriceSheet(
                    uint160(msg.sender),             // miner 
                    uint32(block.number),            // atHeight
                    uint32(_newEthNum),                 // ethNum
                    uint32(_newEthNum),                 // remainNum
                    uint8(_newLevel),                // level
                    uint8(_sheet.typ),               // typ
                    uint8(MiningV1Data.PRICESHEET_STATE_POSTED),  // state 
                    uint8(0),                        // _reserved
                    uint32(_newEthNum),                 // ethNumBal
                    uint32(_newEthNum),                 // tokenNumBal
                    uint32(_newNestNum1k),           // nestNum1k
                    uint128(newTokenAmountPerEth)    // tokenAmountPerEth
                ));
            }
            _C_NestPool.freezeNest(address(msg.sender), _newNestNum1k.mul(1000 * 1e18));
            _C_NestPool.freezeEthAndToken(msg.sender, _newEthNum.add(biteNum).mul(1 ether), 
                token, _newEthNum.mul(newTokenAmountPerEth)
                                    .sub(biteNum.mul(_sheet.tokenAmountPerEth)));
            _sheet.state = MiningV1Data.PRICESHEET_STATE_BITTEN;
            _sheet.ethNumBal = uint32(uint256(_sheet.ethNumBal).add(biteNum));
            _sheet.tokenNumBal = uint32(uint256(_sheet.tokenNumBal).sub(biteNum));
            _sheet.remainNum = uint32(uint256(_sheet.remainNum).sub(biteNum));
            state.priceSheetList[token][index] = _sheet;
            
        }

        emit MiningV1Data.TokenBought(address(msg.sender), address(token), index, biteNum.mul(1 ether), biteNum.mul(_sheet.tokenAmountPerEth));
        return; 

    }

    /// @notice Call the function to buy TOKEN/NTOKEN from a posted price sheet
    /// @dev bite TOKEN(NTOKEN) by ETH,  (+ethNumBal, -tokenNumBal)
    /// @param token The address of token(ntoken)
    /// @param index The position of the sheet in priceSheetList[token]
    /// @param biteNum The amount of bitting (in the unit of ETH), realAmount = biteNum * newTokenAmountPerEth
    /// @param newTokenAmountPerEth The new price of token (1 ETH : some TOKEN), here some means newTokenAmountPerEth
    function _biteEth(
            MiningV1Data.State storage state, 
            address token, 
            uint256 index, 
            uint256 biteNum, 
            uint256 newTokenAmountPerEth
        )
        external
    {
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        require(newTokenAmountPerEth > 0, "Nest:Mine:(price)=0");
        require(biteNum >= state.miningEthUnit && biteNum % state.miningEthUnit == 0, "Nest:Mine:!(bite)");

        MiningV1Data.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        require(block.number.sub(_sheet.height) < MiningV1Data.PRICE_DURATION_BLOCK, "Nest:Mine:!EFF(sheet)");
        require(_sheet.remainNum >= biteNum, "Nest:Mine:!(remain)");

        INestPool _C_NestPool = INestPool(state.C_NestPool);

        uint256 _state = uint256(_sheet.state);
        require(_state == MiningV1Data.PRICESHEET_STATE_POSTED 
            || _state == MiningV1Data.PRICESHEET_STATE_BITTEN,  "Nest:Mine:!(state)");

        {
            address nToken = token;
            
            if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_USD 
                    || _sheet.typ == MiningV1Data.PRICESHEET_TYPE_TOKEN) {
                nToken = _C_NestPool.getNTokenFromToken(token);
                require (nToken != address(0x0), "Nest:Mine:!(ntoken)");
            } else if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_NEST || _sheet.typ == MiningV1Data.PRICESHEET_TYPE_NTOKEN) {
                nToken = token;
            }

            uint256 _ethFee = biteNum.mul(1 ether).mul(state.biteFeeRate).div(1000);

            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            INestStaking(state.C_NestStaking).addETHReward{value:_ethFee}(nToken);
        }
        
       // post a new price sheet
        { 
            // check bitting conditions
            uint256 _newEthNum;
            uint256 _newNestNum1k;
            {
                uint256 _level = uint256(_sheet.level);
                uint256 _newLevel;

                if (_level > MiningV1Data.MAX_BITE_NESTED_LEVEL && _level < 127) { // bitten sheet, nest doubling
                    _newEthNum = biteNum;
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level <= MiningV1Data.MAX_BITE_NESTED_LEVEL) {  // bitten sheet, eth doubling 
                    _newEthNum = biteNum.mul(MiningV1Data.BITE_AMOUNT_INFLATE_FACTOR);
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level >= 127) {
                    _newLevel = _level;
                    _newNestNum1k = uint256(_sheet.nestNum1k);
                }

                MiningV1Data.PriceSheet[] storage _sheetOfToken = state.priceSheetList[token];
                // append a new price sheet
                _sheetOfToken.push(MiningV1Data.PriceSheet(
                    uint160(msg.sender),             // miner 
                    uint32(block.number),            // atHeight
                    uint32(_newEthNum),                 // ethNum
                    uint32(_newEthNum),                 // remainNum
                    uint8(_newLevel),                // level
                    uint8(_sheet.typ),               // typ
                    uint8(MiningV1Data.PRICESHEET_STATE_POSTED),  // state 
                    uint8(0),                        // _reserved
                    uint32(_newEthNum),                 // ethNumBal
                    uint32(_newEthNum),                 // tokenNumBal
                    uint32(_newNestNum1k),           // nestNum1k
                    uint128(newTokenAmountPerEth)    // tokenAmountPerEth
                ));
            }
            _C_NestPool.freezeNest(address(msg.sender), _newNestNum1k.mul(1000 * 1e18));
            _C_NestPool.freezeEthAndToken(msg.sender, _newEthNum.sub(biteNum).mul(1 ether), 
                token, _newEthNum.mul(newTokenAmountPerEth)
                                    .add(biteNum.mul(_sheet.tokenAmountPerEth)));
            _sheet.state = MiningV1Data.PRICESHEET_STATE_BITTEN;
            _sheet.ethNumBal = uint32(uint256(_sheet.ethNumBal).sub(biteNum));
            _sheet.tokenNumBal = uint32(uint256(_sheet.tokenNumBal).add(biteNum));
            _sheet.remainNum = uint32(uint256(_sheet.remainNum).sub(biteNum));
            state.priceSheetList[token][index] = _sheet;
        }
        emit MiningV1Data.TokenSold(address(msg.sender), address(token), index, biteNum.mul(1 ether), biteNum.mul(_sheet.tokenAmountPerEth));
        return; 
    }

    /// @notice Close a batch of price sheets passed VERIFICATION-PHASE
    /// @dev Empty sheets but in VERIFICATION-PHASE aren't allowed
    /// @param token The address of TOKEN contract
    /// @param indices A list of indices of sheets w.r.t. `token`
    function _closeList(
            MiningV1Data.State storage state, 
            address token, 
            uint32[] memory indices) 
        external 
    {
        uint256 _ethAmount;
        uint256 _tokenAmount;
        uint256 _nestAmount;
        uint256 _reward;

        MiningV1Data.PriceSheet[] storage prices = state.priceSheetList[token];
        
        for (uint i=0; i<indices.length; i++) {
            MiningV1Data.PriceSheet memory _sheet = prices[indices[i]];
            if (uint256(_sheet.miner) != uint256(msg.sender)) {
                continue;
            }
            uint256 h = uint256(_sheet.height);
            if (h + MiningV1Data.PRICE_DURATION_BLOCK < block.number) { // safe_math: untainted values
                _ethAmount = _ethAmount.add(uint256(_sheet.ethNumBal).mul(1 ether));
                _tokenAmount = _tokenAmount.add(uint256(_sheet.tokenNumBal).mul(_sheet.tokenAmountPerEth));
                _nestAmount = _nestAmount.add(uint256(_sheet.nestNum1k).mul(1000 * 1e18));
                _sheet.ethNumBal = 0;
                _sheet.tokenNumBal = 0;
                _sheet.nestNum1k = 0;

                _sheet.state = MiningV1Data.PRICESHEET_STATE_CLOSED;
                prices[indices[i]] = _sheet;

                if(_sheet.level == 0) {
                    uint256 _ntokenH = uint256(state.minedAtHeight[token][h] >> 128);
                    uint256 _ethH = uint256(state.minedAtHeight[token][h] << 128 >> 128);
                    _reward = _reward.add(uint256(_sheet.ethNum).mul(_ntokenH).div(_ethH));
                    emit MiningV1Data.PriceClosed(address(msg.sender), token, indices[i]);
                }
            }
        }
        
        INestPool _C_NestPool = INestPool(state.C_NestPool);

        if (_ethAmount > 0 || _tokenAmount > 0) {
            _C_NestPool.unfreezeEthAndToken(address(msg.sender), _ethAmount, token, _tokenAmount);
        }
        _C_NestPool.unfreezeNest(address(msg.sender), _nestAmount); 

        {
            uint256 _typ = prices[indices[0]].typ;
            if  (_typ == MiningV1Data.PRICESHEET_TYPE_USD) {
                _C_NestPool.addNest(address(msg.sender), _reward);
            } else if (_typ == MiningV1Data.PRICESHEET_TYPE_TOKEN) {
                address _ntoken = _C_NestPool.getNTokenFromToken(token);
                _C_NestPool.addNToken(address(msg.sender), _ntoken, _reward);
            }
        }
    }

}