// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
// import "./iface/IBonusPool.sol";
// import "./iface/INToken.sol";
// import "./NestMining.sol";
import "./iface/INNRewardPool.sol";

contract NNRewardPool is INNRewardPool {
    using SafeMath for uint256;

    event Log(string msg);
    event LogUint(string msg, uint256 v);
    event LogAddress(string msg, address a);

    uint128 _NN_reward_sum;
    uint128 _NN_total_supply;

    mapping(address => uint256) _NN_reward_sum_checkpoint;

    ERC20 _C_NNToken;
    ERC20 _C_NestToken;

    constructor(address C_NestToken, address C_NNToken) public
    {
        _C_NestToken = ERC20(C_NestToken);
        _C_NNToken = ERC20(C_NNToken);
        _NN_total_supply = uint128(_C_NNToken.totalSupply());
    }


    function addNNReward(uint256 amount) override external
    {
        _NN_reward_sum = uint128(uint256(_NN_reward_sum).add(amount));
        return;
    }

    function claimNNReward() override external returns (uint256) {
        uint256 blnc =  _C_NNToken.balanceOf(address(msg.sender));
        require(blnc > 0, "Insufficient NNToken");
        uint256 total = _NN_total_supply;
        uint256 sum = _NN_reward_sum;
        uint256 reward = sum.sub(_NN_reward_sum_checkpoint[address(msg.sender)]);
        uint256 share = reward.mul(blnc).div(total);

        require(_C_NestToken.balanceOf(address(this)) >= uint256(share), "Insufficient NestTokens"); 
        _C_NestToken.transfer(address(msg.sender), share);
        _NN_reward_sum_checkpoint[address(msg.sender)] = sum;
        return share;
    }

    function settleNNReward(address from, address to) internal 
        // onlyNNToken
    {
        uint256 fromBlnc = _C_NNToken.balanceOf(address(from));
        require (fromBlnc > 0, "No NNToken to transfer");
        uint256 sum = _NN_reward_sum;
        uint256 total = _NN_total_supply;
        uint256 fromReward = sum.sub(_NN_reward_sum_checkpoint[from]).mul(fromBlnc).div(total);
        _C_NestToken.transfer(from, fromReward);
        _NN_reward_sum_checkpoint[from] = _NN_reward_sum_checkpoint[from].add(sum);

        uint256 toBlnc = _C_NNToken.balanceOf(address(to));
        uint256 toReward = sum.sub(_NN_reward_sum_checkpoint[to]).mul(toBlnc).div(total);
        _C_NestToken.transfer(to, toReward);
        _NN_reward_sum_checkpoint[to] = _NN_reward_sum_checkpoint[to].add(sum);
        return;
    }

    function nodeCount(address fromAdd, address toAdd) override external {
        settleNNReward(fromAdd, toAdd);
        return;
    }

    function unclaimedNNReward() override external view returns (uint256 reward) {
        uint256 blnc = _C_NNToken.balanceOf(address(msg.sender));
        uint256 sum = uint256(_NN_reward_sum);
        uint256 total = uint256(_NN_total_supply);
        reward = sum.sub(_NN_reward_sum_checkpoint[address(msg.sender)]).mul(blnc).div(total);
    }

}