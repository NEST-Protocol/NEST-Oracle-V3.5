// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./libminingv2/MiningData.sol";
import "./libminingv2/MiningCalcPrice.sol";
import "./libminingv2/MiningLookupPrice.sol";
import "./libminingv2/MiningOp.sol";

import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./lib/ABDKMath64x64.sol";

import "./iface/INestMining.sol";
import "./iface/INestPool.sol";
import "./iface/INestStaking.sol";
import "./iface/INToken.sol";
import "./iface/INNRewardPool.sol";
import "hardhat/console.sol";

contract NestMining is INestMining {
    
    using SafeMath for uint256;

    using MiningCalcPrice for MiningData.State;
    using MiningLookupPrice for MiningData.State;
    using MiningOp for MiningData.State;

    address _developer_address;
    address _NN_address;

    uint256 public version = 2;

    MiningData.State private state;

    uint256 constant c_mining_nest_genesis_block_height = 1; // for testing

    uint256 constant c_mining_nest_yield_cutback_period = 2400000;
    uint256 constant c_mining_nest_yield_cutback_rate = 80;
    uint256 constant c_mining_nest_yield_off_period_amount = 40 ether;
    uint256 constant c_mining_nest_yield_per_block_base = 400 ether;

    uint256 constant c_mining_ntoken_yield_cutback_rate = 80;
    uint256 constant c_mining_ntoken_yield_off_period_amount = 0.4 ether;
    uint256 constant c_mining_ntoken_yield_per_block_base = 4 ether;

    uint256 constant c_dev_reward_percentage = 5;
    uint256 constant c_NN_reward_percentage = 15;
    uint256 constant c_nest_reward_percentage = 80;

    uint256 constant c_price_eth_unit = 1;
    uint256 constant c_price_deviation_rate = 10;
    uint256 constant c_price_duration_block = 25;
    uint256 constant c_sheet_duration_block = 4 * 60 * 6; // = 1440 (6 hours) if avg. rate of eth-block mining ~ 14 seconds

    uint256 constant c_mining_eth_unit = 10;  // 10 ether
    // uint256 constant c_mining_price_deviateion_factor = 10; // removed
    uint256 constant c_mining_fee_thousandth = 10; 

    uint256 constant c_take_amount_factor = 2;
    uint256 constant c_take_fee_thousandth = 1; 

    uint256 constant c_ethereum_block_interval = 14; // 14 seconds per block on average


    /* ========== EVENTS ========== */

    event PricePosted(address miner, address token, uint256 index, uint256 ethAmount, uint256 tokenAmount);
    event PriceClosed(address miner, address token, uint256 index);
    event Deposited(address miner, address token, uint256 amount);
    event Withdrawn(address miner, address token, uint256 amount);
    event TokenBought(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);
    event TokenSold(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);
    event PriceComputed(
        uint32 h, 
        uint32 pos, 
        uint32 ethA, 
        uint128 tokenA, 
        int128 sigma_sq, 
        int128 ut_sq
    );

    /* ========== CONSTRUCTOR ========== */

    /// @dev The constructor must do NOTHING to support proxy.
    constructor() public {}

    function init(address NestToken, address NestPool, address NestStaking) 
        external
        onlyWhenUninitialized 
    {
        require(state.id == 0 && state.flag == 0, "Nest:Mine:!flag");
        state._C_NestToken = NestToken;
        state._C_NestPool = (NestPool);
        state._C_NestStaking = (NestStaking);
        state.latestMiningHeight = uint32(block.number);
        uint256 amount = MiningData.c_mining_nest_yield_per_block_base;
        for (uint i =0; i < 10; i++) {
            state._mining_nest_yield_per_block_amount[i] = amount;
            amount = amount.mul(c_mining_nest_yield_cutback_rate).div(100);
        }

        amount = c_mining_ntoken_yield_per_block_base;
        for (uint i =0; i < 10; i++) {
            state._mining_ntoken_yield_per_block_amount[i] = amount;
            amount = amount.mul(c_mining_ntoken_yield_cutback_rate).div(100);
        }

        state.governance = msg.sender;
        state.id = 1;
        state.ethNumPerChunk = 10;
        state.nestPerChunk = 10_000;
        state.flag = uint8(1);
    }

    receive() external payable {
    }

    /* ========== MODIFIERS ========== */

    modifier onlyWhenUninitialized()
    {
        require(state.governance == address(0) && state.id == 0, "Nest:Mine:!uninited");
        _;
    }

    modifier onlyGovernance() 
    {
        require(msg.sender == state.governance, "Nest:Mine:!governance");
        _;
    }

    modifier onlyGovOrBy(address _contract) 
    {
        // console.log("msg.sender=%s, _contract=%s", msg.sender, _contract);
        require(msg.sender == state.governance || msg.sender == _contract, "Nest:Mine:!sender");
        _;
    }

    modifier noContract() 
    {
        require(address(msg.sender) == address(tx.origin), "Nest:Mine:BAN(contract)");
        _;
    }


    /* ========== GOVERNANCE ========== */

    function setAddresses(address developer_address) public onlyGovernance 
    {
        if (uint256(developer_address) != 0) {
            _developer_address = developer_address;
        }
    }

    function setContracts(
            address NestToken, 
            address NestPool, 
            address NestStaking, 
            address NNRewardPool,
            address NestQuery
        ) public onlyGovernance 
    {
        if (uint256(NestToken) != 0) {
            state._C_NestToken = NestToken;
        }
        if (uint256(NestPool) != 0) {
            state._C_NestPool = NestPool;
        }
        if (uint256(NestStaking) != 0) {
            state._C_NestStaking = NestStaking;
        }
        if (uint256(NNRewardPool) != 0) {
            state._C_NNRewardPool = NNRewardPool;
        }
        if (uint256(NestQuery) != 0) {
            state._C_NestQuery = NestQuery;
        }
    }

    /* ========== STAT ========== */

    function volatility(address token) 
        external view returns (MiningData.Price memory p) 
    {
        // TODO: no contract allowed
        return state.volatility(token);
    }

    function stat(address token) external
    {
        state._stat(token);
    }

    /* ========== POST/CLOSE Price Sheets ========== */

    /// @dev post a single price sheet for any token
    function _post(
            address _token, 
            uint256 _tokenPrice, 
            uint256 _ethNum, 
            uint256 _chunkSize, 
            uint256 _state, 
            uint256 _level, 
            uint256 _typ
        ) internal 
    {
        MiningData.PriceSheet[] storage _sheets = state.priceSheetList[_token];
        uint256 _ethChunks = _ethNum.div(_chunkSize);

        // append a new price sheet
        _sheets.push(MiningData.PriceSheet(
            uint160(msg.sender),            // miner 
            uint32(block.number),           // height
            uint8(_ethChunks),              // chunkNum
            uint8(_chunkSize),              // chunkSize 
            uint8(_ethChunks),              // remainChunk
            uint8(_ethChunks),              // ethChunk
            uint8(0),                       // tokenChunk     
            uint8(_state),                  // state
            uint8(_level),                  // level
            uint8(0),                       // _reserved
            uint128(_tokenPrice),           // tokenPrice 
            uint8(_typ),                    // typ            
            uint120(0)            
        ));
        emit PricePosted(msg.sender, _token, (_sheets.length - 1), _ethNum.mul(1 ether), _tokenPrice.mul(_ethNum)); 
    }

    function _mine(address _ntoken, uint256 ethNum) internal
    {
        INestPool _C_NestPool = INestPool(state._C_NestPool);
        INNRewardPool _C_NNRewardPool = INNRewardPool(state._C_NNRewardPool);

        uint256 nestEthAtHeight = state._ntoken_at_height[_ntoken][block.number];
        uint256 _nestAtHeight = uint256(nestEthAtHeight >> 128);
        uint256 _ethAtHeight = uint256(nestEthAtHeight % (1 << 128));
        if (_nestAtHeight == 0) {
            uint256 nestAmount = _mineNest();  
            state.latestMiningHeight = uint32(block.number); 
            state.minedNestAmount += uint128(nestAmount);
            _nestAtHeight = nestAmount.mul(c_nest_reward_percentage).div(100);
            _C_NestPool.addNest(_developer_address, nestAmount.mul(c_dev_reward_percentage).div(100));
            
            // NOTE: Removed because all NNRewards are prepaid 
            // _C_NestPool.addNest(address(_C_NNRewardPool), nestAmount.mul(c_NN_reward_percentage).div(100));
            // _C_NNRewardPool.addNNReward(nestAmount.mul(c_dev_reward_percentage).div(100));
        }
        _ethAtHeight = _ethAtHeight.add(ethNum);
        require(_nestAtHeight < (1 << 128) && _ethAtHeight < (1 << 128), "Nest:Mine:OVERFL(mined)");
        state._ntoken_at_height[_ntoken][block.number] = (_nestAtHeight * (1<< 128) + _ethAtHeight);
    }

    function _mineN(address _ntoken, uint256 _ethNum) internal
    {
        INestPool _C_NestPool = INestPool(state._C_NestPool);
        INNRewardPool _C_NNRewardPool = INNRewardPool(state._C_NNRewardPool);

        uint256 ntokenEthAtHeight = state._ntoken_at_height[_ntoken][block.number];
        uint256 _ntokenAtHeight = uint256(ntokenEthAtHeight >> 128);
        uint256 _ethAtHeight = uint256(ntokenEthAtHeight % (1 << 128));
        if (_ntokenAtHeight == 0) {
            uint256 ntokenAmount = _mineNToken(_ntoken);  
            _ntokenAtHeight = ntokenAmount;
            INToken(_ntoken).increaseTotal2(ntokenAmount, address(_C_NestPool));
        }
        _ethAtHeight = _ethAtHeight.add(_ethNum);
        require(_ntokenAtHeight < (1 << 128) && _ethAtHeight < (1 << 128), "Nest:Mine:OVERFL(mined)");
        state._ntoken_at_height[_ntoken][block.number] = (_ntokenAtHeight * (1<< 128) + _ethAtHeight);
    }

    function post(
            address token, 
            uint256 tokenPrice, 
            uint256 ntokenPrice, 
            uint256 ethNum
        ) 
        public 
        payable 
        noContract
    {
        // check parameters 
        // uint gas = gasleft();
        require(state.flag < 2, "Nest:Mine:!flag");
        require(token != address(0x0), "Nest:Mine:!(token)"); 
        require(ethNum % state.ethNumPerChunk == 0 && ethNum >= state.ethNumPerChunk, "Nest:Mine:!(ethNum)");
        require(tokenPrice > 0, "Nest:Mine:!(price)");
        require(ntokenPrice > 0, "Nest:Mine:!(nprice)");

        // calculate eth fee
        uint256 _ethFee = ethNum.mul(2).mul(1e18).mul(c_mining_fee_thousandth).div(1000);

        // emit LogUint("20: gas remain", gas-gasleft()); gas = gasleft();
        INestPool _C_NestPool = INestPool(state._C_NestPool);
        address _ntoken = _C_NestPool.getNTokenFromToken(token);
        require(_ntoken != address(0), "Nest:Mine:!(ntoken)");

        { // settle ethers and tokens
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            // emit LogUint("30: gas remain", gas-gasleft()); gas = gasleft();        
            
            // transfer ethFee as rewards to the staking contract
            INestStaking(state._C_NestStaking).addETHReward{value:_ethFee}(_ntoken);       

            // freeze ethers in the nest pool
            _C_NestPool.freezeEth(msg.sender, ethNum.mul(2).mul(1 ether));
            _C_NestPool.freezeNest(msg.sender, ethNum.mul(2).div(state.ethNumPerChunk).mul(state.nestPerChunk).mul(1e18));
            // emit LogUint("gas remain 60", gas-gasleft()); gas = gasleft();
        }

        // if (token, ntoken) == (USDT, NEST), then start to mine NEST, otherwise NToken(token) 
        if (_ntoken == state._C_NestToken) {
            // append two new price sheets
            _post(token, tokenPrice, ethNum, state.ethNumPerChunk, 0x2, 0x0, 0x1);
            _post(_ntoken, ntokenPrice, ethNum, state.ethNumPerChunk, 0x2, 0x0, 0x2);
            
            _mine(_ntoken, ethNum);
        } else {
            // append two new price sheets
            _post(token, tokenPrice, ethNum, state.ethNumPerChunk, 0x2, 0x0, 0x3);
            _post(_ntoken, ntokenPrice, ethNum, state.ethNumPerChunk, 0x2, 0x0, 0x4);
            _mineN(_ntoken, ethNum);
        }

        return; 
    }

    function _close(address _token, MiningData.PriceSheet memory _sheet) private 
    {
        INestPool _C_NestPool = INestPool(state._C_NestPool);

        if ((_sheet.typ == 0x1 || _sheet.typ == 0x3) && _sheet.level == 0) {
            address _ntoken = _C_NestPool.getNTokenFromToken(_token);
            uint256 _eth_nest_at_height = state._ntoken_at_height[_ntoken][uint256(_sheet.height)];
            uint256 _nestAtHeight = uint256(_eth_nest_at_height / (1 << 128));
            uint256 _ethAtHeight = uint256(_eth_nest_at_height % (1 << 128));
            uint256 reward = uint256(_sheet.remainChunk).mul(uint256(_sheet.chunkSize)).mul(_nestAtHeight).div(_ethAtHeight);
            if (_sheet.typ == 0x1) { // _sheet is a USDT sheet
                _C_NestPool.addNest(address(msg.sender), reward);
            } else {                 // _sheet is a token sheet
                _C_NestPool.addNToken(address(msg.sender), _ntoken, reward);
            }
        }

        uint256 _ethAmount = uint256(_sheet.ethChunk).mul(uint256(_sheet.chunkSize)).mul(1 ether);
        uint256 _tokenAmount = uint256(_sheet.tokenChunk).mul(uint256(_sheet.chunkSize)).mul(_sheet.tokenPrice);
            
        (uint256 _newNestPerChunk, ) = _calcNestPerChunk(uint256(state.nestPerChunk), _sheet.level);
        uint256 _nestAmount = uint256(_sheet.chunkNum).mul(_newNestPerChunk).mul(1e18);

        _C_NestPool.unfreezeNest(address(msg.sender), _nestAmount);
        _C_NestPool.unfreezeEth(address(msg.sender), _ethAmount);
        _C_NestPool.unfreezeToken(address(msg.sender), _token, _tokenAmount);
    }

    function _recover(address _token, uint256 _index, MiningData.PriceSheet memory _sheet) private 
    {
        uint256 _ethChunkAmount = uint256(_sheet.chunkSize);
        uint256 _tokenChunkAmount = uint256(_sheet.tokenPrice).mul(_ethChunkAmount);
        INestPool _C_NestPool = INestPool(state._C_NestPool);

        MiningData.Taker[] storage _ts = state._takers[_token][_index];
        uint256 _len = _ts.length;
        for (uint i = 0; i < _len; i++) {
            MiningData.Taker memory _t = _ts[_len - 1 - i];
            if (_t.ethChunk > 0) {
                _C_NestPool.freezeEth(address(msg.sender), _ethChunkAmount.mul(_t.ethChunk).mul(1 ether));
                _C_NestPool.unfreezeEth(address(_t.takerAddress), _ethChunkAmount.mul(2).mul(_t.ethChunk).mul(1 ether));
                _sheet.tokenChunk = uint8(uint256(_sheet.tokenChunk).sub(uint256(_t.ethChunk)));
            } else if (_t.tokenChunk > 0) {
                _C_NestPool.freezeToken(address(msg.sender), _token, _tokenChunkAmount.mul(_t.tokenChunk));
                _C_NestPool.unfreezeToken(address(_t.takerAddress), _token, _tokenChunkAmount.mul(_t.tokenChunk));
                _C_NestPool.unfreezeEth(address(_t.takerAddress), _ethChunkAmount.mul(_t.tokenChunk).mul(1 ether));
                _sheet.ethChunk = uint8(uint256(_sheet.ethChunk).sub(uint256(_t.tokenChunk)));
            }
            _ts.pop();
        }
    }

    function close(address token, uint256 index) public noContract 
    {
        require(state.flag < 3, "Nest:Mine:!flag");

        MiningData.PriceSheet memory _sheet = state.priceSheetList[token][index];
        require(address(_sheet.miner) == msg.sender, "Nest:Mine:!(miner)");
        uint256 _state = _sheet.state;
        if (_state == 0x1 || _state == 0x2) {
            require(_sheet.height + c_price_duration_block < block.number, "Nest:Mine:!EFF(sheet)");  // safe_math
            _close(token, _sheet);
        } else if (_state == 0x3 || _state == 0x4) {
            require(_sheet.height + c_sheet_duration_block < block.number, "Nest:Mine:!EXPI(sheet)");  // safe_math
            _recover(token, index, _sheet);
            _close(token, _sheet);
        }

        _sheet.state = 0x0;
        state.priceSheetList[token][index] = _sheet;
        emit PriceClosed(address(msg.sender), token, index);
    }

    function _calcNestPerChunk(uint256 _nestPerChunk, uint256 _level) private returns (uint256, uint256) 
    {
        uint256 _newLevel;
        uint256 _newNestPerChunk;
        if (_level >= 128) { // bitten sheet, max_level reached
            _newLevel = _level;
            _newNestPerChunk = _nestPerChunk.mul(2 ** 128);
        } else if (_level > 4 && _level < 128) { // bitten sheet, nestToken doubling
            _newNestPerChunk = _nestPerChunk.mul(2 ** (_level - 4));
            _newLevel = _level + 1; 
        } else {  // bitten sheet, eth doubling 
            _newNestPerChunk = _nestPerChunk;
            _newLevel = _level + 1;
        }
        return (_newNestPerChunk,_newLevel);
    }

    function buyToken(address token, uint256 index, uint256 takeChunkNum, uint256 newTokenPrice)
        public payable noContract
    {
        require(state.flag < 2, "Nest:Mine:!flag");

        // check parameters 
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        require(newTokenPrice > 0, "Nest:Mine:(price)=0");
        require(takeChunkNum > 0, "Nest:Mine:(take)=0");

        MiningData.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        require(block.number.sub(_sheet.height) < c_price_duration_block, "Nest:Mine:!EFF(sheet)");

        INestPool _C_NestPool = INestPool(state._C_NestPool);

        uint256 _chunkSize = uint256(_sheet.chunkSize);
        uint256 _state = uint256(_sheet.state);
        uint256 _level = uint256(_sheet.level);
        require(_state == 0x2 || _state == 0x3,  "Nest:Mine:!(state)");

        {
            address nToken = token;
            
            if (_sheet.typ == 0x1 && _sheet.typ == 0x3) {
                nToken = _C_NestPool.getNTokenFromToken(token);
                require (nToken != address(0x0), "Nest:Mine:!(ntoken)");
            }

            uint256 _ethNum = takeChunkNum.mul(_chunkSize);
            uint256 _ethFee = _ethNum.mul(1 ether).mul(c_take_fee_thousandth).div(1000);

            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            INestStaking(state._C_NestStaking).addETHReward{value:_ethFee}(nToken);
        }

        // post a new price sheet
        { 
            // check bitting conditions
            require(_sheet.remainChunk >= takeChunkNum, "Nest:Mine:!(remain)");

            uint256 _ethChunkNum;
            {
                uint256 _nestDeposited = uint256(state.nestPerChunk).mul(takeChunkNum);
                uint256 _newNestPerChunk;
                uint256 _newLevel;

                if (_level > 4) { // bitten sheet, nest doubling
                    _ethChunkNum = takeChunkNum;
                    (_newNestPerChunk, _newLevel) = _calcNestPerChunk(uint256(state.nestPerChunk), _level);
                    _nestDeposited = _newNestPerChunk.mul(_ethChunkNum);
                } else {  // bitten sheet, eth doubling 
                    _ethChunkNum = takeChunkNum.mul(c_take_amount_factor);
                    _nestDeposited = uint256(state.nestPerChunk).mul(_ethChunkNum);
                    _newLevel = _level + 1;
                }
            
                _post(token, newTokenPrice, _ethChunkNum.mul(_chunkSize), uint256(_chunkSize), 0x2, _newLevel, _sheet.typ);
                _C_NestPool.freezeNest(address(msg.sender), _nestDeposited.mul(1e18));
            }
            _C_NestPool.freezeEth(address(msg.sender), _ethChunkNum.add(takeChunkNum).mul(_chunkSize).mul(1 ether));
        }

        // add msg.sender as a taker
        {
            uint256 _ethNum = takeChunkNum.mul(_chunkSize);

            // update price sheet
            _sheet.state = 0x3;
            _sheet.ethChunk = uint8(uint256(_sheet.ethChunk).add(takeChunkNum));
            _sheet.remainChunk = uint8(uint256(_sheet.remainChunk).sub(takeChunkNum));
            state.priceSheetList[token][index] = _sheet;
    
            state._takers[token][index].push(MiningData.Taker(uint160(msg.sender), uint8(0), uint8(takeChunkNum), uint80(0)));            
            // generate an event 
            emit TokenBought(address(msg.sender), address(token), index, _ethNum.mul(1 ether), _ethNum.mul(_sheet.tokenPrice));
        }

        return; 
    }

    function sellToken(address token, uint256 index, uint256 takeChunkNum, uint256 newTokenPrice)
        public payable noContract 
    {
        require(state.flag < 2, "Nest:Mine:!flag");

        // check parameters 
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        require(newTokenPrice > 0, "Nest:Mine:(price)=0");
        require(takeChunkNum > 0, "Nest:Mine:(take)=0");

        MiningData.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        require(block.number.sub(_sheet.height) < c_price_duration_block, "Nest:Mine:!EFF(sheet)");

        uint256 _chunkSize = uint256(_sheet.chunkSize);
        uint256 _ethNum = takeChunkNum.mul(_chunkSize);
        uint256 _state = uint256(_sheet.state);
        uint256 _level = uint256(_sheet.level);
        require(_state == 0x2 || _state == 0x3,  "Nest:Mine:!(state)");

        INestPool _C_NestPool = INestPool(state._C_NestPool);

        // check bitting conditions
        require(_sheet.remainChunk >= takeChunkNum, "Nest:Mine:!(remain)");

        {
            address nToken = token;
            if (_sheet.typ == 0x1 && _sheet.typ == 0x3) {
                nToken = _C_NestPool.getNTokenFromToken(token);
                require (nToken != address(0x0), "Nest:Mine:!(ntoken)");
            }

            uint256 _ethFee = _ethNum.mul(1 ether).mul(c_take_fee_thousandth).div(1000);
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            INestStaking(state._C_NestStaking).addETHReward{value:_ethFee}(nToken);
        }

        // post a new price sheet
        {
            uint256 _ethChunkNum;
            { 
                uint256 _nestDeposited;
                uint256 _newLevel;

                if (_level >= 128) { // bitten sheet, max_level reached
                    _ethChunkNum = takeChunkNum;
                    _newLevel = _level;
                    _nestDeposited = _nestDeposited.mul(2 ** 128);
                } else if (_level > 4 && _level < 128) { // bitten sheet, nestToken doubling
                    _nestDeposited = _nestDeposited.mul(2 ** (_state - 6));
                    _ethChunkNum = takeChunkNum;
                    _newLevel = _level + 1;
                } else {  // bitten sheet, eth doubling 
                    _ethChunkNum = takeChunkNum.mul(c_take_amount_factor);
                    _nestDeposited = takeChunkNum.mul(uint256(state.nestPerChunk));
                    _newLevel = _level + 1;
                }
                _post(token, newTokenPrice, _ethChunkNum.mul(_chunkSize), uint256(_chunkSize), 0x2, _newLevel, _sheet.typ);
                _C_NestPool.freezeNest(address(msg.sender), _nestDeposited.mul(1e18));
            }
            _C_NestPool.freezeEth(address(msg.sender), _ethChunkNum.mul(_chunkSize).mul(1 ether));
            _C_NestPool.freezeToken(address(msg.sender), token, _ethNum.mul(uint256(_sheet.tokenPrice)));
        }

        {
            // update price sheet
            _sheet.state = 0x3;
            _sheet.tokenChunk = uint8(uint256(_sheet.tokenChunk).add(takeChunkNum));
            _sheet.remainChunk = uint8(uint256(_sheet.remainChunk).sub(takeChunkNum));
            state.priceSheetList[token][index] = _sheet;
            
            state._takers[token][index].push(MiningData.Taker(uint160(msg.sender), uint8(takeChunkNum), uint8(0), uint80(0)));
            emit TokenSold(address(msg.sender), address(token), index, _ethNum.mul(1 ether), _ethNum.mul(_sheet.tokenPrice));

        }


        return; 
    }

    // function _clear(address _token, uint256 _chunkSize, uint256 _tokenChunkSize, MiningData.Taker memory _t) internal  
    // {
    //     return state._clear(_token, _chunkSize, _tokenChunkSize);
    //     // if (_t.ethChunk > 0) {
    //     //     _C_NestPool.freezeEth(address(msg.sender), _chunkSize.mul(_t.ethChunk));
    //     //     _C_NestPool.unfreezeEth(address(_t.takerAddress), _chunkSize.mul(_t.ethChunk));
    //     // } else if (_t.tokenChunk > 0) {
    //     //     _C_NestPool.freezeToken(address(msg.sender), _token, _tokenChunkSize.mul(_t.tokenChunk));
    //     //     _C_NestPool.unfreezeToken(address(_t.takerAddress), _token, _tokenChunkSize.mul(_t.tokenChunk));
    //     // }
    // }

    function clear(address token, uint256 index, uint256 num) external payable 
    {
        require(state.flag < 3, "Nest:Mine:!flag");
        return state.clear(token, index, num);
        // // check parameters 
        // require(token != address(0x0), "Nest:Mine:(token)=0"); 
        // MiningData.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        // require(uint256(_sheet.miner) == uint256(msg.sender), "Nest:Mine:!(miner)");
        // require(_sheet.height + c_price_duration_block < block.number, "Nest:Mine:!EFF(sheet)");  // safe_math
        // require(_sheet.height + c_sheet_duration_block > block.number, "Nest:Mine:!EFF(sheet)");  // safe_math
        
        // uint256 _state = uint256(_sheet.state);
        // if (_state == 0x2) { // non-bitten price sheet
        //     require(state._takers[token][index].length == 0, "Nest:Mine:!(takers)");
        //     _sheet.state = uint8(1);
        //     state.priceSheetList[token][index] = _sheet;
        //     if (msg.value > 0) {
        //         _C_NestPool.depositEth{value:msg.value}(address(msg.sender));
        //     }
        //     return;
        // }
        // require(_state == 0x3, "Nest:Mine:!BITTEN(sheet)");
        
        // uint256 _ethChunkAmount = uint256(_sheet.chunkSize).mul(1 ether);
        // uint256 _tokenChunkAmount = uint256(_sheet.tokenPrice).mul(_ethChunkAmount);

        // if (msg.value > 0) { 
        //     _C_NestPool.depositEth{value:msg.value}(address(msg.sender));
        // }

        // MiningData.Taker[] storage _ts = state._takers[token][index];
        // uint256 _len = _ts.length;
        // for (uint i = 0; i < num; i++) {
        //     MiningData.Taker memory _t = _ts[_len - i];
        //     _clear(token, _ethChunkAmount, _tokenChunkAmount, _t);
        //     _ts.pop();
        // }

        // if (_ts.length == 0) { 
        //     _sheet.state = uint8(1);
        //     state.priceSheetList[token][index] = _sheet;
        // }
    }

    function clearAll(address token, uint256 index) external payable 
    {
        require(state.flag < 3, "Nest:Mine:!flag");
        return state.clearAll(token, index);
        // // check parameters 
        // require(token != address(0x0), "Nest:Mine:(token)=0"); 
        // MiningData.PriceSheet memory _sheet = state.priceSheetList[token][index]; 
        // require(_sheet.height + c_price_duration_block < block.number, "Nest:Mine:!EFF(sheet)");  // safe_math: untainted values
        // require(_sheet.height + c_sheet_duration_block > block.number, "Nest:Mine:!VALID(sheet)");  // safe_math: untainted values
        // require(uint256(_sheet.miner) == uint256(msg.sender), "Nest:Mine:!(miner)");
        
        // uint256 _state = uint256(_sheet.state);
        // if (_state == 0x2) { // non-bitten price sheet
        //     require(state._takers[token][index].length == 0, "Nest:Mine:!(takers)");
        //     _sheet.state = uint8(1);
        //     state.priceSheetList[token][index] = _sheet;
        //     _C_NestPool.depositEth{value:msg.value}(address(msg.sender));
        //     return;
        // }
        // require(_state == 0x3, "Nest:Mine:!BITTEN(sheet)");

        // uint256 _ethChunkAmount = uint256(_sheet.chunkSize).mul(1 ether);
        // uint256 _tokenChunkAmount = uint256(_sheet.tokenPrice).mul(_ethChunkAmount);

        // _C_NestPool.depositEth{value:msg.value}(address(msg.sender));

        // MiningData.Taker[] storage _ts = state._takers[token][index];
        // uint256 _len = _ts.length;
        // for (uint i = 0; i < _len; i++) {
        //     MiningData.Taker memory _t = _ts[_len - i];
        //     _clear(token, _ethChunkAmount, _tokenChunkAmount, _t);
        //     _ts.pop();
        // }

        // _sheet.state = uint8(1);
        // state.priceSheetList[token][index] = _sheet;
    }

    function refute(address token, uint256 index, uint256 takeIndex) external  
    {
        require(state.flag < 3, "Nest:Mine:!flag");
        return state.refute(token, index, takeIndex);
        // MiningData.PriceSheet storage _sheet = state.priceSheetList[token][index]; 
        // require(_sheet.state == 0x3,  "Nest:Mine:!(state)");

        // MiningData.Taker memory _taker = state._takers[token][index][takeIndex];
        // require(_taker.takerAddress == uint160(msg.sender), "Nest:Mine:!(taker)");
        // require(_sheet.height + c_sheet_duration_block < block.number, "Nest:Mine:VALID(sheet)");  // safe_math: untainted values
        
        // uint256 _chunkSize = _sheet.chunkSize;
        // if (_taker.ethChunk > 0) {  // sellToken
        //     uint256 _chunkNum = _taker.ethChunk;
        //     uint256 _tokenAmount = uint256(_sheet.tokenPrice).mul(_chunkNum).mul(_chunkSize);
        //     _C_NestPool.unfreezeToken(address(msg.sender), token, _tokenAmount);
        //     _C_NestPool.unfreezeEth(address(msg.sender), _chunkNum.mul(_chunkSize).mul(1 ether));
        //     _taker.ethChunk = 0;
        // } else if (_taker.tokenChunk > 0) { // buyToken
        //     uint256 _chunkNum = _taker.ethChunk;
        //     uint256 _ethAmount = _chunkNum.add(_chunkNum).mul(_chunkSize).mul(1 ether);
        //     _C_NestPool.unfreezeEth(address(msg.sender), _ethAmount);
        //     _taker.tokenChunk = 0;
        // }
        // _taker.takerAddress = 0;
        // state._takers[token][index][takeIndex] = _taker;
        // _sheet.state = uint8(0x4);
    }

/*
    function closePriceSheetList(address token, uint64[] memory indices) public 
    {
        uint256 ethAmount;
        uint256 tokenAmount;
        uint256 reward;
        PriceSheet[] storage prices = _price_list[token];
        for (uint i=0; i<indices.length; i++) {
            PriceSheet storage p = prices[indices[i]];
            if (uint256(p.miner) != uint256(msg.sender) >> 96) {
                continue;
            }
            uint256 h = uint256(p.atHeight);
            if (h + c_price_duration_block < block.number) { // safe_math: untainted values
                ethAmount = ethAmount.add(uint256(p.ethAmount));
                tokenAmount = tokenAmount.add(uint256(p.tokenAmount));
                uint256 fee = uint256(p.ethFeeTwei) * 1e12;
                p.ethAmount = 0;
                p.tokenAmount = 0;
                uint256 nestAtHeight = uint256(_mined_nest_to_eth_at_height[h] >> 128);
                uint256 ethAtHeight = uint256(_mined_nest_to_eth_at_height[h] << 128 >> 128);
               
                reward = reward.add(fee.mul(nestAtHeight).div(ethAtHeight));
                emit PriceClosed(address(msg.sender), token, indices[i]);

            }
        }
        if (ethAmount > 0 || tokenAmount >0) {
            _C_NestPool.unfreezeEthAndToken(address(msg.sender), ethAmount, token, tokenAmount);
        }

        if (reward > 0) {
            _C_NestPool.increaseNestReward(address(msg.sender), reward);
        }
    }
*/

    /* ========== PRICE QUERIES ========== */

    function latestPrice(address token) 
        override external view onlyGovOrBy(state._C_NestQuery)
        returns (uint256 ethNum, uint256 tokenAmount, uint256 atHeight) 
    {
        require(state.flag < 2, "Nest:Mine:!flag");
        require(INestPool(state._C_NestPool).getNTokenFromToken(token) != address(0), "Nest:Mine:!token");
        return state._calcPriceAtHeight(token, block.number);
    }

    function priceOf(address token) 
        override external view onlyGovOrBy(state._C_NestQuery)
        returns (uint256 ethNum, uint256 tokenAmount, uint256 atHeight) 
    {
        require(state.flag < 2, "Nest:Mine:!flag");
        require(INestPool(state._C_NestPool).getNTokenFromToken(token) != address(0), "Nest:Mine:!token");
        MiningData.Price memory _pi = state._priceInEffect[token];
        return (uint256(_pi.ethNum), uint256(_pi.tokenAmount), uint256(_pi.height));
    }

    function priceAvgAndSigmaOf(address token) 
        override external view onlyGovOrBy(state._C_NestQuery)
        returns (uint256, uint256, uint256, int128, int128) 
    {
        require(state.flag < 2, "Nest:Mine:!flag");
        require(INestPool(state._C_NestPool).getNTokenFromToken(token) != address(0), "Nest:Mine:!token");
        MiningData.Price memory _pi = state._priceInEffect[token];
        int128 _sigma = ABDKMath64x64.sqrt(ABDKMath64x64.abs(_pi.volatility_sigma_sq));
        int128 _avg = _pi.avgTokenAmount;
        return (uint256(_pi.ethNum), uint256(_pi.tokenAmount), uint256(_pi.height), _avg, _sigma);
    }


    /* ========== MINING ========== */
    
    function _mineNest() private view returns (uint256) {
        uint256 period = block.number.sub(c_mining_nest_genesis_block_height).div(c_mining_nest_yield_cutback_period);
        uint256 _nestMinedPerBlock;
        if (period > 9) {
            _nestMinedPerBlock = c_mining_nest_yield_off_period_amount;
        } else {
            _nestMinedPerBlock = state._mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = _nestMinedPerBlock.mul(block.number.sub(state.latestMiningHeight));
        return yieldAmount;
    }

    function yieldAmountAtHeight(uint64 height) public view returns (uint128) {
        uint256 period = uint256(height).sub(c_mining_nest_genesis_block_height).div(c_mining_nest_yield_cutback_period);
        uint256 nestPerBlock;
        if (period > 9) {
            nestPerBlock = c_mining_nest_yield_off_period_amount;
        } else {
            nestPerBlock = state._mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = nestPerBlock.mul(uint256(height).sub(state.latestMiningHeight));
        return uint128(yieldAmount);
    }

    function latestMinedHeight() external view returns (uint64) {
       return uint64(state.latestMiningHeight);
    }

    function minedNestAmount() override external view returns (uint256) {
        return uint256(state.minedNestAmount);
    }

    function _mineNToken(address ntoken) private view returns (uint256) {
        (uint256 genesis, uint256 last) = INToken(ntoken).checkBlockInfo();

        uint256 period = block.number.sub(genesis).div(c_mining_nest_yield_cutback_period);
        uint256 ntokenPerBlock;
        if (period > 9) {
            ntokenPerBlock = c_mining_ntoken_yield_off_period_amount;
        } else {
            ntokenPerBlock = state._mining_ntoken_yield_per_block_amount[period];
        }
        uint256 _interval = block.number.sub(last);
        if (_interval > 300 ) {
            _interval = 300;
        }
        uint256 yieldAmount = ntokenPerBlock.mul(_interval);
        // emit NTokenMining(block.number, yieldAmount, ntoken);
        return yieldAmount;
    }

    /* ========== MINING ========== */


    function withdrawEth(uint256 ethAmount) public noContract
    {
        require(state.flag < 4, "Nest:Mine:!flag");

        INestPool(state._C_NestPool).withdrawEth(address(msg.sender), ethAmount); 
    }

    function withdrawToken(address token, uint256 tokenAmount) public noContract
    {
        require(state.flag < 4, "Nest:Mine:!flag");

        INestPool(state._C_NestPool).withdrawToken(address(msg.sender), token, tokenAmount); 
    }

    function claimAllNest() public noContract
    {
        require(state.flag < 4, "Nest:Mine:!flag");

        uint256 nestAmount = INestPool(state._C_NestPool).balanceOfNestInPool(address(msg.sender));
        INestPool(state._C_NestPool).withdrawNest(address(msg.sender), nestAmount);
    }

    function withdrawEthAndToken(uint256 ethAmount, address token, uint256 tokenAmount) public noContract
    {
        require(state.flag < 4, "Nest:Mine:!flag");

        INestPool(state._C_NestPool).withdrawEthAndToken(address(msg.sender), ethAmount, token, tokenAmount); 
    }

    function claimNToken(address ntoken, uint256 amount) public noContract 
    {
        require(state.flag < 4, "Nest:Mine:!flag");

        if (ntoken == address(0x0) || ntoken == address(state._C_NestToken)){
            INestPool(state._C_NestPool).withdrawNest(address(msg.sender), amount); 
        } else {
            INestPool(state._C_NestPool).withdrawNToken(address(msg.sender), ntoken, amount);
        }
    }

    // function claimAllNToken(address ntoken) public noContract {
    //     if (ntoken == address(0x0) || ntoken == address(_C_NestToken)){
    //         _C_NestPool.distributeRewards(address(msg.sender)); 
    //     } else {
    //         uint256 amount = _C_NestPool.balanceOfNTokenInPool(address(msg.sender));
    //         _C_NestPool.withdrawNToken(address(msg.sender), ntoken, amount);
    //     }
    // }

    /* ========== HELPERS ========== */

    function lengthOfTakers(address token, uint256 index) view public returns (uint256) 
    {
        return state._takers[token][index].length;
    }

    function takerOf(address token, uint256 index, uint256 k) view public returns (MiningData.Taker memory) 
    {
        return state._takers[token][index][k];
    }

    function lengthOfPriceSheets(address token) view public 
        returns (uint)
    {
        return state.priceSheetList[token].length;
    }

    function contentOfPriceSheet(address token, uint256 index) view public 
        returns (MiningData.PriceSheet memory ps) 
    {
        uint256 len = state.priceSheetList[token].length;
        require (index < len, "Nest:Mine:>(len)");
        return state.priceSheetList[token][index];
    }

    function atHeightOfPriceSheet(address token, uint256 index) view public returns (uint64)
    {
        MiningData.PriceSheet storage p = state.priceSheetList[token][index];
        return p.height;
    }

    /* ========== ENCODING/DECODING ========== */

    function decodeU256Two(uint256 enc) public pure returns (uint128, uint128) 
    {
        return (uint128(enc / (1 << 128)), uint128(enc % (1 << 128)));
    }

    // only for debugging 
    // NOTE: REMOVE it before deployment
    // function debug_SetAtHeightOfPriceSheet(address token, uint256 index, uint64 height) public 
    // {
    //     PriceSheet storage p = _price_list[token][index];
    //     p.atHeight = height;
    //     return;
    // }

    function decode(bytes32 x) internal pure returns (uint64 a, uint64 b, uint64 c, uint64 d) 
    {
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

    function debugMinedNest(address token, uint256 h) public view returns (uint256, uint256) 
    {
        address ntoken = INestPool(state._C_NestPool).getNTokenFromToken(address(token));
        return (uint128(state._ntoken_at_height[ntoken][h] / (1 << 128)), 
                uint128(state._ntoken_at_height[ntoken][h] % (1 << 128)));
    }
    // mapping(uint256 => uint256) public acc;
    // function debug(uint256 v) public 
    // {
    //     acc[block.number] = acc[block.number] + v;
    // }
}
