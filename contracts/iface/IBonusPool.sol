// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

interface IBonusPool {

    function getEthAmount(address nestNtoken) view external returns (uint256);

    function pumpinEth(address nestNtoken, uint256 amount) external payable; //onlyStakingContract 

    function pickupEth(address payable recevier, address nestNtoken, uint256 amount) external; //onlyStakingContract 

    function lockNToken(address sender, address nestNtoken, uint256 amount) external; // onlyStakingContract 

    function unlockNToken(address receiver, address nestNtoken, uint256 amount) external; // onlyStakingContract 

    function getNTokenAmount(address nestNtoken, address user) view external returns (uint256 amount);

    function getNTokenBonusAmount(address nestNtoken) view external returns (uint256 amount); 
    
    function getLevelingAmount(address nestNtoken) view external returns (uint256);

    function moveBonusToLeveling(address nestNtoken, uint256 amount) external;   

    function moveBonusFromLeveling(address nestNtoken, uint256 amount) external; 


}