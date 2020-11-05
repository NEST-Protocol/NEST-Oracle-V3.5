// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./lib/ABDKMath64x64.sol";

import "./iface/INestPool.sol";
import "./iface/INestStaking.sol";
import "./iface/INToken.sol";
import "./iface/INNRewardPool.sol";
import "hardhat/console.sol";

contract NestMining {
    
    using SafeMath for uint256;

    /* ========== VARIABLES ========== */

    address public governance;

    INestPool private _C_NestPool;
    ERC20 private _C_NestToken;
    INestStaking private _C_NestStaking;
    INNRewardPool private _C_NNRewardPool;
    // IPriceOracle private _C_PriceOracle;

    address private _developer_address;
    address private _NN_address;

    uint256 private _latest_mining_height;
    uint256[10] private _mining_nest_yield_per_block_amount;

    // a temp for storing eth_bonus(right-most 128bits) and eth_deposit (left-most 128bits)
    // uint256 private _temp_eth_deposit_bonus;

        // the minimum mining fee (ethers)
    // uint256 constant c_mining_eth_minimum = 10 ether; // removed
    uint32 private ethNumPerChunk = 10;  // 10 ether
    uint32 private nestPerChunk = 10_000;

    /* ========== CONSTANTS ========== */

    // uint256 constant c_mining_nest_genesis_block_height = 6236588;
    uint256 constant c_mining_nest_genesis_block_height = 1; // for testing

    uint256 constant c_mining_nest_yield_cutback_period = 2400000;
    uint256 constant c_mining_nest_yield_cutback_rate = 80;
    uint256 constant c_mining_nest_yield_off_period_amount = 40 ether;
    uint256 constant c_mining_nest_yield_per_block_base = 400 ether;

    uint256 constant c_mining_ntoken_yield_cutback_rate = 80;
    uint256 constant c_mining_ntoken_yield_off_period_amount = 0.4 ether;
    uint256 constant c_mining_ntoken_yield_per_block_base = 4 ether;
    uint256[10] private _mining_ntoken_yield_per_block_amount;

    uint256 constant c_mining_eth_unit = 10;  // 10 ether
    // uint256 constant c_mining_price_deviateion_factor = 10; // removed
    uint256 constant c_mining_fee_thousandth = 10; 

    uint256 constant c_dev_reward_percentage = 5;
    uint256 constant c_NN_reward_percentage = 15;
    uint256 constant c_nest_reward_percentage = 80;

    // uint256 constant c_ntoken_bidder_reward_percentage = 5;
    // uint256 constant c_ntoken_miner_reward_percentage = 95;

    uint256 constant c_price_eth_unit = 1;
    uint256 constant c_price_deviation_rate = 10;
    uint256 constant c_price_duration_block = 25;

    uint256 constant c_sheet_duration_block = 4 * 60 * 6; // = 1440 (6 hours) if avg. rate of eth-block mining ~ 14 seconds

    // uint256 constant c_bite_amount_price_deviateion_factor = 10; // removed
    uint256 constant c_take_amount_factor = 2;
    uint256 constant c_take_fee_thousandth = 1; 

    uint256 constant c_ethereum_block_interval = 14; // 14 seconds per block on average

    /// @dev size: 2 x 256bit, 11 fields
    struct PriceSheet {    
        uint160 miner;          //  miner who posted the price (most significant bits, or left-most)
        uint32  height;         // the height of block where the sheet was posted
        uint8  chunkNum;        // the amount of chunks deposited
        uint8  chunkSize;       // ethers per chunk
        uint8  remainChunk;     // the remain chunks of deposits, which decrease if some chunks are biten
        uint8  ethChunk;        // the number of eth chunks
        uint8  tokenChunk;     // the number of token1 chunk, each of which has `tokenPrice` tokens
        // uint8  token2Chunk;     // the number of token2 chunk 
        uint8  state;           // =0: closed | =1: cleared | =2: posted | =3: bitten | =4: refuted
        uint8  level;           // the level of bitting, 1-4: eth-doubling | 5 - 127: nest-doubling
        uint8  _reserved;       // for padding 

        uint128 tokenPrice;     // the amount of (token1 : 1 ether)
        uint128 _reserved2;     // the amount of (token2 : 1 ether)
    }

    ///@dev  A mapping (from token(address) to an array of PriceSheet)
    mapping(address => PriceSheet[]) private _priceSheetList;

    /// @dev size: (3 x 256 bit)
    struct Price {
        uint32  index;
        uint32  height;
        uint32  ethAmount;   //  the balance of eth
        uint128 tokenAmount; //  the balance of token 
        int128  volatility_sigma_sq;
        int128  volatility_ut_sq;
        uint160  _reserved;
    }

    /// @dev from token(address) to Price
    mapping(address => Price) private _priceInEffect;

    struct Taker {
        uint160 takerAddress;
        uint8 ethChunk;
        uint8 tokenChunk;
        uint80 _reserved;
    }

    /// @dev from token(address), index to array of Taker
    mapping(address => mapping(uint256 => Taker[])) internal _takers;

    // The following two mappings collects all of the nest mined and eth fee 
    // paid at each height, such that the distribution can be calculated

    // _nest_at_height: block height => nest amount
    mapping(uint256 => uint256) private _nest_at_height;
    
    // _ntoken_at_height: ntoken => block height => (ntoken amount, eth amount)
    // mapping(address => mapping(uint256 => uint256)) _ntoken_at_height;

    /* ========== EVENTS ========== */

    event PricePosted(address miner, address token, uint256 index, uint256 ethAmount, uint256 tokenAmount);
    event PriceClosed(address miner, address token, uint256 index);
    event Deposited(address miner, address token, uint256 amount);
    event Withdrawn(address miner, address token, uint256 amount);
    event TokenBought(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);
    event TokenSold(address miner, address token, uint256 index, uint256 biteEthAmount, uint256 biteTokenAmount);

    event VolaComputed(uint32 h, uint32 pos, uint32 ethA, uint128 tokenA, int128 sigma_sq, int128 ut_sq);


    /* ========== CONSTRUCTOR ========== */

    constructor(address NestToken, address NestPool, address NestStaking) public 
    {
        _C_NestToken = ERC20(NestToken);
        _C_NestPool = INestPool(NestPool);
        _C_NestStaking = INestStaking(NestStaking);
        _latest_mining_height = block.number;
        uint256 amount = c_mining_nest_yield_per_block_base;
        for (uint i =0; i < 10; i++) {
            _mining_nest_yield_per_block_amount[i] = amount;
            amount = amount.mul(c_mining_nest_yield_cutback_rate).div(100);
        }

        amount = c_mining_ntoken_yield_per_block_base;
        for (uint i =0; i < 10; i++) {
            _mining_ntoken_yield_per_block_amount[i] = amount;
            amount = amount.mul(c_mining_ntoken_yield_cutback_rate).div(100);
        }

        governance = msg.sender;
    }

    receive() external payable {
    }

    /* ========== MODIFIERS ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:Mine:!governance");
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

    function setContracts(address NestToken, address NestPool, address NestStaking, address NNRewardPool) public onlyGovernance 
    {
        if (uint256(NestToken) != 0) {
            _C_NestToken = ERC20(NestToken);
        }
        if (uint256(NestPool) != 0) {
            _C_NestPool = INestPool(NestPool);
        }
        if (uint256(NestStaking) != 0) {
            _C_NestStaking = INestStaking(NestStaking);
        }
        if (uint256(NNRewardPool) != 0) {
            _C_NNRewardPool = INNRewardPool(NNRewardPool);
        }
    }

    /* ========== HELPERS ========== */
/*
    function _calcEWMA(
        uint256 ethA0, 
        uint256 tokenA0, 
        uint256 ethA1, 
        uint256 tokenA1, 
        int128 _sigma_sq, 
        int128 _ut_sq,
        uint256 _interval) private pure returns (int128, int128)
    {
        int128 _ut2 = ABDKMath64x64.div(_sigma_sq, 
            ABDKMath64x64.fromUInt(_interval * c_ethereum_block_interval));

        int128 _new_sigma_sq = ABDKMath64x64.add(
            ABDKMath64x64.mul(ABDKMath64x64.divu(95, 100), _sigma_sq), 
            ABDKMath64x64.mul(ABDKMath64x64.divu(5,100), _ut_sq));

        int128 _new_ut_sq;
        if (ethA0 == 0 || tokenA0 == 0) {
            _new_ut_sq = int128(0);
        } else {
            _new_ut_sq = ABDKMath64x64.pow(ABDKMath64x64.sub(ABDKMath64x64.divu(
                    tokenA1 * ethA0, 
                    tokenA0 * ethA1 
                ), ABDKMath64x64.fromUInt(1)), 2);
        }
        
        return (_new_sigma_sq, _new_ut_sq);
    }

    function _moveVolatility(
        Price memory p0,
        PriceSheet[] memory pL
    ) private view returns (Price memory p1)
    {   
        uint256 i = p0.index + 1;
        if (i >= pL.length) {
            return (Price(0,0,0,0,int128(0),int128(0), 0));
        }

        uint256 h = uint256(pL[i].height);
        if (h + c_price_duration_block >= block.number) {
            return (Price(0,0,0,0,int128(0),int128(0), 0));
        }
        
        uint256 ethA1 = 0;
        uint256 tokenA1 = 0;
        while (i < pL.length && pL[i].height == h 
                            && pL[i].height + c_price_duration_block < block.number) {
            ethA1 = ethA1 + uint256(pL[i].remainChunk).mul(pL[i].chunkSize);
            tokenA1 = tokenA1 + uint256(pL[i].remainChunk).mul(pL[i].chunkSize).mul(pL[i].tokenPrice);
            i = i + 1;
        }
        i = i - 1;
        (int128 new_sigma_sq, int128 new_ut_sq) = _calcEWMA(
            p0.ethAmount, p0.tokenAmount, 
            ethA1, tokenA1, 
            p0.volatility_sigma_sq, p0.volatility_ut_sq, 
            i - p0.index);
        return(Price(uint32(i), uint32(h), uint32(ethA1), uint128(tokenA1), 
            new_sigma_sq, new_ut_sq, uint160(0)));
    }

    function calcMultiVolatilities(address token) public 
    {
        Price memory p0 = _priceInEffect[token];
        PriceSheet[] memory pL = _priceSheetList[token];
        Price memory p1;
        if (pL.length < 2) {
            emit VolaComputed(0,0,0,0,int128(0),int128(0));
            return;
        }
        while (uint256(p0.index) < pL.length && uint256(p0.height) + c_price_duration_block < block.number){
            p1 = _moveVolatility(p0, pL);
            if (p1.index <= p0.index) {
                break;
            }
            p0 = p1;
        }

        if (p0.index > _priceInEffect[token].index) {
            _priceInEffect[token] = p0;
            emit VolaComputed(p0.height, p0.index, uint32(p0.ethAmount), uint128(p0.tokenAmount), 
                p0.volatility_sigma_sq, p0.volatility_ut_sq);
        }
        return;
    }

    function calcVolatility(address token) public 
    {
        Price memory p0 = _priceInEffect[token];
        PriceSheet[] memory pL = _priceSheetList[token];
        if (pL.length < 2) {
            emit VolaComputed(0,0,0,0,int128(0),int128(0));
            return;
        }
        (Price memory p1) = _moveVolatility(p0, _priceSheetList[token]);
        if (p1.index > p0.index) {
            _priceInEffect[token] = p1;
            emit VolaComputed(p1.height, p1.index, uint32(p1.ethAmount), uint128(p1.tokenAmount), 
                p1.volatility_sigma_sq, p1.volatility_ut_sq);
        } 
        return;
    }

    function volatility(address token) public view returns (Price memory p) 
    {
        // TODO: no contract allowed
        return _priceInEffect[token];
    }
*/
    /* ========== POST/CLOSE Price Sheets ========== */

    /// @dev post a single price sheet for any token
    function _post(address _token, uint256 _tokenPrice, uint256 _ethNum, uint256 _chunkSize, uint256 _state, uint256 _level) internal 
    {
        PriceSheet[] storage _sheets = _priceSheetList[_token];
        uint256 _ethChunks = _ethNum.div(_chunkSize);

        // append a new price sheet
        _sheets.push(PriceSheet(
            uint160(msg.sender),            // miner 
            uint32(block.number),           // height
            uint8(_ethChunks),   // chunkNum
            uint8(_chunkSize),          // chunkSize 
            uint8(_ethChunks),   // remainChunk
            uint8(_ethChunks),   // ethChunk
            uint8(0),                      // tokenChunk     
            uint8(_state),                    // state
            uint8(_level),                    // level
            uint8(0),                       // _reserved
            uint128(_tokenPrice),            // tokenPrice 
            uint128(0)            
        ));
        emit PricePosted(msg.sender, _token, (_sheets.length - 1), _ethNum.mul(1 ether), _tokenPrice.mul(_ethNum)); 
    }

    function _mine(uint256 ethNum) internal
    {
        uint256 nestEthAtHeight = _nest_at_height[block.number];
        uint256 _nestAtHeight = uint256(nestEthAtHeight >> 128);
        uint256 _ethAtHeight = uint256(nestEthAtHeight % (1 << 128));
        if (_nestAtHeight == 0) {
            uint256 nestAmount = mineNest();  
            _nestAtHeight = nestAmount.mul(c_nest_reward_percentage).div(100);
            _C_NestPool.addNest(_developer_address, nestAmount.mul(c_dev_reward_percentage).div(100));
            _C_NestPool.addNest(address(_C_NNRewardPool), nestAmount.mul(c_dev_reward_percentage).div(100));
            _C_NNRewardPool.addNNReward(nestAmount.mul(c_dev_reward_percentage).div(100));
        }
        _ethAtHeight = _ethAtHeight.add(ethNum);
        require(_nestAtHeight < (1 << 128) && _ethAtHeight < (1 << 128), "Nest:Mine:OVERFL(mined)");
        _nest_at_height[block.number] = (_nestAtHeight * (1<< 128) + _ethAtHeight);
    }

    function post(address token1, uint256 token1Price, uint256 token2Price, uint256 ethNum) public payable noContract
    {
        // check parameters 
        uint gas = gasleft();
        require(token1 != address(0x0), "Nest:Mine:(token)=0"); 
        require(ethNum % ethNumPerChunk == 0, "Nest:Mine:mod(ethAmount)!=0");
        require(ethNum >= ethNumPerChunk, "Nest:Mine:(ethAmount)<unit");
        require(token1Price > 0, "Nest:Mine:(price)=0");
        require(token2Price > 0, "Nest:Mine:(price)=0");

        // emit LogUint("10: gas remain", gas-gasleft()); gas = gasleft();

        // calculate eth fee
        uint256 _ethFee = ethNum.mul(2).mul(1e18).mul(c_mining_fee_thousandth).div(1000);

        // emit LogUint("20: gas remain", gas-gasleft()); gas = gasleft();


        { // settle ethers and tokens
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            // emit LogUint("30: gas remain", gas-gasleft()); gas = gasleft();        

            // transfer ethFee as rewards to the staking contract
            _C_NestStaking.addETHReward{value:_ethFee}(address(_C_NestToken));       

            // freeze ethers in the nest pool
            _C_NestPool.freezeEth(msg.sender, ethNum.mul(2).mul(1 ether));
            _C_NestPool.freezeNest(msg.sender, ethNum.mul(2).div(ethNumPerChunk).mul(nestPerChunk).mul(1e18));
            // emit LogUint("gas remain 60", gas-gasleft()); gas = gasleft();
        }

        // append two new price sheets
        _post(token1, token1Price, ethNum, ethNumPerChunk, 0x2, 0x0);
        // emit LogUint("70: gas remain", gas-gasleft()); gas = gasleft();
        _post(address(_C_NestToken), token2Price, ethNum, ethNumPerChunk, 0x2, 0x0);
        // emit LogUint("80: gas remain", gas-gasleft()); gas = gasleft();
        _mine(ethNum.mul(2));
        // emit LogUint("90: gas remain", gas-gasleft()); gas = gasleft();

        return; 
    }

    function _close(address _token, PriceSheet memory _sheet) private 
    {
        uint256 h = uint256(_sheet.height);
        uint256 _nestAtHeight = uint256(_nest_at_height[h] / (1 << 128));
        uint256 _ethAtHeight = uint256(_nest_at_height[h] % (1 << 128));
        uint256 reward = uint256(_sheet.remainChunk).mul(uint256(_sheet.chunkSize)).mul(_nestAtHeight).div(_ethAtHeight);

        _C_NestPool.addNest(address(msg.sender), reward);

        uint256 _ethAmount = uint256(_sheet.ethChunk).mul(uint256(_sheet.chunkSize)).mul(1 ether);
        uint256 _tokenAmount = uint256(_sheet.tokenChunk).mul(uint256(_sheet.chunkSize)).mul(_sheet.tokenPrice);
            
        (uint256 _newNestPerChunk, ) = _calcNestPerChunk(uint256(nestPerChunk), _sheet.level);
        uint256 _nestAmount = uint256(_sheet.chunkNum).mul(_newNestPerChunk).mul(1e18);

        _C_NestPool.unfreezeNest(address(msg.sender), _nestAmount);
        _C_NestPool.unfreezeEth(address(msg.sender), _ethAmount);
        _C_NestPool.unfreezeToken(address(msg.sender), _token, _tokenAmount);
    }

    function _recover(address _token, uint256 _index, PriceSheet memory _sheet) private 
    {
        uint256 _ethChunkAmount = uint256(_sheet.chunkSize).mul(1 ether);
        uint256 _tokenChunkAmount = uint256(_sheet.tokenPrice).mul(_ethChunkAmount);

        Taker[] storage _ts = _takers[_token][_index];
        uint256 _len = _ts.length;
        for (uint i = 0; i < _len; i++) {
            Taker memory _t = _ts[_len - i];
            if (_t.ethChunk > 0) {
                _C_NestPool.freezeEth(address(msg.sender), _ethChunkAmount.mul(_t.ethChunk));
                _C_NestPool.unfreezeEth(address(_t.takerAddress), _ethChunkAmount.mul(2).mul(_t.ethChunk));
                _sheet.tokenChunk = uint8(uint256(_sheet.tokenChunk).sub(uint256(_t.ethChunk)));
            } else if (_t.tokenChunk > 0) {
                _C_NestPool.freezeToken(address(msg.sender), _token, _tokenChunkAmount.mul(_t.tokenChunk));
                _C_NestPool.unfreezeToken(address(_t.takerAddress), _token, _tokenChunkAmount.mul(_t.tokenChunk));
                _C_NestPool.unfreezeEth(address(_t.takerAddress), _ethChunkAmount.mul(_t.tokenChunk));
                _sheet.ethChunk = uint8(uint256(_sheet.ethChunk).sub(uint256(_t.tokenChunk)));
            }
            _ts.pop();
        }
    }

    function close(address token, uint256 index) public noContract 
    {
        PriceSheet memory _sheet = _priceSheetList[token][index];
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
        _priceSheetList[token][index] = _sheet;
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
        // check parameters 
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        require(newTokenPrice > 0, "Nest:Mine:(price)=0");
        require(takeChunkNum > 0, "Nest:Mine:(take)=0");

        address nToken = _C_NestPool.getNTokenFromToken(token);
        require (nToken != address(0x0), "Nest:Mine:!(ntoken)");

        PriceSheet memory _sheet = _priceSheetList[token][index]; 
        require(block.number.sub(_sheet.height) < c_price_duration_block, "Nest:Mine:!EFF(sheet)");

        uint256 _chunkSize = uint256(_sheet.chunkSize);
        uint256 _state = uint256(_sheet.state);
        uint256 _level = uint256(_sheet.level);
        require(_state == 0x2 || _state == 0x3,  "Nest:Mine:!(state)");

        // post a new price sheet
        { 
            // check bitting conditions
            require(_sheet.remainChunk >= takeChunkNum, "Nest:Mine:!(remain)");

            uint256 _ethChunkNum;
            {
                uint256 _nestDeposited = uint256(nestPerChunk).mul(takeChunkNum);
                uint256 _newNestPerChunk;
                uint256 _newLevel;

                if (_level > 4) { // bitten sheet, nest doubling
                    _ethChunkNum = takeChunkNum;
                    (_newNestPerChunk, _newLevel) = _calcNestPerChunk(uint256(nestPerChunk), _level);
                    _nestDeposited = _newNestPerChunk.mul(_ethChunkNum);
                } else {  // bitten sheet, eth doubling 
                    _ethChunkNum = takeChunkNum.mul(c_take_amount_factor);
                    _nestDeposited = uint256(nestPerChunk).mul(_ethChunkNum);
                    _newLevel = _level + 1;
                }
            
                _post(token, newTokenPrice, _ethChunkNum, uint256(_sheet.chunkSize), 0x2, _newLevel);
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
            _priceSheetList[token][index] = _sheet;
    
            _takers[token][index].push(Taker(uint160(msg.sender), uint8(0), uint8(takeChunkNum), uint80(0)));            
            // generate an event 
            emit TokenBought(address(msg.sender), address(token), index, _ethNum.mul(1 ether), _ethNum.mul(_sheet.tokenPrice));
        }

        {
            uint256 _ethNum = takeChunkNum.mul(_chunkSize);
            uint256 _ethFee = _ethNum.mul(1 ether).mul(c_take_fee_thousandth).div(1000);

            // save the changes into miner's virtual account
            if (msg.value > _ethFee) {
                _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            }
            _C_NestStaking.addETHReward{value:_ethFee}(nToken);

        }
        return; 
    }

    function sellToken(address token, uint256 index, uint256 takeChunkNum, uint256 newTokenPrice)
        public payable noContract 
    {
        // check parameters 
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        require(newTokenPrice > 0, "Nest:Mine:(price)=0");
        require(takeChunkNum > 0, "Nest:Mine:(take)=0");

        address nToken = _C_NestPool.getNTokenFromToken(token);
        require (nToken != address(0x0), "Nest:Mine:!(ntoken)");

        PriceSheet memory _sheet = _priceSheetList[token][index]; 
        require(block.number.sub(_sheet.height) < c_price_duration_block, "Nest:Mine:!EFF(sheet)");

        uint256 _chunkSize = uint256(_sheet.chunkSize);
        uint256 _ethNum = takeChunkNum.mul(_chunkSize);
        uint256 _state = uint256(_sheet.state);
        uint256 _level = uint256(_sheet.level);
        require(_state == 0x2 || _state == 0x3,  "Nest:Mine:!(state)");

        // check bitting conditions
        require(_sheet.remainChunk >= takeChunkNum, "Nest:Mine:!(remain)");

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
                    _nestDeposited = takeChunkNum.mul(uint256(nestPerChunk));
                    _newLevel = _level + 1;
                }
                _post(token, newTokenPrice, _ethChunkNum, uint256(_sheet.chunkSize), 0x2, _newLevel);
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
            _priceSheetList[token][index] = _sheet;
            
            _takers[token][index].push(Taker(uint160(msg.sender), uint8(takeChunkNum), uint8(0), uint80(0)));
            emit TokenSold(address(msg.sender), address(token), index, _ethNum.mul(1 ether), _ethNum.mul(_sheet.tokenPrice));

        }
        {
            uint256 _ethFee = _ethNum.mul(1 ether).mul(c_take_fee_thousandth).div(1000);

            if (msg.value > _ethFee) {
                _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            }
            _C_NestStaking.addETHReward{value:_ethFee}(nToken);
        }

        return; 
    }

    function _clear(address _token, uint256 _chunkSize, uint256 _tokenChunkSize, Taker memory _t) internal  
    {
        if (_t.ethChunk > 0) {
            _C_NestPool.freezeEth(address(msg.sender), _chunkSize.mul(_t.ethChunk));
            _C_NestPool.unfreezeEth(address(_t.takerAddress), _chunkSize.mul(_t.ethChunk));
        } else if (_t.tokenChunk > 0) {
            _C_NestPool.freezeToken(address(msg.sender), _token, _tokenChunkSize.mul(_t.tokenChunk));
            _C_NestPool.unfreezeToken(address(_t.takerAddress), _token, _tokenChunkSize.mul(_t.tokenChunk));
        }
    }

    function clear(address token, uint256 index, uint256 num) public payable 
    {
        // check parameters 
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        PriceSheet memory _sheet = _priceSheetList[token][index]; 
        require(uint256(_sheet.miner) == uint256(msg.sender), "Nest:Mine:!(miner)");
        require(_sheet.height + c_price_duration_block < block.number, "Nest:Mine:!EFF(sheet)");  // safe_math
        require(_sheet.height + c_sheet_duration_block > block.number, "Nest:Mine:!EFF(sheet)");  // safe_math
        
        uint256 _state = uint256(_sheet.state);
        if (_state == 0x2) { // non-bitten price sheet
            require(_takers[token][index].length == 0, "Nest:Mine:!(takers)");
            _sheet.state = uint8(1);
            _priceSheetList[token][index] = _sheet;
            if (msg.value > 0) {
                _C_NestPool.depositEth{value:msg.value}(address(msg.sender));
            }
            return;
        }
        require(_state == 0x3, "Nest:Mine:!BITTEN(sheet)");
        
        uint256 _ethChunkAmount = uint256(_sheet.chunkSize).mul(1 ether);
        uint256 _tokenChunkAmount = uint256(_sheet.tokenPrice).mul(_ethChunkAmount);

        if (msg.value > 0) { 
            _C_NestPool.depositEth{value:msg.value}(address(msg.sender));
        }

        Taker[] storage _ts = _takers[token][index];
        uint256 _len = _ts.length;
        for (uint i = 0; i < num; i++) {
            Taker memory _t = _ts[_len - i];
            _clear(token, _ethChunkAmount, _tokenChunkAmount, _t);
            _ts.pop();
        }

        if (_ts.length == 0) { 
            _sheet.state = uint8(1);
            _priceSheetList[token][index] = _sheet;
        }
    }

    function clearAll(address token, uint256 index) public payable 
    {
        // check parameters 
        require(token != address(0x0), "Nest:Mine:(token)=0"); 
        PriceSheet memory _sheet = _priceSheetList[token][index]; 
        require(_sheet.height + c_price_duration_block < block.number, "Nest:Mine:!EFF(sheet)");  // safe_math: untainted values
        require(_sheet.height + c_sheet_duration_block > block.number, "Nest:Mine:!VALID(sheet)");  // safe_math: untainted values
        require(uint256(_sheet.miner) == uint256(msg.sender), "Nest:Mine:!(miner)");
        
        uint256 _state = uint256(_sheet.state);
        if (_state == 0x2) { // non-bitten price sheet
            require(_takers[token][index].length == 0, "Nest:Mine:!(takers)");
            _sheet.state = uint8(1);
            _priceSheetList[token][index] = _sheet;
            _C_NestPool.depositEth{value:msg.value}(address(msg.sender));
            return;
        }
        require(_state == 0x3, "Nest:Mine:!BITTEN(sheet)");

        uint256 _ethChunkAmount = uint256(_sheet.chunkSize).mul(1 ether);
        uint256 _tokenChunkAmount = uint256(_sheet.tokenPrice).mul(_ethChunkAmount);

        _C_NestPool.depositEth{value:msg.value}(address(msg.sender));

        Taker[] storage _ts = _takers[token][index];
        uint256 _len = _ts.length;
        for (uint i = 0; i < _len; i++) {
            Taker memory _t = _ts[_len - i];
            _clear(token, _ethChunkAmount, _tokenChunkAmount, _t);
            _ts.pop();
        }

        _sheet.state = uint8(1);
        _priceSheetList[token][index] = _sheet;
    }

    function refute(address token, uint256 index, uint256 takeIndex) public  
    {
        PriceSheet storage _sheet = _priceSheetList[token][index]; 
        require(_sheet.state == 0x3,  "Nest:Mine:!(state)");

        Taker memory _taker = _takers[token][index][takeIndex];
        require(_taker.takerAddress == uint160(msg.sender), "Nest:Mine:!(taker)");
        require(_sheet.height + c_sheet_duration_block < block.number, "Nest:Mine:VALID(sheet)");  // safe_math: untainted values
        
        uint256 _chunkSize = _sheet.chunkSize;
        if (_taker.ethChunk > 0) {  // sellToken
            uint256 _chunkNum = _taker.ethChunk;
            uint256 _tokenAmount = uint256(_sheet.tokenPrice).mul(_chunkNum).mul(_chunkSize);
            _C_NestPool.unfreezeToken(address(msg.sender), token, _tokenAmount);
            _C_NestPool.unfreezeEth(address(msg.sender), _chunkNum.mul(_chunkSize).mul(1 ether));
            _taker.ethChunk = 0;
        } else if (_taker.tokenChunk > 0) { // buyToken
            uint256 _chunkNum = _taker.ethChunk;
            uint256 _ethAmount = _chunkNum.add(_chunkNum).mul(_chunkSize).mul(1 ether);
            _C_NestPool.unfreezeEth(address(msg.sender), _ethAmount);
            _taker.tokenChunk = 0;
        }
        _taker.takerAddress = 0;
        _takers[token][index][takeIndex] = _taker;
        _sheet.state = uint8(0x4);
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

/*
    // Get the latest effective price for a token
    function latestPriceOfToken(address token) public view returns(uint256 ethAmount, uint256 tokenAmount, uint256 bn) 
    {
        PriceSheet[] storage tp = _priceSheetList[token];
        uint256 len = tp.length;
        PriceSheet memory p;
        if (len == 0) {
            return (0, 0, 0);
        }

        uint256 first = 0;
        for (uint i = 1; i <= len; i++) {
            p = tp[len-i];
            if (first == 0 && p.atHeight + c_price_duration_block < block.number) {
                first = uint256(p.atHeight);
                ethAmount = uint256(p.dealEthAmount);
                tokenAmount = uint256(p.dealTokenAmount);
                bn = first;
            } else if (first == uint256(p.atHeight)) {
                ethAmount = ethAmount.add(p.dealEthAmount);
                tokenAmount = tokenAmount.add(p.dealTokenAmount);
            } else if (first > uint256(p.atHeight)) {
                break;
            }
        }
    }

    function priceOfToken(address token) public view returns(uint256 ethAmount, uint256 tokenAmount, uint256 bn) 
    {
        // TODO: no contract allowed
        require(_C_NestPool.getNTokenFromToken(token) != address(0), "Nest::Mine: !token");
        Price memory pi = _price_info[token];
        return (pi.ethAmount, pi.tokenAmount, pi.height);
    }

    function priceAndSigmaOfToken(address token) public view returns (
        uint256, uint256, uint256, int128) 
    {
        // TODO: no contract allowed
        require(_C_NestPool.getNTokenFromToken(token) != address(0), "Nest::Mine: !token");
        Price memory pi = _price_info[token];
        // int128 v = 0;
        int128 v = ABDKMath64x64.sqrt(ABDKMath64x64.abs(pi.volatility_sigma_sq));
        return (uint256(pi.ethAmount), uint256(pi.tokenAmount), uint256(pi.atHeight), v);
    }

    function priceOfTokenAtHeight(address token, uint64 atHeight) public view returns(uint256 ethAmount, uint256 tokenAmount, uint64 bn) 
    {
        // TODO: no contract allowed

        PriceSheet[] storage tp = _price_list[token];
        uint256 len = _price_list[token].length;
        PriceSheet memory p;
        
        if (len == 0) {
            return (0, 0, 0);
        }

        uint256 first = 0;
        uint256 prev = 0;
        for (uint i = 1; i <= len; i++) {
            p = tp[len-i];
            first = uint256(p.atHeight);
            if (prev == 0) {
                if (first <= uint256(atHeight) && first + c_price_duration_block < block.number) {
                    ethAmount = uint256(p.dealEthAmount);
                    tokenAmount = uint256(p.dealTokenAmount);
                    bn = uint64(first);
                    prev = first;
                }
            } else if (first == prev) {
                ethAmount = ethAmount.add(p.dealEthAmount);
                tokenAmount = tokenAmount.add(p.dealTokenAmount);
            } else if (prev > first) {
                break;
            }
        }
    }

    function priceListOfToken(address token, uint8 num) public view returns(uint128[] memory data, uint256 atHeight) 
    {
        PriceSheet[] storage tp = _price_list[token];
        uint256 len = tp.length;
        uint256 index = 0;
        data = new uint128[](num * 3);
        PriceSheet memory p;

        // loop
        uint256 curr = 0;
        uint256 prev = 0;
        for (uint i = 1; i <= len; i++) {
            p = tp[len-i];
            curr = uint256(p.atHeight);
            if (prev == 0) {
                if (curr + c_price_duration_block < block.number) {
                    data[index] = uint128(curr);
                    data[index+1] = p.dealEthAmount;
                    data[index+2] = p.dealTokenAmount;
                    atHeight = curr;
                    prev = curr;
                }
            } else if (prev == curr) {
                // TODO: here we should use safeMath  x.add128(y)
                data[index+1] = data[index+1] + (p.dealEthAmount);
                data[index+2] = data[index+2] + (p.dealTokenAmount);
            } else if (prev > curr) {
                index = index + 3;
                if (index >= uint256(num * 3)) {
                    break;
                }
                data[index] = uint128(curr);
                data[index+1] = p.dealEthAmount;
                data[index+2] = p.dealTokenAmount;
                prev = curr;
            }
        } 
        require (data.length == uint256(num * 3), "Incorrect price list length");
    }
*/
    /* ========== MINING ========== */
    
    function mineNest() private returns (uint256) {
        uint256 period = block.number.sub(c_mining_nest_genesis_block_height).div(c_mining_nest_yield_cutback_period);
        uint256 nestPerBlock;
        if (period > 9) {
            nestPerBlock = c_mining_nest_yield_off_period_amount;
        } else {
            nestPerBlock = _mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = nestPerBlock.mul(block.number.sub(_latest_mining_height));
        _latest_mining_height = block.number; 
        // emit NestMining(block.number, yieldAmount);
        return yieldAmount;
    }

    function yieldAmountAtHeight(uint64 height) public view returns (uint128) {
        uint256 period = uint256(height).sub(c_mining_nest_genesis_block_height).div(c_mining_nest_yield_cutback_period);
        uint256 nestPerBlock;
        if (period > 9) {
            nestPerBlock = c_mining_nest_yield_off_period_amount;
        } else {
            nestPerBlock = _mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = nestPerBlock.mul(uint256(height).sub(_latest_mining_height));
        return uint128(yieldAmount);
    }

    function latestMinedHeight() external view returns (uint64) {
       return uint64(_latest_mining_height);
    }

    // function mineNToken(address ntoken) private returns (uint256) {
    //     (uint256 genesis, uint256 last) = INToken(ntoken).checkBlockInfo();

    //     uint256 period = block.number.sub(genesis).div(c_mining_nest_yield_cutback_period);
    //     uint256 ntokenPerBlock;
    //     if (period > 9) {
    //         ntokenPerBlock = c_mining_ntoken_yield_off_period_amount;
    //     } else {
    //         ntokenPerBlock = _mining_ntoken_yield_per_block_amount[period];
    //     }
    //     uint256 yieldAmount = ntokenPerBlock.mul(block.number.sub(last));
    //     INToken(ntoken).increaseTotal(yieldAmount);
    //     // emit NTokenMining(block.number, yieldAmount, ntoken);
    //     return yieldAmount;
    // }

    /* ========== MINING ========== */


    function withdrawEth(uint256 ethAmount) public noContract
    {
        _C_NestPool.withdrawEth(address(msg.sender), ethAmount); 
    }

    function withdrawToken(address token, uint256 tokenAmount) public noContract
    {
        _C_NestPool.withdrawToken(address(msg.sender), token, tokenAmount); 
    }

    function claimAllNest() public noContract
    {
        uint256 nestAmount = _C_NestPool.balanceOfNestInPool(address(msg.sender));
        _C_NestPool.withdrawNest(address(msg.sender), nestAmount);
    }

    function withdrawEthAndToken(uint256 ethAmount, address token, uint256 tokenAmount) public noContract
    {
        _C_NestPool.withdrawEthAndToken(address(msg.sender), ethAmount, token, tokenAmount); 
    }

    function claimNToken(address ntoken, uint256 amount) public noContract {
        if (ntoken == address(0x0) || ntoken == address(_C_NestToken)){
            _C_NestPool.withdrawNest(address(msg.sender), amount); 
        } else {
            _C_NestPool.withdrawNToken(address(msg.sender), ntoken, amount);
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
        return _takers[token][index].length;
    }

    function takerOf(address token, uint256 index, uint256 k) view public returns (Taker memory) 
    {
        return _takers[token][index][k];
    }

    function lengthOfPriceSheets(address token) view public 
        returns (uint)
    {
        return _priceSheetList[token].length;
    }

    function contentOfPriceSheet(address token, uint256 index) view public 
        returns (PriceSheet memory ps) 
    {
        uint256 len = _priceSheetList[token].length;
        require (index < len, "Nest:Mine:>(len)");
        return _priceSheetList[token][index];
    }

    function atHeightOfPriceSheet(address token, uint256 index) view public returns (uint64)
    {
        PriceSheet storage p = _priceSheetList[token][index];
        return p.height;
    }

    /* ========== ENCODING/DECODING ========== */

    function decodeU256Two(uint256 enc) public pure returns (uint128, uint128) {
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

    function debugMinedNest(uint256 h) public view returns (uint256, uint256) 
    {
        return (uint128(_nest_at_height[h] / (1 << 128)), uint128(_nest_at_height[h] % (1 << 128)));
    }
}
