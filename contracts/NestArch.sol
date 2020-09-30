// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

contract NestArch {

    mapping(string => address) public addrOf;

    function setContractAddress(string calldata name, address ctrAddr) public 
        // onlyDAO
    {
        addrOf[name] = ctrAddr;
    }

}

