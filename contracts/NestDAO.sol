// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./iface/INestDAO.sol";


/// @dev The contract is for redeeming nest token and getting ETH in return
contract NestDAO is INestDAO {

    using SafeMath for uint256;

    uint8 public flag;       // = 0: uninitialized
                            // = 1: active
                            // = 2: withdraw forbidden
                            // = 3: paused 
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

    /// @dev Mapping from ntoken => amount (of ntokens owned by DAO)
    mapping(address => uint256) public ntokenLedger;

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

    function setGovernance(address _gov) external onlyGovernance
    {
        governance = _gov;
    }

    /// @notice 
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
        ntokenLedger[C_NestToken] += amount;
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
        return;
    }

}