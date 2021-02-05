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

// import "hardhat/console.sol";

/// @title NestVote
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>


/// @dev This contract is the governance Nest Protocol. All of the governors of contracts
///  should be set to its address. 
contract NestVote is ReentrancyGuard, IParamSettable {

    using SafeMath for uint256;

    /* ========== PARAMETERS ========= */

    /// NOTE: The following 4 parameters are settable through `setParam()`. 
    ///   Each of them is of type uint256 and has a separated index.
    ///   The `index` should start from `1` other than zero. 

    /// @dev The time duration from when an NIP was proposed to that it can be executed
    uint256 public voteDuration = 7 days;                   // index = 1

    /// @dev The percentage of all circulated NEST tokens voted for voting an NIP
    uint256 public acceptancePercentage = 51;               // index = 2

    /// @dev The NEST token amount that should be staked to propose an NIP 
    uint256 public proposalStakingAmount = 100_000 * 1e18;  // index = 3

    /// @dev The minimal NEST token amount required for voting
    uint256 public minimalVoteAmount = 1_000 * 1e18;        // index = 4

    uint256 constant PARAM_INDEX_VOTE_DURATION = 1;
    uint256 constant PARAM_INDEX_ACCEPTANCE_PERCENTAGE = 2;
    uint256 constant PARAM_INDEX_PROPOSAL_STAKING_AMOUNT = 3;
    uint256 constant PARAM_INDEX_MINIMAL_VOTE_AMOUNT = 4;

    /* ========== STATE ============== */

    /// @dev The data structure of a proposal (NIP)
    struct Proposal {
        uint64 state;       // 0: proposed | 1: revoked | 2: accepted | 3: rejected | 4: failed
        uint64 startTime;   // the time at which the proposal was proposed
        uint64 endTime;     // the time at which the proposal can be executed (once)
        uint64 voters;      // the number of voters of the proposal
        uint256 stakedNestAmount;   // the staked amount of NEST tokens deposited by the proposer
        uint256 votedNestAmount;    // the voted total amount of NEST tokens deposited by the voters
        address proposer;   // the address of the EOA as proposer
        address executor;   // the address of the EOA executing the proposal
        address contractAddr;   // the contract address of the proposal
        bytes args;         // the arguments that will be passed to the contract
        string description; // the description of the proposal
    }
    
    uint32 constant PROPOSAL_STATE_PROPOSED = 0;
    uint32 constant PROPOSAL_STATE_REVOKED = 1;
    uint32 constant PROPOSAL_STATE_ACCEPTED = 2;
    uint32 constant PROPOSAL_STATE_REJECTED = 3;
    uint32 constant PROPOSAL_STATE_FAILED = 4;

    /// @dev The data structure storing all proposals, including those revoked and rejected.
    ///   Any proposal won't removed from it.
    Proposal[] public proposalList;

    /// @dev The ledger keeping NEST amounts staked by voters
    ///   id => voter => amount
    mapping(uint256 => mapping(address => uint256)) public votedNestLedger;

    /// @dev The addresses of NEST Protocol contracts
    address public C_NestToken;
    address public C_NestPool;
    address public C_NestDAO;
    address public C_NestMining;

    /// @dev The address of governor w.r.t. this contract.
    address public governance;
    // NOTE: 1. It is the deployer (EOA) after NestVote was deployed. 
    //       2. It should be loaded from NestPool.
    //       3. After NestPool set its governance to NestVote, it will
    //        also be changed to NestVote, as self-governing.

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
    ///   governance, including NestVote. Well, governance == NestVote.address.
    function loadGovernance() external 
    { 
        governance = INestPool(C_NestPool).governance();
    }

    /// @dev The 
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

    /// @dev The function to setup one parameter of this contract
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
    
    /// @dev The function to submit a proposal(NIP), from anyone
    /// @param contract_ The address of the NIP contract, which should deployed before
    /// @param args The arguments will be passed to the contract when NIP is executed
    /// @param description_ The short message describing the NIP
    function propose(
            address contract_, 
            bytes calldata args, 
            string memory description_
        ) 
        external nonReentrant
    {
        // check parameter
        require(contract_ != address(0), "Nest:Vote:!contract");

        uint256 id = proposalList.length;
        proposalList.push(Proposal(
            uint64(PROPOSAL_STATE_PROPOSED),        // state
            uint64(block.timestamp),                // startTime
            uint64(block.timestamp + voteDuration), // endTime
            uint64(0),                              // voters
            uint256(proposalStakingAmount),         // stakedNestAmount
            uint256(0),                             // votedNestAmount
            address(msg.sender),                    // proposer
            address(0),                             // executor
            contract_,                              // contractAddr
            args,                                   // arguments
            string(description_)                    // description
         ));

        ERC20(C_NestToken).transferFrom(address(msg.sender), address(this), proposalStakingAmount);

        // NOTE: The new proposal id is returned via an event
        emit NIPSubmitted(msg.sender, id, description_);
    }

    /// @dev The function to vote a proposal(NIP), by a time limit
    /// @param id The id of proposal
    /// @param amount The amount of NEST tokens to vote as ballots
    function vote(uint256 id, uint256 amount) external nonReentrant
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
        uint256 _blnc = votedNestLedger[id][address(msg.sender)];
        votedNestLedger[id][address(msg.sender)] = _blnc.add(amount); 
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

    /// @dev The function is for voters to withdraw NEST tokens after voting is stopped
    /// @param id The id of proposal
    function withdraw(uint256 id) external nonReentrant
    {
        // check parameter
        require(id < proposalList.length, "Nest:Vote:!id");

        // load proposal
        Proposal memory p = proposalList[id];

        // check state
        require(p.state == PROPOSAL_STATE_ACCEPTED 
            || p.state == PROPOSAL_STATE_REJECTED
            || p.state == PROPOSAL_STATE_REVOKED
            || p.state == PROPOSAL_STATE_FAILED, "Nest:Vote:!state");

        // decrease `votedNestAmount`
        uint256 _amount = votedNestLedger[id][address(msg.sender)];
        p.votedNestAmount = p.votedNestAmount.sub(_amount);
        votedNestLedger[id][address(msg.sender)] = 0;

        // save proposal
        proposalList[id] = p;

        ERC20(C_NestToken).transfer(address(msg.sender), _amount);

        emit NIPWithdrawn(msg.sender, id, _amount);
    }

    /// @dev The function is for voters to cancel the vote before voting is stopped
    /// @param id The id of proposal
    function unvote(uint256 id) external nonReentrant
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
        uint256 _amount = votedNestLedger[id][address(msg.sender)];
        p.voters = uint64(uint256(p.voters).sub(1));
        p.votedNestAmount = p.votedNestAmount.sub(_amount);
        votedNestLedger[id][address(msg.sender)] = 0;

        // save proposal
        proposalList[id] = p;

        // return NEST tokens
        ERC20(C_NestToken).transfer(address(msg.sender), _amount);

        emit NIPUnvoted(msg.sender, id, _amount);
    }

    /// @dev The function is to execute the proposal(NIP), by any volunteer
    /// @param id The id of proposal
    function execute(uint256 id) external nonReentrant
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

        // NOTE: The NIP contract is executed by delegatecall such that the NIP code will has
        //   priviledges to call governed functions. If the delegatecall failed, the proposal
        //   will be marked with `PROPOSAL_STATE_FAILED`. However, NIP should be tested to ensure
        //   the code be runnable to avoid code failure.
        if (accepted) {
            address _contract = p.contractAddr;
            (success, ) = _contract.delegatecall(
                abi.encodeWithSignature(
                    "run(address,bytes)", C_NestPool, p.args
                ));
            if (success) {
                p.state = PROPOSAL_STATE_ACCEPTED;
            } else {
                p.state = PROPOSAL_STATE_FAILED;
            }
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

    /// @dev The function is to revoke the proposal(NIP), by the proposer
    /// @param id The id of proposal
    /// @param reason The short message explaining the revoking reason
    function revoke(uint256 id, string calldata reason) external nonReentrant
    {
        // check parameter
        require(id < proposalList.length, "Nest:Vote:!id");
        // load proposal
        Proposal memory p = proposalList[id];

        // NOTE: The proposal can also be revoked if no one executes it after time limit.

        // check state
        require(p.state == PROPOSAL_STATE_PROPOSED, "Nest:Vote:!state");
        // check proposer 
        require(p.proposer == address(msg.sender), "Nest:Vote:!sender");

        uint256 _staked = p.stakedNestAmount;
        p.stakedNestAmount = 0;
        // save new state
        p.state = PROPOSAL_STATE_REVOKED;
        p.description = reason;
        proposalList[id] = p;

        ERC20(C_NestToken).transfer(msg.sender, _staked);

        emit NIPRevoked(msg.sender, id, reason);
    }

    /* ========== VIEWS ============== */

    function propsalNextId() 
        public view returns (uint256) 
    {
        return proposalList.length;
    }

    function proposalById(uint256 id) 
        public view returns (Proposal memory) 
    {
        require(id < proposalList.length, "Nest:Vote:!id");
        
        Proposal memory p = proposalList[id];

        return p;
    }

    function proposalListById(uint256[] calldata idList) 
        public view returns (Proposal[] memory pL) 
    {
        uint256 _num = idList.length;

        pL = new Proposal[](_num);

        for (uint i = 0; i < _num; i++) {
            uint256 _id = idList[i];
            require(_id < proposalList.length, "Nest:Vote:!id");
            pL[i] = proposalList[_id];
        }
    }

    function votedNestAmountOf(address voter, uint256 id) 
        public view returns (uint256) 
    {
        require(id < proposalList.length, "Nest:Vote:!id");

        uint256 _blnc = votedNestLedger[id][voter];
        return _blnc;
    }

    function stakedNestAmountById(uint256 id) 
        public view returns (uint256) 
    {
        require(id < proposalList.length, "Nest:Vote:!id");
        Proposal storage p = proposalList[id];
        return p.stakedNestAmount;
    }

    function votedNestAmountById(uint256 id) 
        public view returns (uint256) 
    {
        require(id < proposalList.length, "Nest:Vote:!id");
        Proposal storage p = proposalList[id];
        return p.votedNestAmount;
    }

    function numberOfVotersById(uint256 id) 
        public view returns (uint256) 
    {
        require(id < proposalList.length, "Nest:Vote:!id");
        Proposal storage p = proposalList[id];
        return (uint256(p.voters));
    }

}