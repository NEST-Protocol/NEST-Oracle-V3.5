// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./lib/AddressPayable.sol";

import "./iface/INestPool.sol";

import "./lib/SafeERC20.sol";
import "./lib/ReentrancyGuard.sol";
import './lib/TransferHelper.sol';

/// @title NestVote
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>

contract NestVote is ReentrancyGuard {

    using SafeMath for uint256;

    /* ========== STATE ============== */

    uint32 voteDuration = 7 days;
    uint32 acceptance = 51;
    uint256 proposalStaking = 100_000 * 1e18;

    struct Proposal {
        uint32 state;  // 0: proposed | 1: accepted | 2: rejected
        uint32 startTime;
        uint32 endTime;
        uint64 voters;
        uint128 stakedNestAmount;
        address contractAddr;
        address proposer;
        address executor;
    }
    
    Proposal[] public proposalList;
    mapping(uint256 => mapping(address => uint256)) public stakedNestAmount;

    address private C_NestToken;
    address private C_NestPool;
    address private C_NestDAO;

    address public governance;

    /* ========== EVENTS ========== */

    event NIPSubmitted(address proposer, uint256 id);
    event NIPVoted(address voter, uint256 amount);

    /* ========== CONSTRUCTOR ========== */

    receive() external payable {}

    // NOTE: to support open-zeppelin/upgrades, leave it blank
    constructor() public
    {  }


    /* ========== MODIFIERS ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance);
        _;
    }

    modifier noContract() 
    {
        require(address(msg.sender) == address(tx.origin), "Nest:Vote:BAN(contract)");
        _;
    }

    /* ========== GOVERNANCE ========== */

    function loadGovernance() external 
    { 
        governance = INestPool(C_NestPool).governance();
    }

    function loadContracts() public onlyGovernance
    {
        C_NestToken = INestPool(C_NestPool).addrOfNestToken();
        C_NestDAO = INestPool(C_NestPool).addrOfNestDAO();
    }

    function releaseGovTo(address gov) public onlyGovernance
    {
        governance = gov;
    }

    function setParams(uint32 voteDuration_, uint32 acceptance_, uint256 proposalStaking_) 
        public onlyGovernance
    {
        acceptance = acceptance_;
        voteDuration = voteDuration_;
        proposalStaking = proposalStaking_;
    }

    /* ========== VOTE ========== */
    
    function propose(address contract_) external
    {
        uint256 id = proposalList.length;
        proposalList.push(Proposal(
            uint32(0),                   // state
            uint32(block.timestamp),    //startTime
            uint32(block.timestamp + voteDuration),  //endTime
            uint64(0),                  // voters
            uint128(0),                 // stakedNestAmount
            contract_,                 //contractAddr
            address(msg.sender),        // proposer
            address(0)                 // executor
         ));

        ERC20(C_NestToken).transferFrom(address(msg.sender), address(this), proposalStaking);

        emit NIPSubmitted(msg.sender, id);
    }

    function vote(uint256 id, uint256 amount) external noContract
    {
        Proposal memory p = proposalList[id];
        uint256 blncs = stakedNestAmount[id][address(msg.sender)];
        stakedNestAmount[id][address(msg.sender)] = blncs.add(amount); 
        p.stakedNestAmount = uint128(uint256(p.stakedNestAmount).add(amount));
        if (blncs == 0) {
            p.voters = uint64(uint256(p.voters).add(1));

        }
        proposalList[id] = p;

        ERC20(C_NestToken).transferFrom(address(msg.sender), address(this), amount);
    }

    function withdraw(uint256 id) external noContract
    {
        Proposal memory p = proposalList[id];
        require (p.state > 0, "Nest:Vote:!state");

        uint256 blnc = stakedNestAmount[id][address(msg.sender)];
        p.stakedNestAmount = uint128(uint256(p.stakedNestAmount).sub(blnc));
        stakedNestAmount[id][address(msg.sender)] = 0;

        proposalList[id] = p;

        ERC20(C_NestToken).transfer(address(msg.sender), blnc);
    }

    function revoke(uint256 id, uint256 amount) external noContract
    {
        Proposal memory p = proposalList[id];
        require (p.state == 0, "Nest:Vote:!state");
        require (block.timestamp < p.endTime, "Nest:Vote:!time");

        uint256 blnc = stakedNestAmount[id][address(msg.sender)];
        require(blnc >= amount, "Nest:Vote:!amount"); 
        if (blnc == amount) {
            p.voters = uint64(uint256(p.voters).sub(1));
        }

        p.stakedNestAmount = uint128(uint256(p.stakedNestAmount).sub(amount));
        stakedNestAmount[id][address(msg.sender)] = blnc.sub(amount);

        proposalList[id] = p;

        ERC20(C_NestToken).transfer(address(msg.sender), amount);
    }

    function execute(uint256 id) external
    {
        uint256 _total = ERC20(C_NestToken).totalSupply();
        uint256 _burned = ERC20(C_NestToken).balanceOf(address(0x1));
        uint256 _repurchased = ERC20(C_NestToken).balanceOf(C_NestDAO);
        uint256 _circulation = _total.sub(_repurchased).sub(_burned);

        Proposal storage p = proposalList[id];
        require (p.state == 0, "Nest:Vote:!state");
        require (p.endTime < block.timestamp, "Nest:Vote:!time");

        if (p.stakedNestAmount > _circulation.mul(acceptance).div(100)) {
            address _contract = p.contractAddr;
            (bool success, bytes memory result) = _contract.delegatecall(abi.encodeWithSignature("run()"));
            require(success, "Nest:Vote:!exec");
            p.state = 1;
        } else {
            p.state = 2;
        }
        p.executor = address(msg.sender);
        
        ERC20(C_NestToken).transfer(p.proposer, proposalStaking);
    }

    function stakedNestNum(uint256 id) public view returns (uint256) 
    {
        Proposal storage p = proposalList[id];
        return (uint256(p.stakedNestAmount).div(1e18));
    }

    function numberOfVoters(uint256 id) public view returns (uint256) 
    {
        Proposal storage p = proposalList[id];
        return (uint256(p.voters));
    }
}