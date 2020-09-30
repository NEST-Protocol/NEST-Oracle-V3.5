// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

interface IStaking {
        
    function timeOfNextBonus() external returns (uint256, uint256, uint256);

}