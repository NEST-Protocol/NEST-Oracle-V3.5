// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

interface INTokenController {

    /// @dev Only for governance
    function loadContracts() external; 
}
