// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./lib/ReentrancyGuard.sol";


import "./iface/INestPool.sol";
import "./iface/INestStaking.sol";
import "./iface/INToken.sol";
import "./iface/INestQuery.sol";
import "./iface/INestMining.sol";

/// @title NestQuery
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>
contract NestQuery is INestQuery, ReentrancyGuard {

    using SafeMath for uint256;

    struct Params {
        uint32 singleFeeEth;     
        uint32 activationTime;
        uint32 activationFeeNest;
        uint32 _reserved2;
    }

    uint8  public flag;     // 0: query forbidden, client activation forbidden
                            // 1: query allowed, client activation forbidden
                            // 2: query forbidden, client activation allowed
                            // 3: query allowed, clien  t activation allowed;

    uint8  constant FLAG_PAUSED             = 0;
    uint8  constant FLAG_QUERY_ONLY         = 1;
    uint8  constant FLAG_ACTIVATION_ONLY    = 2;
    uint8  constant FLAG_QUERY_ACTIVATION   = 3;

    uint256 private paramsEncoded;

    address public governance;

    struct Client {
        uint64 startTime;
        uint64 endTime;  // endTime==0 for non-monthly clients
        uint32 fee;
        uint32 typ;     // =1: PPQ | =2: PPM
        uint64 _reserved;
    }

    address    private C_NestToken;
    address    private C_NestMining;
    address    private C_NestPool;
    address    private C_NestStaking;
    address    private C_NestDAO;

    uint32  constant CLIENT_ACTIVATION_NEST_AMOUNT = 10_000;
    uint32  constant CLIENT_MONTHLY_FEE_NEST_AMOUNT = 1_000;
    uint32  constant CLIENT_ACTIVATION_DURATION = 1;

    uint32 constant CLIENT_TYPE_PAY_PER_QUERY = 1;
    // uint32 constant CLIENT_TYPE_PAY_PER_MONTH = 2;


    mapping(address => uint256) private clientList;
    mapping(address => address) private clientOp;

    event ClientActivated(address, uint256, uint256);
    // event ClientRenewed(address, uint256, uint256, uint256);
    event PriceQueried(address client, address token, uint256 atHeight);
    event PriceListQueried(address client, address token, uint256 atHeight, uint8 num);
    event ParamsSetup(address gov, uint256 oldParams, uint256 newParams);
    event FlagSet(address gov, uint256 flag);
    event GovSet(address gov, address oldGov, address newGov);

    receive() external payable { }

    constructor() public { }

    function initialize() external 
    { 
        governance = address(msg.sender); 
        flag = FLAG_QUERY_ACTIVATION;
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

    /* ========== MODIFIERS ========== */

    function setGovernance(address _gov) external onlyGovernance 
    { 
        emit GovSet(address(msg.sender), governance, _gov);
        governance = _gov;
    }

    /// @notice Setup the parameters for queryings, one price for all token
    /// @dev    It should be called right after deployment
    function setParams(uint256 single, uint32 time, uint256 nestAmount) 
        public 
        onlyGovernance
    {
        (uint32 _singleFee, uint32 _time, uint32 _actFee, uint32 _res) =  decode_4x32_256(paramsEncoded);

        if (_singleFee == 0 && _time == 0 && _actFee == 0) {
            _singleFee = ((0.01 ether) / 1e12);
            _time = CLIENT_ACTIVATION_DURATION;
            _actFee = CLIENT_ACTIVATION_NEST_AMOUNT;
        }
        
        if (_singleFee != 0) {
            _singleFee = uint32(single);
        }

        if (time != 0) {
            _time = uint32(time);
        }

        if (nestAmount != 0) {
            _actFee = uint32(nestAmount / 1e18);
        }

        uint256 oldParamsEncoded = paramsEncoded;

        paramsEncoded = encode_4x32_256(_singleFee, _time, _actFee, _res);

        emit ParamsSetup(address(msg.sender), oldParamsEncoded, paramsEncoded);
    }

    function setContracts(address NestToken, address NestMining, address NestStaking, address NestPool, address NestDAO) 
        external 
        onlyGovernance
    {
        if (NestToken != address(0)) {
            C_NestToken = NestToken;
        }

        if (NestMining != address(0)) {
            C_NestMining = NestMining;
        }
        
        if (NestPool != address(0)) {
            C_NestPool = NestPool;
        }

        if (NestStaking != address(0)) {
            C_NestStaking = NestStaking;
        }

        if (NestDAO != address(0)) {
            C_NestDAO = NestDAO;
        }
    }

    function setFlag(uint8 newFlag) external onlyGovernance
    {
        flag = newFlag;
                
        emit FlagSet(address(msg.sender), uint256(newFlag));

    }

    /// @dev Withdraw NEST only when emergency or governance
    /// @param to  The address of recipient
    /// @param amount  The amount of NEST tokens 
    function withdrawNest(address to, uint256 amount) override external onlyGovernance
    {
       require(ERC20(C_NestToken).transfer(to, amount), "Nest:Qury:!transfer");
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
        return ERC20(C_NestToken).balanceOf(address(this));
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
    function activate(
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
        (, , uint256 _actFee, ) = decode_4x32_256(paramsEncoded);  
        uint256 _nestFee = _actFee.mul(1 ether);
        uint256 _start = uint64(block.timestamp.add(CLIENT_ACTIVATION_DURATION));
        uint256 _end = 0;
        uint256 _mfee = 0;
        clientList[defi] = encodeClient(uint64(_start), uint64(_end), uint32(_mfee), 0x1);
        clientOp[defi] = address(msg.sender);
        emit ClientActivated(defi, _start, _end);
        require(ERC20(C_NestToken).transferFrom(address(msg.sender), address(this), _nestFee), "Nest:Qury:!transfer");
    }

    function deactivate(address defi) 
        override 
        external 
        whenClientOpened
    {
        if (defi == address(0)) {
            defi = address(msg.sender);
        }
        require(address(msg.sender) == clientOp[defi], "Nest:Qury:!Op");
        clientList[defi] = encodeClient(0, 0, 0, 0);
    }

    function remove(address defi) 
        external 
        onlyGovernance
        whenClientOpened
    {
        clientList[defi] = encodeClient(0, 0, 0, 0);
        clientOp[defi] = address(0);
    }

    /// @notice Query for PPQ (pay-per-query) clients
    function query(address token, address payback) 
        override 
        public 
        payable 
        whenQuryOpened
        nonReentrant
        returns (uint256, uint256, uint256) 
    {
        // check parameters
        Client memory c = decodeClient(clientList[address(msg.sender)]);
        require (c.typ == CLIENT_TYPE_PAY_PER_QUERY, "Nest:Qury:=!(client.typ)");
        require(c.startTime != 0 && uint256(c.startTime) < block.timestamp 
            && uint256(c.endTime) == 0, "Nest:Qury:!(client.time)");

        // lookup the latest effective price
        (uint256 ethAmount, uint256 tokenAmount, uint256 bn) = INestMining(C_NestMining).latestPriceOf(token);
        (uint256 _single, , , ) = decode_4x32_256(paramsEncoded);  

        {
            address _nToken = INestPool(C_NestPool).getNTokenFromToken(token); 
            uint256 _ethFee = _single;
            INestStaking(C_NestStaking).addETHReward{value:_ethFee}(address(_nToken));

            // charge back
            if (payback != address(0)) {
                TransferHelper.safeTransferETH(payback, msg.value.sub(_ethFee));
            }
        }
    
        emit PriceQueried(address(msg.sender), token, bn);
        return (ethAmount, tokenAmount, uint256(bn));
    }

    /// @notice Query for PPQ (pay-per-query) clients
    function queryPriceAvgVola(address token, address payback)
        override 
        external 
        payable 
        whenQuryOpened
        nonReentrant
        returns (uint256 ethAmount, uint256 tokenAmount, int128 avgPrice, int128 vola, uint256 bn) 
    {
        // check parameters
        Client memory c = decodeClient(clientList[address(msg.sender)]);
        require (c.typ == CLIENT_TYPE_PAY_PER_QUERY, "Nest:Qury:=!(client.typ)");
        require(c.startTime != 0 && uint256(c.startTime) < block.timestamp 
            && uint256(c.endTime) == 0, "Nest:Qury:!(client.time)");

        (ethAmount, tokenAmount, bn) = INestMining(C_NestMining).latestPriceOf(token);
        (, avgPrice, vola,) = INestMining(C_NestMining).priceAvgAndSigmaOf(token);

        {
            (uint256 _single, , , ) = decode_4x32_256(paramsEncoded);  
            address _nToken = INestPool(C_NestPool).getNTokenFromToken(token); 
            uint256 _ethFee = _single;
            INestStaking(C_NestStaking).addETHReward{value:_ethFee}(address(_nToken));

            // charge back
            if (payback != address(0)) {
                TransferHelper.safeTransferETH(payback, msg.value.sub(_ethFee));
            }
        }
    }
    
    /// @notice The main function called by DeFi clients, compatible to Nest Protocol v3.0 
    /// @dev  The payback address is ZERO, so the changes are kept in this contract
    function updateAndCheckPriceNow(
            address tokenAddress
        ) 
        override
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

        (uint256 _min, uint256 _max, uint256 _single) = decodePriceOfQuery(_paramsEncoded);  
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
