// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

pragma experimental ABIEncoderV2;

import "../iface/INestPrice.sol";

contract DeFiMock {

    INestPrice _NestOracle;

    struct PriceInfo {
        address token;
        uint128 atHeight;
        uint128 ethAmount;
        uint128 tokenAmount;
    }
    PriceInfo[] _prices;

    constructor(address Oracle) public {
        _NestOracle = INestPrice(Oracle);
    }

    function simu() public {
        return;
    }

    function queryOracle(address token) payable public {
        uint128[] memory data = _NestOracle.queryPriceList{value:msg.value}(token, uint8(4), msg.sender);
        for (uint256 i=0; i<data.length; i=i+3) {
            _prices.push(PriceInfo(token, data[i], data[i+1], data[i+2]));
        }
    }

    function lengthOfPrices() public view returns (uint256) {
        return _prices.length;
    }

    function priceByIndex(uint256 index) public view returns (PriceInfo memory) {
        return _prices[index];
    }
    
}