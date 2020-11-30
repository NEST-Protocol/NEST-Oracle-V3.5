// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./iface/INestDAO.sol";


/// @dev The contract is for redeeming nest token and getting ETH in return
contract NestDAO is INestDAO {

    using SafeMath for uint256;

    address public governance;

    address private C_NestPool;
    address private C_NestToken;
    address private C_NestStaking;
    address private C_NestQuery;


    mapping(address => uint256) public ntokenAmount;

    mapping(address => uint256) public ethLedger;

    constructor (address NestPool) public 
    {
        governance = address(msg.sender);
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
    }

    /* ========== MAIN ========== */

    function addETHReward(address ntoken) 
        override 
        external 
        payable 
    {
        ethLedger[ntoken] = ethLedger[ntoken].add(msg.value);
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