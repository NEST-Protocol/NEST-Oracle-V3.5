// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./lib/AddressPayable.sol";
import "./lib/SafeERC20.sol";

import "./iface/IBonusPool.sol";


contract BonusPool is IBonusPool {

    using SafeMath for uint256;
    // using SafeMath for uint128;

    // TEMP: debugging tools
    event Log(string msg);
    event LogUint(string msg, uint256 v);
    event LogAddress(string msg, address a);

    mapping(address => uint256) private _bonus_ledger_eth;
    mapping(address => uint256) private _leveling_ledger_eth;


    // _staking_ledger: nestNtoken => user => amount
    mapping(address => mapping(address => uint256)) private _staking_ledger;

    receive() external payable {
    }

    function getEthAmount(address nestNtoken) override view public returns (uint256)
    {
        return _bonus_ledger_eth[nestNtoken];
    }

    function getBonusEthAmount(address nestNtoken) view public returns (uint256)
    {
        return _bonus_ledger_eth[nestNtoken];
    }

    function getLevelingEthAmount(address nestNtoken) view public returns (uint256)
    {
        return _leveling_ledger_eth[nestNtoken];
    }

    function pumpinEth(address nestNtoken, uint256 amount) override public payable //onlyStakingContract 
    {
        require(msg.value >= amount, "Insufficient ethers");
        _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].add(amount);
    }

    function pickupEth(address payable recevier, address nestNtoken, uint256 amount) override public //onlyStakingContract 
    {
        _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].sub(amount);
        recevier.transfer(amount);
    }

    function lockNToken(address sender, address nestNtoken, uint256 amount) 
        override public // onlyStakingContract 
    {
        require(amount > 0, "Amount must be greater than zero");
        require(ERC20(nestNtoken).transferFrom(sender, address(this), amount), "Authorized transfer failed");  
        _staking_ledger[nestNtoken][sender] = _staking_ledger[nestNtoken][sender].add(amount);
    }

    function unlockNToken(address receiver, address nestNtoken, uint256 amount) 
        override public // onlyStakingContract 
    {
        uint256 blncs = _staking_ledger[nestNtoken][receiver];
        emit LogUint("unlockNToken>blncs", blncs);
        emit LogUint("unlockNToken>amount", amount);
        require(amount <= blncs, "E: insufficient staked balance");
        _staking_ledger[nestNtoken][receiver] = blncs.sub(amount);
        ERC20(nestNtoken).transfer(receiver, amount); 
    }

    function getNTokenAmount(address nestNtoken, address user) 
        override public view returns (uint256 amount) 
    {
        uint256 ntokenAmount = _staking_ledger[nestNtoken][user];
        return ntokenAmount;
    }

    function getNTokenBonusAmount(address nestNtoken) 
        override public view returns (uint256 amount) 
    {
        uint256 ntokenAmount = _bonus_ledger_eth[nestNtoken];
        return ntokenAmount;
    }

    function getLevelingAmount(address nestNtoken) override view public returns (uint256){
        return _leveling_ledger_eth[nestNtoken];
    }

    function moveBonusToLeveling(address nestNtoken, uint256 amount) override public 
    {
        _leveling_ledger_eth[nestNtoken] = _leveling_ledger_eth[nestNtoken].add(amount);
        _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].sub(amount);
    }

    function moveBonusFromLeveling(address nestNtoken, uint256 amount) override public 
    {
        _leveling_ledger_eth[nestNtoken] = _leveling_ledger_eth[nestNtoken].sub(amount);
        _bonus_ledger_eth[nestNtoken] = _bonus_ledger_eth[nestNtoken].add(amount);
    }
} 
