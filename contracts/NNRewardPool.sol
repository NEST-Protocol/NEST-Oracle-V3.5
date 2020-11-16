// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./iface/INestMining.sol";
// import "./iface/INToken.sol";
// import "./NestMining.sol";
import "./iface/INNRewardPool.sol";
import "hardhat/console.sol";

/// @title NNRewardPool
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>

/// @notice The NNRewardPool contract distributes the mining rewards,
///     15% share of the amount of nest-token produced by miners
/// @dev The nest-tokens are put in NestPool. This contract only traces 
///     the sum-amount of all of the rewards (nest-token)
contract NNRewardPool is INNRewardPool {
    using SafeMath for uint256;

    uint8   public flag;    // | 1: active 
                            // | 2: only claims are allowed
                            // | 3: shutdown

    uint256 public NN_reward_sum;
    uint256 public NN_total_supply;

    address _C_NNToken;
    address _C_NestToken;
    address _C_NestPool;
    address _C_NestMining;

    address public governance;

    uint256 constant DEV_REWARD_PERCENTAGE   = 5;
    uint256 constant NN_REWARD_PERCENTAGE    = 15;
    uint256 constant MINER_REWARD_PERCENTAGE = 80;

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
    /// @param NestToken The address of Nest Token Contract
    /// @param NNToken The address of NestNode Token Contract
    constructor(address NestToken, address NNToken) public
    {
        _C_NestToken = NestToken;
        _C_NNToken = NNToken;
        NN_total_supply = uint128(ERC20(_C_NNToken).totalSupply());
        governance = msg.sender;
        flag = 0;
    }

    modifier onlyBy(address _account)
    {
        require(msg.sender == _account,
            "Nest:NN:!Auth");
        _;
    }

    modifier noContract() 
    {
        require(address(msg.sender) == address(tx.origin), 
        "Nest:NN:BAN(contract)");
        _;
    }


    /* ========== GOVERNANCE ========== */

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

    /// @notice 
    function loadContracts(address NestToken, address NNToken, address NestPool, address NestMining) 
        public onlyBy(governance)
    {
        if (NestToken != address(0)) {
            _C_NestToken = NestToken;
        } 
        if (NNToken != address(0)) {
            _C_NNToken = NNToken;
        }
        if (NestPool != address(0)) {
            _C_NestPool = NestPool;
        }
        if (NestMining != address(0)) {
            _C_NestMining = NestMining;
        }
    }

    function setNNRewardSum(uint256 sum) external onlyGovernance
    {
        NN_reward_sum = uint128(sum);
    }

    function setNNRewardSumCheckpoint(address node, uint256 sum) external onlyGovernance 
    {
        if (sum > 0) {
            NN_reward_sum_checkpoint[node] = sum;
        }
    }

    function setFlag(uint8 newFlag) external onlyGovernance
    {
        flag = newFlag;
    }

    /* ========== ADDING REWARDS ========== */


    /// @notice Add rewards for Nest-Nodes, only governance or NestMining (contract) are allowed
    /// @dev [Obseleted] The rewards need to pull from NestPool
    /// @param _amount The amount of Nest token as the rewards to each nest-node
    function addNNReward(uint256 _amount) override external onlyGovOrBy(_C_NestMining)
    {
        require(flag < 2, "Nest:NN:!flag");

        // uint256 _amount = _C_NestPool.balanceOfNestInPool(address(this));
        if (_amount > 0) {
            uint256 _newSum = uint256(NN_reward_sum).add(_amount);
            NN_reward_sum = uint128(_newSum);
            emit NNRewardAdded(_amount, _newSum);
        }
        return;
    }

    /// @dev The updator is to update the sum of NEST tokens mined in NestMining
    /// DISCUSSION: when shall we notify updator ??
    function updateNNReward() external
    {
        require(flag < 2, "Nest:NN:!flag");

        uint256 _allMined = INestMining(_C_NestMining).minedNestAmount();
        if (_allMined > NN_reward_sum) {
            uint256 _amount = _allMined.mul(NN_REWARD_PERCENTAGE).div(100).sub(NN_reward_sum);
            uint256 _newSum = uint256(NN_reward_sum).add(_amount);
            NN_reward_sum = uint128(_newSum);
            emit NNRewardAdded(_amount, _newSum);
        }
    }


    /* ========== claim/settle ========== */


    /// @notice Claim rewards by Nest-Nodes
    /// @dev The rewards need to pull from NestPool
    function claimNNReward() override external noContract
    {
        require(flag < 3, "Nest:NN:!flag");

        uint256 blnc =  ERC20(_C_NNToken).balanceOf(address(msg.sender));
        require(blnc > 0, "Nest:NN:!(NNToken)");
        uint256 total = NN_total_supply;
        uint256 sum = NN_reward_sum;
        uint256 reward = sum.sub(NN_reward_sum_checkpoint[address(msg.sender)]);
        uint256 share = reward.mul(blnc).div(total);

        INestPool(_C_NestPool).withdrawNest(address(this), share);
        ERC20(_C_NestToken).transfer(address(msg.sender), share);
        NN_reward_sum_checkpoint[address(msg.sender)] = sum;

        emit NNRewardClaimed(address(msg.sender), share);
        
        return;
    }

    function settleNNReward(address from, address to) internal 
    {
        require(flag < 3, "Nest:NN:!flag");

        uint256 fromBlnc = ERC20(_C_NNToken).balanceOf(address(from));
        require (fromBlnc > 0, "Nest:NN:!(fromBlnc)");
        uint256 sum = NN_reward_sum;
        uint256 total = NN_total_supply;
        uint256 fromReward = sum.sub(NN_reward_sum_checkpoint[from]).mul(fromBlnc).div(total);
        if (fromReward > 0) {
            INestPool(_C_NestPool).withdrawNest(address(this), fromReward);
            ERC20(_C_NestToken).transfer(from, fromReward);
        }
        NN_reward_sum_checkpoint[from] = NN_reward_sum_checkpoint[from].add(sum);

        uint256 toBlnc = ERC20(_C_NNToken).balanceOf(address(to));
        uint256 toReward = sum.sub(NN_reward_sum_checkpoint[to]).mul(toBlnc).div(total);

        if (toReward > 0) { 
            INestPool(_C_NestPool).withdrawNest(address(this), toReward);
            ERC20(_C_NestToken).transfer(to, toReward);
        }
        NN_reward_sum_checkpoint[to] = NN_reward_sum_checkpoint[to].add(sum);

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
        uint256 blnc = ERC20(_C_NNToken).balanceOf(address(msg.sender));
        uint256 sum = uint256(NN_reward_sum);
        uint256 total = uint256(NN_total_supply);
        console.log("blnc=%s, total=%s", blnc, total);
        reward = sum.sub(NN_reward_sum_checkpoint[address(msg.sender)]).mul(blnc).div(total);
    }

}