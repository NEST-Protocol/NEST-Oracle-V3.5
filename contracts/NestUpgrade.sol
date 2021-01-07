// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "./lib/SafeMath.sol";

import "./iface/INestPool.sol";
import "./iface/INestDAO.sol";
import "./iface/INestMining.sol";
import "./iface/INestQuery.sol";
import "./iface/INestStaking.sol";
import "./iface/INNRewardPool.sol";
import "./iface/INTokenController.sol";

import "./iface/INest_3_Abonus.sol";
import "./iface/INest_3_Leveling.sol";
import "./iface/INest_3_MiningContract.sol";
import "./iface/INest_NToken_TokenAuction.sol";
import "./iface/INest_NToken_TokenMapping.sol";

//import "hardhat/console.sol";

/*
    Upgrade: setNTokenToToken() ==> NestMining.post2Only4Upgrade() ==> transferFundsFromNest3()
    
    1. nest3Admin: Set nest3Admin address to NestUpgrade.address
    2. nest3.5: gov: NestPool.setGovernance(NestUpgrade.address)

    3. then run setNTokenToToken() func: (at this time, openning new token-ntoken should not be allowed)
    
    nest3: Nest_NToken_TokenAuction.checkTokenMapping(token) ==> (token , ntoken), excluding usdt / nest
    nest3.5: NestPool.setNTokenToToken(token, ntoken)
    nest3.5: MestMining.setup(...)

    4. NestMining.post2Only4Upgrade(...)

    5. nest3.5: NestPool.setGovernance(NestUpgrade.address)

    6. run transferFundsFromNest3 func:(transfer funds)

    nest3.5: NestMining.setParams1(latestHeight, minedNestAmount)
    nest3: Nest_3_MiningContract.takeOutNest(NestPool.address)
    nest3.5: NestPool.initNestLedger(amount)
    transfer funds from Nest_3_Abonus and Nest_3_Leveling to NeatDAO
    
    nest3.5: NestMining.upgrade()
    nest3.5: NestDAO.start()
*/

