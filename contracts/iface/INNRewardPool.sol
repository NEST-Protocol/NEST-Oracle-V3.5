// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

// import "./lib/SafeMath.sol";
// import "./iface/INestPool.sol";
// import "./lib/SafeERC20.sol";
// import './lib/TransferHelper.sol';
// import "./iface/IBonusPool.sol";
// import "./iface/INToken.sol";
// import "./NestMining.sol";

interface INNRewardPool {
 
    function addNNReward(uint256 amount) external ;

    function claimNNReward() external returns (uint256);  

    function nodeCount(address fromAdd, address toAdd) external;

    function unclaimedNNReward() external view returns (uint256 reward);
    
}