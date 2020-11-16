// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';

import "./iface/INestPool.sol";
import "./iface/INestStaking.sol";
import "./iface/INToken.sol";
import "./iface/INestQuery.sol";
import "./iface/INestMining.sol";

/// @title NestQuery
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>

contract NestQuery is INestQuery {

    using SafeMath for uint256;

    struct TokenPrice {
        uint32 singleFeeEth;     
        uint32 monthlyFeeNest;   // unit: NestToken 
        uint32 activationFeeNest;
        uint32 _reserved;
    }

    uint8  public flag;     // 0: query allowed, client activation forbidden
                            // 1: query forbidden, client activation allowed
                            // 2: query allowed, client activation forbidden
                            // 3: query forbidden, client activation allowed;

    uint256 private priceOfQueryEncoded;

    address public governance;

    struct Client {
        uint64 startTime;
        uint64 endTime;  // endTime==0 for non-monthly clients
        uint32 fee;
        uint32 typ;     // =1: PPQ | =2: PPM
        uint64 _reserved;
    }

    address    private _C_NestToken;
    address    private _C_NestMining;
    address    private _C_NestPool;
    address    private _C_NestStaking;

    uint32 constant CLIENT_ACTIVATION_NEST_AMOUNT = 10_000;
    uint32 constant CLIENT_MONTHLY_FEE_NEST_AMOUNT = 1_000;
    uint256 constant CLIENT_ACTIVATION_DURATION = 1 seconds;

    uint32 constant CLIENT_TYPE_PAY_PER_QUERY = 1;
    uint32 constant CLIENT_TYPE_PAY_PER_MONTH = 2;


    mapping(address => uint256) private clientList;
    mapping(address => address) private clientOp;

    event ClientActivated(address, uint256, uint256);
    event ClientRenewed(address, uint256, uint256, uint256);
    event PriceQueried(address client, address token, uint256 ethAmount, uint256 tokenAmount, uint256 atHeight);
    event PriceListQueried(address client, address token, uint256 atHeight, uint8 num);

    receive() external payable { }

    constructor() public 
    {
        governance = address(msg.sender); 
        flag = 3;
    }

    function init() external {
        flag = 3;
    }
    /* ========== GOVERNANCE ========== */

    modifier whenQuryOpened() 
    {
        require(flag & 0x1 != 0, "Nest:Qury:!flag");
        _;
    }

    modifier whenClientOpened() 
    {
        require(flag & 0x2 != 0, "Nest:Qury:!flag");
        _;
    }

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:Qury:!governance");
        _;
    }

    modifier onlyGovernanceOrBy(address _account)
    {
        if (msg.sender != governance) { 
            require(msg.sender == _account,
                "Nest:Qury:!Auth");
        }
        _;
    }

    modifier noContract() 
    {
        require(address(msg.sender) == address(tx.origin), "Nest:Qury:BAN(contract)");
        _;
    }

    /// @notice Setup the price for queryings, one price for all token
    /// @dev    It should be called right after deployment
    function setFee(uint256 single, uint256 monthly) 
        public 
        onlyGovernance
    {
        (uint32 _single, uint32 _mon, uint32 _act, uint32 _res) =  decode_4x32_256(priceOfQueryEncoded);

        if (_single == 0 && _mon == 0 && _act == 0) {
            _single = ((0.01 ether) / 1e12);
            _mon = CLIENT_MONTHLY_FEE_NEST_AMOUNT;
            _act = CLIENT_ACTIVATION_NEST_AMOUNT;
        }
        
        if (single != 0) {
            _single = uint32(single);
        }

        if (monthly != 0) {
            _mon = uint32(monthly);
        }

        priceOfQueryEncoded = encode_4x32_256(_single, _mon, _act, _res);
    }

    function setContracts(address C_NestToken, address C_NestMining, address C_NestStaking, address C_NestPool) 
        external 
        onlyGovernance
    {
        if (C_NestToken != address(0)) {
            _C_NestToken = C_NestToken;
        }

        if (C_NestMining != address(0)) {
            _C_NestMining = C_NestMining;
        }
        
        if (C_NestPool != address(0)) {
            _C_NestPool = C_NestPool;
        }

        if (C_NestStaking != address(0)) {
            _C_NestStaking = C_NestStaking;
        }
    }

    function setFlag(uint8 newFlag) external onlyGovernance
    {
        flag = newFlag;
    }

    /// @dev Withdraw NEST only when emergency or governance
    /// @param to  The address of recipient
    /// @param amount  The amount of NEST tokens 
    function withdrawNest(address to, uint256 amount) override external onlyGovernance
    {
       ERC20(_C_NestToken).transfer(to, amount);
    }

    /// @dev Withdraw ethers only when emergency or governance
    /// @param to  The address of recipient
    /// @param amount  The amount of ethers 
    function withdrawEth(address to, uint256 amount) override external onlyGovernance
    {
       TransferHelper.safeTransferETH(to, amount);
    }

    /// @dev  The balance of NEST
    /// @return  The amount of NEST tokens for this contract
    function balanceNest() override external view returns (uint256) 
    {
        return ERC20(_C_NestToken).balanceOf(address(this));
    }

    /// @dev  The balance of NEST
    /// @return  The amount of ethers withheld by this contract
    function balanceEth() override external view returns (uint256) 
    {
        return address(this).balance;
    }

    /* ========== CLIENT ========== */

    /// @notice Activate a pay-per-query defi client with NEST tokens
    /// 
    function activatePPQ(
            address defi
        ) 
        override 
        external 
        noContract 
        whenClientOpened
    {
        if (defi == address(0)) {
            defi = address(msg.sender);
        }
        Client memory _c = decodeClient(clientList[defi]);
        require (_c.typ == 0, "Nest:Qury:EX(client)");
        (, , uint256 _actFee, ) = decode_4x32_256(priceOfQueryEncoded);  
        uint256 _nestFee = _actFee.mul(1 ether);
        uint256 _start = uint64(block.timestamp.add(CLIENT_ACTIVATION_DURATION));
        uint256 _end = 0;
        uint256 _mfee = 0;
        clientList[defi] = encodeClient(uint64(_start), uint64(_end), uint32(_mfee), 0x1);
        clientOp[defi] = address(msg.sender);
        emit ClientActivated(defi, _start, _end);
        ERC20(_C_NestToken).transferFrom(address(msg.sender), address(this), _nestFee);
    }

    /// @notice Activate a pay-per-month client with NEST tokens
    function activatePPM(
            address defi, 
            uint256 monthlyFee
        ) 
        override 
        external 
        noContract 
        whenClientOpened
    {
        if (defi == address(0)) {
            defi = address(msg.sender);
        }
        Client memory _c = decodeClient(clientList[defi]);
        require (_c.typ == 0, "Nest:Qury:EX(client)");
        (, , uint256 _actFee, ) = decode_4x32_256(priceOfQueryEncoded);  
        uint256 _nestFee = _actFee.mul(1 ether);

        uint256 _start = block.timestamp.add(CLIENT_ACTIVATION_DURATION);
        uint256 _end = _start;
        clientList[defi] = encodeClient(uint64(_start), uint64(_end), uint32(monthlyFee), 0x2);
        clientOp[defi] = address(msg.sender);

        emit ClientActivated(defi, _start, _end);
        ERC20(_C_NestToken).transferFrom(address(msg.sender), address(this), _nestFee);
    }

    function deactivate(address defi) override external whenClientOpened
    {
        if (defi == address(0)) {
            defi = address(msg.sender);
        }
        require(address(msg.sender) == clientOp[defi], "Nest:Qury:!Op");
        clientList[defi] = encodeClient(0, 0, 0, 0);
    }

    function remove(address defi) external onlyGovernance noContract whenClientOpened
    {
        clientList[defi] = encodeClient(0, 0, 0, 0);
        clientOp[defi] = address(0);
    }

    function renewalPPM(address defi, uint256 months) override external noContract whenClientOpened
    {
        if (defi == address(0)) {
            defi = address(msg.sender);
        }

        require(clientOp[defi] == address(msg.sender), "Nest:Qury:!Op");

        require(months > 0, "Nest:Qury:!(months)");
        Client memory c = decodeClient(clientList[defi]);
        // uint256 _monthlyFee = uint256(c.fee);
        require(c.typ == CLIENT_TYPE_PAY_PER_MONTH, "Nest:Qury:!(client)"); 

        uint256 _fee = uint256(c.fee).mul(1 ether).mul(months);

        uint256 start_time;
        if (c.endTime != 0) {
            start_time = uint256(c.endTime);
            c.endTime = uint64(uint256(c.endTime).add(uint256(months).mul(30 days))); 
        } else { // per query fee ==> monthly fee
            start_time = uint256(c.startTime);
            c.endTime = uint64(uint256(c.startTime).add(uint256(months).mul(30 days))); 
        }
        clientList[defi] = encodeClient(c.startTime, c.endTime, uint32(0), c.typ);
        
        emit ClientRenewed(msg.sender, start_time, c.endTime, months);
        ERC20(_C_NestToken).transferFrom(address(msg.sender), address(this), _fee);
    }

    /// @notice Query for PPQ (pay-per-query) clients
    function query(address token, address payback) 
        override 
        public 
        payable 
        whenQuryOpened
        returns (uint256, uint256, uint256) 
    {
        // check parameters
        Client memory c = decodeClient(clientList[address(msg.sender)]);
        require (c.typ == CLIENT_TYPE_PAY_PER_QUERY || c.typ == CLIENT_TYPE_PAY_PER_MONTH, "Nest:Qury:=!(client.typ)");
        if (c.typ == CLIENT_TYPE_PAY_PER_QUERY) {
            // require(c.monthlyFee == 0, "Nest:Qury:=0(monFee)");
            require(c.startTime != 0 && uint256(c.startTime) < block.timestamp 
                && uint256(c.endTime) == 0, "Nest:Qury:!(client.time)");

            // lookup the latest effective price
            (uint256 ethAmount, uint256 tokenAmount, uint256 bn) = INestMining(_C_NestMining).priceOf(token);
            (uint256 _single, , , ) = decode_4x32_256(priceOfQueryEncoded);  

            {
                address _nToken = INestPool(_C_NestPool).getNTokenFromToken(token); 
                uint256 _ethFee = _single;
                INestStaking(_C_NestStaking).addETHReward{value:_ethFee}(address(_nToken));

                // charge back
                if (payback != address(0)) {
                    TransferHelper.safeTransferETH(payback, msg.value.sub(_ethFee));
                }
            }
        
            // emit PriceQueried(address(msg.sender), token, ethAmount, tokenAmount, bn);
            return (ethAmount, tokenAmount, uint256(bn));
        
        } else if (c.typ == CLIENT_TYPE_PAY_PER_MONTH) {
            // require(c.monthlyFee > 0, "Nest:Qury:!(monFee)");
            uint256 startTime = uint256(c.startTime);
            uint256 endTime = uint256(c.endTime);
            require(startTime != 0 && startTime < block.timestamp && endTime > block.timestamp, "Nest:Qury:!(client)");
    
            // get the newest EFFECTIVE price from NestMining
            (uint256 ethAmount, uint256 tokenAmount, uint256 bn) = INestMining(_C_NestMining).priceOf(token);
        
            emit PriceQueried(address(msg.sender), token, ethAmount, tokenAmount, bn);
            return (ethAmount, tokenAmount, uint64(bn));
        }

    }
    
    /// @notice The main function called by DeFi clients, compatible to Nest Protocol v3.0 
    /// @dev  The payback address is ZERO, so the changes are kept in this contract
    function updateAndCheckPriceNow(
            address tokenAddress
        ) 
        public 
        payable 
        whenQuryOpened
        returns(uint256 ethAmount, uint256 erc20Amount, uint256 blockNum) 
    {
        return query(tokenAddress, address(0));
    }


