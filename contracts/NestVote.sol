// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";
import "./lib/AddressPayable.sol";

import "./iface/INestMining.sol";
import "./iface/INestPool.sol";
import "./iface/IParamSettable.sol";

import "./lib/SafeERC20.sol";
import "./lib/ReentrancyGuard.sol";
import './lib/TransferHelper.sol';

import "hardhat/console.sol";

/// @title NestVote
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>

contract NestVote is ReentrancyGuard, IParamSettable {

    using SafeMath for uint256;

    /* ========== PARAMETERS ========= */

    uint256 public voteDuration = 7 days;       // index = 1
    uint256 public acceptancePercentage = 51;   // index = 2
    uint256 public proposalStakingAmount = 100_000 * 1e18;  // index = 3
    uint256 public minimalVoteAmount = 1_000 * 1e18;  // index = 4

    uint256 constant PARAM_INDEX_VOTE_DURATION = 1;
    uint256 constant PARAM_INDEX_ACCEPTANCE_PERCENTAGE = 2;
    uint256 constant PARAM_INDEX_PROPOSAL_STAKING_AMOUNT = 3;
    uint256 constant PARAM_INDEX_MINIMAL_VOTE_AMOUNT = 4;

    /* ========== STATE ============== */

    /// @dev 
    struct Proposal {
        uint64 state;  // 0: proposed | 1: revoked | 2: accepted | 3: rejected
        uint64 startTime;
        uint64 endTime;
        uint64 voters;
        uint256 stakedNestAmount;
        uint256 votedNestAmount;
        address proposer;
        address executor;
        address contractAddr;
        bytes args;
        string description;
    }
    
    uint32 constant PROPOSAL_STATE_PROPOSED = 0;
    uint32 constant PROPOSAL_STATE_REVOKED = 1;
    uint32 constant PROPOSAL_STATE_ACCEPTED = 2;
    uint32 constant PROPOSAL_STATE_REJECTED = 3;

    Proposal[] public proposalList;

    /// @dev The ledger keeping NEST amounts staked by voters
    ///   id => voter => amount
    mapping(uint256 => mapping(address => uint256)) public stakedNestLedger;

    address public C_NestToken;
    address public C_NestPool;
    address public C_NestDAO;
    address public C_NestMining;

    address public governance;

    mapping(string => address) private _contractAddress;

    /* ========== EVENTS ========== */

    event NIPSubmitted(address proposer, uint256 id, string desc);
    event NIPVoted(address voter, uint256 id, uint256 amount);
    event NIPUnvoted(address voter, uint256 id, uint256 amount);

    event NIPWithdrawn(address voter, uint256 id, uint256 amount);
    event NIPRevoked(address proposer, uint256 id, string reason);

    event NIPExecuted(address executor, uint256 id, bool success);
    event NIPRun(address alice, string message);

    /* ========== CONSTRUCTOR ========== */

    receive() external payable {}

    /// @dev Constructor of NestVote.
    /// NOTE: This contract doesn't support open-zeppelin/upgrades, because 
    ///   it uses delegatecall.
    /// @param NestPool The address of NestPool contract
    constructor(address NestPool) public
    {  
        governance = msg.sender;
        C_NestPool = NestPool;
        loadContracts();
    }

    /* ========== MODIFIERS ========== */

    modifier onlyGovernance()
    {
        require(msg.sender == governance, "Nest:Vote:!gov");
        _;
    }

    modifier noContract()
    {
        require(address(msg.sender) == address(tx.origin), "Nest:Vote:BAN(contract)");
        _;
    }

    /* ========== GOVERNANCE ========== */

    /// @dev Load governance from NestPool. All contracts shall have only one 
    ///   governance, including NestVote. Well, governance == NestVote.e
    function loadGovernance() external 
    { 
        governance = INestPool(C_NestPool).governance();
    }

    function loadContracts() public
    {
        C_NestToken = INestPool(C_NestPool).addrOfNestToken();
        C_NestDAO = INestPool(C_NestPool).addrOfNestDAO();
        C_NestMining = INestPool(C_NestPool).addrOfNestMining();
    }


    /// @dev The gov of NestPool is exactly NestVote, thus `releaseGovTo()` 
    ///   can only be called through a proposal.
    function releaseGovTo(address gov_) external onlyGovernance
    {
        governance = gov_;
    }

    function setParam(uint256 index, uint256 value) override external onlyGovernance returns (bool) 
    {
        uint256 old;
        if (index == 1) {
            old = voteDuration;
            voteDuration = value;
        } else if (index == 2) {
            old = acceptancePercentage;
            acceptancePercentage = value;
        } else if (index == 3) {
            old = proposalStakingAmount;
            proposalStakingAmount = value;
        } else if (index == 4) {
            old = minimalVoteAmount;
            minimalVoteAmount = value;
        } else {
            return false;
        }

        emit ParamSet(tx.origin, index, old, value);

        return true;
    }

    /* ========== VOTE ========== */
    
    function propose(
            address contract_, 
            bytes calldata args, 
            string memory description_
        ) 
        external
    {
        // check parameter
        require(contract_ != address(0), "Nest:Vote:!contract");

        uint256 id = proposalList.length;
        proposalList.push(Proposal(
            uint64(PROPOSAL_STATE_PROPOSED),        // state
            uint64(block.timestamp),                //startTime
            uint64(block.timestamp + voteDuration), //endTime
            uint64(0),                              // voters
            uint256(proposalStakingAmount),         // stakedNestAmount
            uint256(0),                             // votedNestAmount
            address(msg.sender),                    // proposer
            address(0),                             // executor
            contract_,                              //contractAddr
            args,                                    // arguments
            string(description_)
         ));

        ERC20(C_NestToken).transferFrom(address(msg.sender), address(this), proposalStakingAmount);

        emit NIPSubmitted(msg.sender, id, description_);
    }

    function vote(uint256 id, uint256 amount) external
    {
        // check parameters
        require(id < proposalList.length, "Nest:Vote:!id");
        require(amount >= minimalVoteAmount, "Nest:Vote:!amount");

        // load proposal
        Proposal memory p = proposalList[id];

        // check state
        require(p.state == PROPOSAL_STATE_PROPOSED, "Nest:Vote:!state");

        // check time
        require (block.timestamp <= p.endTime, "Nest:Vote:!time");

        // increase stakedNestAmount and voters
        uint256 _blnc = stakedNestLedger[id][address(msg.sender)];
        stakedNestLedger[id][address(msg.sender)] = _blnc.add(amount); 
        p.votedNestAmount = p.votedNestAmount.add(amount);
        if (_blnc == 0) {
            p.voters = uint64(uint256(p.voters).add(1));
        }
        
        // save proposal
        proposalList[id] = p;

        // stake NEST tokens
        ERC20(C_NestToken).transferFrom(address(msg.sender), address(this), amount);

        emit NIPVoted(msg.sender, id, amount);
    }

    function withdraw(uint256 id) external
    {
        // check parameter
        require(id < proposalList.length, "Nest:Vote:!id");

        // load proposal
        Proposal memory p = proposalList[id];

        // check state
        require(p.state == PROPOSAL_STATE_ACCEPTED 
            || p.state == PROPOSAL_STATE_REJECTED
            || p.state == PROPOSAL_STATE_REVOKED, "Nest:Vote:!state");

        // decrease `stakedNestAmount`
        uint256 _amount = stakedNestLedger[id][address(msg.sender)];
        p.stakedNestAmount = p.stakedNestAmount.sub(_amount);
        stakedNestLedger[id][address(msg.sender)] = 0;

        // save proposal
        proposalList[id] = p;

        ERC20(C_NestToken).transfer(address(msg.sender), _amount);

        emit NIPWithdrawn(msg.sender, id, _amount);
    }

    function unvote(uint256 id) external
    {
        // check parameter
        require(id < proposalList.length, "Nest:Vote:!id");
        
        // load proposal
        Proposal memory p = proposalList[id];

        // check state
        require(p.state == PROPOSAL_STATE_PROPOSED, "Nest:Vote:!state");
        // check time
        require (uint256(block.timestamp) <= uint256(p.endTime), "Nest:Vote:!time");

        // decrease `stakedNestAmount` and `voters`
        uint256 _amount = stakedNestLedger[id][address(msg.sender)];
        p.voters = uint64(uint256(p.voters).sub(1));
        p.votedNestAmount = p.votedNestAmount.sub(_amount);
        stakedNestLedger[id][address(msg.sender)] = 0;

        // save proposal
        proposalList[id] = p;

        // return NEST tokens
        ERC20(C_NestToken).transfer(address(msg.sender), _amount);

        emit NIPUnvoted(msg.sender, id, _amount);
    }

    function execute(uint256 id) external
    {
        require(id < proposalList.length, "Nest:Vote:!id");

        uint256 _total_mined = INestMining(C_NestMining).minedNestAmount();
        uint256 _burned = ERC20(C_NestToken).balanceOf(address(0x1));
        uint256 _repurchased = ERC20(C_NestToken).balanceOf(C_NestDAO);

        uint256 _circulation = _total_mined.sub(_repurchased).sub(_burned);

        Proposal memory p = proposalList[id];
        
        require (p.state == PROPOSAL_STATE_PROPOSED, "Nest:Vote:!state");

        require (p.endTime < block.timestamp, "Nest:Vote:!time");

        bool success = false;
        bool accepted = (p.votedNestAmount >= _circulation.mul(acceptancePercentage).div(100));

        if (accepted) {
            address _contract = p.contractAddr;
            (success, ) = _contract.delegatecall(
                abi.encodeWithSignature(
                    "run(address,bytes)", C_NestPool, p.args
                ));
            require(success, "Nest:Vote:!exec");
            p.state = PROPOSAL_STATE_ACCEPTED;
        } else {
            p.state = PROPOSAL_STATE_REJECTED;
        }
        uint256 _staked = p.stakedNestAmount;
        p.stakedNestAmount = 0;
        p.executor = address(msg.sender);

        proposalList[id] = p;
        
        ERC20(C_NestToken).transfer(p.proposer, _staked);

        emit NIPExecuted(msg.sender, id, accepted);
    }

    function revoke(uint256 id, string calldata reason) external
    {
        // check parameter
        require(id < proposalList.length, "Nest:Vote:!id");
        // load proposal
        Proposal storage p = proposalList[id];
        // check state
        require(p.state == PROPOSAL_STATE_PROPOSED, "Nest:Vote:!state");
        // check proposer 
        require(p.proposer == address(msg.sender), "Nest:Vote:!sender");

        uint256 _staked = p.stakedNestAmount;
        p.stakedNestAmount = 0;
        // save new state
        p.state = PROPOSAL_STATE_REVOKED;
        p.description = reason;

        ERC20(C_NestToken).transfer(msg.sender, _staked);

        emit NIPRevoked(msg.sender, id, reason);
    }

    /* ========== VIEWS ============== */

    function propsalNextId() public view returns (uint256) 
    {
        return proposalList.length;
    }

    function proposalById(uint256 id) public view returns (Proposal memory) 
    {
        require(id < proposalList.length, "Nest:Vote:!id");
        
        Proposal memory p = proposalList[id];

        return p;
    }

    function proposalListById(uint256[] calldata idList) public view returns (Proposal[] memory pL) 
    {
        uint256 _num = idList.length;

        pL = new Proposal[](_num);

        for (uint i = 0; i < _num; i++) {
            uint256 _id = idList[i];
            require(_id < proposalList.length, "Nest:Vote:!id");
            pL[i] = proposalList[_id];
        }
    }

    function balanceOf(uint256 id) public view returns (uint256) 
    {
        require(id < proposalList.length, "Nest:Vote:!id");

        uint256 _blnc = stakedNestLedger[id][address(msg.sender)];
        return _blnc;
    }

    function stakedNestAmountById(uint256 id) public view returns (uint256) 
    {
        Proposal storage p = proposalList[id];
        return p.stakedNestAmount;
    }

    function votedNestAmountById(uint256 id) public view returns (uint256) 
    {
        Proposal storage p = proposalList[id];
        return p.votedNestAmount;
    }

    function numberOfVotersById(uint256 id) public view returns (uint256) 
    {
        Proposal storage p = proposalList[id];
        return (uint256(p.voters));
    }

}