// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./iface/INestMining.sol";
import "./iface/INNRewardPool.sol";

//import "hardhat/console.sol";

/// @title NNRewardPool
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>

/// @notice The NNRewardPool contract distributes the mining rewards,
///     15% share of the amount of nest-token produced by miners
/// @dev The nest-tokens are put in NestPool. This contract only traces 
///     the sum-amount of all of the rewards (nest-token)
contract NNRewardPool is INNRewardPool {
    using SafeMath for uint256;

    int8   public flag;     // | 1: active 
                            // | 0: uninitialized
                            // | -1: shutdown

    uint256 public NN_reward_sum;
    uint256 public NN_total_supply;

    address C_NNToken;
    address C_NestToken;
    address C_NestPool;
    address C_NestMining;

    address public governance;

    uint256 constant DEV_REWARD_PERCENTAGE   = 5;
    uint256 constant NN_REWARD_PERCENTAGE    = 15;
    uint256 constant MINER_REWARD_PERCENTAGE = 80;

    int8   constant NNREWARD_FLAG_UNINITIALIZED    = 0;
    int8   constant NNREWARD_FLAG_ACTIVE           = 1;
    int8   constant NNREWARD_FLAG_SHUTDOWN         = -1;

    /// @dev From nest-node address to checkpoints of reward-sum
    mapping(address => uint256) public NN_reward_sum_checkpoint;

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
    /// @param NestPool The address of NestPool Contract
    /// @param NNToken The address of NestNode Token Contract
    constructor(address NestPool, address NNToken) public
    {
        C_NestPool = NestPool;
        C_NNToken = NNToken;
        NN_total_supply = uint128(ERC20(C_NNToken).totalSupply());
        governance = msg.sender;
        flag = NNREWARD_FLAG_UNINITIALIZED;
    }

    /* ========== MODIFIERS ========== */

    modifier onlyBy(address _account)
    {
        require(msg.sender == _account, "Nest:NN:!Auth");
        _;
    }

    modifier noContract() 
    {
        require(address(msg.sender) == address(tx.origin), "Nest:NN:BAN(contract)");
        _;
    }

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:NN:!governance");
        _;
    }

    modifier onlyGovOrBy(address _account)
    {
        if (msg.sender != governance) { 
            require(msg.sender == _account,
                "Nest:NN:!Auth");
        }
        _;
    }

    /* ========== GOVERNANCE ========== */

    /// @dev The function loads all nest-contracts, it is supposed to be called by NestPool
    function loadContracts() override external onlyGovOrBy(C_NestPool)
    {
        C_NestToken = INestPool(C_NestPool).addrOfNestToken();
        C_NNToken = INestPool(C_NestPool).addrOfNNToken();
        C_NestMining = INestPool(C_NestPool).addrOfNestMining();
        
        flag = NNREWARD_FLAG_ACTIVE;

    }

    /// @notice Set the snapshot of NN total rewards
    /// @dev The function should be called by admin when upgrading
    function setNNRewardSum(uint128 sum) external onlyGovernance
    {
        NN_reward_sum = uint128(sum);
    }

    /// @notice Set the snapshot of NN holders
    /// @dev The function should be called by admin when upgrading
    function setNNRewardSumCheckpoint(address node, uint256 sum) external onlyGovernance 
    {
        if (sum > 0) {
            NN_reward_sum_checkpoint[node] = sum;
        }
    }

    /// @dev Set the flag of this contract
    function setFlag(int8 newFlag) external onlyGovernance
    {
        flag = newFlag;
    }

    /// @dev Shutdown this contract
    function shutdown() external onlyGovernance
    {
        flag = NNREWARD_FLAG_SHUTDOWN;
    }

    /* ========== ADDING REWARDS ========== */


    /// @notice Add rewards for Nest-Nodes, only governance or NestMining (contract) are allowed
    /// @dev  The rewards need to pull from NestPool
    /// @param _amount The amount of Nest token as the rewards to each nest-node
    function addNNReward(uint256 _amount) override external onlyGovOrBy(C_NestMining)
    {
        if (_amount > 0) {
            uint256 _newSum = uint256(NN_reward_sum).add(_amount);
            NN_reward_sum = uint128(_newSum);
            emit NNRewardAdded(_amount, _newSum);
        }
        return;
    }

    // /// @dev The updator is to update the sum of NEST tokens mined in NestMining
    // function updateNNReward() external
    // {
    //     require(flag == NNREWARD_FLAG_ACTIVE, "Nest:NN:!flag");

    //     uint256 _allMined = INestMining(C_NestMining).minedNestAmount();
    //     if (_allMined > NN_reward_sum) {
    //         uint256 _amount = _allMined.mul(NN_REWARD_PERCENTAGE).div(100).sub(NN_reward_sum);
    //         uint256 _newSum = uint256(NN_reward_sum).add(_amount);
    //         NN_reward_sum = uint128(_newSum);
    //         emit NNRewardAdded(_amount, _newSum);
    //     }
    // }

    // modifier updateNNReward1()
    // {
    //     require(flag == NNREWARD_FLAG_ACTIVE, "Nest:NN:!flag");

    //     uint256 _allMined = INestMining(C_NestMining).minedNestAmount();
    //     if (_allMined > NN_reward_sum) {
    //         uint256 _amount = _allMined.mul(NN_REWARD_PERCENTAGE).div(100).sub(NN_reward_sum);
    //         uint256 _newSum = uint256(NN_reward_sum).add(_amount);
    //         NN_reward_sum = uint128(_newSum);
    //         emit NNRewardAdded(_amount, _newSum);
    //     }
    //    _;
    // }

    /* ========== CLAIM/SETTLEMENT ========== */

    /// @notice Claim rewards by Nest-Nodes
    /// @dev The rewards need to pull from NestPool
    function claimNNReward() override external noContract //updateNNReward1
    {
        require(flag == NNREWARD_FLAG_ACTIVE, "Nest:NN:!flag");

        uint256 blnc =  ERC20(C_NNToken).balanceOf(address(msg.sender));
        require(blnc > 0, "Nest:NN:!(NNToken)");
        uint256 total = NN_total_supply;
        uint256 sum = NN_reward_sum;
        uint256 reward = sum.sub(NN_reward_sum_checkpoint[address(msg.sender)]);
        uint256 share = reward.mul(blnc).div(total);

        NN_reward_sum_checkpoint[address(msg.sender)] = sum;
        emit NNRewardClaimed(address(msg.sender), share);
     
        INestPool(C_NestPool).withdrawNest(address(this), share);
        require(ERC20(C_NestToken).transfer(address(msg.sender), share), "transfer fail!");
        
        return;
    }

    /// @notice Settle rewards for two NN holders
    /// @dev The function is for callback from NNToken. It is banned for contracts.
    /// @param from The address of the NN sender 
    /// @param to The address of the NN receiver 
    function settleNNReward(address from, address to) internal
    {
        require(flag == NNREWARD_FLAG_ACTIVE, "Nest:NN:!flag");

        uint256 fromBlnc = ERC20(C_NNToken).balanceOf(address(from));
        require (fromBlnc > 0, "Nest:NN:!(fromBlnc)");
        uint256 sum = NN_reward_sum;
        uint256 total = NN_total_supply;

        uint256 fromReward = sum.sub(NN_reward_sum_checkpoint[from]).mul(fromBlnc).div(total);      
        NN_reward_sum_checkpoint[from] = sum;      
       
        uint256 toBlnc = ERC20(C_NNToken).balanceOf(address(to));
        uint256 toReward = sum.sub(NN_reward_sum_checkpoint[to]).mul(toBlnc).div(total);
        NN_reward_sum_checkpoint[to] = sum;
        
        if (fromReward > 0) {
            INestPool(C_NestPool).withdrawNest(address(this), fromReward);
            require(ERC20(C_NestToken).transfer(from, fromReward), "transfer fail!");
            emit NNRewardClaimed(from, uint128(fromReward));
        }

        if (toReward > 0) { 
            INestPool(C_NestPool).withdrawNest(address(this), toReward);
            require(ERC20(C_NestToken).transfer(to, toReward), "transfer fail!");
            emit NNRewardClaimed(to, uint128(toReward));
        }

        return;
    }

    /// @dev The callback function called by NNToken.transfer()
    /// @param fromAdd The address of 'from' to transfer
    /// @param toAdd The address of 'to' to transfer
    function nodeCount(address fromAdd, address toAdd) 
        override
        external
        // updateNNReward1
        onlyBy(address(C_NNToken)) 
    {
        settleNNReward(fromAdd, toAdd);
        return;
    }

    /// @notice Show the amount of rewards unclaimed
    /// @return reward The reward of a NN holder
    function unclaimedNNReward() override external view returns (uint256 reward) 
    {
        uint256 blnc = ERC20(C_NNToken).balanceOf(address(msg.sender));
        uint256 sum = uint256(NN_reward_sum);
        uint256 total = uint256(NN_total_supply);
     
        reward = sum.sub(NN_reward_sum_checkpoint[address(msg.sender)]).mul(blnc).div(total);

    }

}