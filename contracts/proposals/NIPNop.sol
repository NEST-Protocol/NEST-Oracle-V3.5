// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "../lib/SafeMath.sol";
import "../lib/AddressPayable.sol";
import "../iface/INestPool.sol";
import "./Proposal.sol";
import "hardhat/console.sol";

contract NIPNop is Proposal {

    event NIPRun(address alice, string message);

    function run(address NestPool,bytes calldata args) override external returns (bool)
    {
        (address alice, string memory _message) = abi.decode(args, (address,string));

        emit NIPRun(alice, _message);

        return true;
    }
}