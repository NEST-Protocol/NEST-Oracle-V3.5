// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "../lib/SafeMath.sol";
import "../lib/AddressPayable.sol";
import "../iface/INestPool.sol";

abstract contract Proposal {

    function run(address NestPool, bytes calldata args) virtual external returns (bool);

    // function run(address NestPool) virtual external;

    function getAddress(address NestPool, string memory contractName) public view returns (address) 
    {
        bytes32 _hash = keccak256(bytes(contractName));

        if (_hash == keccak256(bytes("NestMining"))) {
            return INestPool(NestPool).addrOfNestMining();
        } else if (_hash == keccak256(bytes("NestToken"))) {
            return INestPool(NestPool).addrOfNestToken();
        } else if (_hash == keccak256(bytes("NTokenController"))) {
            return INestPool(NestPool).addrOfNTokenController();
        } else if (_hash == keccak256(bytes("NNRewardPool"))) {
            return INestPool(NestPool).addrOfNNRewardPool();
        } else if (_hash == keccak256(bytes("NNToken"))) {
            return INestPool(NestPool).addrOfNNToken();
        } else if (_hash == keccak256(bytes("NestStaking"))) {
            return INestPool(NestPool).addrOfNestStaking();
        } else if (_hash == keccak256(bytes("NestQuery"))) {
            return INestPool(NestPool).addrOfNestQuery();
        } else if (_hash == keccak256(bytes("NestDAO"))) {
            return INestPool(NestPool).addrOfNestDAO();
        } else if (_hash == keccak256(bytes("NestVote"))) {
            return INestPool(NestPool).governance();
        } else if (_hash == keccak256(bytes("Governance"))) {
            return INestPool(NestPool).governance();
        } else {
            return address(0);
        }
    }

}

