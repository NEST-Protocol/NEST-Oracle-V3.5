// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./MiningData.sol";

import "./lib/SafeMath.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./lib/ABDKMath64x64.sol";

import "./iface/INestPool.sol";
import "./iface/INestStaking.sol";
// import "./iface/INToken.sol";
// import "./iface/INNRewardPool.sol";
import "hardhat/console.sol";

/// @title MiningPrice module of NestMining
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author 0x00  - <0x00@nestprotocol.org>
contract NestMiningV1 {

    using SafeMath for uint256;


    /* ========== VARIABLES ========== */

    address private governance;

    INestPool private C_NestPool;
    ERC20 private C_NestToken;
    address private C_NestStaking;
    address private C_NestQuery;
    // IPriceOracle private _C_PriceOracle;

    address private _developer_address;
    address private _NN_address;

    uint128 private latestMiningHeight;
    uint128 private minedNestAmount;   

    uint8   private version = 2;
    uint8   private miningEthUnit = 10;
    uint32  private nestStakedNum1k = 10;
    uint8   private biteFeeRate = 1; 
    uint8   private miningFeeRate = 10;

    uint256[10] private _mining_nest_yield_per_block_amount;



    /* ========== CONSTANTS ========== */

    uint256 constant PRICE_DURATION_BLOCK = 25;

    uint256 constant BITE_AMOUNT_INFLATE_FACTOR  = 2;

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

    uint256 constant DEV_REWARD_PERCENTAGE = 5;
    uint256 constant NN_REWARD_PERCENTAGE = 15;
    uint256 constant MINER_NEST_REWARD_PERCENTAGE = 80;

    // uint256 constant c_ntoken_bidder_reward_percentage = 5;
    // uint256 constant c_ntoken_miner_reward_percentage = 95;

    uint8 constant PRICESHEET_STATE_CLOSED = 0;
    uint8 constant PRICESHEET_STATE_POSTED = 1;
    uint8 constant PRICESHEET_STATE_BITTEN = 2;

    uint8 constant PRICESHEET_TYPE_USD     = 1;
    uint8 constant PRICESHEET_TYPE_NEST    = 2;
    uint8 constant PRICESHEET_TYPE_TOKEN   = 3;
    uint8 constant PRICESHEET_TYPE_NTOKEN  = 4;
    uint8 constant PRICESHEET_TYPE_BITTING = 8;

    uint8 constant MAX_BITE_NESTED_LEVEL  = 3;

    // size: (2 x 256 byte)
    struct PriceSheet {    
        uint160 miner;       //  miner who posted the price (most significant bits, or left-most)
        uint32  height;
        uint32  ethNum;   
        uint32  remainNum;    

        uint8   level;           // the level of bitting, 1-4: eth-doubling | 5 - 127: nest-doubling
        uint8   typ;             // 1: USD | 2: NEST | 3: TOKEN | 4: NTOKEN(Not Available)
        uint8   state;           // 0: closed | 1: posted | 2: bitten
        uint8   _reserved; 
        uint32  ethNumBal;
        uint32  tokenNumBal;
        uint32  nestNum1k;
        uint128 tokenAmountPerEth;
    }

    // We use mapping (from `token_address` to an array of `PriceSheet`) to remove the owner field 
    // from the PriceSheet so that to save 256b. The idea is from Fei.
    mapping(address => PriceSheet[]) private priceSheetList;

    // size: (3 x 256 byte)
    struct PriceInfo {
        uint32  index;
        uint32  height;
        uint32  ethNum;         //  the balance of eth
        uint32  _reserved;
        uint128 tokenAmount;    //  the balance of token 
        int128  volatility_sigma_sq;
        int128  volatility_ut_sq;
        int128  avgTokenAmount;
        uint128 _reserved2;     
    }

    mapping(address => PriceInfo) private priceInfo;

    // minedAtHeight: ntoken => block height => (ntoken amount, eth amount)
    mapping(address => mapping(uint256 => uint256)) private minedAtHeight;

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


    constructor(address NestToken, address NestPool, address NestStaking) public {
        C_NestToken = ERC20(NestToken);
        C_NestPool = INestPool(NestPool);
        C_NestStaking = NestStaking;

        latestMiningHeight = uint128(block.number);
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

    function _onlyGovernance() private view 
    {
        require(msg.sender == governance, "Nest:Mine:!GOV");
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
        // console.log("msg.sender=%s, _contract=%s", msg.sender, _contract);
        require(msg.sender == governance || msg.sender == _contract, "Nest:Mine:!sender");
        _;
    }

    /* ========== GOVERNANCE ========== */

    function setAddresses(address developer_address, address NN_address) public onlyGovernance {
        _developer_address = developer_address;
        _NN_address = NN_address;
    }

    function setContracts(address NestToken, address NestPool, address NestQuery) public onlyGovernance {
        C_NestToken = ERC20(NestToken);
        C_NestPool = INestPool(NestPool);
        C_NestQuery = NestQuery;
    }

    /* ========== HELPERS ========== */
    function _calcEWMA(
            uint256 ethA0, 
            uint256 tokenA0, 
            uint256 ethA1, 
            uint256 tokenA1, 
            int128 _sigma_sq, 
            int128 _ut_sq,
            uint256 _interval
        ) 
        private 
        view
        // pure 
        returns (int128, int128)
    {
        int128 _ut_sq_2 = ABDKMath64x64.div(_ut_sq, 
            ABDKMath64x64.fromUInt(_interval));

        int128 _new_sigma_sq = ABDKMath64x64.add(
            ABDKMath64x64.mul(ABDKMath64x64.divu(95, 100), _sigma_sq), 
            ABDKMath64x64.mul(ABDKMath64x64.divu(5,100), _ut_sq_2));

        // console.log("_calcEWMA, tokenA0=%s, ethA0=%s",tokenA0, ethA0 );
        // console.log("_calcEWMA, tokenA1=%s, ethA1=%s",tokenA1, ethA1 );
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

    function _calcAvg(uint256 ethA, uint256 tokenA, int128 _avg) 
        private 
        pure
        returns(int128)
    {
        int128 _newP = ABDKMath64x64.div(ABDKMath64x64.fromUInt(tokenA), 
                                        ABDKMath64x64.fromUInt(ethA));
        int128 _newAvg;

        if (_avg == 0) {
            _newAvg = _newP;
        } else {
            _newAvg = ABDKMath64x64.add(
                ABDKMath64x64.mul(ABDKMath64x64.divu(95, 100), _avg), 
                ABDKMath64x64.mul(ABDKMath64x64.divu(5,100), _newP));
        }

        return _newAvg;
    }

    function _moveAndCalc(
            PriceInfo memory p0,
            PriceSheet[] storage pL
        ) 
        private
        view 
        returns (PriceInfo memory p1)
    {   
        uint256 i = p0.index + 1;
        if (i >= pL.length) {
            return (PriceInfo(0,0,0,0,0,int128(0),int128(0), int128(0), 0));
        }

        uint256 h = uint256(pL[i].height);
        if (h + PRICE_DURATION_BLOCK >= block.number) {
            return (PriceInfo(0,0,0,0,0,int128(0),int128(0), int128(0), 0));
        }
        
        uint256 ethA1 = 0;
        uint256 tokenA1 = 0;
        while (i < pL.length && pL[i].height == h) { 
            // console.log("_moveAndCalc, i=%s, remainNum=%s", i, pL[i].remainNum);
            uint256 _remain = uint256(pL[i].remainNum);
            if (_remain == 0) {
                continue;
            }
            ethA1 = ethA1 + _remain;
            tokenA1 = tokenA1 + _remain.mul(pL[i].tokenAmountPerEth);
            i = i + 1;
        }
        i = i - 1;
        // console.log("_calcEWMA, interval=%s", i - p0.index);
        // console.log("_calcEWMA, p0.index=%s, p0.ethNum=%s, p0.tokenAmount", p0.index, p0.ethNum, p0.tokenAmount);

        if (ethA1 == 0 || tokenA1 == 0) {
            return (PriceInfo(
                    uint32(i),  // index
                    uint32(0),  // height
                    uint32(0),  // ethNum
                    uint32(0),  // _reserved
                    uint32(0),  // tokenAmount
                    int128(0),  // volatility_sigma_sq
                    int128(0),  // volatility_ut_sq
                    int128(0),  // avgTokenAmount
                    0           // _reserved2
            ));
        }

        (int128 new_sigma_sq, int128 new_ut_sq) = _calcEWMA(
            p0.ethNum, p0.tokenAmount, 
            ethA1, tokenA1, 
            p0.volatility_sigma_sq, p0.volatility_ut_sq, 
            i - p0.index);
        int128 _newAvg = _calcAvg(ethA1, tokenA1, p0.avgTokenAmount); 

        return(PriceInfo(
                uint32(i),          // index
                uint32(h),          // height
                uint32(ethA1),      // ethNum
                uint32(0),          // _reserved
                uint128(tokenA1),   // tokenAmount
                new_sigma_sq,       // volatility_sigma_sq
                new_ut_sq,          // volatility_ut_sq
                _newAvg,            // avgTokenAmount
                uint128(0)          // _reserved2
        ));
    }

    function _stat(address token) public 
    {
        PriceInfo memory p0 = priceInfo[token];
        PriceSheet[] storage pL = priceSheetList[token];
        if (pL.length < 2) {
            return;
        }

        if (p0.height == 0) {
            PriceSheet memory _sheet = pL[0];
            p0.ethNum = _sheet.ethNum;
            p0.tokenAmount = uint128(uint256(_sheet.tokenAmountPerEth).mul(_sheet.ethNum));
            p0.height = _sheet.height;
            p0.volatility_sigma_sq = 0;
            p0.volatility_ut_sq = 0;
            p0.avgTokenAmount = ABDKMath64x64.fromUInt(_sheet.tokenAmountPerEth);
            priceInfo[token] = p0;
        }
        PriceInfo memory p1;

        while (uint256(p0.index) < pL.length && uint256(p0.height) + PRICE_DURATION_BLOCK < block.number){
            p1 = _moveAndCalc(p0, pL);
            if (p1.index <= p0.index) {    // bootstraping
                break;
            } else if (p1.ethNum == 0) {   // jump cross a block with bitten prices
                p0.index = p1.index;
                continue;
            } else {                       // calculate one more block
                p0 = p1;
            }
        }

        if (p0.index > priceInfo[token].index) {
            priceInfo[token] = p0;
        }
        return;
    }


    function _statOneBlock(address token) public {
        PriceInfo memory p0 = priceInfo[token];
        PriceSheet[] storage pL = priceSheetList[token];
        if (pL.length < 2) {
            return;
        }
        (PriceInfo memory p1) = _moveAndCalc(p0, priceSheetList[token]);
        if (p1.index > p0.index && p1.ethNum != 0) {
            priceInfo[token] = p1;
        } else if (p1.index > p0.index && p1.ethNum == 0) {
            p0.index = p1.index;
            priceInfo[token] = p1;
        }
        return;
    }
/*

    function volatility(address token) public view returns (PriceInfo memory p) {
        // TODO: no contract allowed
        return priceInfo[token];
    }
*/
    /* ========== POST/CLOSE Price Sheets ========== */

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
        require(ethNum > miningEthUnit && ethNum % miningEthUnit == 0, "Nest:Mine:!(ethNum)");
        require(tokenAmountPerEth > 0, "Nest:Mine:!(price)");
        address _ntoken = C_NestPool.getNTokenFromToken(token);
        require(_ntoken != address(0) &&  _ntoken != address(C_NestToken), "Nest:Mine:!(ntoken)");


        // calculate eth fee
        uint256 _ethFee = ethNum.mul(miningFeeRate).div(1000).mul(1e18);

        { // settle ethers and tokens
            INestPool _C_NestPool = INestPool(C_NestPool);

            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));

            INestStaking(C_NestStaking).addETHReward{value:_ethFee}(_ntoken);       

            // freeze eths and tokens in the nest pool
            _C_NestPool.freezeEthAndToken(msg.sender, ethNum.mul(1 ether), 
                token, tokenAmountPerEth.mul(ethNum));
        }

        {
            PriceSheet[] storage _sheetToken = priceSheetList[token];
            // append a new price sheet
            _sheetToken.push(PriceSheet(
                uint160(msg.sender),            // miner 
                uint32(block.number),           // atHeight
                uint32(ethNum),                 // ethNum
                uint32(ethNum),                 // remainNum
                uint8(0),                       // level
                uint8(PRICESHEET_TYPE_TOKEN),   // typ
                uint8(PRICESHEET_STATE_POSTED), // state 
                uint8(0),                       // _reserved
                uint32(ethNum),                 // ethNumBal
                uint32(ethNum),                 // tokenNumBal
                uint32(nestStakedNum1k),        // nestNum1k
                uint128(tokenAmountPerEth)      // tokenAmountPerEth
            ));
            emit PricePosted(msg.sender, token, (_sheetToken.length - 1), ethNum.mul(1 ether), tokenAmountPerEth.mul(ethNum)); 

        }

        { // mining
            uint256 _minedH = minedAtHeight[token][block.number];
            uint256 _ntokenH = uint256(_minedH >> 128);
            uint256 _ethH = uint256(_minedH % (1 << 128));
            if (_ntokenH == 0) {
                uint256 _ntokenAmount = _mineNToken(_ntoken);  
                latestMiningHeight = uint32(block.number); 
                _ntokenH = _ntokenAmount;
                INToken(_ntoken).increaseTotal2(_ntokenAmount, address(C_NestPool));
            }
            _ethH = _ethH.add(ethNum);
            // require(_nestH < (1 << 128) && _ethH < (1 << 128), "nestAtHeight/ethAtHeight error");
            minedAtHeight[token][block.number] = (_ntokenH * (1<< 128) + _ethH);
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
        require(ethNum >= miningEthUnit && ethNum % miningEthUnit == 0, "Nest:Mine:!(ethNum)");
        require(tokenAmountPerEth > 0 && ntokenAmountPerEth > 0, "Nest:Mine:!(price)");
        address _ntoken = C_NestPool.getNTokenFromToken(token);
        require(_ntoken == address(C_NestToken), "Nest:Mine:!(ntoken)");

        // calculate eth fee
        uint256 _ethFee = ethNum.mul(miningFeeRate).mul(1e18).div(1000);

        { // settle ethers and tokens
            INestPool _C_NestPool = INestPool(C_NestPool);
            console.log("msg.value=%s, _ethFee=%s", msg.value, _ethFee);
            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));

            INestStaking(C_NestStaking).addETHReward{value:_ethFee}(_ntoken);       

            // freeze eths and tokens in the nest pool
            _C_NestPool.freezeEthAndToken(msg.sender, ethNum.mul(1 ether), 
                token, tokenAmountPerEth.mul(ethNum));
            _C_NestPool.freezeEthAndToken(msg.sender, ethNum.mul(1 ether), 
                _ntoken, ntokenAmountPerEth.mul(ethNum));
            _C_NestPool.freezeNest(msg.sender, uint256(nestStakedNum1k).mul(2).mul(1000 * 1e18));
        }

        {
            PriceSheet[] storage _sheetToken = priceSheetList[token];
            // append a new price sheet
            _sheetToken.push(PriceSheet(
                uint160(msg.sender),            // miner 
                uint32(block.number),           // atHeight
                uint32(ethNum),                 // ethNum
                uint32(ethNum),                 // remainNum
                uint8(0),                       // level
                uint8(PRICESHEET_TYPE_USD),     // typ
                uint8(PRICESHEET_STATE_POSTED), // state 
                uint8(0),                       // _reserved
                uint32(ethNum),                 // ethNumBal
                uint32(ethNum),                 // tokenNumBal
                uint32(nestStakedNum1k),        // nestNum1k
                uint128(tokenAmountPerEth)      // tokenAmountPerEth
            ));

            PriceSheet[] storage _sheetNToken = priceSheetList[_ntoken];
            // append a new price sheet for ntoken
            _sheetNToken.push(PriceSheet(
                uint160(msg.sender),            // miner 
                uint32(block.number),           // atHeight
                uint32(ethNum),                 // ethNum
                uint32(ethNum),                 // remainNum
                uint8(0),                       // level
                uint8(PRICESHEET_TYPE_NEST),     // typ
                uint8(PRICESHEET_STATE_POSTED), // state 
                uint8(0),                       // _reserved
                uint32(ethNum),                 // ethNumBal
                uint32(ethNum),                 // tokenNumBal
                uint32(nestStakedNum1k),        // nestNum1k
                uint128(ntokenAmountPerEth)      // tokenAmountPerEth
            ));
            emit PricePosted(msg.sender, token, (_sheetToken.length - 1), ethNum.mul(1 ether), tokenAmountPerEth.mul(ethNum)); 
            emit PricePosted(msg.sender, _ntoken, (_sheetNToken.length - 1), ethNum.mul(1 ether), ntokenAmountPerEth.mul(ethNum)); 
        }

        { // mining
            // TODO: support token <-> ntoken, add _mineNToken()
            uint256 _minedH = minedAtHeight[token][block.number];
            uint256 _nestH = uint256(_minedH >> 128);
            uint256 _ethH = uint256(_minedH % (1 << 128));
            if (_nestH == 0) {
                uint256 _nestAmount = _mineNest();  
                latestMiningHeight = uint32(block.number); 
                minedNestAmount += uint128(_nestAmount);
                _nestH = _nestAmount.mul(MINER_NEST_REWARD_PERCENTAGE).div(100); 
            }
            _ethH = _ethH.add(ethNum);
            // require(_nestH < (1 << 128) && _ethH < (1 << 128), "nestAtHeight/ethAtHeight error");
            minedAtHeight[token][block.number] = (_nestH * (1<< 128) + _ethH);
        }

        // uint256 priceIndex = (uint256(token) >> 96) << 96 + uint256(index);
        return; 

    }

    /// @dev Close a price sheet of USD/NEST/TOKEN
    function close(address token, uint256 index) public noContract 
    {
        PriceSheet memory _sheet = priceSheetList[token][index];
        require(_sheet.height + PRICE_DURATION_BLOCK < block.number, "Nest:Mine:!(height)");  // safe_math: untainted values
        require(address(_sheet.miner) == address(msg.sender), "Nest:Mine:!(miner)");

        INestPool _C_NestPool = INestPool(C_NestPool);
        address _ntoken = _C_NestPool.getNTokenFromToken(token);

        {   
            uint256 h = _sheet.height;
            if (_sheet.typ == PRICESHEET_TYPE_USD && _sheet.level == 0) {
                uint256 _nestH = uint256(minedAtHeight[token][h] / (1 << 128));
                uint256 _ethH = uint256(minedAtHeight[token][h] % (1 << 128));
                uint256 _reward = uint256(_sheet.ethNum).mul(_nestH).div(_ethH);
                _C_NestPool.addNest(address(msg.sender), _reward);
            } else if (_sheet.typ == PRICESHEET_TYPE_TOKEN && _sheet.level == 0) {
                uint256 _ntokenH = uint256(minedAtHeight[token][h] / (1 << 128));
                uint256 _ethH = uint256(minedAtHeight[token][h] % (1 << 128));
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

            _C_NestPool.unfreezeEthAndToken(address(msg.sender), _ethAmount, token, _tokenAmount);
            _C_NestPool.unfreezeNest(address(msg.sender), _nestAmount); 
        }

        _sheet.state = PRICESHEET_STATE_CLOSED;

        priceSheetList[token][index] = _sheet;

        emit PriceClosed(address(msg.sender), token, index);
    }

    function closeList(address token, uint64[] memory indices) public 
    {
        uint256 _ethAmount;
        uint256 _tokenAmount;
        uint256 _reward;
        uint256 _typ;

        PriceSheet[] storage prices = priceSheetList[token];
        
        for (uint i=0; i<indices.length; i++) {
            PriceSheet memory _sheet = prices[indices[i]];
            _typ = _sheet.typ;
            if (uint256(_sheet.miner) != uint256(msg.sender)) {
                continue;
            }
            uint256 h = uint256(_sheet.height);
            if (h + PRICE_DURATION_BLOCK < block.number) { // safe_math: untainted values
                _ethAmount = _ethAmount.add(uint256(_sheet.ethNumBal).mul(1 ether));
                _tokenAmount = _tokenAmount.add(uint256(_sheet.tokenNumBal).mul(_sheet.tokenAmountPerEth));
                _sheet.ethNumBal = 0;
                _sheet.tokenNumBal = 0;
                _sheet.remainNum = 0;
                uint256 _ntokenH = uint256(minedAtHeight[token][h] >> 128);
                uint256 _ethH = uint256(minedAtHeight[token][h] << 128 >> 128);
               
                _reward = _reward.add(uint256(_sheet.ethNum).mul(_ntokenH).div(_ethH));
                emit PriceClosed(address(msg.sender), token, indices[i]);
            }
        }
        
        INestPool _C_NestPool = INestPool(C_NestPool);

        if (_ethAmount > 0 || _tokenAmount > 0) {
            _C_NestPool.unfreezeEthAndToken(address(msg.sender), _ethAmount, token, _tokenAmount);
        }

        if  (_typ == PRICESHEET_TYPE_USD) {
            _C_NestPool.addNest(address(msg.sender), _reward);
        } else if (_typ == PRICESHEET_TYPE_TOKEN) {
            address _ntoken = _C_NestPool.getNTokenFromToken(token);
            _C_NestPool.addNToken(address(msg.sender), _ntoken, _reward);
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
        require(biteNum >= miningEthUnit && biteNum % miningEthUnit == 0, "Nest:Mine:!(bite)");

        PriceSheet memory _sheet = priceSheetList[token][index]; 
        require(_sheet.height + PRICE_DURATION_BLOCK > block.number, "Nest:Mine:!EFF(sheet)");
        require(_sheet.remainNum >= biteNum, "Nest:Mine:!(remain)");

        INestPool _C_NestPool = INestPool(C_NestPool);

        uint256 _state = uint256(_sheet.state);
        require(_state == PRICESHEET_STATE_POSTED || _state == PRICESHEET_STATE_BITTEN,  "Nest:Mine:!(state)");

        {
            address nToken = token;
            
            if (_sheet.typ == PRICESHEET_TYPE_USD || _sheet.typ == PRICESHEET_TYPE_TOKEN) {
                nToken = _C_NestPool.getNTokenFromToken(token);
                require (nToken != address(0x0), "Nest:Mine:!(ntoken)");
            } else if (_sheet.typ == PRICESHEET_TYPE_NEST || _sheet.typ == PRICESHEET_TYPE_NTOKEN) {
                nToken = token;
            }

            uint256 _ethFee = biteNum.mul(1 ether).mul(biteFeeRate).div(1000);

            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            INestStaking(C_NestStaking).addETHReward{value:_ethFee}(nToken);
        }

        // post a new price sheet
        { 
            // check bitting conditions
            uint256 _newEthNum;
            uint256 _newNestNum1k;
            {
                uint256 _level = uint256(_sheet.level);
                uint256 _newLevel;

                if (_level > MAX_BITE_NESTED_LEVEL && _level < 127) { // bitten sheet, nest doubling
                    _newEthNum = biteNum;
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level <= MAX_BITE_NESTED_LEVEL) {  // bitten sheet, eth doubling 
                    _newEthNum = biteNum.mul(BITE_AMOUNT_INFLATE_FACTOR);
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level >= 127) {
                    _newLevel = _level;
                    _newNestNum1k = uint256(_sheet.nestNum1k);
                }

                PriceSheet[] storage _sheetOfToken = priceSheetList[token];
                // append a new price sheet
                _sheetOfToken.push(PriceSheet(
                    uint160(msg.sender),             // miner 
                    uint32(block.number),            // atHeight
                    uint32(_newEthNum),                 // ethNum
                    uint32(_newEthNum),                 // remainNum
                    uint8(_newLevel),                // level
                    uint8(_sheet.typ),               // typ
                    uint8(PRICESHEET_STATE_POSTED),  // state 
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
            _sheet.state = PRICESHEET_STATE_BITTEN;
            _sheet.ethNumBal = uint32(uint256(_sheet.ethNumBal).add(biteNum));
            _sheet.tokenNumBal = uint32(uint256(_sheet.tokenNumBal).sub(biteNum));
            _sheet.remainNum = uint32(uint256(_sheet.remainNum).sub(biteNum));
            priceSheetList[token][index] = _sheet;
            
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
        require(biteNum >= miningEthUnit && biteNum % miningEthUnit == 0, "Nest:Mine:!(bite)");

        PriceSheet memory _sheet = priceSheetList[token][index]; 
        require(block.number.sub(_sheet.height) < PRICE_DURATION_BLOCK, "Nest:Mine:!EFF(sheet)");
        require(_sheet.remainNum >= biteNum, "Nest:Mine:!(remain)");

        INestPool _C_NestPool = INestPool(C_NestPool);

        uint256 _state = uint256(_sheet.state);
        require(_state == PRICESHEET_STATE_POSTED || _state == PRICESHEET_STATE_BITTEN,  "Nest:Mine:!(state)");

        {
            address nToken = token;
            
            if (_sheet.typ == PRICESHEET_TYPE_USD || _sheet.typ == PRICESHEET_TYPE_TOKEN) {
                nToken = _C_NestPool.getNTokenFromToken(token);
                require (nToken != address(0x0), "Nest:Mine:!(ntoken)");
            } else if (_sheet.typ == PRICESHEET_TYPE_NEST || _sheet.typ == PRICESHEET_TYPE_NTOKEN) {
                nToken = token;
            }

            uint256 _ethFee = biteNum.mul(1 ether).mul(biteFeeRate).div(1000);

            // save the changes into miner's virtual account
            _C_NestPool.depositEth{value:msg.value.sub(_ethFee)}(address(msg.sender));
            INestStaking(C_NestStaking).addETHReward{value:_ethFee}(nToken);
        }
        
       // post a new price sheet
        { 
            // check bitting conditions
            uint256 _newEthNum;
            uint256 _newNestNum1k;
            {
                uint256 _level = uint256(_sheet.level);
                uint256 _newLevel;

                if (_level > MAX_BITE_NESTED_LEVEL && _level < 127) { // bitten sheet, nest doubling
                    _newEthNum = biteNum;
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level <= MAX_BITE_NESTED_LEVEL) {  // bitten sheet, eth doubling 
                    _newEthNum = biteNum.mul(BITE_AMOUNT_INFLATE_FACTOR);
                    _newNestNum1k = uint256(_sheet.nestNum1k).mul(_newEthNum).div(_sheet.ethNum).mul(2);
                    _newLevel = _level + 1;
                } else if (_level >= 127) {
                    _newLevel = _level;
                    _newNestNum1k = uint256(_sheet.nestNum1k);
                }

                PriceSheet[] storage _sheetOfToken = priceSheetList[token];
                // append a new price sheet
                _sheetOfToken.push(PriceSheet(
                    uint160(msg.sender),             // miner 
                    uint32(block.number),            // atHeight
                    uint32(_newEthNum),                 // ethNum
                    uint32(_newEthNum),                 // remainNum
                    uint8(_newLevel),                // level
                    uint8(_sheet.typ),               // typ
                    uint8(PRICESHEET_STATE_POSTED),  // state 
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
            _sheet.state = PRICESHEET_STATE_BITTEN;
            _sheet.ethNumBal = uint32(uint256(_sheet.ethNumBal).sub(biteNum));
            _sheet.tokenNumBal = uint32(uint256(_sheet.tokenNumBal).add(biteNum));
            _sheet.remainNum = uint32(uint256(_sheet.remainNum).sub(biteNum));
            priceSheetList[token][index] = _sheet;
        }
        emit TokenSold(address(msg.sender), address(token), index, biteNum.mul(1 ether), biteNum.mul(_sheet.tokenAmountPerEth));
        return; 
    }
    
    /* ========== PRICE QUERIES ========== */

    // Get the latest effective price for a token
    function latestPrice(address token) 
        public 
        view 
        noContract
        returns(uint256 ethNum, uint256 tokenAmount, uint256 bn) 
    {
        PriceSheet[] storage _plist = priceSheetList[token];
        uint256 len = _plist.length;
        PriceSheet memory _sheet;
        if (len == 0) {
            return (0, 0, 0);
        }

        uint256 _first = 0;
        for (uint i = 1; i <= len; i++) {
            _sheet = _plist[len-i];
            if (_first == 0 && _sheet.height + PRICE_DURATION_BLOCK < block.number) {
                _first = uint256(_sheet.height);
                ethNum = uint256(_sheet.remainNum);
                tokenAmount = uint256(_sheet.tokenAmountPerEth).mul(ethNum);
                bn = _first;
            } else if (_first == uint256(_sheet.height)) {
                ethNum = ethNum.add(_sheet.remainNum);
                tokenAmount = tokenAmount.add(uint256(_sheet.tokenAmountPerEth).mul(ethNum));
            } else if (_first > uint256(_sheet.height)) {
                break;
            }
        }
    }

    function price(address token) 
        public 
        view 
        onlyGovOrBy(C_NestQuery)
        returns(uint256 ethAmount, uint256 tokenAmount, uint256 bn) 
    {
        require(C_NestPool.getNTokenFromToken(token) != address(0), "Nest::Mine: !token");
        PriceInfo memory pi = priceInfo[token];
        return (uint256(pi.ethNum).mul(1 ether), pi.tokenAmount, pi.height);
    }

    function priceAvgAndSigmaOfToken(address token) 
        public 
        view 
        returns (int128, int128, int128, uint256) 
    {
        // TODO: no contract allowed
        require(C_NestPool.getNTokenFromToken(token) != address(0), "Nest::Mine: !token");
        PriceInfo memory pi = priceInfo[token];
        // int128 v = 0;
        int128 v = ABDKMath64x64.sqrt(ABDKMath64x64.abs(pi.volatility_sigma_sq));
        int128 p = ABDKMath64x64.divu(uint256(pi.tokenAmount), uint256(pi.ethNum));
        return (p, pi.avgTokenAmount, v, uint256(pi.height));
    }

/*

    function priceOfTokenAtHeight(address token, uint64 atHeight) public view returns(uint256 ethAmount, uint256 tokenAmount, uint64 bn) 
    {
        // TODO: no contract allowed

        PriceSheet[] storage tp = priceSheetList[token];
        uint256 len = priceSheetList[token].length;
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
                if (first <= uint256(atHeight) && first + PRICE_DURATION_BLOCK < block.number) {
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
        PriceSheet[] storage tp = priceSheetList[token];
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
                if (curr + PRICE_DURATION_BLOCK < block.number) {
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
    
    function _mineNest() private returns (uint256) {
        uint256 period = block.number.sub(c_mining_nest_genesis_block_height).div(c_mining_nest_yield_cutback_period);
        uint256 nestPerBlock;
        if (period > 9) {
            nestPerBlock = c_mining_nest_yield_off_period_amount;
        } else {
            nestPerBlock = _mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = nestPerBlock.mul(block.number.sub(latestMiningHeight));
        latestMiningHeight = uint128(block.number); 
        return yieldAmount;
    }

/*
    function yieldAmountAtHeight(uint64 height) public view returns (uint128) {
        console.log("c_mining_nest_genesis_block_height=%s, height=%s", c_mining_nest_genesis_block_height, height);
        uint256 period = uint256(height).sub(c_mining_nest_genesis_block_height).div(c_mining_nest_yield_cutback_period);
        uint256 nestPerBlock;
        if (period > 9) {
            nestPerBlock = c_mining_nest_yield_off_period_amount;
        } else {
            nestPerBlock = _mining_nest_yield_per_block_amount[period];
        }
        uint256 yieldAmount = nestPerBlock.mul(uint256(height).sub(latestMiningHeight));
        return uint128(yieldAmount);
    }
    */

    function latestMinedHeight() external view returns (uint64) {
       return uint64(latestMiningHeight);
    }

    function _mineNToken(address ntoken) private returns (uint256) {
        (uint256 genesis, uint256 last) = INToken(ntoken).checkBlockInfo();

        uint256 period = block.number.sub(genesis).div(c_mining_nest_yield_cutback_period);
        uint256 ntokenPerBlock;
        if (period > 9) {
            ntokenPerBlock = c_mining_ntoken_yield_off_period_amount;
        } else {
            ntokenPerBlock = _mining_ntoken_yield_per_block_amount[period];
        }
        uint256 yieldAmount = ntokenPerBlock.mul(block.number.sub(last));
        INToken(ntoken).increaseTotal(yieldAmount);
        // emit NTokenMining(block.number, yieldAmount, ntoken);
        return yieldAmount;
    }

    /* ========== MINING ========== */


    function withdrawEthAndToken(uint256 ethAmount, address token, uint256 tokenAmount) public noContract
    {
        C_NestPool.withdrawEthAndToken(address(msg.sender), ethAmount, token, tokenAmount); 
    }

    /* ========== MINING ========== */

    function lengthOfPriceSheets(address token) view public 
        returns (uint)
    {
        return priceSheetList[token].length;
    }

    // function contentOfPriceSheet(address token, uint256 index) view public 
    //     returns (uint160 miner, uint64 atHeight, uint128 ethAmount,uint128 tokenAmount, 
    //     uint128 dealEthAmount, uint128 dealTokenAmount, 
    //     uint128 ethFee) 
    // {
    //     uint256 len = priceSheetList[token].length;
    //     require (index < len, "index out of bound");
    //     PriceSheet memory price = priceSheetList[token][index];
    //     uint256 ethFee2 = uint256(price.ethFeeTwei) * 1e12;
    //     return (price.miner, price.atHeight, 
    //         price.ethAmount, price.tokenAmount, price.dealEthAmount, price.dealTokenAmount, 
    //         uint128(ethFee2));
    // }

    // function atHeightOfPriceSheet(address token, uint256 index) view public returns (uint64)
    // {
    //     PriceSheet storage p = priceSheetList[token][index];
    //     return p.height;
    // }

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