// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

interface INestPool {
    function distributeRewards(address contributor) external returns(uint256);
    function increaseNestReward(address contributor, uint256 amount) external;
    function increaseNTokenReward(address contributor, address ntoken, uint256 amount) external;
    function depositEthMiner(address miner, uint256 value) external;
    function freezeEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) external;
    function unfreezeEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) external;
    function getNTokenFromToken(address token) external view returns (address); 
    function setNTokenToToken(address token, address ntoken) external; 
    function withdrawEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) external;
    function withdrawNToken(address miner, address ntoken) external returns (uint256);
    function balanceOfNestInPool(address miner) external view returns (uint256);
    function transferNestInPool(address from, address to, uint256 amount) external;


    function addressOfBurnNest() view external returns (address);

}