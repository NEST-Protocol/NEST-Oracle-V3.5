// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./lib/ReentrancyGuard.sol";

import "./iface/INestPool.sol";
import "./iface/INToken.sol";
import "./iface/IBonusPool.sol";
import "./legacy/NestNToken.sol";

// import "./NestMining.sol";
// import "./iface/INNRewardPool.sol";

/// @title NTokenController
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>

contract NTokenController is  ReentrancyGuard {

    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /// @dev A number counter for generating ntoken name
    uint32 public ntokenCounter;
    
    /// @dev Contract address of NestPool
    address private _C_NestPool;
    /// @dev Contract address of NestToken
    address private _C_NestToken;

    /// @dev A struct for an ntoken
    ///     size: 2 x 256bit
    struct NTokenTag {
        address owner;     // the owner with the highest bid
        uint128 nestStaked;   //  burned nest when the auction is closed
        uint64  startTime;    // the due time of auction                                      
        uint8   state;     // =0: normal | =1 disabled
        uint56  _reserved;   // padding space
    }

    /// @dev A mapping for all auctions
    ///     token(address) => NTokenTag
    mapping(address => NTokenTag) private nTokenTagList;

    // uint256 constant c_auction_duration = 5 days;
    uint256 constant NTOKEN_NEST_STAKED_AMOUNT = 100_000;
    // uint256 constant c_auction_bid_incentive_percentage = 50;
    // uint256 constant c_auction_min_bid_increment = 10000;

    address private governance;

    /* ========== EVENTS ============== */

    /// @notice when the auction of a token gets started
    /// @param token    The address of the (ERC20) token
    /// @param ntoken   The address of the ntoken w.r.t. token for incentives
    /// @param owner    The address of miner who opened the oracle
    event NTokenOpened(address token, address ntoken, address owner);

    /* ========== CONSTRUCTOR ========== */

    constructor() public 
    {
        governance = msg.sender;
    }

    modifier noContract() 
    {
        require(address(msg.sender) == address(tx.origin), "Nest:NTC:^(contract)");
        _;
    }

    /* ========== GOVERNANCE ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:NTC:!governance");
        _;
    }

    function setGovernance(address _gov) external onlyGovernance 
    { 
        governance = _gov;
    }

    /// @dev  It should be called immediately after the depolyment
    function setContracts(
        address _NestToken, 
        address _NestPool
    ) public onlyGovernance 
    {
        if (_NestToken != address(0)) {
            _C_NestToken = _NestToken;
        }
        if (_NestPool != address(0)) {
            _C_NestPool = _NestPool;
        }
    }


    /// @dev  Bad tokens should be banned 
    function disable(address token) external onlyGovernance
    {
        NTokenTag storage _to = nTokenTagList[token];
        _to.state = 1;
    }

    function enable(address token) external onlyGovernance
    {
        NTokenTag storage _to = nTokenTagList[token];
        _to.state = 0;
    }

    /// @dev Withdraw all NEST only when emergency or governance
    /// @param to  The address of recipient
    /// @param amount  The amount of NEST tokens 
    function withdrawNest(address to, uint256 amount) external onlyGovernance
    {
       ERC20(_C_NestToken).transfer(to, amount);
    }

    /// @dev  The balance of NEST
    /// @return  The amount of NEST tokens for this contract
    function balanceNest() external view returns (uint256) 
    {
        return ERC20(_C_NestToken).balanceOf(address(this));
    }

    /* ========== OPEN ========== */

    /// @notice  Open a NToken for a token by anyone (contracts aren't allowed)
    /// @dev  Create and map the (Token, NToken) pair in NestPool
    /// @param token  The address of token contract
    function open(address token) external noContract
    {
        require(INestPool(_C_NestPool).getNTokenFromToken(token) == address(0x0), 
            "Nest:NTC:EX(token)");
        require(nTokenTagList[token].state == 0, 
            "Nest:NTC:DIS(token)");

        // is token not a ntoken?
        bool isNToken = false;
        try INToken(token).checkBidder() returns(address bidder) {
            isNToken = true;
        } catch {
            isNToken = false;
        }

        // is token valid ?
        ERC20 tokenERC20 = ERC20(token);
        tokenERC20.safeTransferFrom(address(msg.sender), address(this), 1);
        require(tokenERC20.balanceOf(address(this)) >= 1, 
            "Nest:NTC:!TEST(token)");
        tokenERC20.safeTransfer(address(msg.sender), 1);

        require(isNToken == false, "Nest:NTC:(ntoken)!");

        uint256 _nestAmount = NTOKEN_NEST_STAKED_AMOUNT.mul(1 ether);

        require(ERC20(_C_NestToken).transferFrom(address(msg.sender), address(this), _nestAmount), 
            "Nest:NTC:!DEPO(nest)");

        nTokenTagList[token] = NTokenTag(address(msg.sender),   // owner
            uint128(_nestAmount),                               // nestStaked
            uint64(block.timestamp),                            // startTime
            0,                                                  // state
            0                                                   // _reserved
        );

        //  create ntoken
        NestNToken nToken = new NestNToken(strConcat("NToken", getAddressStr(ntokenCounter)), strConcat("N", getAddressStr(ntokenCounter)), address(governance), address(msg.sender));
        // NestNToken nToken = new NestNToken(strConcat("NToken", getAddressStr(_x_ntoken_counter)), strConcat("N", getAddressStr(_x_ntoken_counter)), address(_C_DAO), address(auction.winner));
        //  set the mapping of token => ntoken
        INestPool(_C_NestPool).setNTokenToToken(token, address(nToken));

        ntokenCounter = ntokenCounter + 1;  // safe math
        // raise an event
        emit NTokenOpened(token, address(nToken), address(msg.sender));
    }

    /* ========== VIEWS ========== */

    function NTokenTagOf(address token) public view returns (NTokenTag memory) 
    {
        return nTokenTagList[token];
    }

    /* ========== HELPERS ========== */
    /// @dev from NESTv3.0
    function strConcat(string memory _a, string memory _b) public pure returns (string memory)
    {
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        string memory ret = new string(_ba.length + _bb.length);
        bytes memory bret = bytes(ret);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++) {
            bret[k++] = _ba[i];
        } 
        for (uint i = 0; i < _bb.length; i++) {
            bret[k++] = _bb[i];
        } 
        return string(ret);
    } 
    
    /// @dev Convert a 4-digital number into a string, from NestV3.0
    function getAddressStr(uint256 iv) public pure returns (string memory) 
    {
        bytes memory buf = new bytes(64);
        uint256 index = 0;
        do {
            buf[index++] = byte(uint8(iv % 10 + 48));
            iv /= 10;
        } while (iv > 0 || index < 4);
        bytes memory str = new bytes(index);
        for(uint256 i = 0; i < index; ++i) {
            str[i] = buf[index - i - 1];
        }
        return string(str);
    }

}