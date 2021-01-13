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

// import "hardhat/console.sol";

/*
    steps:

    Attention: no new quote pairs are allowed when executing upgrade contracts !!!
    
    //==================== set params ====================//
   
    1. nest3Admin: Set nest3Admin address to NestUpgrade.address

    2. nest3.5: gov: NestPool.setGovernance(NestUpgrade.address)

    3. nest3.5: NestUpgrade.setPairsOfTokens(..., tokanL), can be run multiple times, all token-ntoken settings must be completed before proceeding to the next step, usdt-nest included. tokenL[i] != usdt.addr

    4. nest3.5: NestUpgrade.SetupParamsOfNestMining(...), this function can only be executed once
    
    5. nest3.5: NestMining.post2Only4Upgrade(...)

    //========================================================//
    
    
    Attenion: nest 3 stops running when funds are transferred !!!!
    //===================== transfer funds ===================//
    
    6. nest3.5: gov: NestPool.setGovernance(NestUpgrade.address)
    
    7. nest3.5: NestUpgrade.transferNestFromNest3(), transfer nest to nestpool
       if failed: all right, no funds are transferred to the new contract at this time;
       if succeeded: next step;

    8. nest3.5: gov: NestPool.setGovernance(NestUpgrade.address)

    9. nest3.5: NestUpgrade.transferETHFromNest3(...), transfer eth to address(this), 
       can be run multiple times, all tokens should be applyed once, usdt included 
       if falied: can run NestUpgrade.transferNestInUrgent()
       if succeeded: next step

    10. nest3.5: NestUpgrade.transferETHToNestDAO(...), transfer eth to NestDAO.addr, 
        if failed: can run NestUpgrade.transferETH()
        if succeeded: next step

    11. nest3.5: NestUpgrade.initNest35(), NestMining.upgrade() / NestDAO.start()
        if failed: NestDAO.migrateTo(...), transfer eth to new DAO
        if succeeded: end
*/

