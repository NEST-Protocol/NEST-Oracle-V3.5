// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";
import "./iface/INestPool.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./iface/IBonusPool.sol";
import "./iface/INToken.sol";
import "./iface/INestPrice.sol";
import "./iface/INestMining.sol";
import "./NestMining.sol";
import "./NestArch.sol";

contract NestPrice is INestPrice{

    using SafeMath for uint256;

    event Log(string msg);
    event LogUint(string msg, uint256 v);
    event LogAddress(string msg, address a);

    // // TODO: unoptimized code
    struct TokenPrice {
        uint64 priceCostLeast;
        uint64 priceCostMost;
        uint64 priceCostSingle;
        uint64 padding;
    }

    uint256 private _price_of_query_encoded;
    
    struct ClientInfo {
        uint64 startTime;
        uint64 endTime;  // endTime==0 for non-monthly clients
        // monthlyFee == 0, the client pays fee per query
        // monthlyFee != 0, the client pays fee monthly
        uint32 monthlyFee;
        uint32 lastHeight;
        uint64 lastSeed;
    }

    address private _x_nest_burn_address;
    address private _x_dev_address;
    ERC20   private _C_NestToken;
    INestMining  private _C_NestMining;
    INestPool    private _C_NestPool;
    IBonusPool   private _C_BonusPool;
    address private _C_DAO;
    address private _C_NestArch;

    uint256 constant c_client_oracle_nest_burned_amount = 10000 ether;
    uint256 constant c_client_activation_duration = 1 days;
    uint256 constant c_1st_prize_thousandth = 500;
    uint256 constant c_2nd_prize_thousandth = 100;
    uint256 constant c_3rd_prize_thousandth = 10;

    uint64 constant c_1st_prize_nonzero_bits = 61;
    uint64 constant c_2nd_prize_nonzero_bits = 62;
    uint64 constant c_3rd_prize_nonzero_bits = 63;


    mapping(address => uint256) private _clients;

    // token-address => token price info
    mapping(address => uint256) private _token_prices;

    event ClientActivation(address, uint256, uint256);
    event ClientSubscribe(address, uint256, uint256, uint256);
    event PriceOracle(address client, address token, uint256 ethAmount, uint256 tokenAmount, uint256 atHeight);
    event PriceOracleList(address client, address token, uint256 atHeight, uint8 num);

    event OraclePrize(address prizer, address token, uint256 prize, uint8 level);

    receive() external payable {
    }

    constructor() public {
    }
    // constructor(address C_NestArch) public {
    //     address _C_NestArch = address(C_NestArch);
    // }

    // function loadArch() public //onlyDAO
    // {
    //     _C_NestToken = ERC20(_C_NestArch.addrOf("nest3.NestToken"));
    //     _C_NestMining = INestMining(_C_NestArch.addrOf("nest3.NestMining"));
    //     _C_NestPool = INestPool(_C_NestArch.addrOf("nest3.NestPool"));
    //     _C_BonusPool = IBonusPool(_C_NestArch.addrOf("nest3.BonusToken"));
    //     _C_DAO = _C_NestArch.addrOf("nest3.DAO");    
    // }

    function setBurnAddr(address burnAddr) public {
        _x_nest_burn_address = burnAddr;
    }

    function setFee() override public // onlyAuctionOrDAO
    {
        uint64 min = uint64((0.001 ether) / 1e12); 
        uint64 max = uint64((0.01 ether) / 1e12);
        uint64 single = uint64((0.001 ether) / 1e12);
        _price_of_query_encoded = encodePriceOfQuery(TokenPrice(min, max, single, 0));
    }

    function setContracts(address C_NestToken, address C_NestMining, address C_BonusPool, address C_NestPool, address C_DAO) public 
    {
        _C_NestToken = ERC20(C_NestToken);
        _C_NestMining = INestMining(C_NestMining);
        _C_NestPool = INestPool(C_NestPool);
        _C_BonusPool = IBonusPool(C_BonusPool);
        _C_DAO = C_DAO;
    }

    function setAddresses(address developer_address) public {
        _x_dev_address = developer_address;
    }

    function activateClient(address defiAddress) override public {
        address defi = defiAddress;
        if (defi == address(0)) {
            defi = address(msg.sender);
        }
        ClientInfo memory client;
        client.monthlyFee = 0;
        client.startTime = uint64(block.timestamp.add(c_client_activation_duration));
        client.endTime = uint64(0);
        client.lastSeed = uint64(uint(keccak256(abi.encodePacked(defi, block.number))));
        client.lastHeight = uint32(block.number);
        _clients[defi] = encodeInfoOfClient(client);
        emit ClientActivation(defi, uint256(client.startTime), uint256(client.endTime));
        _C_NestToken.transferFrom(address(msg.sender), _x_nest_burn_address, c_client_oracle_nest_burned_amount);
    }

    function registerClient(uint32 monthlyFee) override external {
        ClientInfo memory client;
        client.monthlyFee = monthlyFee;
        client.startTime = uint64(block.timestamp.add(c_client_activation_duration));
        client.endTime = client.startTime;
        client.lastSeed = uint64(uint(keccak256(abi.encodePacked(msg.sender, block.number))));
        client.lastHeight = uint32(block.number);
        _clients[address(msg.sender)] = encodeInfoOfClient(client);
        emit ClientActivation(address(msg.sender), uint256(client.startTime), uint256(client.endTime));
        _C_NestToken.transferFrom(address(msg.sender), _x_nest_burn_address, c_client_oracle_nest_burned_amount);
    }

    function renewalClient(uint8 months) override external payable returns (uint64) {
        require(months > 0, "At least one month");
        ClientInfo memory c = decodeInfoOfClient(_clients[address(msg.sender)]);
        uint256 monthlyFee = uint256(c.monthlyFee);
        require(monthlyFee > 0, "only for monthly client");
        uint256 ethFee = monthlyFee.mul(1 ether).mul(months);
        require(msg.value >= ethFee, "Insufficient monthly fee");

        uint256 start_time;
        if (c.endTime != 0) {
            start_time = uint256(c.endTime);
            c.endTime = uint64(uint256(c.endTime).add(uint256(months).mul(30 days))); 
        } else { // per query fee ==> monthly fee
            start_time = uint256(c.startTime);
            c.endTime = uint64(uint256(c.startTime).add(uint256(months).mul(30 days))); 
        }
        _clients[address(msg.sender)] = encodeInfoOfClient(c);
        
        emit ClientSubscribe(msg.sender, start_time, c.endTime, months);
        _C_BonusPool.pumpinEth{value:ethFee}(address(_C_NestToken), ethFee);
        TransferHelper.safeTransferETH(address(msg.sender), msg.value - ethFee); // safe math;
        return c.endTime;
    }

    function queryPrice(address token, address payback) override public payable returns (uint256, uint256, uint64) 
    {
        // check
        ClientInfo memory c = decodeInfoOfClient(_clients[address(msg.sender)]);
        require(c.monthlyFee == 0, "No monthly client");
        require(c.startTime != 0 && uint256(c.startTime) < block.timestamp && uint256(c.endTime) == 0, "Client not activated");
        // lookup the latest effective price
        (uint256 ethAmount, uint256 tokenAmount, uint256 bn) = _C_NestMining.priceOfToken(token);
        TokenPrice memory tp = decodePriceOfQuery(_token_prices[token]);  

        {
        address nToken = _C_NestPool.getNTokenFromToken(token); 
        uint256 ethFee = tp.priceCostLeast;
        // fee * 80% => bonus pool
        // uint256 ethFeeMiner = tp.priceCostLeast.mul(tp.priceCostUser).div(10);
        // uint256 ethFeeBonus = ethFee.sub(ethFeeMiner);
        _C_BonusPool.pumpinEth{value:ethFee}(address(nToken), ethFee);
        // fee * 20% => miner who posted the price
        // TransferHelper.safeTransferETH(miner, ethFeeMiner);
        // pay back the surplus
        TransferHelper.safeTransferETH(payback, msg.value.sub(ethFee));
        }

        (uint256 prize, uint64 hash) = calcOraclePrize(token, c);
        if (prize > 0) {
            _C_NestPool.transferNestInPool(_x_dev_address, address(msg.sender), prize);
        }

        c.lastSeed = hash;
        c.lastHeight = uint32(block.number);
        _clients[address(msg.sender)] = encodeInfoOfClient(c);
        
        emit PriceOracle(address(msg.sender), token, ethAmount, tokenAmount, bn);
        return (ethAmount, tokenAmount, uint64(bn));
    }

    function calcOraclePrize(address token, ClientInfo memory c) private returns (uint256 prize, uint64 hash)
    {
        uint32 lh = uint32(block.number - uint256(c.lastHeight)); //safe math
        uint256 pool = _C_NestPool.balanceOfNestInPool(_x_dev_address);
        emit LogUint("lastHeight", uint256(lh));
        emit LogUint("pool", uint256(pool));

        if (lh < uint32(256) && pool > 0) {
            hash = uint64(uint((blockhash(block.number - uint256(lh))))) + c.lastSeed; //safe math
            if (hash >> c_1st_prize_nonzero_bits == uint64(0)) {
                prize = pool.mul(c_1st_prize_thousandth).div(1000);
                emit OraclePrize(address(msg.sender), token, prize, 1);
            } else if (hash >> c_2nd_prize_nonzero_bits == uint64(0)){
                prize = pool.mul(c_2nd_prize_thousandth).div(1000);
                emit OraclePrize(address(msg.sender), token, prize, 2);
            } else if (hash >> c_3rd_prize_nonzero_bits == uint64(0)) {
                prize = pool.mul(c_3rd_prize_thousandth).div(1000);
                emit OraclePrize(address(msg.sender), token, prize, 3);
            }
        }
    }

    function queryPriceForMonthlyClient(address token) public returns (uint256, uint256, uint64) 
    {
        // check
        ClientInfo memory c = decodeInfoOfClient(_clients[address(msg.sender)]);
        require(c.monthlyFee > 0, "Client should be monthly");
        uint256 startTime = uint256(c.startTime);
        uint256 endTime = uint256(c.endTime);
        require(startTime != 0 && startTime < block.timestamp && endTime > block.timestamp, "Client not activated");
    
        // 在价格列表中找到第一个有效的价格
        (uint256 ethAmount, uint256 tokenAmount, uint256 bn) = _C_NestMining.priceOfToken(token);
        c.lastHeight = uint32(block.number);
        _clients[address(msg.sender)] = encodeInfoOfClient(c);
        
        emit PriceOracle(address(msg.sender), token, ethAmount, tokenAmount, bn);
        return (ethAmount, tokenAmount, uint64(bn));
    }

    function queryPriceList(address token, uint8 num, address payback) override public payable returns (uint128[] memory) 
    {
        // check client 
        ClientInfo memory c = decodeInfoOfClient(_clients[address(msg.sender)]);
        require(c.monthlyFee == 0, "No monthly client");
        {
            uint256 startTime = uint256(c.startTime);
            uint256 endTime = uint256(c.endTime);
            require(startTime != 0 && startTime < block.timestamp && endTime == 0, "Client not activated");
        }

        (uint128[] memory data, uint256 atHeight) = _C_NestMining.priceListOfToken(token, num);
        // require(miner != address(0x0), "miner null");

        TokenPrice memory tp = decodePriceOfQuery(_token_prices[token]);  
        uint256 ethFee = tp.priceCostSingle * num; // safe math
        if (ethFee < tp.priceCostLeast) {
            ethFee = tp.priceCostLeast;
        } else if (ethFee > tp.priceCostMost) {
            ethFee = tp.priceCostMost;
        }
        require(msg.value > ethFee, "Insufficient payment");
        // {
        address nToken = _C_NestPool.getNTokenFromToken(token); 

        // uint256 ethFeeMiner = ethFee.mul(tp.priceCostUser).div(10);
        // uint256 ethFeeBonus = ethFee.sub(ethFeeMiner);
        // // fee * 80% => bonus pool
        // TransferHelper.safeTransferETH(miner, ethFeeMiner);
        // // fee * 20% => miner who posted the price
        // TransferHelper.safeTransferETH(miner, ethFeeMiner);
        // // pay back the surplus (to the user of DeFi)
        // TransferHelper.safeTransferETH(address(tx.origin), msg.value.sub(ethFee));
        // }

        _C_BonusPool.pumpinEth{value:ethFee}(address(nToken), ethFee);
        // pay back the surplus (to the user of DeFi)
        TransferHelper.safeTransferETH(payback, msg.value.sub(ethFee));

        (uint256 prize, uint64 hash) = calcOraclePrize(token, c);
        if (prize > 0) {
                _C_NestPool.transferNestInPool(_x_dev_address, address(msg.sender), prize);
        }

        c.lastSeed = hash;
        c.lastHeight = uint32(block.number);
        _clients[address(msg.sender)] = encodeInfoOfClient(c);

        emit PriceOracleList(address(msg.sender), token, atHeight, num);
        
        return data;
    }

    function AmountOfNestClient() external returns (uint256) {
        return _C_NestPool.balanceOfNestInPool(address(msg.sender));
    }

    function claimNestClient() external returns (uint256) {
        return (_C_NestPool.distributeRewards(address(msg.sender)));
    }

    function infoOfClient(address client) external view returns (ClientInfo memory) {
        return decodeInfoOfClient(_clients[client]);
    }

    // function encodePriceOfQuery(uint64 padding, uint64 min, uint64 max, uint64 single) internal pure returns (uint256 enc) 
    function encodePriceOfQuery(TokenPrice memory tp) internal pure returns (uint256 enc) 
    {
        uint64 single = tp.priceCostSingle;
        uint64 min = tp.priceCostLeast;
        uint64 max = tp.priceCostMost;
        uint64 padding = tp.padding;
        assembly {
            let y := 0
            mstore(0x20, single)
            mstore(0x18, max)
            mstore(0x10, min)
            mstore(0x8, padding)
            enc := mload(0x20)
        }
    }

    function decodePriceOfQuery(uint256 enc) internal pure returns (TokenPrice memory tp) 
    {
        uint64 single;
        uint64 min;
        uint64 max;
        uint64 padding;
        assembly {
            single := enc
            mstore(0x18, enc)
            padding := mload(0)
            mstore(0x10, enc)
            min := mload(0)
            mstore(0x8, enc)
            max := mload(0)
        }
        tp.priceCostSingle = single;
        tp.priceCostLeast = min;
        tp.priceCostMost = max;
        tp.padding = padding; 
    }

    function encodeInfoOfClient(ClientInfo memory client) internal pure returns (uint256 enc) 
    {
        uint64 lastSeed = client.lastSeed;
        uint32 lastHeight = client.lastHeight;
        uint32 monthlyFee = client.monthlyFee;
        uint64 startTime = client.startTime;
        uint64 endTime = client.endTime;
        assembly {
            let y := 0
            mstore(0x20, lastSeed)
            mstore(0x18, lastHeight)
            mstore(0x14, monthlyFee)
            mstore(0x10, endTime)
            mstore(0x8, startTime)
            enc := mload(0x20)
        }
    }

    function decodeInfoOfClient(uint256 enc) internal pure returns (ClientInfo memory client) 
    {
        uint64 lastSeed;
        uint32 lastHeight;
        uint32 monthlyFee;
        uint64 startTime;
        uint64 endTime;
        assembly {
            lastSeed := enc
            mstore(0x18, enc)
            startTime := mload(0)
            mstore(0x10, enc)
            endTime := mload(0)
            mstore(0xc, enc)
            monthlyFee := mload(0)
            mstore(0x8, enc)
            lastHeight := mload(0)
        }
        client = ClientInfo(startTime, endTime, monthlyFee, lastHeight, lastSeed);
    }
}