/*
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
*/

    function encode_4x32_256(uint32 p1, uint32 p2, uint32 p3, uint32 p4) 
        internal 
        pure 
        returns (uint256 enc) 
    {
        assembly {
            mstore(0x20, p1)
            mstore(0x18, p2)
            mstore(0x10, p3)
            mstore(0x8, p4)
            enc := mload(0x20)
        }
    }

    function decode_4x32_256(uint256 enc) 
        internal 
        pure 
        returns (uint32 p1, uint32 p2, uint32 p3, uint32 p4) 
    {
        assembly {
            p1 := enc
            mstore(0x18, enc)
            p4 := mload(0)
            mstore(0x10, enc)
            p3 := mload(0)
            mstore(0x8, enc)
            p2 := mload(0)
        }
    }

    function encodeClient(uint64 _start, uint64 _end, uint32 _fee, uint32 _typ) internal pure returns (uint256 enc) 
    {
        assembly {
            let y := 0
            mstore(0x20, 0)
            mstore(0x18, _typ)
            mstore(0x14, _fee)
            mstore(0x10, _end)
            mstore(0x8, _start)
            enc := mload(0x20)
        }
    }

    
    function decodeClient(uint256 enc) internal pure returns (Client memory client) 
    {
        uint32 _typ;
        uint32 _fee;
        uint64 _start;
        uint64 _end;
        assembly {
            mstore(0x18, enc)
            _start := mload(0)
            mstore(0x10, enc)
            _end := mload(0)
            mstore(0xc, enc)
            _fee := mload(0)
            mstore(0x8, enc)
            _typ := mload(0)
        }
        client = Client(_start, _end, _fee, _typ, 0);
    }
}
