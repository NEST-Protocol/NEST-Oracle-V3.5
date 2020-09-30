// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./iface/INToken.sol";
import "./iface/IBonusPool.sol";
import "./legacy/NestNToken.sol";
import "./iface/INestPrice.sol";
import "./iface/IStaking.sol";

// import "./NestMining.sol";
// import "./iface/INNRewardPool.sol";

contract NTokenAuction {
        
    using SafeMath for uint256;
    using SafeERC20 for ERC20;


    event Log(string msg);
    event LogUint(string msg, uint256 v);
    event LogAddress(string msg, address a);


    uint32 private _x_ntoken_counter;
    
    INestPool private _C_NestPool;
    INestPrice private _C_NestPrice;
    IStaking private _C_Staking;
    ERC20 private _C_NestToken;
    address private _C_DAO;


    // from token address to a boolean of if being banned
    mapping(address => bool) private _auction_ntoken_denied_list;

    struct AuctionInfo {
        address winner;   //  the bidder with the highest bid
        uint128 latestBid;  // the price of the bid
        uint128 nestBurnedAmount;   //  burned nest when the auction is closed
        uint64  endTime;  // the due time of auction                                      
        uint16  disabled; // =1 if the token is disabled
        uint16  closed; // =1 if the token auction is closed
        uint160 _padding; // padding space
    }

    mapping(address => AuctionInfo) private _auctions_map;

    // AuctionInfo[] private _auction_token_list;

    uint256 constant c_auction_duration = 5 days;
    uint256 constant c_auction_nest_burning = 100000;
    uint256 constant c_auction_bid_incentive_percentage = 50;
    uint256 constant c_auction_min_bid_increment = 10000;

    event AuctionStart(address token, uint256 bid, address bidder);
    event AuctionBid(address token, uint256 bid, address bidder);
    event AuctionClose(address token, address ntoken, address winner);

    function setContracts(address C_NestToken, address C_NestPrice, address C_NestPool, address C_Staking, address C_DAO) public 
    {
        _C_NestToken = ERC20(C_NestToken);
        _C_NestPrice = INestPrice(C_NestPrice);
        _C_NestPool = INestPool(C_NestPool);
        _C_Staking = IStaking(C_Staking);
        _C_DAO = C_DAO;
    }

    function startAuction(address token, uint256 bidAmount) public {
        require(_C_NestPool.getNTokenFromToken(token) != address(0x0), "NToken already exists");
        require(_auctions_map[token].endTime == 0, "NToken is on sale");
        require(bidAmount >= c_auction_nest_burning.mul(1 ether), "bidAmount must > ");
        require(_auctions_map[token].disabled == 0, "token is banned");

        require(_C_NestToken.transferFrom(address(msg.sender), address(this), bidAmount), "Authorization failed");

        // is token valid ?
        ERC20 tokenERC20 = ERC20(token);
        tokenERC20.safeTransferFrom(address(msg.sender), address(this), 1);
        require(tokenERC20.balanceOf(address(this)) >= 1, "Insufficient tokens, at least 1");
        tokenERC20.safeTransfer(address(msg.sender), 1);

        // 
        AuctionInfo memory auction = AuctionInfo(
            address(msg.sender),
            uint128(bidAmount),
            uint128(bidAmount),
            uint64(block.timestamp + c_auction_duration),  // safe math 
            uint16(0),
            uint16(0),
            uint160(0));

        // update the state
        _auctions_map[token] = auction;
        // _auction_token_list.push(auction);

        emit AuctionStart(token, bidAmount, address(msg.sender));
    }

        
    function bidAuction(address token, uint256 bidAmount) external {
        AuctionInfo storage auction = _auctions_map[token];

        require(block.timestamp <= auction.endTime, "Auction closed");
        require(auction.closed == 0, "Auction closed");
        require(bidAmount > auction.latestBid, "New bid must be greater than previous");
        uint256 inc = bidAmount.sub(auction.latestBid);
        require(inc >= c_auction_min_bid_increment.mul(1 ether));

        uint256 cashback = inc.mul(c_auction_bid_incentive_percentage).div(100);

        // transfers
        require(_C_NestToken.transferFrom(address(msg.sender), address(this), bidAmount), "Authorization failed");
        require(_C_NestToken.transfer(auction.winner, auction.latestBid + uint128(cashback)), "Transfer failure");
        
        // update auction info
        auction.winner = address(msg.sender);
        auction.latestBid = uint128(bidAmount);
        auction.nestBurnedAmount = auction.nestBurnedAmount + uint128(inc.sub(cashback));

        emit AuctionBid(token, bidAmount, address(msg.sender));


    }

    function closeAuction(address token) external {
        uint256 nowTime = block.timestamp;
        // (uint256 startTime, uint256 endTime, ) = _C_Staking.timeOfNextBonus();
        // require(!(nowTime >= startTime && nowTime <= endTime), "conflict with bonus claiming");

        AuctionInfo storage auction = _auctions_map[token];

        require(nowTime > auction.endTime && auction.endTime != 0, "Token is on sale");
        require(auction.closed == 0, "Auction closed");

        //  create ntoken
        NestNToken nToken = NestNToken(address(this));
        // NestNToken nToken = new NestNToken(strConcat("NToken", getAddressStr(_x_ntoken_counter)), strConcat("N", getAddressStr(_x_ntoken_counter)), address(_C_DAO), address(auction.winner));
        //  burn nest tokens
        address burnAddr = _C_NestPool.addressOfBurnNest();
        emit LogAddress("burnAddr", burnAddr);
        _C_NestToken.transfer(burnAddr, auction.nestBurnedAmount);
        auction.nestBurnedAmount = 0;
        auction.closed = 0;
        //  set the mapping of token => ntoken
        _C_NestPool.setNTokenToToken(token, address(nToken));
        //  setup the price (basic)
        // _C_NestPrice.setFee(token);
        _x_ntoken_counter = _x_ntoken_counter + 1;  // safe math
        emit AuctionClose(token, address(nToken), auction.winner);
    }

    function ntokenCounter() public view returns (uint32) {
        return _x_ntoken_counter;
    }

    function auctionOf(address token) public view returns(AuctionInfo memory auc) 
    {
        auc = _auctions_map[token];
    }

    // ported from NestV3
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
    
    // ported from NestV3, 4-digitals converted into string
    function getAddressStr(uint256 iv) public pure returns (string memory) {
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