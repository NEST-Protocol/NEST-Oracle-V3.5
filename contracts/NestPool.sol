// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./lib/AddressPayable.sol";
import "./lib/SafeERC20.sol";
import './lib/TransferHelper.sol';
import "./iface/INestPool.sol";

import "hardhat/console.sol";


/// @title NNRewardPool
/// @author Inf Loop - <inf-loop@nestprotocol.org>
/// @author Paradox  - <paradox@nestprotocol.org>

contract NestPool is INestPool {
    
    using address_make_payable for address;
    using SafeMath for uint256;
    // using SafeMath for uint128;
    using SafeERC20 for ERC20;

    event Log(string msg);
    event LogUint(string msg, uint256 v);
    event LogAddress(string msg, address a);

    // the top-most block height where nest tokens were mined
    uint64 _latest_mining_height;

    // eth ledger for all miners, if address == 0, it is the balance of pool
    mapping(address => uint256) _eth_ledger;
    // token => miner => amount 
    mapping(address => mapping(address => uint256)) _token_ledger;

    mapping(address => uint256) _nest_ledger;

    mapping(address => address) _token_ntoken_mapping;

    // parameters 

    address _x_nest_burning_address = address(0x1);

    // Contracts 
    address _C_DAOContract;
    address _C_NestMining;
    ERC20 _C_NestToken;
    // address _C_NNReward;

    constructor(address DAOContract) public {
    // constructor(address DAOContract, address NestMiningContract) {
        _C_DAOContract = DAOContract;
    }

    receive() external payable {
    }

    function setContracts(address NestMiningContract, address NestTokenContract) public {
        _C_NestMining = NestMiningContract;
        _C_NestToken = ERC20(NestTokenContract);
    }

    function getNTokenFromToken(address token) override view public returns (address) {
        return _token_ntoken_mapping[token];
    }

    function setNTokenToToken(address token, address ntoken) override public {
        _token_ntoken_mapping[token] = ntoken;
    }

    function getMinerNToken(address miner, address token) public view returns (uint256 tokenAmount) 
    {
        if (token != address(0x0)) {
            tokenAmount = _token_ledger[token][miner];
        }
    } 
        
    function getMinerEthAndToken(address miner, address token) public view returns (uint256 ethAmount, uint256 tokenAmount) {
        ethAmount = _eth_ledger[miner];
        if (token != address(0x0)) {
            tokenAmount = _token_ledger[token][miner];
        }
    } 

    function getMinerNest(address miner) public view returns (uint256 nestAmount) {
        nestAmount = _nest_ledger[miner];
    } 
    
    function depositEthMiner(address miner, uint256 amount) 
        override public onlyMiningContract 
    {
        require(amount > 0, "deposit amount should >0");
        _eth_ledger[miner] =  _eth_ledger[miner].add(amount);
    }

    function depositEth(address miner) 
        override payable public onlyMiningContract 
    {
        require(msg.value > 0, "deposit amount should >0");
        _eth_ledger[miner] =  _eth_ledger[miner].add(msg.value);
    }

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

    function unfreezeEth(address miner, uint256 ethAmount) override public onlyMiningContract 
    {
        if (ethAmount > 0) {
            // LogUint("unfreezeEthAndToken> _eth_ledger[address(0x0)]", _eth_ledger[address(0x0)]);
            // LogUint("unfreezeEthAndToken> _eth_ledger[miner]", _eth_ledger[miner]);
            // LogUint("unfreezeEthAndToken> ethAmount", ethAmount);
            _eth_ledger[address(this)] =  _eth_ledger[address(this)].sub(ethAmount);
            _eth_ledger[miner] = _eth_ledger[miner].add(ethAmount);
        } 
    }

    function freezeNest(address miner, uint256 nestAmount) override public onlyMiningContract 
    {
        uint256 blncs = _nest_ledger[miner];
        if (blncs < nestAmount) {
            _C_NestToken.transferFrom(miner,  address(this), nestAmount - blncs); //safe math
            _nest_ledger[miner] = 0; 
        } else {
            _nest_ledger[miner] = blncs - nestAmount;  //safe math
        }
        _nest_ledger[address(this)] =  _nest_ledger[address(this)].add(nestAmount);
    }

    function unfreezeNest(address miner, uint256 nestAmount) override public onlyMiningContract 
    {
        if (nestAmount > 0) {
            _nest_ledger[address(this)] =  _nest_ledger[address(this)].sub(nestAmount);
            _nest_ledger[miner] = _nest_ledger[miner].add(nestAmount); 
        }
    }

    function freezeToken(address miner, address token, uint256 tokenAmount) override public onlyMiningContract 
    {
        uint256 blncs = _token_ledger[token][miner];
        if (blncs < tokenAmount) {
            ERC20(token).safeTransferFrom(address(miner),  address(this), tokenAmount - blncs); //safe math
            _token_ledger[token][miner] = 0; 
        } else {
            _token_ledger[token][miner] = blncs - tokenAmount;  //safe math
        }
        _token_ledger[token][address(this)] =  _token_ledger[token][address(this)].add(tokenAmount);

    }

    function unfreezeToken(address miner, address token, uint256 tokenAmount) override public onlyMiningContract 
    {
        if (tokenAmount > 0) {
            _token_ledger[token][address(this)] =  _token_ledger[token][address(this)].sub(tokenAmount);
            _token_ledger[token][miner] = _token_ledger[token][miner].add(tokenAmount); 
        }
    }

    function freezeEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) 
        override public onlyMiningContract 
    {
        // emit LogAddress("freezeEthAndToken> miner", miner);
        // emit LogAddress("freezeEthAndToken> token", token);
        uint256 blncs = _eth_ledger[miner];
        // emit LogUint("freezeEthAndToken> Pool.eth_blncs", blncs);
        require(blncs >= ethAmount, "Insufficient ethers in the pool");
        _eth_ledger[miner] = blncs - ethAmount;  //safe_math: checked before
        _eth_ledger[address(this)] =  _eth_ledger[address(this)].add(ethAmount);

        blncs = _token_ledger[token][miner];
        if (blncs < tokenAmount) {
            // emit LogUint("freezeEthAndToken> pool.token_blncs", blncs);
            // emit LogUint("freezeEthAndToken> tokenAmount", tokenAmount);
            ERC20(token).safeTransferFrom(address(miner),  address(this), tokenAmount - blncs); //safe math
            _token_ledger[token][miner] = 0; 
        } else {
            _token_ledger[token][miner] = blncs - tokenAmount;  //safe math
        }
        _token_ledger[token][address(this)] =  _token_ledger[token][address(this)].add(tokenAmount);

    }

    function unfreezeEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) 
        override public onlyMiningContract 
    {
        if (ethAmount > 0) {
            // LogUint("unfreezeEthAndToken> _eth_ledger[address(0x0)]", _eth_ledger[address(0x0)]);
            // LogUint("unfreezeEthAndToken> _eth_ledger[miner]", _eth_ledger[miner]);
            // LogUint("unfreezeEthAndToken> ethAmount", ethAmount);
            _eth_ledger[address(this)] =  _eth_ledger[address(this)].sub(ethAmount);
            _eth_ledger[miner] = _eth_ledger[miner].add(ethAmount);
        } 

        if (tokenAmount > 0) {
            // LogUint("unfreezeEthAndToken> _token_ledger[token][address(0x0)]", _token_ledger[token][address(0x0)]);
            // LogUint("unfreezeEthAndToken> _token_ledger[token][miner]", _token_ledger[token][miner]);
            // LogUint("unfreezeEthAndToken> tokenAmount", tokenAmount);
            _token_ledger[token][address(this)] =  _token_ledger[token][address(this)].sub(tokenAmount);
            _token_ledger[token][miner] = _token_ledger[token][miner].add(tokenAmount); 
        }
    }


    // function transferEthFromMiningPool(address miner, uint128 ethAmount) 
    //     public onlyMiningContract 
    // {
    //     require(ethAmount > 0, "");
    //     uint128 blncs = uint128(_eth_ledger[address(0x0)]);
    //     require(blncs >= ethAmount, "Insufficient ethers for mining pool");
    //     _eth_ledger[miner] = _eth_ledger[miner].add(ethAmount);  
    //     _eth_ledger[address(0x0)] =  blncs - ethAmount; //safe_math: checked before
    // }
    
    // function transferEthToMiningPool(address miner, uint256 ethAmount) 
    //     public onlyMiningContract 
    // {
    //     require(ethAmount > 0, "");
    //     uint128 blncs = uint128(_eth_ledger[miner]);
    //     require(blncs >= ethAmount, "Insufficient ethers");
    //     _eth_ledger[miner] = blncs - ethAmount;  //safe_math: checked before
    //     _eth_ledger[address(0x0)] =  _eth_ledger[address(0x0)].add(ethAmount);
    // }


    // function transferTokenToMiningPool(address token, address miner, uint256 amount) 
    //     public onlyMiningContract 
    // {
    //     require(amount > 0, "");  
    //     uint256 blncs = _token_ledger[token][miner];
    //     if (blncs < amount) {
    //         ERC20(token).safeTransferFrom(address(msg.sender), address(this), amount.sub(blncs));
    //     }
    //     _token_ledger[token][miner] = blncs - amount; 
    //     _token_ledger[token][address(0x0)] =  _token_ledger[token][address(0x0)].add(amount);
    // }

    // function transferTokenFromMiningPool(address token, address miner, uint256 amount) 
    //     public onlyMiningContract 
    // {
    //     require(amount > 0, "");  
    //     uint256 blncs = _token_ledger[token][address(0x0)];
    //     require(blncs >= amount, "Insufficient tokens for mining pool");
    //     _token_ledger[token][miner] = _token_ledger[token][miner].add(amount); 
    //     _token_ledger[token][address(0x0)] =  blncs.sub(amount);
    // }

    function balanceOfNestInPool(address miner) 
        override public view returns (uint256)
    {
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

    function transferNestInPool(address from, address to, uint256 amount) 
        override public 
        //onlyMiningContract 
    {
        require (amount > 0, "Amount should be > 0");
        uint256 blnc = _nest_ledger[from];
        require (blnc >= amount, "Insufficient nest");
        _nest_ledger[from] = blnc.sub(amount);
        _nest_ledger[to] = _nest_ledger[to].add(amount);
    }

    function addNest(address miner, uint256 amount) 
        override public // onlyMiningContract 
    {
        require (amount > 0, "Nest:Pool:(amount)=0");
        _nest_ledger[miner] = _nest_ledger[miner].add(amount);
    }

    function addNToken(address miner, address ntoken, uint256 amount) 
        override public onlyMiningContract 
    {
        require (amount > 0, "Reward amount should be greater than zero");
        _token_ledger[ntoken][miner] = _token_ledger[ntoken][miner].add(amount);
    }

    function distributeRewards(address contributor) override public // onlyNNRewardPoolAndNestMining
        returns (uint256)
    {
        uint256 amount = _nest_ledger[contributor];
        if (amount > 0) {
            _C_NestToken.transfer(contributor, amount);
            _nest_ledger[contributor]=0;
            return amount;
        }
        return 0;
    }

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


    function withdrawEth(address miner, uint256 ethAmount) 
        override public onlyMiningContract
    {
        require(ethAmount > 0, "Nest:Pool:=0(ethAmount)");
        uint256 blncs = _eth_ledger[miner];
        require(ethAmount <= blncs, "Nest:Pool:(ethAmount)<BAL");
        _eth_ledger[miner] = blncs - ethAmount; // safe math
        TransferHelper.safeTransferETH(miner, ethAmount);
    }

    function withdrawToken(address miner, address token, uint256 tokenAmount) 
        override public onlyMiningContract
    {
        require(tokenAmount > 0, "Nest:Pool:=0(tokenAmount)");
        uint256 blncs = _eth_ledger[miner];
        require(tokenAmount <= blncs, "Nest:Pool:(tokenAmount)<BAL");
        _token_ledger[token][miner] = blncs - tokenAmount; // safe math
        ERC20(token).safeTransfer(miner, tokenAmount);
    }

    function withdrawEthAndToken(address miner, uint256 ethAmount, address token, uint256 tokenAmount) 
        override public onlyMiningContract
    {
        uint256 blncs = _eth_ledger[miner];
        LogAddress("withdrawEthAndToken> miner", miner);
        LogUint("withdrawEthAndToken> Pool.eth_balance", blncs);
        if (ethAmount <= blncs) {
            _eth_ledger[miner] = blncs - ethAmount;
            LogUint("withdrawEthAndToken> this.balance", address(this).balance);
            TransferHelper.safeTransferETH(miner, ethAmount);
        }

        blncs = _token_ledger[token][miner];
        emit LogAddress("withdrawNToken> miner", miner);
        emit LogUint("withdrawNToken> Pool.token_balance", blncs);
        if (tokenAmount <= blncs) {
            _token_ledger[token][miner] = blncs - tokenAmount;
            ERC20(token).safeTransfer(miner, tokenAmount);
        }
    }

    function withdrawNToken(address miner, address ntoken, uint256 amount) 
        override public onlyMiningContract
    {
        require(amount > 0, "Nest:Pool:=0(ntokenAmount)");
        uint256 blncs = _token_ledger[ntoken][miner];
        require(amount <= blncs, "Nest:Pool:(ntokenAmount)<BAL");
        ERC20(ntoken).transfer(miner, amount);
        _token_ledger[ntoken][miner]=0;
    }

    function withdrawNest(address miner, uint256 amount) 
        override public 
    {
        require(amount > 0, "Nest:Pool:=0(nestAmount)");
        uint256 blncs = _nest_ledger[miner];
        require(amount <= blncs, "Nest:Pool:(nestAmount)<BAL");
        _nest_ledger[miner] = blncs - amount;  // safe math
        _C_NestToken.transfer(miner, amount);
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

    function withdrawToken(address token, address miner) 
        public onlyMiningContract returns (uint128)
    {
        uint128 blncs = uint128(_token_ledger[token][miner]);
        if (blncs > 0) {
            ERC20(token).safeTransfer(miner, uint256(blncs));
            _token_ledger[token][miner] = 0;
        }
        return blncs;
    }

    function addressOfBurnedNest() override public view returns (address) {
        return _x_nest_burning_address;
    }
    //event OreDrawingLog(uint256 nowBlock, uint256 blockAmount);
    
    /*
    * @dev 初始化方法
    * @param voteFactory 投票合约地址
    */
    // constructor(address voteFactory) public {
    //     _voteFactory = Nest_3_VoteFactory(address(voteFactory));                  
    //     _offerFactoryAddress = address(_voteFactory.checkAddress("nest.v3.offerMain"));
    //     _nestContract = ERC20(address(_voteFactory.checkAddress("nest")));
    //     // 初始化挖矿参数
    //     _firstBlockNum = 6236588;
    //     _latestMining = block.number;
    //     uint256 blockAmount = 400 ether;
    //     for (uint256 i = 0; i < 10; i ++) {
    //         _attenuationAmount[i] = blockAmount;
    //         blockAmount = blockAmount.mul(8).div(10);
    //     }
    // }
    
    // /**
    // * @dev 重置投票合约
    // * @param voteFactory 投票合约地址
    // */
    // function changeMapping(address voteFactory) public onlyOwner {
    //     _voteFactory = Nest_3_VoteFactory(address(voteFactory));                  
    //     _offerFactoryAddress = address(_voteFactory.checkAddress("nest.v3.offerMain"));
    //     _nestContract = ERC20(address(_voteFactory.checkAddress("nest")));
    // }

    modifier onlyMiningContract()
    {
        require(address(msg.sender) == _C_NestMining, "No authority");
        _;
    }
}
