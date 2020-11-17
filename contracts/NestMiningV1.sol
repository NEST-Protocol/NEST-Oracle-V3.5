// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./libminingv1/MiningV1Data.sol";
import "./libminingv1/MiningV1Calc.sol";

import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./lib/ABDKMath64x64.sol";

import "./iface/INestPool.sol";
import "./iface/INestStaking.sol";
import "hardhat/console.sol";

// import "hardhat/console.sol";

/// @title  NestMiningV1
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>
contract NestMiningV1 {

    using SafeMath for uint256;

    MiningV1Data.State state;

    using MiningV1Calc for MiningV1Data.State;


    struct Params {
        uint8    miningEthUnit;     // = 10;
        uint32   nestStakedNum1k;   // = 1;
        uint8    biteFeeRate;       // = 1; 
        uint8    miningFeeRate;     // = 10;
    }

    /// @dev The struct is for public data in a price sheet, so as to protect prices from being read
    struct PriceSheetPub {
        uint160 miner;       //  miner who posted the price (most significant bits, or left-most)
        uint32  height;
        uint32  ethNum;   

        uint8   typ;             // 1: USD | 2: NEST | 3: TOKEN | 4: NTOKEN(Not Available)
        uint8   state;           // 0: closed | 1: posted | 2: bitten
        uint32  ethNumBal;
        uint32  tokenNumBal;
    }

    // /* ========== CONSTANTS ========== */

    uint256 constant MINING_NEST_YIELD_CUTBACK_PERIOD = 2400000; // ~ 1 years 
    uint256 constant MINING_NEST_YIELD_CUTBACK_RATE = 80;     // percentage = 80%

    // yield amount (per block) after the first ten years
    uint256 constant MINING_NEST_YIELD_OFF_PERIOD_AMOUNT = 40 ether;  
    // yield amount (per block) in the first year, it drops to 80% in the following nine years
    uint256 constant MINING_NEST_YIELD_PER_BLOCK_BASE = 400 ether;  

    uint256 constant MINING_NTOKEN_YIELD_CUTBACK_RATE = 80;
    uint256 constant MINING_NTOKEN_YIELD_OFF_PERIOD_AMOUNT = 0.4 ether;
    uint256 constant MINING_NTOKEN_YIELD_PER_BLOCK_BASE = 4 ether;
    uint256 constant MINING_NTOKEN_YIELD_BLOCK_LIMIT = 300;

    /* ========== EVENTS ========== */

    event PricePosted(address miner, address token, uint256 index, uint256 ethAmount, uint256 tokenAmount);
    event PriceClosed(address miner, address token, uint256 index);
    event Deposit(address miner, address token, uint256 amount);
    event Withdraw(address miner, address token, uint256 amount);
    event TokenBought(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);
    event TokenSold(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);

    event VolaComputed(uint32 h, uint32 pos, uint32 ethA, uint128 tokenA, int128 sigma_sq, int128 ut_sq);
    // event NTokenMining(uint256 height, uint256 yieldAmount, address ntoken);
    // event NestMining(uint256 height, uint256 yieldAmount);

    /* ========== CONSTRUCTOR ========== */

    constructor() public 
    {
        state.governance = msg.sender;
    }

    function init() external 
    {
        require(state.flag == MiningV1Data.STATE_FLAG_UNINITIALIZED);
        uint256 amount = MiningV1Data.MINING_NEST_YIELD_PER_BLOCK_BASE;
        for (uint i =0; i < 10; i++) {
            state._mining_nest_yield_per_block_amount[i] = amount;
            amount = amount.mul(MiningV1Data.MINING_NEST_YIELD_CUTBACK_RATE).div(100);
        }

        amount = MiningV1Data.MINING_NTOKEN_YIELD_PER_BLOCK_BASE;
        for (uint i =0; i < 10; i++) {
            state._mining_ntoken_yield_per_block_amount[i] = amount;
            amount = amount.mul(MiningV1Data.MINING_NTOKEN_YIELD_CUTBACK_RATE).div(100);
        }

        state.governance = msg.sender;

        state.version = 1;
        state.miningEthUnit = 10;
        state.nestStakedNum1k = 1;
        state.biteFeeRate = 1;
        state.miningFeeRate = 10;
        state.latestMiningHeight = uint128(block.number);
        state.flag = MiningV1Data.STATE_FLAG_ACTIVE;
    }

    receive() external payable { }

    /* ========== MODIFIERS ========== */

    function _onlyGovernance() private view 
    {
        require(msg.sender == state.governance, "Nest:Mine:!GOV");
    }

    modifier onlyGovernance() 
    {
        _onlyGovernance();
        _;
    }

    function _noContract() private view {
        require(address(msg.sender) == address(tx.origin), "Nest::Mine:contract!");
    }

    modifier noContract() 
    {
        _noContract();
        _;
    }

    modifier onlyGovOrBy(address _contract) 
    {
        require(msg.sender == state.governance || msg.sender == _contract, "Nest:Mine:!sender");
        _;
    }

    /* ========== GOVERNANCE ========== */

    function setAddresses(address developer_address, address NN_address) public onlyGovernance 
    {
        state._developer_address = developer_address;
        state._NN_address = NN_address;
    }

    function setContracts(address NestToken, address NestPool, address NestStaking, address NestQuery) 
        public onlyGovernance 
    {
        state.C_NestToken = NestToken;
        state.C_NestPool  = NestPool;
        state.C_NestQuery = NestQuery;
        state.C_NestStaking = NestStaking;
    }


    function setParameters(Params calldata newParams) external 
        onlyGovernance
    {
        if (newParams.miningEthUnit != 0) {
            state.miningEthUnit = newParams.miningEthUnit;
        }
        if (newParams.nestStakedNum1k != 0) {
            state.nestStakedNum1k = newParams.nestStakedNum1k;
        }
        if (newParams.biteFeeRate != 0) {
            state.biteFeeRate = newParams.biteFeeRate;
        }
        if (newParams.miningFeeRate != 0) {
            state.miningFeeRate = newParams.miningFeeRate;
        }
    }

    /* ========== HELPERS ========== */

    function version() view public 
        returns (uint256)
    {
        return uint256(state.version);
    }

    function addrOfGovernance() view external
        returns (address) 
    {   
        return state.governance;
    }


    function parameters() view external 
        returns (Params memory params)
    {
        params.miningEthUnit = state.miningEthUnit;
        params.nestStakedNum1k = state.nestStakedNum1k;
        params.biteFeeRate = state.biteFeeRate;
        params.miningFeeRate = state.miningFeeRate;
    }

/*

    function volatility(address token) public view returns (PriceInfo memory p) {
        // TODO: no contract allowed
        return priceInfo[token];
    }
*/
    /* ========== POST/CLOSE Price Sheets ========== */

    /// @dev  It is for TOKEN (except USDx) and NTOKEN (except NEST)
    function post(
            address token, 
            uint256 ethNum, 
            uint256 tokenAmountPerEth
        )
        external 
        payable 
        noContract
    {
        // check parameters 
        require(ethNum >= state.miningEthUnit && ethNum % state.miningEthUnit == 0, "Nest:Mine:!(ethNum)");
        require(tokenAmountPerEth > 0, "Nest:Mine:!(price)");
        INestPool _C_NestPool = INestPool(state.C_NestPool);
        address _ntoken = _C_NestPool.getNTokenFromToken(token);
        require(_ntoken != address(0) &&  _ntoken != address(state.C_NestToken), "Nest:Mine:!(ntoken)");


        // calculate eth fee
        uint256 _ethFee = ethNum.mul(state.miningFeeRate).mul(1e18).div(1000);

        { // settle ethers and tokens

            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));

            INestStaking(state.C_NestStaking).addETHReward{value:_ethFee}(_ntoken);       

            // freeze eths and tokens in the nest pool
            _C_NestPool.freezeEthAndToken(msg.sender, ethNum.mul(1 ether), 
                token, tokenAmountPerEth.mul(ethNum));
            _C_NestPool.freezeNest(msg.sender, uint256(state.nestStakedNum1k).mul(1000 * 1e18));
        }

        {
            MiningV1Data.PriceSheet[] storage _sheetToken = state.priceSheetList[token];
            // append a new price sheet
            _sheetToken.push(MiningV1Data.PriceSheet(
                uint160(msg.sender),            // miner 
                uint32(block.number),           // atHeight
                uint32(ethNum),                 // ethNum
                uint32(ethNum),                 // remainNum
                uint8(0),                       // level
                uint8(MiningV1Data.PRICESHEET_TYPE_TOKEN),   // typ
                uint8(MiningV1Data.PRICESHEET_STATE_POSTED), // state 
                uint8(0),                       // _reserved
                uint32(ethNum),                 // ethNumBal
                uint32(ethNum),                 // tokenNumBal
                uint32(state.nestStakedNum1k),        // nestNum1k
                uint128(tokenAmountPerEth)      // tokenAmountPerEth
            ));
            emit PricePosted(msg.sender, token, (_sheetToken.length - 1), ethNum.mul(1 ether), tokenAmountPerEth.mul(ethNum)); 

        }

        { // mining
            uint256 _minedH = state.minedAtHeight[token][block.number];
            uint256 _ntokenH = uint256(_minedH >> 128);
            uint256 _ethH = uint256(_minedH % (1 << 128));
            if (_ntokenH == 0) {
                uint256 _ntokenAmount = _mineNToken(_ntoken);  
                state.latestMiningHeight = uint32(block.number); 
                _ntokenH = _ntokenAmount;
                INToken(_ntoken).increaseTotal2(_ntokenAmount, address(state.C_NestPool));
            }
            _ethH = _ethH.add(ethNum);
            // require(_nestH < (1 << 128) && _ethH < (1 << 128), "nestAtHeight/ethAtHeight error");
            state.minedAtHeight[token][block.number] = (_ntokenH * (1<< 128) + _ethH);
        }

        return; 
    }

    function post2(
            address token, 
            uint256 ethNum, 
            uint256 tokenAmountPerEth, 
            uint256 ntokenAmountPerEth
        )
        external 
        payable 
        noContract
    {
        // check parameters 
        require(ethNum >= state.miningEthUnit && ethNum % state.miningEthUnit == 0, "Nest:Mine:!(ethNum)");
        require(tokenAmountPerEth > 0 && ntokenAmountPerEth > 0, "Nest:Mine:!(price)");
        address _ntoken = INestPool(state.C_NestPool).getNTokenFromToken(token);
        require(_ntoken == address(state.C_NestToken), "Nest:Mine:!(ntoken)");

        // calculate eth fee
        uint256 _ethFee = ethNum.mul(state.miningFeeRate).mul(1e18).div(1000);

        { // settle ethers and tokens
            INestPool _C_NestPool = INestPool(state.C_NestPool);
            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));

            INestStaking(state.C_NestStaking).addETHReward{value:_ethFee}(_ntoken);       

            // freeze eths and tokens in the nest pool
            _C_NestPool.freezeEthAndToken(msg.sender, ethNum.mul(1 ether), 
                token, tokenAmountPerEth.mul(ethNum));
            _C_NestPool.freezeEthAndToken(msg.sender, ethNum.mul(1 ether), 
                _ntoken, ntokenAmountPerEth.mul(ethNum));
            _C_NestPool.freezeNest(msg.sender, uint256(state.nestStakedNum1k).mul(2).mul(1000 * 1e18));
        }

        {
            MiningV1Data.PriceSheet[] storage _sheetToken = state.priceSheetList[token];
            // append a new price sheet
            _sheetToken.push(MiningV1Data.PriceSheet(
                uint160(msg.sender),            // miner 
                uint32(block.number),           // atHeight
                uint32(ethNum),                 // ethNum
                uint32(ethNum),                 // remainNum
                uint8(0),                       // level
                uint8(MiningV1Data.PRICESHEET_TYPE_USD),     // typ
                uint8(MiningV1Data.PRICESHEET_STATE_POSTED), // state 
                uint8(0),                       // _reserved
                uint32(ethNum),                 // ethNumBal
                uint32(ethNum),                 // tokenNumBal
                uint32(state.nestStakedNum1k),        // nestNum1k
                uint128(tokenAmountPerEth)      // tokenAmountPerEth
            ));

            MiningV1Data.PriceSheet[] storage _sheetNToken = state.priceSheetList[_ntoken];
            // append a new price sheet for ntoken
            _sheetNToken.push(MiningV1Data.PriceSheet(
                uint160(msg.sender),            // miner 
                uint32(block.number),           // atHeight
                uint32(ethNum),                 // ethNum
                uint32(ethNum),                 // remainNum
                uint8(0),                       // level
                uint8(MiningV1Data.PRICESHEET_TYPE_NEST),     // typ
                uint8(MiningV1Data.PRICESHEET_STATE_POSTED), // state 
                uint8(0),                       // _reserved
                uint32(ethNum),                 // ethNumBal
                uint32(ethNum),                 // tokenNumBal
                uint32(state.nestStakedNum1k),        // nestNum1k
                uint128(ntokenAmountPerEth)      // tokenAmountPerEth
            ));
            emit PricePosted(msg.sender, token, (_sheetToken.length - 1), ethNum.mul(1 ether), tokenAmountPerEth.mul(ethNum)); 
            emit PricePosted(msg.sender, _ntoken, (_sheetNToken.length - 1), ethNum.mul(1 ether), ntokenAmountPerEth.mul(ethNum)); 
        }

        { // mining
            // TODO: support token <-> ntoken, add _mineNToken()
            uint256 _minedH = state.minedAtHeight[token][block.number];
            uint256 _nestH = uint256(_minedH >> 128);
            uint256 _ethH = uint256(_minedH % (1 << 128));
            if (_nestH == 0) {
                uint256 _nestAmount = _mineNest();  
                state.latestMiningHeight = uint32(block.number); 
                state.minedNestAmount += uint128(_nestAmount);
                _nestH = _nestAmount.mul(MiningV1Data.MINER_NEST_REWARD_PERCENTAGE).div(100); 
            }
            _ethH = _ethH.add(ethNum);
            // require(_nestH < (1 << 128) && _ethH < (1 << 128), "nestAtHeight/ethAtHeight error");
            state.minedAtHeight[token][block.number] = (_nestH * (1<< 128) + _ethH);
        }

        return; 
    }

    /// @dev Close a price sheet of USD/NEST/TOKEN
    function close(address token, uint256 index) public noContract 
    {
        MiningV1Data.PriceSheet memory _sheet = state.priceSheetList[token][index];
        require(_sheet.height + MiningV1Data.PRICE_DURATION_BLOCK < block.number, "Nest:Mine:!(height)");  // safe_math: untainted values
        require(address(_sheet.miner) == address(msg.sender), "Nest:Mine:!(miner)");

        INestPool _C_NestPool = INestPool(state.C_NestPool);
        address _ntoken = _C_NestPool.getNTokenFromToken(token);

        {   
            uint256 h = _sheet.height;
            if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_USD && _sheet.level == 0) {
                uint256 _nestH = uint256(state.minedAtHeight[token][h] / (1 << 128));
                uint256 _ethH = uint256(state.minedAtHeight[token][h] % (1 << 128));
                uint256 _reward = uint256(_sheet.ethNum).mul(_nestH).div(_ethH);
                _C_NestPool.addNest(address(msg.sender), _reward);
            } else if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_TOKEN && _sheet.level == 0) {
                uint256 _ntokenH = uint256(state.minedAtHeight[token][h] / (1 << 128));
                uint256 _ethH = uint256(state.minedAtHeight[token][h] % (1 << 128));
                uint256 _reward = uint256(_sheet.ethNum).mul(_ntokenH).div(_ethH);
                _C_NestPool.addNToken(address(msg.sender), _ntoken, _reward);
            }
        }

        {
            uint256 _ethAmount = uint256(_sheet.ethNumBal).mul(1 ether);
            uint256 _tokenAmount = uint256(_sheet.tokenNumBal).mul(_sheet.tokenAmountPerEth);
            uint256 _nestAmount = uint256(_sheet.nestNum1k).mul(1000 * 1e18);
            _sheet.ethNumBal = 0;
            _sheet.tokenNumBal = 0;
            _sheet.nestNum1k = 0;

            _C_NestPool.unfreezeEthAndToken(address(msg.sender), _ethAmount, token, _tokenAmount);
            _C_NestPool.unfreezeNest(address(msg.sender), _nestAmount); 
        }

        _sheet.state = MiningV1Data.PRICESHEET_STATE_CLOSED;

        state.priceSheetList[token][index] = _sheet;

        emit PriceClosed(address(msg.sender), token, index);
    }

    function closeList(address token, uint64[] memory indices) public 
    {
        uint256 _ethAmount;
        uint256 _tokenAmount;
        uint256 _nestAmount;
        uint256 _reward;

        MiningV1Data.PriceSheet[] storage prices = state.priceSheetList[token];
        
        for (uint i=0; i<indices.length; i++) {
            MiningV1Data.PriceSheet memory _sheet = prices[indices[i]];
            if (uint256(_sheet.miner) != uint256(msg.sender)) {
                continue;
            }
            uint256 h = uint256(_sheet.height);
            if (h + MiningV1Data.PRICE_DURATION_BLOCK < block.number) { // safe_math: untainted values
                _ethAmount = _ethAmount.add(uint256(_sheet.ethNumBal).mul(1 ether));
                _tokenAmount = _tokenAmount.add(uint256(_sheet.tokenNumBal).mul(_sheet.tokenAmountPerEth));
                _nestAmount = _nestAmount.add(uint256(_sheet.nestNum1k).mul(1000 * 1e18));
                _sheet.ethNumBal = 0;
                _sheet.tokenNumBal = 0;
                _sheet.nestNum1k = 0;

                _sheet.state = MiningV1Data.PRICESHEET_STATE_CLOSED;
                prices[indices[i]] = _sheet;

                uint256 _ntokenH = uint256(state.minedAtHeight[token][h] >> 128);
                uint256 _ethH = uint256(state.minedAtHeight[token][h] << 128 >> 128);
                _reward = _reward.add(uint256(_sheet.ethNum).mul(_ntokenH).div(_ethH));
                emit PriceClosed(address(msg.sender), token, indices[i]);
            }
        }
        
        INestPool _C_NestPool = INestPool(state.C_NestPool);

        if (_ethAmount > 0 || _tokenAmount > 0) {
            _C_NestPool.unfreezeEthAndToken(address(msg.sender), _ethAmount, token, _tokenAmount);
        }
        _C_NestPool.unfreezeNest(address(msg.sender), _nestAmount); 

        {
            uint256 _typ = prices[indices[0]].typ;
            if  (_typ == MiningV1Data.PRICESHEET_TYPE_USD) {
                _C_NestPool.addNest(address(msg.sender), _reward);
            } else if (_typ == MiningV1Data.PRICESHEET_TYPE_TOKEN) {
                address _ntoken = _C_NestPool.getNTokenFromToken(token);
                _C_NestPool.addNToken(address(msg.sender), _ntoken, _reward);
            }
        }
    }


    /// @notice Call the function to buy TOKEN/NTOKEN from a posted price sheet
    /// @dev bite TOKEN(NTOKEN) by ETH,  (+ethNumBal, -tokenNumBal)
    /// @param token The address of token(ntoken)
    /// @param index The position of the sheet in priceSheetList[token]
    /// @param biteNum The amount of bitting (in the unit of ETH), realAmount = biteNum * newTokenAmountPerEth
    /// @param newTokenAmountPerEth The new price of token (1 ETH : some TOKEN), here some means newTokenAmountPerEth
    function biteToken(address token, uint256 index, uint256 biteNum, uint256 newTokenAmountPerEth) 
        public payable noContract
    {
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        require(newTokenAmountPerEth > 0, "Nest:Mine:(price)=0");
        require(biteNum >= state.miningEthUnit && biteNum % state.miningEthUnit == 0, "Nest:Mine:!(bite)");

        MiningV1Data.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        require(_sheet.height + MiningV1Data.PRICE_DURATION_BLOCK > block.number, "Nest:Mine:!EFF(sheet)");
        require(_sheet.remainNum >= biteNum, "Nest:Mine:!(remain)");

        INestPool _C_NestPool = INestPool(state.C_NestPool);

        uint256 _state = uint256(_sheet.state);
        require(_state == MiningV1Data.PRICESHEET_STATE_POSTED 
             || _state == MiningV1Data.PRICESHEET_STATE_BITTEN,  "Nest:Mine:!(state)");

        {
            address nToken = token;
            
            if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_USD || _sheet.typ == MiningV1Data.PRICESHEET_TYPE_TOKEN) {
                nToken = _C_NestPool.getNTokenFromToken(token);
                require (nToken != address(0x0), "Nest:Mine:!(ntoken)");
            } else if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_NEST || _sheet.typ == MiningV1Data.PRICESHEET_TYPE_NTOKEN) {
                nToken = token;
            }

            uint256 _ethFee = biteNum.mul(1 ether).mul(state.biteFeeRate).div(1000);

            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            INestStaking(state.C_NestStaking).addETHReward{value:_ethFee}(nToken);
        }

        // post a new price sheet
        { 
            // check bitting conditions
            uint256 _newEthNum;
            uint256 _newNestNum1k;
            {
                uint256 _level = uint256(_sheet.level);
                uint256 _newLevel;

                if (_level > MiningV1Data.MAX_BITE_NESTED_LEVEL && _level < 127) { // bitten sheet, nest doubling
                    _newEthNum = biteNum;
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level <= MiningV1Data.MAX_BITE_NESTED_LEVEL) {  // bitten sheet, eth doubling 
                    _newEthNum = biteNum.mul(MiningV1Data.BITE_AMOUNT_INFLATE_FACTOR);
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level >= 127) {
                    _newLevel = _level;
                    _newNestNum1k = uint256(_sheet.nestNum1k);
                }

                MiningV1Data.PriceSheet[] storage _sheetOfToken = state.priceSheetList[token];
                // append a new price sheet
                _sheetOfToken.push(MiningV1Data.PriceSheet(
                    uint160(msg.sender),             // miner 
                    uint32(block.number),            // atHeight
                    uint32(_newEthNum),                 // ethNum
                    uint32(_newEthNum),                 // remainNum
                    uint8(_newLevel),                // level
                    uint8(_sheet.typ),               // typ
                    uint8(MiningV1Data.PRICESHEET_STATE_POSTED),  // state 
                    uint8(0),                        // _reserved
                    uint32(_newEthNum),                 // ethNumBal
                    uint32(_newEthNum),                 // tokenNumBal
                    uint32(_newNestNum1k),           // nestNum1k
                    uint128(newTokenAmountPerEth)    // tokenAmountPerEth
                ));
            }
            _C_NestPool.freezeNest(address(msg.sender), _newNestNum1k.mul(1000 * 1e18));
            _C_NestPool.freezeEthAndToken(msg.sender, _newEthNum.add(biteNum).mul(1 ether), 
                token, _newEthNum.mul(newTokenAmountPerEth)
                                    .sub(biteNum.mul(_sheet.tokenAmountPerEth)));
            _sheet.state = MiningV1Data.PRICESHEET_STATE_BITTEN;
            _sheet.ethNumBal = uint32(uint256(_sheet.ethNumBal).add(biteNum));
            _sheet.tokenNumBal = uint32(uint256(_sheet.tokenNumBal).sub(biteNum));
            _sheet.remainNum = uint32(uint256(_sheet.remainNum).sub(biteNum));
            state.priceSheetList[token][index] = _sheet;
            
        }

        emit TokenBought(address(msg.sender), address(token), index, biteNum.mul(1 ether), biteNum.mul(_sheet.tokenAmountPerEth));
        return; 

    }

    /// @notice Call the function to buy TOKEN/NTOKEN from a posted price sheet
    /// @dev bite TOKEN(NTOKEN) by ETH,  (+ethNumBal, -tokenNumBal)
    /// @param token The address of token(ntoken)
    /// @param index The position of the sheet in priceSheetList[token]
    /// @param biteNum The amount of bitting (in the unit of ETH), realAmount = biteNum * newTokenAmountPerEth
    /// @param newTokenAmountPerEth The new price of token (1 ETH : some TOKEN), here some means newTokenAmountPerEth
    function biteEth(address token, uint256 index, uint256 biteNum, uint256 newTokenAmountPerEth)
            public payable noContract
    {
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        require(newTokenAmountPerEth > 0, "Nest:Mine:(price)=0");
        require(biteNum >= state.miningEthUnit && biteNum % state.miningEthUnit == 0, "Nest:Mine:!(bite)");

        MiningV1Data.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        require(block.number.sub(_sheet.height) < MiningV1Data.PRICE_DURATION_BLOCK, "Nest:Mine:!EFF(sheet)");
        require(_sheet.remainNum >= biteNum, "Nest:Mine:!(remain)");

        INestPool _C_NestPool = INestPool(state.C_NestPool);

        uint256 _state = uint256(_sheet.state);
        require(_state == MiningV1Data.PRICESHEET_STATE_POSTED 
            || _state == MiningV1Data.PRICESHEET_STATE_BITTEN,  "Nest:Mine:!(state)");

        {
            address nToken = token;
            
            if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_USD 
                    || _sheet.typ == MiningV1Data.PRICESHEET_TYPE_TOKEN) {
                nToken = _C_NestPool.getNTokenFromToken(token);
                require (nToken != address(0x0), "Nest:Mine:!(ntoken)");
            } else if (_sheet.typ == MiningV1Data.PRICESHEET_TYPE_NEST || _sheet.typ == MiningV1Data.PRICESHEET_TYPE_NTOKEN) {
                nToken = token;
            }

            uint256 _ethFee = biteNum.mul(1 ether).mul(state.biteFeeRate).div(1000);

            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            INestStaking(state.C_NestStaking).addETHReward{value:_ethFee}(nToken);
        }
        
       // post a new price sheet
        { 
            // check bitting conditions
            uint256 _newEthNum;
            uint256 _newNestNum1k;
            {
                uint256 _level = uint256(_sheet.level);
                uint256 _newLevel;

                if (_level > MiningV1Data.MAX_BITE_NESTED_LEVEL && _level < 127) { // bitten sheet, nest doubling
                    _newEthNum = biteNum;
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level <= MiningV1Data.MAX_BITE_NESTED_LEVEL) {  // bitten sheet, eth doubling 
                    _newEthNum = biteNum.mul(MiningV1Data.BITE_AMOUNT_INFLATE_FACTOR);
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level >= 127) {
                    _newLevel = _level;
                    _newNestNum1k = uint256(_sheet.nestNum1k);
                }

                MiningV1Data.PriceSheet[] storage _sheetOfToken = state.priceSheetList[token];
                // append a new price sheet
                _sheetOfToken.push(MiningV1Data.PriceSheet(
                    uint160(msg.sender),             // miner 
                    uint32(block.number),            // atHeight
                    uint32(_newEthNum),                 // ethNum
                    uint32(_newEthNum),                 // remainNum
                    uint8(_newLevel),                // level
                    uint8(_sheet.typ),               // typ
                    uint8(MiningV1Data.PRICESHEET_STATE_POSTED),  // state 
                    uint8(0),                        // _reserved
                    uint32(_newEthNum),                 // ethNumBal
                    uint32(_newEthNum),                 // tokenNumBal
                    uint32(_newNestNum1k),           // nestNum1k
                    uint128(newTokenAmountPerEth)    // tokenAmountPerEth
                ));
            }
            _C_NestPool.freezeNest(address(msg.sender), _newNestNum1k.mul(1000 * 1e18));
            _C_NestPool.freezeEthAndToken(msg.sender, _newEthNum.sub(biteNum).mul(1 ether), 
                token, _newEthNum.mul(newTokenAmountPerEth)
                                    .add(biteNum.mul(_sheet.tokenAmountPerEth)));
            _sheet.state = MiningV1Data.PRICESHEET_STATE_BITTEN;
            _sheet.ethNumBal = uint32(uint256(_sheet.ethNumBal).sub(biteNum));
            _sheet.tokenNumBal = uint32(uint256(_sheet.tokenNumBal).add(biteNum));
            _sheet.remainNum = uint32(uint256(_sheet.remainNum).sub(biteNum));
            state.priceSheetList[token][index] = _sheet;
        }
        emit TokenSold(address(msg.sender), address(token), index, biteNum.mul(1 ether), biteNum.mul(_sheet.tokenAmountPerEth));
        return; 
    }
    
    /* ========== PRICE QUERIES ========== */

    /// @notice Get the latest effective price for a token
    /// @dev It shouldn't be read from any contracts other than NestQuery
    function latestPriceOf(address token) 
        public 
        view 
        noContract
        returns(uint256 ethAmount, uint256 tokenAmount, uint256 blockNum) 
    {
        MiningV1Data.PriceSheet[] storage _plist = state.priceSheetList[token];
        uint256 len = _plist.length;
        uint256 _ethNum;
        MiningV1Data.PriceSheet memory _sheet;
        if (len == 0) {
            return (0, 0, 0);
        }

        uint256 _first = 0;
        for (uint i = 1; i <= len; i++) {
            _sheet = _plist[len-i];
            if (_first == 0 && _sheet.height + MiningV1Data.PRICE_DURATION_BLOCK < block.number) {
                _first = uint256(_sheet.height);
                _ethNum = uint256(_sheet.remainNum);
                tokenAmount = uint256(_sheet.tokenAmountPerEth).mul(_ethNum);
                ethAmount = _ethNum.mul(1 ether);
                blockNum = _first;
            } else if (_first == uint256(_sheet.height)) {
                _ethNum = _ethNum.add(_sheet.remainNum);
                tokenAmount = tokenAmount.add(uint256(_sheet.tokenAmountPerEth).mul(_ethNum));
                ethAmount = _ethNum.mul(1 ether);
            } else if (_first > uint256(_sheet.height)) {
                break;
            }
        }
    }

    /// @dev It shouldn't be read from any contracts other than NestQuery
    function priceOf(address token) 
        public 
        view 
        onlyGovOrBy(state.C_NestQuery)
        returns(uint256 ethAmount, uint256 tokenAmount, uint256 blockNum) 
    {
        MiningV1Data.PriceInfo memory pi = state.priceInfo[token];
        require(pi.height > 0, "Nest:Mine:NO(price)");
        return (uint256(pi.ethNum).mul(1 ether), pi.tokenAmount, pi.height);
    }

    /// @dev It shouldn't be read from any contracts other than NestQuery
    function priceAvgAndSigmaOf(address token) 
        public 
        view 
        onlyGovOrBy(state.C_NestQuery)
        returns (int128, int128, int128, uint256) 
    {
        MiningV1Data.PriceInfo memory pi = state.priceInfo[token];
        require(pi.height > 0, "Nest:Mine:NO(price)");
        int128 v = ABDKMath64x64.sqrt(ABDKMath64x64.abs(pi.volatility_sigma_sq));
        int128 p = ABDKMath64x64.divu(uint256(pi.tokenAmount), uint256(pi.ethNum));
        return (p, pi.avgTokenAmount, v, uint256(pi.height));
    }

    function priceOfTokenAtHeight(address token, uint64 atHeight) 
        public 
        view 
        returns(uint256 ethAmount, uint256 tokenAmount, uint256 height) 
    {
        return state._priceOfTokenAtHeight(token, atHeight);
    }

    /// @notice Return a consecutive price list for a token 
    /// @dev 
    /// @param token The address of token contract
    /// @param num   The length of price list
    function priceListOfToken(address token, uint8 num) 
        public
        view 
        returns (uint128[] memory data, uint256 atHeight) 
    {
        return state._priceListOfToken(token, num);
    }

    /* ========== MINING ========== */
    
    function _mineNest() private view returns (uint256) {
        uint256 _period = block.number.sub(MiningV1Data.MINING_NEST_GENESIS_BLOCK_HEIGHT).div(MiningV1Data.MINING_NEST_YIELD_CUTBACK_PERIOD);
        uint256 _nestPerBlock;
        if (_period > 9) {
            _nestPerBlock = MiningV1Data.MINING_NEST_YIELD_OFF_PERIOD_AMOUNT;
        } else {
            _nestPerBlock = state._mining_nest_yield_per_block_amount[_period];
        }
        return _nestPerBlock.mul(block.number.sub(state.latestMiningHeight));
    }

