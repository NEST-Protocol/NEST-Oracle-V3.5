// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

interface INestMining {
    
    function priceOf(address token) external view returns(uint256 ethAmount, uint256 tokenAmount, uint256 bn);

    function priceAvgAndSigmaOf(address token) external view returns (uint256, uint256, uint256, int128, int128);
    
    // function priceListOfToken(address token, uint8 num) external view returns(uint128[] memory data, uint256 atHeight);

    // function priceOfTokenAtHeight(address token, uint64 atHeight) external view returns(uint256 ethAmount, uint256 tokenAmount, uint64 bn);

    function latestPrice(address token) external view returns (uint256 ethNum, uint256 tokenAmount, uint256 atHeight);

    function minedNestAmount() external view returns (uint256);
}