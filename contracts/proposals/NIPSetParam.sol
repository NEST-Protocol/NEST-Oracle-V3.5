// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "../iface/IParamSettable.sol";

import "../lib/SafeMath.sol";
import "../lib/AddressPayable.sol";
import "./Proposal.sol";

contract NIPSetParam is Proposal {

    function run(address NestPool, bytes calldata args) override external returns(bool)
    {
        (string memory contractName, uint256 paramIndex, uint256 paramNewValue) = abi.decode(args, (string, uint256, uint256));

        address _contract = getAddress(NestPool, contractName);

        bool success = false;

        if (_contract != address(0)) {
            success = IParamSettable(_contract).setParam(paramIndex, paramNewValue);
        }
        return success;
    }

}