contract NestUpgrade {

    using SafeMath for uint256;

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

    uint256 constant total_nest = 10_000_000_000;  // total nest == 10 billion

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
    /// @dev setNtokenToToken(token, ntoken), excluding usdt / nest
    /// open new ntoken in nest3 should not be allowed.
    function setNTokenToToken(
            address Nest_3_MiningContract,
            address Nest_NToken_TokenMapping, 
            address Nest_NToken_TokenAuction, 
            INestMining.Params memory params,
            address[] memory tokenL) public onlyGovernance
    {
        uint32 genesisBlockNumber = 6236588;
        uint256 latestMiningHeight;
        uint256 nestBalance;
        uint256 minedNestTotalAmount;
        uint256 ntoken_num;
        address[] memory ntokenL;

        latestMiningHeight = INest_3_MiningContract(Nest_3_MiningContract).checkLatestMining();
        
        nestBalance = INest_3_MiningContract(Nest_3_MiningContract).checkNestBalance();
       
        minedNestTotalAmount = uint256(total_nest).mul(1e18).sub(nestBalance);

        ntoken_num = INest_NToken_TokenAuction(Nest_NToken_TokenAuction).checkTokenNum();

        require(ntoken_num == tokenL.length + 1, "Token:Upg: !sufficient");
        
        for(uint i=0; i<tokenL.length; i++){
            ntokenL[i] = INest_NToken_TokenMapping(Nest_NToken_TokenMapping).checkTokenMapping(tokenL[i]);

            require(ntokenL[i] != address(0), "Ntoken:Upg: err");
        }

        require(tokenL.length == ntokenL.length, "Ntoken:Upg:!len");
        
        _upgradeAndSetup(
            genesisBlockNumber, 
            uint128(latestMiningHeight),
            uint128(minedNestTotalAmount),
            params,
            tokenL, 
            ntokenL);

        return;

    }


    function _upgradeAndSetup(
            uint32 genesisBlockNumber, 
            uint128 latestMiningHeight,
            uint128 minedNestTotalAmount,
            INestMining.Params memory params,
            address[] memory tokenL, 
            address[] memory ntokenL) internal 
    {
        
        require(flag < 2, "Nest:Upg:!flag");
        INestPool _C_NestPool = INestPool(C_NestPool);
        C_NestToken = _C_NestPool.addrOfNestToken();
        C_NestMining = _C_NestPool.addrOfNestMining();
      
        INestMining(C_NestMining).loadGovernance();
      
        for (uint i = 0; i < tokenL.length; i++) {
            require(ntokenL[i] != C_NestToken, "Ntoken:Upg: !nest");
            _C_NestPool.setNTokenToToken(tokenL[i], ntokenL[i]);
            //IOldNtoken(ntokenL[i]).setOfferMain(C_NestMining);
        }

        INestMining(C_NestMining).setup(genesisBlockNumber, latestMiningHeight, minedNestTotalAmount, params);

        _C_NestPool.setGovernance(governance);

        INestMining(C_NestMining).loadGovernance();
        
        return;
    }


    /// @dev transfer funds from nest3 to nest3.5
    /// @param Nest_3_MiningContract: address of Nest_3_MiningContract
    /// @param Nest_NToken_TokenAuction: address of Nest_NToken_TokenAuction
    /// @param Nest_NToken_TokenMapping: address of Nest_NToken_TokenMapping
    /// @param Nest_3_Abonus: address of Nest_NToken_TokenMapping
    /// @param Nest_3_Leveling: address of Nest_NToken_TokenMapping
    /// @param tokenL: lists of tokens addresses, usdt included
    function transferFundsFromNest3(
            address Nest_3_MiningContract,
            address Nest_NToken_TokenAuction,
            address Nest_NToken_TokenMapping,
            address Nest_3_Abonus,
            address Nest_3_Leveling,
            address[] memory tokenL
            ) public onlyGovernance
    {

        address[] memory ntokenL;
        uint256 ntoken_num;

        require(flag < 2, "Nest:Upg:!flag");
        INestPool _C_NestPool = INestPool(C_NestPool);
        C_NestToken = _C_NestPool.addrOfNestToken();

        C_NestMining = _C_NestPool.addrOfNestMining();
        C_NestDAO = _C_NestPool.addrOfNestDAO();
        

        INestMining(C_NestMining).loadGovernance();
        INestDAO(C_NestDAO).loadGovernance();
        
        /// @dev set latestMiningHeight and minedNestTotalAmount
        uint256 latestHeight;
        uint256 nestBal;
        uint256 minedNestAmount;
        latestHeight = INest_3_MiningContract(Nest_3_MiningContract).checkLatestMining();
        
        nestBal = INest_3_MiningContract(Nest_3_MiningContract).checkNestBalance();
       
        minedNestAmount = uint256(total_nest).mul(1e18).sub(nestBal);

        require(latestHeight > 0, "LatestHeight:Upg: err");

        INestMining(C_NestMining).setParams1(uint128(latestHeight), uint128(minedNestAmount));


        /// @dev send nest to nestpool.addr
        INest_3_MiningContract(Nest_3_MiningContract).takeOutNest(C_NestPool);
        uint256 nest = ERC20(C_NestToken).balanceOf(C_NestPool);
        _C_NestPool.initNestLedger(nest);


        /// @dev send funds to nestDAO
        ntoken_num = INest_NToken_TokenAuction(Nest_NToken_TokenAuction).checkTokenNum();

        require(ntoken_num == tokenL.length, "Token:Upg: !sufficient");
        
        for(uint i=0; i<tokenL.length; i++){
            ntokenL[i] = INest_NToken_TokenMapping(Nest_NToken_TokenMapping).checkTokenMapping(tokenL[i]);

            require(ntokenL[i] != address(0), "Ntoken:Upg: err");
        }

        require(tokenL.length == ntokenL.length, "Ntoken:Upg:!len");

        for(uint i=0; i < ntokenL.length; i++){

            uint256 amount = 0;
            uint256 amount_bonus = 0;
            uint256 amount_leveling = 0;

            amount_bonus = INest_3_Abonus(Nest_3_Abonus).getETHNum(ntokenL[i]);

            if(amount_bonus > 0){
            INest_3_Abonus(Nest_3_Abonus).turnOutAllEth(amount_bonus, C_NestDAO);
            }

            amount_leveling = INest_3_Leveling(Nest_3_Leveling).checkEthMapping(ntokenL[i]);

            if(amount_leveling > 0){
            INest_3_Leveling(Nest_3_Leveling).turnOutAllEth(amount_leveling, C_NestDAO);    
            }

            amount = amount_bonus.add(amount_leveling);

            if(amount > 0){
            INestDAO(C_NestDAO).initEthLedger(ntokenL[i], amount);
            }
        }

        /// @dev start nest3.5
        /// new ntoken not turned on at this time, set ntokenCounter by C_NTokenController.start(...)
        INestMining(C_NestMining).upgrade();
        INestDAO(C_NestDAO).start();

        _C_NestPool.setGovernance(governance);

        INestMining(C_NestMining).loadGovernance();
        INestDAO(C_NestDAO).loadGovernance();

        return;
    }


    /// @dev if deploy failed, release gov of nest 3.0
    function releaseAdminOfNest30(address OldAdmin) public onlyGovernance
    {
        // 需要接口
    }

}