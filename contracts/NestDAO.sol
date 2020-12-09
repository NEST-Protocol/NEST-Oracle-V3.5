// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./iface/INestMining.sol";
import "./iface/INestPool.sol";
import "./iface/INestDAO.sol";


/// @dev The contract is for redeeming nest token and getting ETH in return
contract NestDAO is INestDAO {

    using SafeMath for uint256;

    uint8 public flag;       // = 0: uninitialized
                            // = 1: active
                            // = 2: withdraw forbidden
                            // = 3: paused 
    uint32 private startedBlock;
    uint248 private _reserved;

    uint8 constant DAO_FLAG_UNINITIALIZED    = 0;
    uint8 constant DAO_FLAG_ACTIVE           = 1;
    uint8 constant DAO_FLAG_NO_STAKING       = 2;
    uint8 constant DAO_FLAG_PAUSED           = 3;

    address public governance;

    address private C_NestPool;
    address private C_NestToken;
    address private C_NestMining;
    address private C_NestStaking;
    address private C_NestQuery;

    uint256 constant DAO_REPURCHASE_PRICE_DEVIATION = 5;  // %5

    struct Item {
        uint128 redeemedAmount;
        uint128 quotaAmount;
        uint32  lastBlock;
    }
    /// @dev Mapping from ntoken => amount (of ntokens owned by DAO)
    mapping(address => Item) public ntokenLedger;

    /// @dev Mapping from ntoken => amount (of ethers owned by DAO)
    mapping(address => uint256) public ethLedger;

    /* ========== CONSTRUCTOR ========== */

    receive() external payable {}

    // NOTE: to support open-zeppelin/upgrades, leave it blank
    constructor() public { }

    /// @dev It is called by the proxy (open-zeppelin/upgrades), only ONCE!
    function initialize(address NestPool) external 
    {
        require(flag == DAO_FLAG_UNINITIALIZED, "Nest:Stak:!flag");
        governance = msg.sender;
        flag = DAO_FLAG_ACTIVE;
        C_NestPool = NestPool;
    }


    /* ========== MODIFIERS ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:NTC:!governance");
        _;
    }

    modifier onlyGovOrBy(address _contract) 
    {
        require(msg.sender == governance || msg.sender == _contract, "Nest:Mine:!sender");
        _;
    }

    modifier whenActive() 
    {
        require(flag == DAO_FLAG_ACTIVE, "Nest:Stak:!flag");
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

    function addNestReward(uint256 amount) 
        override 
        external 
        onlyGovOrBy(C_NestMining)
    {
        Item storage it = ntokenLedger[C_NestToken];
        it.redeemedAmount = uint128(uint256(it.redeemedAmount) + amount);
    }

    /// @dev Collect ethers from NestStaking & NestQuery
    function collectETHReward() external onlyGovernance
    {
        // TODO:
        return;
    }

    /// @dev Redeem ntokens for ethers
    function redeem(address ntoken, uint256 amount) external
    {
        uint256 bal = ethLedger[ntoken];
        require(bal > 0, "Nest:DAO:!bal");

        Item memory it = ntokenLedger[ntoken];
        uint256 _acc;
        {
            uint256 n = (ntoken == C_NestToken) ? (1000) : (10);
            uint256 intv = (it.lastBlock == 0) ? 
                (block.number).sub(startedBlock) : (block.number).sub(uint256(it.lastBlock));
            _acc = (n * intv > 300_000)? 300_000 : (n * intv);
        }

        (uint256 price, uint256 avgPrice, int128 vola, uint32 bn) = 
            INestMining(C_NestMining).priceAvgAndSigmaOf(ntoken);
        {
            uint256 diff = price > avgPrice? (price - avgPrice) : (avgPrice - price);
            require(diff.mul(100) < avgPrice.mul(DAO_REPURCHASE_PRICE_DEVIATION), "Nest:DAO:!diff");
        }


        uint256 quota = _acc.add(it.quotaAmount);
        require (amount < (quota*1e18), "Nest:DAO:!quota");
        require (amount.mul(1e18).div(price) < bal, "Nest:DAO:!bal2");

        ERC20(C_NestToken).transferFrom(address(msg.sender), address(this), amount);
        it.redeemedAmount += uint128(amount);
        it.quotaAmount = uint128(quota.sub(amount));
        it.lastBlock = uint32(block.number);
    }

}