// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';

import "./iface/INestPool.sol";
import "./iface/INestStaking.sol";
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
        uint64 min;
        uint64 max;
        uint64 single;
        uint64 _padding;
    }

    uint256 private _priceOfQueryEncoded;

    address public governance;

    struct Client {
        uint64 startTime;
        uint64 endTime;  // endTime==0 for non-monthly clients
        // monthlyFee == 0, the client pays fee per query
        // monthlyFee != 0, the client pays fee monthly
        uint32 monthlyFee;
        // uint32 lastHeight;
        // uint64 lastSeed;
    }

    address private _x_nest_burn_address;
    // address private _x_dev_address;
    ERC20           private _C_NestToken;
    INestMining     private _C_NestMining;
    INestPool       private _C_NestPool;
    INestStaking    private _C_NestStaking;
    address         private _C_DAO;
    // address private _C_NestArch;

    uint256 constant c_client_oracle_nest_burned_amount = 10000 ether;
    uint256 constant c_client_activation_duration = 1 days;

    mapping(address => uint256) private _clients;

    // token-address => token price info
    // mapping(address => uint256) private _token_prices;

    event ClientActivated(address, uint256, uint256);
    event ClientRenewed(address, uint256, uint256, uint256);
    event PriceQueried(address client, address token, uint256 ethAmount, uint256 tokenAmount, uint256 atHeight);
    event PriceListQueried(address client, address token, uint256 atHeight, uint8 num);

    receive() external payable {
    }

    constructor() public 
    {

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

    /* ========== GOVERNANCE ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:Orac:!governance");
        _;
    }

    modifier onlyGovernanceOrBy(address _account)
    {
        if (msg.sender != governance) { 
            require(msg.sender == _account,
                "Nest:Orac:!Auth");
        }
        _;
    }

    function setBurnAddr(address burnAddr) public onlyGovernance {
        _x_nest_burn_address = burnAddr;
    }

    function setFee(uint256 _min, uint256 _max, uint256 _single) override public onlyGovernance
    {
        uint64 min = uint64((0.001 ether) / 1e12); 
        uint64 max = uint64((0.01 ether) / 1e12);
        uint64 single = uint64((0.001 ether) / 1e12);

        if (_min != 0) {
            min = uint64(_min); 
        } 
        if (_max != 0) {
            max = uint64(_max);
        }
        if (_single != 0) {
            single = uint64(_single);
        }
        _priceOfQueryEncoded = encodePriceOfQuery(min, max, single);
    }

    function setContracts(address C_NestToken, address C_NestMining, address NestStaking, address C_NestPool, address C_DAO) public 
    {
        _C_NestToken = ERC20(C_NestToken);
        _C_NestMining = INestMining(C_NestMining);
        _C_NestPool = INestPool(C_NestPool);
        _C_NestStaking = INestStaking(NestStaking);
        _C_DAO = C_DAO;
    }

    function activate(address _defi) override public {
        if (_defi == address(0)) {
            _defi = address(msg.sender);
        }
        uint256 _start = uint64(block.timestamp.add(c_client_activation_duration));
        uint256 _end = 0;
        uint256 _mfee = 0;
        _clients[_defi] = encodeClient(_start, _end, _mfee);
        emit ClientActivated(_defi, _start, _end);
        _C_NestToken.transferFrom(address(msg.sender), _C_NestPool.addressOfBurnedNest(), c_client_oracle_nest_burned_amount);
    }

    function register(uint256 monthlyFee) override external {
        uint256 _start = block.timestamp.add(c_client_activation_duration);
        uint256 _end = _start;
        _clients[address(msg.sender)] = encodeClient(_start, _end, monthlyFee);

        emit ClientActivated(address(msg.sender), _start, _end);
        _C_NestToken.transferFrom(address(msg.sender), _C_NestPool.addressOfBurnedNest(), c_client_oracle_nest_burned_amount);
    }

    function renewal(uint256 months) override external payable {
        require(months > 0, "Nest:Orac:!(months)");
        Client memory c = decodeClient(_clients[address(msg.sender)]);
        uint256 monthlyFee = uint256(c.monthlyFee);
        require(monthlyFee > 0, "Nest:Orac:!(monFee)");
        uint256 ethFee = monthlyFee.mul(1 ether).mul(months);
        require(msg.value >= ethFee, "Nest:Orac:!(msg.value)");

        uint256 start_time;
        if (c.endTime != 0) {
            start_time = uint256(c.endTime);
            c.endTime = uint64(uint256(c.endTime).add(uint256(months).mul(30 days))); 
        } else { // per query fee ==> monthly fee
            start_time = uint256(c.startTime);
            c.endTime = uint64(uint256(c.startTime).add(uint256(months).mul(30 days))); 
        }
        _clients[address(msg.sender)] = encodeClient(c.startTime, c.endTime, c.monthlyFee);
        
        emit ClientRenewed(msg.sender, start_time, c.endTime, months);
        _C_NestStaking.addETHReward{value:ethFee}(address(_C_NestToken));
        TransferHelper.safeTransferETH(address(msg.sender), msg.value - ethFee); // safe math;
    }

    function query(address token, address payback) override external payable returns (uint256, uint256, uint64) 
    {
        // check parameters
        Client memory c = decodeClient(_clients[address(msg.sender)]);
        require(c.monthlyFee == 0, "Nest:Orac:=0(monFee)");
        require(c.startTime != 0 && uint256(c.startTime) < block.timestamp && uint256(c.endTime) == 0, "Nest:Orac:!(client)");

        // lookup the latest effective price
        (uint256 ethAmount, uint256 tokenAmount, uint256 bn) = _C_NestMining.priceOfToken(token);
        (uint256 min, , ) = decodePriceOfQuery(_priceOfQueryEncoded);  

        {
            address nToken = _C_NestPool.getNTokenFromToken(token); 
            uint256 ethFee = min;
            _C_NestStaking.addETHReward{value:ethFee}(address(nToken));

            // charge back
            if (payback != address(0)) {
                TransferHelper.safeTransferETH(payback, msg.value.sub(ethFee));
            }
        }
        
        emit PriceQueried(address(msg.sender), token, ethAmount, tokenAmount, bn);
        return (ethAmount, tokenAmount, uint64(bn));
    }

    function queryForMonthlyClient(address token) override external returns (uint256, uint256, uint64) 
    {
        // check parameters
        Client memory c = decodeClient(_clients[address(msg.sender)]);
        require(c.monthlyFee > 0, "Nest:Orac:!(monFee)");
        uint256 startTime = uint256(c.startTime);
        uint256 endTime = uint256(c.endTime);
        require(startTime != 0 && startTime < block.timestamp && endTime > block.timestamp, "Nest:Orac:!(client)");
    
        // get the newest EFFECTIVE price from NestMining
        (uint256 ethAmount, uint256 tokenAmount, uint256 bn) = _C_NestMining.priceOfToken(token);
        
        emit PriceQueried(address(msg.sender), token, ethAmount, tokenAmount, bn);
        return (ethAmount, tokenAmount, uint64(bn));
    }

    function queryPriceList(address token, uint8 num, address payback) override public payable 
        returns (uint128[] memory) 
    {
        // check client 
        Client memory c = decodeClient(_clients[address(msg.sender)]);
        require(c.monthlyFee == 0, "Nest:Orac:=0(monFee)");
        {
            uint256 startTime = uint256(c.startTime);
            uint256 endTime = uint256(c.endTime);
            require(startTime != 0 && startTime < block.timestamp && endTime == 0, "Nest:Orac:!(client)");
        }

        (uint128[] memory data, uint256 atHeight) = _C_NestMining.priceListOfToken(token, num);
        // require(miner != address(0x0), "miner null");

        (uint256 _min, uint256 _max, uint256 _single) = decodePriceOfQuery(_priceOfQueryEncoded);  
        uint256 ethFee = _single * num; // safe math
        if (ethFee < _min) {
            ethFee = _min;
        } else if (ethFee > _max) {
            ethFee = _max;
        }
        require(msg.value > ethFee, "Nest:Orac:!(msg.value)");
        // {
        address nToken = _C_NestPool.getNTokenFromToken(token); 

        _C_NestStaking.addETHReward{value:ethFee}(address(nToken));
        // pay back the surplus (to the user of DeFi)
        TransferHelper.safeTransferETH(payback, msg.value.sub(ethFee));

        emit PriceListQueried(address(msg.sender), token, atHeight, num);
        
        return data;
    }

    // function AmountOfNestClient() external returns (uint256) {
    //     return _C_NestPool.balanceOfNestInPool(address(msg.sender));
    // }

    // function claimNestClient() external returns (uint256) {
    //     return (_C_NestPool.distributeRewards(address(msg.sender)));
    // }

    function client(address clnt) external view returns (Client memory) {
        return decodeClient(_clients[clnt]);
    }

    // function encodePriceOfQuery(uint64 padding, uint64 min, uint64 max, uint64 single) internal pure returns (uint256 enc) 
    function encodePriceOfQuery(uint256 min, uint256 max, uint256 single) internal pure returns (uint256 enc) 
    {
        uint64 padding = 0;
        assembly {
            let y := 0
            mstore(0x20, single)
            mstore(0x18, max)
            mstore(0x10, min)
            mstore(0x8, padding)
            enc := mload(0x20)
        }
    }

    function decodePriceOfQuery(uint256 enc) internal pure returns (uint256 min, uint256 max, uint256 single) 
    {

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
    }

    function encodeClient(uint256 _start, uint256 _end, uint256 _monthlyFee) internal pure returns (uint256 enc) 
    {
        uint64 lastSeed = 0;
        uint32 lastHeight = 0;
        uint32 monthlyFee = uint32(_monthlyFee);
        uint64 startTime = uint64(_start);
        uint64 endTime = uint64(_end);
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

    function decodeClient(uint256 enc) internal pure returns (Client memory client) 
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
        client = Client(startTime, endTime, monthlyFee);
    }
}
