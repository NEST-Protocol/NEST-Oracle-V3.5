// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./iface/INToken.sol";
import "./iface/INestPool.sol";

contract NToken is INToken {
    using SafeMath for uint256;
    
    mapping (address => uint256) private _balances;                                 //  账本
    mapping (address => mapping (address => uint256)) private _allowed;             //  授权账本
    uint256 private _totalSupply = 0 ether;                                         //  总量
    string public name;                                                             //  名称
    string public symbol;                                                           //  简称
    uint8 public decimals = 18;                                                     //  精度
    uint256 public _createBlock;                                                    //  创建区块
    uint256 public _recentlyUsedBlock;                                              //  最近使用区块
    address governance;                                                             //  投票合约
    address C_NestPool;                                                             // 
    
    /// @notice Constructor
    /// @dev Given the address of NestPool, NToken can get other contracts by calling addrOfxxx()
    /// @param _name The name of NToken
    /// @param _symbol The symbol of NToken
    /// @param gov The address of admin
    /// @param NestPool The address of NestPool
    constructor (string memory _name, string memory _symbol, address gov, address NestPool) public {
    	name = _name;                                                               
    	symbol = _symbol;
    	_createBlock = block.number;
    	_recentlyUsedBlock = block.number;
    	governance = gov;
    	C_NestPool = NestPool;
    }
    
    /// @dev Mint 
    /// @param amount The amount of NToken to add
    /// @param account The account of NToken to add
    function mint(uint256 amount, address account) override public {
        require(address(msg.sender) == INestPool(C_NestPool).addrOfNestMining(), "Nest:NTK:!Auth");
        _balances[account] = _balances[account].add(amount);
        _totalSupply = _totalSupply.add(amount);
        _recentlyUsedBlock = block.number;
    }

    // // TODO: only for debugging
    // function increaseTotal2(uint256 value, address offerMain) override public {
    //     // address offerMain = address(_voteFactory.checkAddress("nest.nToken.offerMain"));
    //     // require(address(msg.sender) == offerMain, "No authority");
    //     _balances[offerMain] = _balances[offerMain].add(value);
    //     _totalSupply = _totalSupply.add(value);
    //     _recentlyUsedBlock = block.number;
    // }

    /**
    * @dev 查询token总量
    * @return token总量
    */
    function totalSupply() override public view returns (uint256) {
        return _totalSupply;
    }

    /**
    * @dev 查询地址余额
    * @param owner 要查询的地址
    * @return 返回对应地址的余额
    */
    function balanceOf(address owner) override public view returns (uint256) {
        return _balances[owner];
    }
    
    /**
    * @dev 查询区块信息
    * @return createBlock 初始区块数
    * @return recentlyUsedBlock 最近挖矿增发区块
    */
    function checkBlockInfo() override public view returns(uint256 createBlock, uint256 recentlyUsedBlock) {
        return (_createBlock, _recentlyUsedBlock);
    }

    /**
     * @dev 查询 owner 对 spender 的授权额度
     * @param owner 发起授权的地址
     * @param spender 被授权的地址
     * @return 已授权的金额
     */
    function allowance(address owner, address spender) override public view returns (uint256) {
        return _allowed[owner][spender];
    }

    /**
    * @dev 转账方法
    * @param to 转账目标
    * @param value 转账金额
    * @return 转账是否成功
    */
    function transfer(address to, uint256 value) override public returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    /**
     * @dev 授权方法
     * @param spender 授权目标
     * @param value 授权数量
     * @return 授权是否成功
     */
    function approve(address spender, uint256 value) override public returns (bool) {
        require(spender != address(0));
        _allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
     * @dev 已授权状态下，从 from地址转账到to地址
     * @param from 转出的账户地址 
     * @param to 转入的账户地址
     * @param value 转账金额
     * @return 授权转账是否成功
     */
    function transferFrom(address from, address to, uint256 value) override public returns (bool) {
        _allowed[from][msg.sender] = _allowed[from][msg.sender].sub(value);
        _transfer(from, to, value);
        emit Approval(from, msg.sender, _allowed[from][msg.sender]);
        return true;
    }

    /**
     * @dev 增加授权额度
     * @param spender 授权目标
     * @param addedValue 增加的额度
     * @return 增加授权额度是否成功
     */
    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        require(spender != address(0));

        _allowed[msg.sender][spender] = _allowed[msg.sender][spender].add(addedValue);
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    /**
     * @dev 减少授权额度
     * @param spender 授权目标
     * @param subtractedValue 减少的额度
     * @return 减少授权额度是否成功
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        require(spender != address(0));

        _allowed[msg.sender][spender] = _allowed[msg.sender][spender].sub(subtractedValue);
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    /**
    * @dev 转账方法
    * @param to 转账目标
    * @param value 转账金额
    */
    function _transfer(address from, address to, uint256 value) internal {
        _balances[from] = _balances[from].sub(value);
        _balances[to] = _balances[to].add(value);
        emit Transfer(from, to, value);
    }
    
    /// @dev The ABI is same with old NTokens, so that to support two NToken-mining approaches
    /// @return The address of bidder
    function checkBidder() override public view returns(address) {
        return C_NestPool;
    }

    // 仅限管理员操作
    modifier onlyOwner(){
        // require(_voteFactory.checkOwners(msg.sender));
        _;
    }
}