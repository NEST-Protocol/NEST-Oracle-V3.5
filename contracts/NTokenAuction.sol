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
import "./iface/INestPrice.sol";
import "./iface/IStaking.sol";

// import "./NestMining.sol";
// import "./iface/INNRewardPool.sol";

contract NTokenAuction is  ReentrancyGuard {

    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    event Log(string msg);
    event LogUint(string msg, uint256 v);
    event LogAddress(string msg, address a);

    /// @dev A number counter for generating ntoken name
    uint32 private _x_ntoken_counter;
    
    /// @dev Contract address of NestPool
    INestPool private _C_NestPool;
    /// @dev Contract address of NestToken
    ERC20 private _C_NestToken;
    /// @dev Contract address of DAO
    address private _C_DAO;


    /// @dev A mapping for tokens banned for auction 
    ///      token(address) => is banned(bool)
    // mapping(address => bool) private _auction_ntoken_denied_list;

    /// @dev A struct for an auction
    ///     size: 3 x 256bit
    struct Auction {
        address winner;     // the bidder with the highest bid
        uint128 latestBid;  // the price of the bid
        uint128 nestBurnedAmount;   //  burned nest when the auction is closed
        uint64  endTime;    // the due time of auction                                      
        uint16  disabled;   // =1 if the token is disabled
        uint16  closed;     // =1 if the token auction is closed
        uint160 _padding;   // padding space
    }

    /// @dev A mapping for all auctions
    ///     token(address) => Auction
    mapping(address => Auction) private _auctions_map;

    uint256 constant c_auction_duration = 5 days;
    uint256 constant c_auction_nest_burning = 100000;
    uint256 constant c_auction_bid_incentive_percentage = 50;
    uint256 constant c_auction_min_bid_increment = 10000;

    address public governance;

    /* ========== EVENTS ============== */
    
    /// @notice when the auction of a token gets started
    /// @param token    The address of the (ERC20) token
    /// @param bid      The amount of nest-token as the initial bid
    /// @param bidder   The address of the bidder
    event AuctionStarted(address token, uint256 bid, address bidder);
    
    /// @notice when a new bid called
    /// @param token    The address of the (ERC20) token
    /// @param bid      The amount of nest-token
    /// @param bidder   The address of the bidder
    event AuctionBid(address token, uint256 bid, address bidder);

    /// @notice when the auction is closed (expired)
    /// @param token    The address of the (ERC20) token
    /// @param ntoken   The address of the ntoken w.r.t the (ERC20) token
    /// @param winner   The address of the winner
    event AuctionClosed(address token, address ntoken, address winner);

    /* ========== CONSTRUCTOR ========== */

    constructor() public 
    {
        governance = msg.sender;
    }

    modifier noContract() 
    {
        require(address(msg.sender) == address(tx.origin), "Nest:NAuc:^(contract)");
        _;
    }

    /* ========== GOVERNANCE ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:NAuc:!governance");
        _;
    }

    function setContracts(
        address _NestToken, 
        address _NestPool, 
        address _DAO
    ) public noContract 
    {
        _C_NestToken = ERC20(_NestToken);
        _C_NestPool = INestPool(_NestPool);
        _C_DAO = _DAO;
    }

    /* ========== AUCTION ========== */

    // TODO: If we allow callings from contracts to start/bid/close ?

    /// @notice Start an auction for a (ERC20) token
    /// @dev  The code is nonReentrant protected
    /// @param token The token address for pricing 
    /// @param bidAmount The amount of nest-token as an initial bid
    function start(address token, uint256 bidAmount) external nonReentrant
    {
        require(_C_NestPool.getNTokenFromToken(token) != address(0x0), 
            "Nest:NAuc:EX(token)");
        require(_auctions_map[token].endTime == 0, 
            "Nest:NAuc:EX(auc)");
        require(bidAmount >= c_auction_nest_burning.mul(1 ether), 
            "Nest:NAuc:!Valid(amount)");
        require(_auctions_map[token].disabled == 0, 
            "Nest:NAuc:DIS(token)");

        // is token valid ?
        ERC20 tokenERC20 = ERC20(token);
        tokenERC20.safeTransferFrom(address(msg.sender), address(this), 1);
        require(tokenERC20.balanceOf(address(this)) >= 1, 
            "Nest:NAuc:!TEST(token)");
        tokenERC20.safeTransfer(address(msg.sender), 1);

        // make an Auction
        Auction memory auction = Auction(
            address(msg.sender),
            uint128(bidAmount),
            uint128(bidAmount),
            uint64(block.timestamp + c_auction_duration),  // safe math 
            uint16(0),
            uint16(0),
            uint160(0));

        // update the state
        _auctions_map[token] = auction;

        require(_C_NestToken.transferFrom(address(msg.sender), address(this), bidAmount), 
            "Nest:NAuc:!DEPO(nest)");
        // raise an event
        emit AuctionStarted(token, bidAmount, address(msg.sender));
    }

    /// @notice Call a bid for a (ERC20) token
    /// @dev  The code is gas-optimized
    /// @param token The token address for auction 
    /// @param bidAmount The amount of nest-token as a higher bid
    function bid(address token, uint256 bidAmount) external nonReentrant
    {
        Auction storage auc = _auctions_map[token];

        require(block.timestamp <= auc.endTime, 
            "Nest:NAuc:!time");
        require(auc.closed == 0, 
            "Nest:NAuc:!Open(auc)");
        require(bidAmount > auc.latestBid, 
            "Nest::NAuc:!(bid)");
        uint256 inc = bidAmount.sub(auc.latestBid);
        require(inc >= c_auction_min_bid_increment.mul(1 ether), 
            "Nest:NAuc:!Valid(amount)");

        uint256 cashback = inc.mul(c_auction_bid_incentive_percentage).div(100);

        // transfers
        require(_C_NestToken.transferFrom(address(msg.sender), address(this), bidAmount), 
            "Nest:NAuc:!DEPO(nest)");
        require(_C_NestToken.transfer(auc.winner, auc.latestBid + uint128(cashback)), 
            "Nest:NAuc:!TRANS(nest)");
        
        // update auction info
        auc.winner = address(msg.sender);
        auc.latestBid = uint128(bidAmount);
        auc.nestBurnedAmount = auc.nestBurnedAmount + uint128(inc.sub(cashback));

        emit AuctionBid(token, bidAmount, address(msg.sender));

    }

    
    /// @notice Close an auction for a (ERC20) token
    /// @dev  The code is nonReentrant protected
    /// @param token The token address for pricing 
    function close(address token) external nonReentrant
    {
        Auction storage auc = _auctions_map[token];
        require(block.timestamp > auc.endTime && auc.endTime != 0, 
            "Nest:NAuc:!time");
        require(auc.closed == 0, 
            "Nest:NAuc:!Open(auc)");

        //  create ntoken
        NestNToken nToken = NestNToken(address(this));
        // NestNToken nToken = new NestNToken(strConcat("NToken", getAddressStr(_x_ntoken_counter)), strConcat("N", getAddressStr(_x_ntoken_counter)), address(_C_DAO), address(auction.winner));
        //  burn nest tokens
        address burnAddr = _C_NestPool.addressOfBurnNest();
        // emit LogAddress("burnAddr", burnAddr);
        _C_NestToken.transfer(burnAddr, auc.nestBurnedAmount);
        auc.nestBurnedAmount = 0;
        auc.closed = 0;
        //  set the mapping of token => ntoken
        _C_NestPool.setNTokenToToken(token, address(nToken));

        _x_ntoken_counter = _x_ntoken_counter + 1;  // safe math
        emit AuctionClosed(token, address(nToken), auc.winner);
    }

    /* ========== VIEWS ========== */

    function ntokenCounter() public view returns (uint32) 
    {
        return _x_ntoken_counter;
    }

    function auctionOf(address token) public view returns (Auction memory auc) 
    {
        auc = _auctions_map[token];
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