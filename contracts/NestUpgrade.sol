// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";

import "./iface/INestPool.sol";
import "./iface/INestDAO.sol";
import "./iface/INestMining.sol";
import "./iface/INestQuery.sol";
import "./iface/INestStaking.sol";
import "./iface/INNRewardPool.sol";
import "./iface/INTokenController.sol";
//import "hardhat/console.sol";


/*
    Upgrade: 
    1. nest3Admin: Nest_3_MiningContract.takeOutNest(NestPool.address);
    2. nest3Admin: Nest_3_Abonus.turnOutAllEth(amount, nest3Admin);
    3. gov: NestPool.setGovernance(NestUpgrade.address);
    4. gov: NestUpgrade.upgradeAndSetup(...);
    5. nest3Admin: NestDAO.addETHReward(amount);

    10. gov: NestMining.upgrade()
    100: gov: NestDAO.start();
 */

contract NestUpgrade {

    address governance;

    address public C_NestToken;
    address public C_NestPool;
    address public C_NestMining;
    address public C_NestStaking;
    address public C_NNRewardPool;
    address public C_NTokenController;
    address public C_NestQuery;
    address public C_NestDAO;

    uint8       flag;

    modifier onlyGovernance()
    {
        require(msg.sender == governance, "Nest:Upg:!gov");
        _;
    }

    constructor(address NestPool) public 
    {
        governance = msg.sender;
        C_NestPool = NestPool;
        flag = 0;
    }
    
    function shutdown() public onlyGovernance
    {
        flag = 2;
    }

    /// @dev Upgrade from Nest v3.0 to v3.5
    function upgradeAndSetup(
            uint32 genesisBlockNumber, 
            uint128 latestMiningHeight,
            uint128 minedNestTotalAmount,
            INestMining.Params memory params,
            address[] memory tokenL, 
            address[] memory ntokenL) public onlyGovernance
    {
        require(flag < 2, "Nest:Upg:!flag");
        INestPool _C_NestPool = INestPool(C_NestPool);
        C_NestToken = _C_NestPool.addrOfNestToken();

        uint256 nest = ERC20(C_NestToken).balanceOf(address(this));
        _C_NestPool.initNestLedger(nest);

        C_NestMining = _C_NestPool.addrOfNestMining();
        C_NestStaking = _C_NestPool.addrOfNestStaking();
        C_NNRewardPool = _C_NestPool.addrOfNNRewardPool();
        C_NTokenController = _C_NestPool.addrOfNTokenController();
        C_NestQuery = _C_NestPool.addrOfNestQuery();
        C_NestDAO = _C_NestPool.addrOfNestDAO();
        

        INestMining(C_NestMining).loadGovernance();
        INestStaking(C_NestStaking).loadGovernance();
        INNRewardPool(C_NNRewardPool).loadGovernance();
        INTokenController(C_NTokenController).loadGovernance();
        INestQuery(C_NestQuery).loadGovernance();
        INestDAO(C_NestDAO).loadGovernance();

        require(tokenL.length == ntokenL.length, "Nest:Upg:!len");
        for (uint i = 0; i < tokenL.length; i++) {
            _C_NestPool.setNTokenToToken(tokenL[i], ntokenL[i]);
        }

        INestMining(C_NestMining).setup(genesisBlockNumber, latestMiningHeight, minedNestTotalAmount, params);

        _C_NestPool.setGovernance(governance);

        INestMining(C_NestMining).loadGovernance();
        INestStaking(C_NestStaking).loadGovernance();
        INNRewardPool(C_NNRewardPool).loadGovernance();
        INTokenController(C_NTokenController).loadGovernance();
        INestQuery(C_NestQuery).loadGovernance();
        INestDAO(C_NestDAO).loadGovernance();

    }



}