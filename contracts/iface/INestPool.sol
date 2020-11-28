// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

interface INestPool {

    function addNest(address miner, uint256 amount) external;
    function addNToken(address contributor, address ntoken, uint256 amount) external;

    // function distributeRewards(address contributor) external returns(uint256);
    // function increaseNestReward(address contributor, uint256 amount) external;
    // function depositEthMiner(address miner, uint256 value) external;

    function depositEth(address miner) external payable;

    function freezeEth(address miner, uint256 ethAmount) external; 
    function unfreezeEth(address miner, uint256 ethAmount) external;

    function freezeNest(address miner, uint256 nestAmount) external;
    function unfreezeNest(address miner, uint256 nestAmount) external;

    function freezeToken(address miner, address token, uint256 tokenAmount) external; 
    function unfreezeToken(address miner, address token, uint256 tokenAmount) external;

    function freezeEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) external;
    function unfreezeEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) external;

    function getNTokenFromToken(address token) external view returns (address); 
    function setNTokenToToken(address token, address ntoken) external; 

    function withdrawEth(address miner, uint256 ethAmount) external;
    function withdrawToken(address miner, address token, uint256 tokenAmount) external;

    function withdrawNest(address miner, uint256 amount) external;
    function withdrawEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) external;
    function withdrawNToken(address miner, address ntoken, uint256 amount) external;
    
    function balanceOfNestInPool(address miner) external view returns (uint256);
    // function transferNestInPool(address from, address to, uint256 amount) external;

    function addrOfNestMining() external view returns (address);

    function addrOfNestToken() external view returns (address);

    function addrOfNTokenController() external view returns (address);
    
    function addrOfNNRewardPool() external view returns (address);

    function addressOfBurnedNest() external view returns (address);

}