/*
    function yieldAmountAtHeight(uint64 height) public view returns (uint128) {
        console.log("MINING_NEST_GENESIS_BLOCK_HEIGHT=%s, height=%s", MINING_NEST_GENESIS_BLOCK_HEIGHT, height);
        uint256 period = uint256(height).sub(MINING_NEST_GENESIS_BLOCK_HEIGHT).div(MINING_NEST_YIELD_CUTBACK_PERIOD);
        uint256 nestPerBlock;
        if (period > 9) {
            nestPerBlock = MINING_NEST_YIELD_OFF_PERIOD_AMOUNT;
        } else {
            nestPerBlock = _mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = nestPerBlock.mul(uint256(height).sub(latestMiningHeight));
        return uint128(yieldAmount);
    }
    */

    function latestMinedHeight() external view returns (uint64) {
       return uint64(state.latestMiningHeight);
    }

    function _mineNToken(address ntoken) private returns (uint256) {
        (uint256 _genesis, uint256 _last) = INToken(ntoken).checkBlockInfo();

        uint256 _period = block.number.sub(_genesis).div(MiningV1Data.MINING_NEST_YIELD_CUTBACK_PERIOD);
        uint256 _ntokenPerBlock;
        if (_period > 9) {
            _ntokenPerBlock = MiningV1Data.MINING_NTOKEN_YIELD_OFF_PERIOD_AMOUNT;
        } else {
            _ntokenPerBlock = state._mining_ntoken_yield_per_block_amount[_period];
        }
        uint256 _interval = block.number.sub(_last);
        if (_interval > MINING_NTOKEN_YIELD_BLOCK_LIMIT) {
            _interval = MINING_NTOKEN_YIELD_BLOCK_LIMIT;
        }

        // NOTE: no NTOKEN rewards if the mining interval is greater than a pre-defined number
        uint256 yieldAmount = _ntokenPerBlock.mul(_interval);
        return yieldAmount;
    }

    /* ========== MINING ========== */


    function withdrawEthAndToken(uint256 ethAmount, address token, uint256 tokenAmount) public noContract
    {
        INestPool(state.C_NestPool).withdrawEthAndToken(address(msg.sender), ethAmount, token, tokenAmount); 
    }

    /* ========== VIEWS ========== */

    function lengthOfPriceSheets(address token) 
        view external 
        returns (uint256)
    {
        return state.priceSheetList[token].length;
    }

    function priceSheet(address token, uint256 index) 
        view external 
        returns (PriceSheetPub memory sheet) 
    {
        uint256 len = state.priceSheetList[token].length;
        require (index < len, "Nest:Mine:!index");
        MiningV1Data.PriceSheet memory _sheet = state.priceSheetList[token][index];
        sheet.miner = _sheet.miner;
        sheet.height = _sheet.height;
        sheet.ethNum = _sheet.ethNum;
        sheet.typ = _sheet.typ;
        sheet.state = _sheet.state;
        sheet.ethNumBal = _sheet.ethNumBal;
        sheet.tokenNumBal = _sheet.tokenNumBal;
    }

    function contentOfPriceSheet(address token, uint256 index) view public 
        returns (MiningV1Data.PriceSheet memory ps) 
    {
        uint256 len = state.priceSheetList[token].length;
        require (index < len, "Nest:Mine:>(len)");
        return state.priceSheetList[token][index];
    }


    /* ========== CALCULATION ========== */

    function stat(address _token) public 
    {
        return state._stat(_token);
    }


    /* ========== ENCODING/DECODING ========== */

    // function decodeU256Two(uint256 enc) public pure returns (uint128, uint128) {
    //     return (uint128(enc / (1 << 128)), uint128(enc % (1 << 128)));
    // }

/*
    function decode(bytes32 x) internal pure returns (uint64 a, uint64 b, uint64 c, uint64 d) {
        assembly {
            d := x
            mstore(0x18, x)
            a := mload(0)
            mstore(0x10, x)
            b := mload(0)
            mstore(0x8, x)
            c := mload(0)
        }
    }
*/
}