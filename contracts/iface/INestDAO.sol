// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

interface INestDAO {

    /// @dev Only for governance
    function loadContracts() external; 

    function addETHReward(address ntoken) external payable; 

    function addNestReward(uint256 amount) external;

    event FlagSet(address gov, uint256 flag);
    
    event GovSet(address gov, address oldGov, address newGov);
}