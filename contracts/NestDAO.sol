// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./lib/TransferHelper.sol";
import "./lib/ReentrancyGuard.sol";


import "./iface/INestMining.sol";
import "./iface/INToken.sol";
import "./iface/INestPool.sol";
import "./iface/INestDAO.sol";
import "./iface/INestStaking.sol";


/// @dev The contract is for redeeming nest token and getting ETH in return
contract NestDAO is INestDAO, ReentrancyGuard {

    using SafeMath for uint256;

    uint8 public flag;       // = 0: uninitialized
                            // = 1: active
                            // = 2: withdraw forbidden
                            // = 3: paused 
    uint32 private startedBlock;
    uint248 private _reserved;

    uint256 public ntokenRepurchaseThreshold;

    uint8 constant DAO_FLAG_UNINITIALIZED    = 0;
    uint8 constant DAO_FLAG_INITIALIZED      = 1;
    uint8 constant DAO_FLAG_ACTIVE           = 2;
    uint8 constant DAO_FLAG_NO_STAKING       = 3;
    uint8 constant DAO_FLAG_PAUSED           = 4;

    address public governance;

    address private C_NestPool;
    address private C_NestToken;
    address private C_NestMining;
    address private C_NestStaking;
    address private C_NestQuery;

    uint256 constant DAO_REPURCHASE_PRICE_DEVIATION = 5;  // price deviation < 5% 
    uint256 constant DAO_REPURCHASE_NTOKEN_TOTALSUPPLY = 200_000_000;  // price deviation < 5% 

    struct Ledger {
        uint128 rewardedAmount;
        uint128 redeemedAmount;
        uint128 quotaAmount;
        uint32  lastBlock;
    }

    /// @dev Mapping from ntoken => amount (of ntokens owned by DAO)
    mapping(address => Ledger) public ntokenLedger;

    /// @dev Mapping from ntoken => amount (of ethers owned by DAO)
    mapping(address => uint256) public ethLedger;

    /* ========== CONSTRUCTOR ========== */

    receive() external payable {}

    // NOTE: to support open-zeppelin/upgrades, leave it blank
    constructor() public { }

    /// @dev It is called by the proxy (open-zeppelin/upgrades), only ONCE!
    function initialize(address NestPool) external 
    {
        require(flag == DAO_FLAG_UNINITIALIZED, "Nest:DAO:!flag");
        governance = msg.sender;
        flag = DAO_FLAG_INITIALIZED;
        C_NestPool = NestPool;
        ntokenRepurchaseThreshold = DAO_REPURCHASE_NTOKEN_TOTALSUPPLY;
    }


    /* ========== MODIFIERS ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:DAO:!governance");
        _;
    }

    modifier onlyGovOrBy(address _contract) 
    {
        require(msg.sender == governance || msg.sender == _contract, "Nest:DAO:!sender");
        _;
    }

    modifier whenActive() 
    {
        require(flag == DAO_FLAG_ACTIVE, "Nest:DAO:!flag");
        _;
    }

    /* ========== GOVERNANCE ========== */

    /// @dev Ensure that all governance-addresses be consistent with each other
    function loadGovernance() override external 
    { 
        governance = INestPool(C_NestPool).governance();
    }

    /// @dev The function loads all nest-contracts, it is supposed to be called by NestPool
    function loadContracts() override external onlyGovOrBy(C_NestPool)
    {
        C_NestToken = INestPool(C_NestPool).addrOfNestToken();
        C_NestStaking = INestPool(C_NestPool).addrOfNestStaking();
        C_NestQuery = INestPool(C_NestPool).addrOfNestQuery();
        C_NestMining = INestPool(C_NestPool).addrOfNestMining();
    }

    function start() external onlyGovernance
    {  
        require(flag == DAO_FLAG_INITIALIZED, "Nest:DAO:!flag");
        ERC20(C_NestToken).approve(C_NestStaking, uint(-1));
        startedBlock = uint32(block.number);
        flag = DAO_FLAG_ACTIVE;
        emit FlagSet(address(msg.sender), uint256(DAO_FLAG_ACTIVE));
    }

    /// @dev Stop service for emergency
    function pause() external onlyGovernance
    {
        flag = DAO_FLAG_PAUSED;
        emit FlagSet(address(msg.sender), uint256(DAO_FLAG_PAUSED));
    }

    /// @dev Resume service 
    function resume() external onlyGovernance
    {
        flag = DAO_FLAG_ACTIVE;
        emit FlagSet(address(msg.sender), uint256(DAO_FLAG_ACTIVE));
    }

    function setParams(uint256 _ntokenRepurchaseThreshold) external onlyGovernance
    {
        ntokenRepurchaseThreshold = _ntokenRepurchaseThreshold;
    }

    function totalRewards(address ntoken)
        external view returns (uint256) 
    {
       return  ethLedger[ntoken];
    }

    /* ========== MAIN ========== */

    function addETHReward(address ntoken) 
        override 
        external 
        payable 
    {
        ethLedger[ntoken] = ethLedger[ntoken].add(msg.value);
    }

    /// @dev (Obsolete) 
    function addNestReward(uint256 amount) 
        override 
        external 
        onlyGovOrBy(C_NestMining)
    {
        Ledger storage it = ntokenLedger[C_NestToken];
        it.redeemedAmount = uint128(uint256(it.redeemedAmount) + amount);
    }

    /// @dev Collect ethers from NestStaking & NestQuery
    function collectNestReward() public returns(uint256)
    {
        // withdraw NEST from NestPool (mined by miners)
        uint256 nestAmount = INestPool(C_NestPool).balanceOfTokenInPool(address(this), C_NestToken);
        INestPool(C_NestPool).withdrawNest(address(this), nestAmount);

        Ledger storage lg = ntokenLedger[C_NestToken];
        lg.rewardedAmount = uint128(uint256(lg.rewardedAmount) + nestAmount);

        return nestAmount;
    }


    /// @dev Collect ethers from NestStaking & NestQuery
    function collectETHReward(address ntoken) public returns (uint256)
    {
        // check if ntoken is a NTOKEN
        address _ntoken = INestPool(C_NestPool).getNTokenFromToken(ntoken);
        require (_ntoken == ntoken, "Nest:DAO:!ntoken");

        uint256 ntokenAmount = ERC20(ntoken).balanceOf(address(this));

        // stake new NEST/NTOKENs into StakingPool
        INestStaking(C_NestStaking).stake(ntoken, ntokenAmount);

        // claim rewards from StakingPool 
        uint256 _rewards = INestStaking(C_NestStaking).claim(ntoken);
        ethLedger[ntoken] = ethLedger[ntoken].add(_rewards);

        return _rewards;
    }

    /// @dev Redeem ntokens for ethers
    function redeem(address ntoken, uint256 amount) 
        external nonReentrant whenActive
    {
        // check if ntoken is a NTOKEN
        address _ntoken = INestPool(C_NestPool).getNTokenFromToken(ntoken);
        require (_ntoken == ntoken, "Nest:DAO:!ntoken");

        require(INToken(ntoken).totalSupply() >= ntokenRepurchaseThreshold, "Nest:DAO:!total");

        // check if there is sufficient ethers for repurchase
        uint256 bal = ethLedger[ntoken];
        require(bal > 0, "Nest:DAO:!bal");

        //  calculate the accumulated amount of NEST/NTOKEN available to repurchasing
        Ledger memory it = ntokenLedger[ntoken];
        uint256 _acc;
        {
            uint256 n = (ntoken == C_NestToken) ? (1000) : (10);
            uint256 intv = (it.lastBlock == 0) ? 
                (block.number).sub(startedBlock) : (block.number).sub(uint256(it.lastBlock));
            _acc = (n * intv > 300_000)? 300_000 : (n * intv);
        }

        // check if the price of NEST/NTOKEN deviates from the average
        (uint256 price, uint256 avgPrice, int128 vola, uint32 bn) = 
            INestMining(C_NestMining).priceAvgAndSigmaOf(ntoken);
        {
            uint256 diff = price > avgPrice? (price - avgPrice) : (avgPrice - price);
            require(diff.mul(100) < avgPrice.mul(DAO_REPURCHASE_PRICE_DEVIATION), "Nest:DAO:!diff");
        }

        // check if there is sufficient quota for repurchase
        uint256 quota = _acc.mul(1e18).add(it.quotaAmount);
        require (amount < quota, "Nest:DAO:!quota");
        require (amount.mul(1e18).div(price) < bal, "Nest:DAO:!bal2");

        // update the ledger
        it.redeemedAmount += uint128(amount);
        it.quotaAmount = uint128(quota.sub(amount));
        it.lastBlock = uint32(block.number);
        ntokenLedger[ntoken] = it;

        // transactions
        ERC20(ntoken).transferFrom(address(msg.sender), address(this), amount);
        TransferHelper.safeTransferETH(msg.sender, amount.mul(1e18).div(price));

    }

    function quota(address ntoken) public returns (uint256) 
    {
        return 0;
    }

}