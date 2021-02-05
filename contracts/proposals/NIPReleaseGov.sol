// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "../lib/SafeMath.sol";
import "../lib/AddressPayable.sol";
import "../iface/INestPool.sol";
import "./Proposal.sol";
import "hardhat/console.sol";

interface IVote {
    
    function releaseGovTo(address gov_) external;

}

contract NIPReleaseGov is Proposal {

    function run(address NestPool, bytes calldata args) override external returns (bool)
    {
        address _newGov = abi.decode(args, (address));

        address _contract = getAddress(NestPool, "Governance");

        if (_contract != address(0)) {
            IVote(_contract).releaseGovTo(_newGov);
            INestPool(NestPool).setGovernance(_newGov);
        }
    }
}