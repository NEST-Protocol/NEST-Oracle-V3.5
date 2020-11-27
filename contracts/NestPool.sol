// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./lib/AddressPayable.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./iface/INestPool.sol";

//import "hardhat/console.sol";


/// @title NNRewardPool
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>

/// @dev The contract is for bookkeeping ETH, NEST and Tokens. It is served as a vault, such that 
///     assets are transferred internally to save GAS.
contract NestPool is INestPool {
    
    using address_make_payable for address;
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    address public governance;

    // eth ledger for all miners, if address == 0, it is the balance of pool
    mapping(address => uint256) _eth_ledger;
    // token => miner => amount 
    mapping(address => mapping(address => uint256)) _token_ledger;

    // mapping(address => uint256) _nest_ledger;

    mapping(address => address) _token_ntoken_mapping;

    // parameters 

    address private _x_nest_burning_address = address(0x1);

    // Contracts 
    address C_DAO;
    address C_NestMining;
    ERC20   C_NestToken;
    address C_NTokenController;
    address C_NNRewardPool;
    // address _C_NNReward;

    constructor() public 
    {
        governance = msg.sender;
    }

    receive() external payable { }

    /* ========== MODIFIERS ========== */

    modifier onlyGovernance() 
    {
        require(msg.sender == governance, "Nest:NTC:!governance");
        _;
    }

    modifier onlyGovOrBy(address _contract) 
    {
        require(msg.sender == governance || msg.sender == _contract, "Nest:Mine:!sender");
        _;
    }

    modifier onlyGovOrBy2(address _contract, address _contract2) 
    {
        require(msg.sender == governance || msg.sender == _contract || msg.sender == _contract2, "Nest:Mine:!sender");
        _;
    }

    modifier onlyMiningContract()
    {
        require(address(msg.sender) == C_NestMining, "Nest:Mine:onlyMining");
        _;
    }

    /* ========== ONLY FOR EMERGENCY ========== */

    function drainEth(address to, uint256 amount) 
        external onlyGovernance
    {
        TransferHelper.safeTransferETH(to, amount);
    }

    function drainNest(address to, uint256 amount) 
        external onlyGovernance
    {
        require(C_NestToken.transfer(to, amount),"transfer fail!");
    }

    function drainToken(address token, address to, uint256 amount) 
        external onlyGovernance
    {
        ERC20(token).safeTransfer(to, amount);
    }

    function transferNestInPool(address from, address to, uint256 amount) 
        external onlyGovernance
    {
        mapping(address => uint256) storage _nest_ledger = _token_ledger[address(C_NestToken)];
        uint256 blnc = _nest_ledger[from];
        require (amount > 0 && blnc >= amount, "Nest:Pool:!amount");
        _nest_ledger[from] = blnc.sub(amount);
        _nest_ledger[to] = _nest_ledger[to].add(amount);
    }

    function transferTokenInPool(address token, address from, address to, uint256 amount) 
        external onlyGovernance
    {
        uint256 blnc = _token_ledger[token][from];
        require (amount > 0 && blnc >= amount, "Nest:Pool:!amount");
        _token_ledger[token][from] = blnc.sub(amount);
        _token_ledger[token][to] = _token_ledger[token][to].add(amount);
    }
/*
    function transferEthInPool(address token, address from, address to, uint256 amount) 
        external onlyGovernance
    {
        uint256 blnc = _eth_ledger[from];
        require (amount > 0 && blnc >= amount, "Nest:Pool:!amount");
        _eth_ledger[from] = blnc.sub(amount);
        _eth_ledger[to] = _eth_ledger[to].add(amount);
    }
*/
    /* ========== GOVERNANCE ========== */


    function setGovernance(address _gov) external onlyGovernance 
    { 
        governance = _gov;
    }

    function setContracts(address NestMining, address NestToken, address NTokenController, address NNRewardPool) 
        external onlyGovernance
    {
        if (NestToken != address(0)) {
            C_NestToken = ERC20(NestToken);
        }
        if (NestMining != address(0)) {
            C_NestMining = NestMining;
        }
        if (NTokenController != address(0)) {
            C_NTokenController = NTokenController;
        }
        if (NNRewardPool != address(0)) {
            C_NNRewardPool = NNRewardPool;
        }
    }

    function setDAO(address DAO) external onlyGovernance
    {
        if (DAO != address(0)) {
            C_DAO = DAO;
        }
    }


    function getNTokenFromToken(address token) override view public returns (address) {
        return _token_ntoken_mapping[token];
    }

    function setNTokenToToken(address token, address ntoken) 
        override 
        public
        onlyGovOrBy(C_NTokenController) 
    {
        _token_ntoken_mapping[token] = ntoken;
    }    

    /* ========== FREEZING/UNFREEZING ========== */

    // NOTE: Guarded by onlyMiningContract

    function freezeEth(address miner, uint256 ethAmount) 
        override public onlyMiningContract 
    {
        // emit LogAddress("freezeEthAndToken> miner", miner);
        // emit LogAddress("freezeEthAndToken> token", token);
        uint256 blncs = _eth_ledger[miner];
        require(blncs >= ethAmount, "Nest:Pool:BAL(eth)<0");
        _eth_ledger[miner] = blncs - ethAmount;  //safe_math: checked before
        _eth_ledger[address(this)] =  _eth_ledger[address(this)].add(ethAmount);
    }

    function unfreezeEth(address miner, uint256 ethAmount) 
        override public onlyMiningContract 
    {
        if (ethAmount > 0) {
            // LogUint("unfreezeEthAndToken> _eth_ledger[address(0x0)]", _eth_ledger[address(0x0)]);
            // LogUint("unfreezeEthAndToken> _eth_ledger[miner]", _eth_ledger[miner]);
            // LogUint("unfreezeEthAndToken> ethAmount", ethAmount);
            _eth_ledger[address(this)] =  _eth_ledger[address(this)].sub(ethAmount);
            _eth_ledger[miner] = _eth_ledger[miner].add(ethAmount);
        } 
    }

    function freezeNest(address miner, uint256 nestAmount) 
        override public onlyMiningContract 
    {
        mapping(address => uint256) storage _nest_ledger = _token_ledger[address(C_NestToken)];

        uint256 blncs = _nest_ledger[miner];
        
        _nest_ledger[address(this)] =  _nest_ledger[address(this)].add(nestAmount);

        if (blncs < nestAmount) {
            _nest_ledger[miner] = 0; 
            require(C_NestToken.transferFrom(miner,  address(this), nestAmount - blncs), "transferFrom fail!"); //safe math
            //_nest_ledger[miner] = 0; 
        } else {
            _nest_ledger[miner] = blncs - nestAmount;  //safe math
        }
        //_nest_ledger[address(this)] =  _nest_ledger[address(this)].add(nestAmount);
    }

    function unfreezeNest(address miner, uint256 nestAmount) 
        override public onlyMiningContract 
    {
        mapping(address => uint256) storage _nest_ledger = _token_ledger[address(C_NestToken)];

        if (nestAmount > 0) {
            _nest_ledger[address(this)] =  _nest_ledger[address(this)].sub(nestAmount);
            _nest_ledger[miner] = _nest_ledger[miner].add(nestAmount); 
        }
    }

    function freezeToken(address miner, address token, uint256 tokenAmount) 
        override external onlyMiningContract 
    {
        uint256 blncs = _token_ledger[token][miner];
        _token_ledger[token][address(this)] =  _token_ledger[token][address(this)].add(tokenAmount);
        if (blncs < tokenAmount) {
            _token_ledger[token][miner] = 0; 
            ERC20(token).safeTransferFrom(address(miner),  address(this), tokenAmount - blncs); //safe math
            //_token_ledger[token][miner] = 0; 
        } else {
            _token_ledger[token][miner] = blncs - tokenAmount;  //safe math
        }
        //_token_ledger[token][address(this)] =  _token_ledger[token][address(this)].add(tokenAmount);

    }

    function unfreezeToken(address miner, address token, uint256 tokenAmount) 
        override external onlyMiningContract 
    {
        if (tokenAmount > 0) {
            _token_ledger[token][address(this)] =  _token_ledger[token][address(this)].sub(tokenAmount);
            _token_ledger[token][miner] = _token_ledger[token][miner].add(tokenAmount); 
        }
    }

    function freezeEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) 
        override external onlyMiningContract 
    {
        uint256 blncs = _eth_ledger[miner];
        require(blncs >= ethAmount, "Insufficient ethers in the pool");
        _eth_ledger[miner] = blncs - ethAmount;  //safe_math: checked before
        _eth_ledger[address(this)] =  _eth_ledger[address(this)].add(ethAmount);

        blncs = _token_ledger[token][miner];
        _token_ledger[token][address(this)] =  _token_ledger[token][address(this)].add(tokenAmount);
        if (blncs < tokenAmount) {
            _token_ledger[token][miner] = 0;
            ERC20(token).safeTransferFrom(address(miner),  address(this), tokenAmount - blncs); //safe math
            //_token_ledger[token][miner] = 0; 
        } else {
            _token_ledger[token][miner] = blncs - tokenAmount;  //safe math
        }
        //_token_ledger[token][address(this)] =  _token_ledger[token][address(this)].add(tokenAmount);

    }

    function unfreezeEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) 
        override external onlyMiningContract 
    {
        if (ethAmount > 0) {
            _eth_ledger[address(this)] =  _eth_ledger[address(this)].sub(ethAmount);
            _eth_ledger[miner] = _eth_ledger[miner].add(ethAmount);
        } 

        if (tokenAmount > 0) {
            _token_ledger[token][address(this)] =  _token_ledger[token][address(this)].sub(tokenAmount);
            _token_ledger[token][miner] = _token_ledger[token][miner].add(tokenAmount); 
        }
    }

    /* ========== BALANCE ========== */


    function balanceOfNestInPool(address miner) 
        override public view returns (uint256)
    {
        mapping(address => uint256) storage _nest_ledger = _token_ledger[address(C_NestToken)];

        return _nest_ledger[miner];
    }

    function balanceOfEthInPool(address miner) 
        public view returns (uint256)
    {
        return _eth_ledger[miner];
    }

    function balanceOfTokenInPool(address miner, address token) 
        public view returns (uint256)
    {
        return _token_ledger[token][miner];
    }

    function balanceOfEthFreezed() public view returns (uint256)
    {
        return _eth_ledger[address(0x0)];
    }

    function balanceOfTokenFreezed(address token) public view returns (uint256)
    {
        return _token_ledger[token][address(0x0)];
    }


    function addNest(address miner, uint256 amount) 
        override public // onlyMiningContract 
    {
        mapping(address => uint256) storage _nest_ledger = _token_ledger[address(C_NestToken)];

        require (amount > 0, "Nest:Pool:(amount)=0");
        _nest_ledger[miner] = _nest_ledger[miner].add(amount);
    }

    function addNToken(address miner, address ntoken, uint256 amount) 
        override public onlyMiningContract 
    {
        require (amount > 0, "Reward amount should be greater than zero");
        _token_ledger[ntoken][miner] = _token_ledger[ntoken][miner].add(amount);
    }

    // function distributeRewards(address contributor) override public // onlyNNRewardPoolAndNestMining
    //     returns (uint256)
    // {
    //     uint256 amount = _nest_ledger[contributor];
    //     if (amount > 0) {
    //         _C_NestToken.transfer(contributor, amount);
    //         _nest_ledger[contributor]=0;
    //         return amount;
    //     }
    //     return 0;
    // }

    // function distributeNNRewards(address contributor) override public // onlyNNRewardPoolAndNestMining
    //     returns (uint256)
    // {
    //     uint256 amount = _nest_ledger[contributor];
    //     if (amount > 0) {
    //         _C_NestToken.transfer(contributor, amount);
    //         _nest_ledger[contributor]=0;
    //         return amount;
    //     }
    //     return 0;
    // }

    /* ========== DEPOSIT ========== */

    // NOTE: Guarded by onlyMiningContract

    // function depositEthMiner(address miner, uint256 amount) 
    //     override public onlyMiningContract 
    // {
    //     require(amount > 0, "deposit amount should >0");
    //     _eth_ledger[miner] =  _eth_ledger[miner].add(amount);
    // }

    function depositEth(address miner) 
        override payable public onlyMiningContract 
    {
        require(msg.value > 0, "deposit amount should >0");
        _eth_ledger[miner] =  _eth_ledger[miner].add(msg.value);
    }

    /* ========== WITHDRAW ========== */

    // NOTE: Guarded by onlyGovOrBy(C_NestMining)

    function withdrawEth(address miner, uint256 ethAmount) 
        override public onlyGovOrBy(C_NestMining)
    {
        require(ethAmount > 0, "Nest:Pool:=0(ethAmount)");
        uint256 blncs = _eth_ledger[miner];
        require(ethAmount <= blncs, "Nest:Pool:(ethAmount)<BAL");
        _eth_ledger[miner] = blncs - ethAmount; // safe math
        TransferHelper.safeTransferETH(miner, ethAmount);
    }

    function withdrawToken(address miner, address token, uint256 tokenAmount) 
        override public onlyGovOrBy(C_NestMining)
    {
        require(tokenAmount > 0, "Nest:Pool:=0(tokenAmount)");
        uint256 blncs = _eth_ledger[miner];
        require(tokenAmount <= blncs, "Nest:Pool:(tokenAmount)<BAL");
        _token_ledger[token][miner] = blncs - tokenAmount; // safe math
        ERC20(token).safeTransfer(miner, tokenAmount);
    }

    function withdrawEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) 
        override public onlyGovOrBy(C_NestMining)
    {
        uint256 blncs = _eth_ledger[miner];
        if (ethAmount <= blncs) {
            _eth_ledger[miner] = blncs - ethAmount;  // safe math
            TransferHelper.safeTransferETH(miner, ethAmount);
        }

        blncs = _token_ledger[token][miner];
        if (tokenAmount <= blncs) {
            _token_ledger[token][miner] = blncs - tokenAmount;  // safe math
            ERC20(token).safeTransfer(miner, tokenAmount);
        }
    }

    function withdrawNToken(address miner, address ntoken, uint256 amount) 
        override public onlyGovOrBy(C_NestMining)
    {
        require(amount > 0, "Nest:Pool:=0(ntokenAmount)");
        uint256 blncs = _token_ledger[ntoken][miner];
        require(amount <= blncs, "Nest:Pool:(ntokenAmount)<BAL");
        _token_ledger[ntoken][miner]=0;
        require(ERC20(ntoken).transfer(miner, amount), "transfer fail!");
        //_token_ledger[ntoken][miner]=0;
    }

    function withdrawNest(address miner, uint256 amount) 
        override public onlyGovOrBy2(C_NestMining, C_NNRewardPool)
    {
        mapping(address => uint256) storage _nest_ledger = _token_ledger[address(C_NestToken)];

        require(amount > 0, "Nest:Pool:=0(nestAmount)");
        uint256 blncs = _nest_ledger[miner];
        require(amount <= blncs, "Nest:Pool:(nestAmount)<BAL");
        _nest_ledger[miner] = blncs - amount;  // safe math
        require(C_NestToken.transfer(miner, amount),"transfer fail!");
    }

    // function clearNest(address miner) public //onlyMiningOrNNRewardContract 
    // {
    //     uint128 amount = uint128(_nest_ledger[miner]);
    //     require(amount > 0, "");
    //     if (miner = _NN_address) {
    //         _C_NNReward.addNNReward(amount);
    //     } else {
    //         ERC20(_C_NestToken).transfer(miner, uint256(amount));
    //     }
    // }

    // function withdrawToken(address token, address miner) 
    //     public onlyMiningContract returns (uint128)
    // {
    //     uint128 blncs = uint128(_token_ledger[token][miner]);
    //     if (blncs > 0) {
    //         ERC20(token).safeTransfer(miner, uint256(blncs));
    //         _token_ledger[token][miner] = 0;
    //     }
    //     return blncs;
    // }


    /* ========== HELPERS ========== */


    function addressOfBurnedNest() override public view returns (address) 
    {
        return _x_nest_burning_address;
    }

    // function getMinerNToken(address miner, address token) public view returns (uint256 tokenAmount) 
    // {
    //     if (token != address(0x0)) {
    //         tokenAmount = _token_ledger[token][miner];
    //     }
    // } 
        
    function getMinerEthAndToken(address miner, address token) 
        public view returns (uint256 ethAmount, uint256 tokenAmount) 
    {
        ethAmount = _eth_ledger[miner];
        if (token != address(0x0)) {
            tokenAmount = _token_ledger[token][miner];
        }
    } 

    function getMinerNest(address miner) public view returns (uint256 nestAmount) 
    {

        mapping(address => uint256) storage _nest_ledger = _token_ledger[address(C_NestToken)];

        nestAmount = _nest_ledger[miner];
    } 

}
