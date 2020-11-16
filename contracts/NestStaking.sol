// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./lib/AddressPayable.sol";
import "./iface/IBonusPool.sol";
import "./lib/SafeERC20.sol";
import "./iface/INestStaking.sol";
import "./lib/ReentrancyGuard.sol";
import './lib/TransferHelper.sol';
import "hardhat/console.sol";

/// @title NNRewardPool
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>

contract NestStaking is INestStaking, ReentrancyGuard {

    using SafeMath for uint256;

    /// @dev  The flag of staking global state
    ///     bits[0]: open 
    ///     bits[1]: staking 
    ///     bits[2]: unstaking  
    ///     bits[3]: claiming 
    ///     bits[4]: reward
    uint8 private _state; 
    
    /// @dev The percentage of dividends 
    ///      - 80% to Nest/NToken holders as dividend
    ///      - 20% to saving for buying back (future)
    uint8 private _dividend_share = 80;

    address private _C_NestToken;

    address public governance;

    /// @dev The balance of savings w.r.t a ntoken(or nest-token)
    ///     _pending_saving_Amount: ntoken => saving amount
    mapping(address => uint256) private _pending_saving_amount;

    /// @dev The per-ntoken-reward (ETH) w.r.t a ntoken(or nest-token)
    ///     _reward_per_ntoken_stored: ntoken => amount
    mapping(address => uint256) private _reward_per_ntoken_stored;

    // _reward_per_ntoken_claimed: (ntoken, acount, amount) => amount
    mapping(address => mapping(address => uint256)) _reward_per_ntoken_claimed;

    // ntoken => last reward 
    mapping(address => uint256) public lastRewardsTotal;

    // _ntoken_total: ntoken => amount
    mapping(address => uint256) _ntoken_staked_total;

    // _staked_balances: (ntoken, account) => amount
    mapping(address => mapping(address => uint256)) private _staked_balances;

    // rewardsTotal: (ntoken) => amount
    mapping(address => uint256) public rewardsTotal;
    
    // _rewards_balances: (ntoken, account) => amount
    mapping(address => mapping(address => uint256)) public rewardBalances;

    /* ========== EVENTS ========== */

    event RewardAdded(address ntoken, address sender, uint256 reward);
    event NTokenStaked(address ntoken, address indexed user, uint256 amount);
    event NTokenUnstaked(address ntoken, address indexed user, uint256 amount);
    event SavingWithdrawn(address ntoken, address indexed to, uint256 amount);
    event RewardClaimed(address ntoken, address indexed user, uint256 reward);

    /* ========== CONSTRUCTOR ========== */

    constructor(address _nestToken) public 
    {
        _C_NestToken = _nestToken;
        governance = msg.sender;
        _state = 0;
    }

    receive() external payable {}

    /* ========== GOVERNANCE ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:Stak:!gov");
        _;
    }

    function setGovernance(address _newGov) external onlyGovernance
    {
        governance = _newGov;
    }

    function setState(uint8 _newSt) external onlyGovernance
    {
        _state = _newSt;
    }
    
    function state() external onlyGovernance returns (uint8)
    {
        return _state;
    }

    function withdrawSavingByGov(address ntoken, address to, uint256 amount) 
        external 
        nonReentrant 
        onlyGovernance 
    {
        _pending_saving_amount[ntoken] = _pending_saving_amount[ntoken].sub(amount);
        TransferHelper.safeTransferETH(to, amount);

        // must refresh WETH balance record after updating WETH balance
        // or lastRewardsTotal could be less than the newest WETH balance in the next update
        uint256 _newTotal = rewardsTotal[ntoken].sub(amount);
        lastRewardsTotal[ntoken] = _newTotal;
        rewardsTotal[ntoken] = _newTotal;
        emit SavingWithdrawn(ntoken, to, amount);
    }

    /* ========== VIEWS ========== */
    // 
    function totalStaked(address ntoken) 
        external override view returns (uint256) 
    {
        return _ntoken_staked_total[ntoken];
    }

    function stakedBalanceOf(address ntoken, address account) 
        external override view returns (uint256) 
    {
        return _staked_balances[ntoken][account];
    }

    // CM: <token收益> = <token原收益> + (<新增总收益> * 80% / <token总锁仓量>) 
    function rewardPerToken(address ntoken) 
        public 
        view 
        returns (uint256) 
    {
        uint256 _total = _ntoken_staked_total[ntoken];
        if (_total == 0) {
            // use the old rewardPerTokenStored
            // if not, the new accrued amount will never be distributed to anyone
            return _reward_per_ntoken_stored[ntoken];
        }
        uint256 _rewardPerToken = _reward_per_ntoken_stored[ntoken].add(
                accrued(ntoken).mul(1e18).mul(_dividend_share).div(_total).div(100)
            );
        return _rewardPerToken;
    }

    // CM: <新增总收益> = <rewardToken 余额> - <上次余额>
    function accrued(address ntoken) 
        public 
        view 
        returns (uint256) 
    {
        // eth increment of eth since last update
        uint256 _newest = rewardsTotal[ntoken];
        // lastest must be larger than lastUpdate
        return _newest.sub(lastRewardsTotal[ntoken]); 
    }

    // CM: <用户收益> = [<用户token锁仓> * (<token收益> - <用户已领收益>) / 1e18] + <用户奖励>
    function earned(address ntoken, address account) 
        public 
        view 
        returns (uint256) 
    {
        return _staked_balances[ntoken][account].mul(
                        rewardPerToken(ntoken).sub(_reward_per_ntoken_claimed[ntoken][account])
                    ).div(1e18).add(rewardBalances[ntoken][account]);
    }

    // calculate
    function _rewardPerTokenAndAccrued(address ntoken) 
        internal
        view 
        returns (uint256, uint256) 
    {
        uint256 _total = _ntoken_staked_total[ntoken];
        if (_total == 0) {
            // use the old rewardPerTokenStored, and accrued should be zero here
            // if not the new accrued amount will never be distributed to anyone
            return (_reward_per_ntoken_stored[ntoken], 0);
        }
        uint256 _accrued = accrued(ntoken);
        uint256 _rewardPerToken = _reward_per_ntoken_stored[ntoken].add(
                _accrued.mul(1e18).mul(_dividend_share).div(_total).div(100) 
            ); // 50% of accrued to CoFi holders as dividend
        return (_rewardPerToken, _accrued);
    }

    /* ========== STAK/UNSTAK/CLAIM ========== */

    modifier updateReward(address ntoken, address account) 
    {
        uint256 _total = _ntoken_staked_total[ntoken];
        uint256 _accrued = rewardsTotal[ntoken].sub(lastRewardsTotal[ntoken]);
        uint256 _rewardPerToken;      

        if (_total == 0) {
            // use the old rewardPerTokenStored, and accrued should be zero here
            // if not the new accrued amount will never be distributed to anyone
            _rewardPerToken = _reward_per_ntoken_stored[ntoken];
        } else {
            // 50% of accrued to CoFi holders as dividend
            _rewardPerToken = _reward_per_ntoken_stored[ntoken].add(
                _accrued.mul(1e18).mul(_dividend_share).div(_total).div(100) 
            );
            // update _reward_per_ntoken_stored
            _reward_per_ntoken_stored[ntoken] = _rewardPerToken;
            lastRewardsTotal[ntoken] = rewardsTotal[ntoken];
            uint256 _newSaving = _accrued.sub(_accrued.mul(_dividend_share).div(100)); // left 50%
            _pending_saving_amount[ntoken] = _pending_saving_amount[ntoken].add(_newSaving);
        }

        uint256 _newEarned = _staked_balances[ntoken][account].mul(
                _rewardPerToken.sub(_reward_per_ntoken_claimed[ntoken][account])
            ).div(1e18);

        if (account != address(0)) { // 问题：为何要判断 address 为 0 的情况？
            rewardBalances[ntoken][account] = rewardBalances[ntoken][account].add(_newEarned);
            _reward_per_ntoken_claimed[ntoken][account] = _reward_per_ntoken_stored[ntoken];
        }
        _;
    }

    /// @notice Stake NTokens to get the dividends
    function stake(address ntoken, uint256 amount) 
        external 
        override 
        nonReentrant 
        updateReward(ntoken, msg.sender) 
    {
        require(_state & 0x02 == 0, "Nest:Stak:!state");
        require(amount > 0, "Nest:Stak:!amount");
        _ntoken_staked_total[ntoken] = _ntoken_staked_total[ntoken].add(amount);
        _staked_balances[ntoken][msg.sender] = _staked_balances[ntoken][msg.sender].add(amount);
        TransferHelper.safeTransferFrom(ntoken, msg.sender, address(this), amount);
        emit NTokenStaked(ntoken, msg.sender, amount);
    }

    /// @notice Unstake NTokens
    function unstake(address ntoken, uint256 amount) 
        public 
        override 
        nonReentrant 
        updateReward(ntoken, msg.sender)
    {
        require(_state & 0x04 == 0, "Nest:Stak:!state");
        require(amount > 0, "Nest:Stak:!amount");
        _ntoken_staked_total[ntoken] = _ntoken_staked_total[ntoken].sub(amount);
        _staked_balances[ntoken][msg.sender] = _staked_balances[ntoken][msg.sender].sub(amount);
        TransferHelper.safeTransfer(ntoken, msg.sender, amount);
        emit NTokenUnstaked(ntoken, msg.sender, amount);
    }

    /// @notice Claim rewards
    function claim(address ntoken) 
        public 
        override 
        nonReentrant 
        updateReward(ntoken, msg.sender) 
    {
        require(_state & 0x08 == 0, "Nest:Stak:!state");
        uint256 _reward = rewardBalances[ntoken][msg.sender];
        if (_reward > 0) {
            rewardBalances[ntoken][msg.sender] = 0;
            // WETH balance decreased after this
            TransferHelper.safeTransferETH(msg.sender, _reward);
            // must refresh WETH balance record after updating WETH balance
            // or lastRewardsTotal could be less than the newest WETH balance in the next update
            uint256 _newTotal = rewardsTotal[ntoken].sub(_reward);
            lastRewardsTotal[ntoken] = _newTotal;
            rewardsTotal[ntoken] = _newTotal;
            emit RewardClaimed(ntoken, msg.sender, _reward);
        }
    }

    /* ========== INTER-CALLS ========== */

    function addETHReward(address ntoken) 
        external 
        payable 
        override 
    {
        require(_state & 0x10 == 0, "Nest:Stak:!_state");
        // NOTE: no need to update reward here
        // support for sending ETH for rewards
        rewardsTotal[ntoken] = rewardsTotal[ntoken].add(msg.value); 
    }

}