contract NestUpgrade {

    using SafeMath for uint256;

    address public governance;

    address public C_NestToken;
    address public C_NestPool;
    address public C_NestMining;
    address public C_NestDAO;

    uint8 public flag;

    uint256 public latestHeight;
    uint256 public nestBal;
    uint256 public minedNestAmount;
    uint256 public nest;
    uint256 public tokenNum;         /// Nest_NToken_TokenAuction.checkTokenNum()

    uint256 public ntoken_num1 = 0;  /// record how many pairs of tokens have been set
                                     /// finnally,the value should equal to  
                                     /// Nest_NToken_TokenAuction.checkTokenNum()

    uint256 public ntoken_num2 = 0;  /// record the number of tokens for which funds have been transferred

    uint256 constant total_nest = 10_000_000_000;  // total nest == 10 billion

    mapping(address => address) _token_ntoken_mapping;

    receive() external payable {}

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

    function resume() public onlyGovernance
    {
        flag = 0;
    }

    /// @dev Upgrade from Nest v3.0 to v3.5
    /// @dev setNtokenToToken(token, ntoken)
    /// @notice If the number of ntokens is too large 
    /// @notice and gas consumption exceeds the limit,
    /// @notice you can execute setPairsOfTokens() multiple times.
    /// @notice open new ntoken in nest3 should not be allowed.
    function setPairsOfTokens(
            address UsdtToken,
            address Nest_NToken_TokenMapping, 
            address[] memory tokenL) public onlyGovernance
    {
        address[] memory ntokenL = new address[](tokenL.length);

        require(flag < 2, "Nest:Upg:!flag");
        require(tokenL.length == ntokenL.length, "Ntoken:Upg:!len");

        for(uint i=0; i<tokenL.length; i++)
        {
            require(tokenL[i] != UsdtToken, "Token:Upg: !USDT");
            ntokenL[i] = INest_NToken_TokenMapping(Nest_NToken_TokenMapping).checkTokenMapping(tokenL[i]);
            require(ntokenL[i] != address(0), "Ntoken:Upg: err");
        }

        INestPool _C_NestPool = INestPool(C_NestPool);
        C_NestToken = _C_NestPool.addrOfNestToken();

        if(_C_NestPool.getNTokenFromToken(UsdtToken) == address(0))
        {
            _C_NestPool.setNTokenToToken(UsdtToken, C_NestToken);
            ntoken_num1 += 1; 
        }

        for (uint i = 0; i < tokenL.length; i++) 
        {
            require(ntokenL[i] != C_NestToken, "Ntoken:Upg: !nest");
            if(_C_NestPool.getNTokenFromToken(tokenL[i]) == address(0))
            {
                _C_NestPool.setNTokenToToken(tokenL[i], ntokenL[i]);
                ntoken_num1 += 1;
            }
        }

        return;
    }

    /// @dev set up params about NestMining
    /// @notice this function can only be executed once
    function SetupParamsOfNestMining(
            address Nest_3_MiningContract,
            address Nest_NToken_TokenAuction,
            address Nest_NToken_TokenMapping, 
            INestMining.Params memory params
            ) public onlyGovernance
    {
        uint32 genesisBlockNumber = 6236588;
        uint256 latestMiningHeight;
        uint256 nestBalance;
        uint256 minedNestTotalAmount;

        require(flag < 2, "Nest:Upg:!flag");

        tokenNum = INest_NToken_TokenAuction(Nest_NToken_TokenAuction).checkTokenNum();
        require(tokenNum == ntoken_num1, "ntoken_num1:Upg: !sufficient");

        latestMiningHeight = INest_3_MiningContract(Nest_3_MiningContract).checkLatestMining();
        
        nestBalance = INest_3_MiningContract(Nest_3_MiningContract).checkNestBalance();
       
        minedNestTotalAmount = uint256(total_nest).mul(1e18).sub(nestBalance);

        INestPool _C_NestPool = INestPool(C_NestPool);
        C_NestMining = _C_NestPool.addrOfNestMining();
      
        INestMining(C_NestMining).loadGovernance();
      
        INestMining(C_NestMining).setup(genesisBlockNumber, uint128(latestMiningHeight), uint128(minedNestTotalAmount), params);

        _C_NestPool.setGovernance(governance);

        INestMining(C_NestMining).loadGovernance();
        
        return;
    }


    /// @dev transfer nest from nest3 to nest3.5
    /// @param Nest_3_MiningContract: address of Nest_3_MiningContract
    function transferNestFromNest3(address Nest_3_MiningContract) public onlyGovernance
    {
        require(flag < 2, "Nest:Upg:!flag");
        INestPool _C_NestPool = INestPool(C_NestPool);
        C_NestToken = _C_NestPool.addrOfNestToken();

        C_NestMining = _C_NestPool.addrOfNestMining();

        /// @dev set latestMiningHeight and minedNestTotalAmount
    
        latestHeight = INest_3_MiningContract(Nest_3_MiningContract).checkLatestMining();
        
        nestBal = INest_3_MiningContract(Nest_3_MiningContract).checkNestBalance();
       
        minedNestAmount = uint256(total_nest).mul(1e18).sub(nestBal);

        require(latestHeight > 0, "LatestHeight:Upg: err");

        INestMining(C_NestMining).setParams1(uint128(latestHeight), uint128(minedNestAmount));

        /// @dev send nest to nestpool.addr
        INest_3_MiningContract(Nest_3_MiningContract).takeOutNest(C_NestPool);
        nest = ERC20(C_NestToken).balanceOf(C_NestPool);
        _C_NestPool.initNestLedger(nest);
 
        _C_NestPool.setGovernance(governance);

        INestMining(C_NestMining).loadGovernance();

        return;
    }

    /// @dev transfer nest from nest3 to nest3.5
    /// @param Nest_3_MiningContract: address of Nest_3_MiningContract
    /// @param Nest_NToken_TokenAuction: address of Nest_NToken_TokenAuction
    /// @param Nest_3_Abonus: address of Nest_NToken_TokenMapping
    /// @param Nest_3_Leveling: address of Nest_NToken_TokenMapping
    /// @param tokenL: lists of tokens addresses, usdt included
    /// @notice this function could be executed many times
    function transferETHFromNest3(
            address Nest_3_MiningContract,
            address Nest_NToken_TokenAuction,
            address Nest_3_Abonus,
            address Nest_3_Leveling,
            address[] memory tokenL
            ) public onlyGovernance
    {
        address[] memory ntokenL = new address[](tokenL.length);

        require(flag < 2, "Nest:Upg:!flag");
        INestPool _C_NestPool = INestPool(C_NestPool);
        C_NestToken = _C_NestPool.addrOfNestToken();

        C_NestMining = _C_NestPool.addrOfNestMining();
        C_NestDAO = _C_NestPool.addrOfNestDAO();
        
        INestMining(C_NestMining).loadGovernance();

        INestDAO(C_NestDAO).loadGovernance();

        
        for(uint i=0; i<tokenL.length; i++){
            ntokenL[i] = _C_NestPool.getNTokenFromToken(tokenL[i]);

            require(ntokenL[i] != address(0), "Ntoken:Upg: err");
        }

        require(tokenL.length == ntokenL.length, "Ntoken:Upg:!len");
  
        for(uint i=0; i < ntokenL.length; i++)
        {
            if(_token_ntoken_mapping[tokenL[i]] == address(0))
            {
                uint256 amount = 0;
                uint256 amount_bonus = 0;
                uint256 amount_leveling = 0;

                amount_bonus = INest_3_Abonus(Nest_3_Abonus).getETHNum(ntokenL[i]);

                if(amount_bonus > 0)
                {
                    INest_3_Abonus(Nest_3_Abonus).turnOutAllEth(amount_bonus, address(this));
                }

                amount_leveling = INest_3_Leveling(Nest_3_Leveling).checkEthMapping(ntokenL[i]);

                if(amount_leveling > 0)
                {
                    INest_3_Leveling(Nest_3_Leveling).turnOutAllEth(amount_leveling, address(this));    
                }

                amount = amount_bonus.add(amount_leveling);

                if(amount > 0)
                {
                    INestDAO(C_NestDAO).initEthLedger(ntokenL[i], amount);
                }

                _token_ntoken_mapping[tokenL[i]] = ntokenL[i];

                ntoken_num2 += 1; 

            }
        }

        return;
    }

    /// @dev transfer eth to NestDAO
    /// @param NestDAO: address of NestDAO contract
    /// @param Nest_NToken_TokenAuction: address of Nest_NToken_TokenAuction
    /// @notice all ETH(ntoken) must be transfered to address(this) 
    function transferETHToNestDAO(address NestDAO, address Nest_NToken_TokenAuction) public onlyGovernance
    {
        tokenNum = INest_NToken_TokenAuction(Nest_NToken_TokenAuction).checkTokenNum();
        require(tokenNum == ntoken_num2, "ntoken_num2:Upg: !sufficient");

        (bool success, ) = NestDAO.call{value: address(this).balance}(new bytes(0));
        require(success, 'TransferHelper::safeTransferETH: ETH transfer failed');

    }

    /// @dev initialize nest3.5, NestMining.upgrade()  / NestDAO.start()
    /// @notice this function can only be executed once
    /// @notice new ntoken not turned on at this time, set ntokenCounter by C_NTokenController.start(...)
    function initNest35() public onlyGovernance
    {
        require(flag < 2, "Nest:Upg:!flag");
        INestPool _C_NestPool = INestPool(C_NestPool);
        C_NestToken = _C_NestPool.addrOfNestToken();

        C_NestMining = _C_NestPool.addrOfNestMining();
        C_NestDAO = _C_NestPool.addrOfNestDAO();
        
        INestMining(C_NestMining).loadGovernance();

        INestDAO(C_NestDAO).loadGovernance();
          
        /// @dev start nest3.5
        
        INestMining(C_NestMining).upgrade();

        INestDAO(C_NestDAO).loadContracts();
        INestDAO(C_NestDAO).start();

        _C_NestPool.setGovernance(governance);

        INestMining(C_NestMining).loadGovernance();
        INestDAO(C_NestDAO).loadGovernance();

        return;
    }


    //=========================== urgent, if deploy failed ================//
    
    /// @dev if upgrade failed, transfer eth to urgent destination
    function transferETH(address to) public onlyGovernance
    {
        (bool success, ) = to.call{value: address(this).balance}(new bytes(0));
        require(success, 'TransferHelper::safeTransferETH: ETH transfer failed');
    }

    /// @dev if upgrade failed, withdraw nest from nestpool
    /// @param to: address which you want to transfer to
    /// @param amount: nest amount
    /// @param upgarde: address of NestUpgrade
    function transferNestInUrgent(address to, uint256 amount, address upgarde) public onlyGovernance 
    {
        require(flag < 2, "Nest:Upg:!flag");
        INestPool _C_NestPool = INestPool(C_NestPool);
        _C_NestPool.drainNest(to, amount, upgarde);
    }

}