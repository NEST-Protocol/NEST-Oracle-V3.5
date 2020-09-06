// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./iface/IBonusPool.sol";
import "./iface/INToken.sol";
import "./NestMining.sol";

contract NestPrice {

    // TODO: unoptimized code
    struct TokenPrice {
        uint256 priceCostLeast;
        uint256 priceCostMost;
        uint256 priceCostSingle;
        uint256 priceCostUser;
    }

    struct ClientInfo {
        // monthlyFee == 0, the client pays fee per query
        // monthlyFee != 0, the client pays fee monthly
        uint32 monthlyFee;
        uint64 startTime;
        uint64 endTime;  // endTime==0 for non-monthly clients
        uint32 lastHeight;
        uint64 lastSeed;
    }

    address private _x_nest_burn_address;
    address private _x_dev_address;
    ERC20   private _C_NestToken;
    INestMining  private _C_NestMining;
    INestPool    private _C_NestPool;
    IBonusPool   private _C_BonusPool;

    uint256 constant c_client_oracle_nest_burned_amount = 10000 ether;
    uint256 constant c_client_activation_duration = 1 days;
    uint256 constant c_1st_prize_thousandth = 500;
    uint256 constant c_2nd_prize_thousandth = 100;
    uint256 constant c_3rd_prize_thousandth = 10;


    mapping(address => ClientInfo) private _clients;

    // token-address => token price info
    mapping(address => TokenPrice) private _token_prices;

    receive() external payable {
    }

    function setFee(address token) {
        TokenPrice storage tp = _token_prices[token];
        tp.priceCostLeast = 0.001 ether;
        tp.priceCostMost = 0.01 ether;
        tp.priceCostSingle = 0.0001 ether;
        tp.priceCostUser = 2;
    }

    function activateClient(uint32 monthlyFee) public {
        ClientInfo memory client;
        client.monthlyFee = monthlyFee;
        client.startTime = now.add(c_client_activation_duration);
        client.endTime = 0;
        client.lastSeed = uint64(keccak256(abi.encodePacked(msg.sender, block.number)));
        client.lastHeight = uint32(block.number);
        _clients[address(msg.sender)] = client;
        emit ClientActivation(address(msg.sender), client.startTime, client.endTime);
        _C_NestToken.transferFrom(address(msg.sender), _x_nest_burn_address, c_client_oracle_nest_burned_amount);
    }

    function renewalClient(uint8 months) external return (uint64) {
        require(months > 0, "At least one month");
        ClientInfo memory c = _clients[address(msg.sender)];
        uint256 monthlyFee = uint256(c.monthlyFee);
        require(monthlyFee > 0, "only for monthly client");
        ethFee = monthlyFee.mul(1 ether).mul(months);
        require(msg.value >= ethFee, "Insufficient monthly fee");

        if (c.endTime != 0) {
            c.endTime = uint64(uint256(c.endTime).add(uint256(months).mul(1 months))); 
        } else {
            c.endTime = uint64(uint256(c.startTime).add(uint256(months).mul(1 months))); 
        }
        _clients[address(msg.sender)] = c;
        
        emit ClientSubscribe(msg.sender, start_time, end_time, months);
        _C_BonusPool.pumpinEth{value:ethFee}(_C_NestToken, ethFee);
        TransferHelper.safeTransferETH(address(msg.sender), msg.value - ethFee); // safe math;
        return c.endTime;
    }

    function queryPrice(address token) public payable returns (uint256, uint256, uint64) 
    {
        // check
        ClientInfo memory c = _clients[address(msg.sender)];
        require(c.monthlyFee == 0, "No monthly client");
        uint256 startTime = uint256(c.startTime);
        uint256 endTime = uint256(c.endTime);
        require(!startTime && startTime < block.timestamp && endTime == 0, "Client not activated");
    
        // lookup the latest effective price
        (uint256 ethAmount, uint256 tokenAmount, uint256 bn, address miner) = _C_NestMining.lookupTokenPrice(token);
        TokenPrice memory tp = _token_prices[token];  

        address nToken = _C_NestPool.getNTokenFromToken(token); 
        uint256 ethFee = tp.priceCostLeast.sub(tp.priceCostLeast.mul(tp.priceCostUser).div(10));
        // fee * 80% => bonus pool
        _C_BonusPool.pumpinEth{value:ethFee}(address(nToken), ethFee);
        // fee * 20% => miner who posted the price
        TransferHelper.safeTransferETH(miner, tp.priceCostLeast.mul(tp.priceCostUser).div(10));
        // pay back the surplus
        TransferHelper.safeTransferETH(address(msg.sender), msg.value.sub(tp.priceCostLeast));
        
        // randomized mining
        uint32 lh = uint32(block.number - uint256(c.lastHeight)); //safe math
        uint256 pool = _C_NestPool.balanceOfNestInPool(_x_dev_address);
        if (lh < uint32(256) && pool > 0) {
            uint64 hash = uint64(blockhash(block.number - uint256(lh))) + c.lastSeed; //safe math
            uint256 prize = 0;
            if (hash >> 54 == uint64(0)) {
                prize = pool.mul(c_1st_prize_thousandth).div(1000);
            } else if (hash >> 58 == uint64(0)){
                prize = pool.mul(c_2nd_prize_thousandth).div(1000);
            } else if (hash >> 61 == uint64(0)) {
                prize = pool.mul(c_3rd_prize_thousandth).div(1000);
            }
            if (prize > 0) {
                _C_NestPool.transferNestInPool(_x_dev_address, address(msg.sender), prize);
            }
            c.lastSeed = hash;
        } 
        c.lastHeight = uint32(block.number);
        _clients[address(msg.sender)] = c;
        
        emit PriceOracle(token, ethAmount, tokenAmount, bn);
        return (ethAmount, tokenAmount, bn);
    }

    function queryPriceForMonthlyClient(address token) public returns (uint256, uint256, uint64) 
    {
        // check
        ClientInfo memory c = _clients[address(msg.sender)];
        require(c.monthlyFee > 0, "Client should be monthly");
        uint256 startTime = uint256(c.startTime);
        uint256 endTime = uint256(c.endTime);
        require(!startTime && startTime < block.timestamp && endTime > block.timestamp, "Client not activated");
    
        // 在价格列表中找到第一个有效的价格
        (uint256 ethAmount, uint256 tokenAmount, uint256 bn, address miner) = _C_NestMining.lookupTokenPrice(token);
        c.lastHeight = uint32(block.number);
        _clients[address(msg.sender)] = c;
        
        emit PriceOracle(token, ethAmount, tokenAmount, bn);
        return (ethAmount, tokenAmount, bn);
    }

    function AmountOfNestClient() external returns (uint256) {
        return _C_NestPool.balanceOfNestInPool(address(msg.sender));
    }

    function claimNestClient() external returns (uint256) {
        return (_C_NestPool.distributeRewards(address(msg.sender)));
    }    
}