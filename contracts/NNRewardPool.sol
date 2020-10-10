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

    uint128 private _NN_reward_sum;
    uint128 private _NN_total_supply;

    ERC20 _C_NNToken;
    ERC20 _C_NestToken;
    INestPool _C_NestPool;
    address _C_NestMining;

    address public governance;

    mapping(address => uint256) private _NN_reward_sum_checkpoint;

    /* ========== EVENTS ============== */

    /// @notice When rewards are added to the pool
    /// @param reward The amount of Nest Token
    /// @param allRewards The snapshot of all rewards accumulated
    event NNRewardAdded(uint256 reward, uint256 allRewards);

    /// @notice When rewards are claimed by nodes 
    /// @param nnode The address of the nest node
    /// @param share The amount of Nest Token claimed by the nest node
    event NNRewardClaimed(address nnode, uint256 share);

    /* ========== CONSTRUCTOR ========== */

    /// @notice Constructor of NNRewardPool contract
    /// @dev The NNToken contract was created on the Ethereum mainnet 
    /// @param _NestToken The address of Nest Token Contract
    /// @param _NNToken The address of NestNode Token Contract
    constructor(address _NestToken, address _NNToken) public
    {
        _C_NestToken = ERC20(_NestToken);
        _C_NNToken = ERC20(_NNToken);
        _NN_total_supply = uint128(_C_NNToken.totalSupply());
        governance = msg.sender;
    }

    modifier onlyBy(address _account)
    {
        require(msg.sender == _account,
            "Nest:NNPl:!Auth");
        _;
    }

    modifier noContract() 
    {
        require(address(msg.sender) == address(tx.origin), "Nest::NNPl> BAN(contract)");
        _;
    }


    /* ========== GOVERNANCE ========== */

    modifier onlyGovernanceOrBy(address _account)
    {
        if (msg.sender != governance) { 
            require(msg.sender == _account,
                "Nest:NNPl:!Auth");
        }
        _;
    }

    /// @notice 
    function loadContracts(address _NestToken, address _NNToken, address _NestPool, address _NestMining) 
        public onlyBy(governance)
    {
        _C_NestToken = ERC20(_NestToken);
        _C_NNToken = ERC20(_NNToken);
        _C_NestPool = INestPool(_NestPool);
        _C_NestMining = _NestMining;
    }

    /// @notice Add rewards for Nest-Nodes, only governance or NestMining (contract) are allowed
    /// @dev The rewards need to pull from NestPool
    function addNNReward() override external onlyGovernanceOrBy(_C_NestMining)
    {
        uint256 _amount = _C_NestPool.distributeRewards(address(this));
        if (_amount > 0) {
            uint256 _newSum = uint256(_NN_reward_sum).add(_amount);
            _NN_reward_sum = uint128(_newSum);
            emit NNRewardAdded(_amount, _newSum);
        }
        return;
    }

    /// @notice Claim rewards by Nest-Nodes
    /// @dev The rewards need to pull from NestPool
    function claimNNReward() override external noContract
    {
        uint256 blnc =  _C_NNToken.balanceOf(address(msg.sender));
        require(blnc > 0, "Insufficient NNToken");
        uint256 total = _NN_total_supply;
        uint256 sum = _NN_reward_sum;
        uint256 reward = sum.sub(_NN_reward_sum_checkpoint[address(msg.sender)]);
        uint256 share = reward.mul(blnc).div(total);

        require(_C_NestToken.balanceOf(address(this)) >= uint256(share), "Insufficient NestTokens"); 
        _C_NestToken.transfer(address(msg.sender), share);
        _NN_reward_sum_checkpoint[address(msg.sender)] = sum;

        emit NNRewardClaimed(address(msg.sender), share);
        
        return;
    }

    function settleNNReward(address from, address to) internal 
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

        emit NNRewardClaimed(from, uint128(fromReward));
        emit NNRewardClaimed(to, uint128(toReward));
        return;
    }

    /// @dev The callback function called by NNToken.transfer()
    /// @param fromAdd The address of 'from' to transfer
    /// @param toAdd The address of 'to' to transfer
    function nodeCount(address fromAdd, address toAdd) override external onlyBy(address(_C_NNToken)) {
        settleNNReward(fromAdd, toAdd);
        return;
    }

    /// @notice Show the amount of rewards unclaimed
    function unclaimedNNReward() override external view returns (uint256 reward) {
        uint256 blnc = _C_NNToken.balanceOf(address(msg.sender));
        uint256 sum = uint256(_NN_reward_sum);
        uint256 total = uint256(_NN_total_supply);
        reward = sum.sub(_NN_reward_sum_checkpoint[address(msg.sender)]).mul(blnc).div(total);
    }

}