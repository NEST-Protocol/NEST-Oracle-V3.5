// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

// import "./lib/SafeMath.sol";
// import "./iface/INestPool.sol";
// import "./lib/SafeERC20.sol";
// import './lib/TransferHelper.sol';
// import "./iface/IBonusPool.sol";
// import "./iface/INToken.sol";

interface INestQuery {

 
    // function setFee(uint256 min, uint256 max, uint256 single, uint256 monthly) external;

    function activate(address defi) external;

    function deactivate(address defi) external;

    function query(address token, address payback) 
        external payable returns (uint256, uint256, uint256);

    function queryPriceAvgVola(address token, address payback) 
        external payable returns (uint256, uint256, uint128, int128, uint256);

    function updateAndCheckPriceNow(address tokenAddress) 
        external payable returns (uint256, uint256, uint256);

    function queryPriceList(address token, uint8 num, address payback) 
        external payable returns (uint128[] memory);

    function priceList(address token, uint8 num) 
        external view returns (uint128[] memory);

    /// @dev Withdraw NEST only when emergency or governance
    /// @param to  The address of recipient
    /// @param amount  The amount of NEST tokens 
    function withdrawNest(address to, uint256 amount) external;

    /// @dev Withdraw ethers only when emergency or governance
    /// @param to  The address of recipient
    /// @param amount  The amount of ethers 
    function withdrawEth(address to, uint256 amount) external;

    /// @dev  The balance of NEST
    /// @return  The amount of NEST tokens for this contract
    function balanceNest() external view returns (uint256);

    /// @dev  The balance of NEST
    /// @return  The amount of ethers withheld by this contract
    function balanceEth() external view returns (uint256);

    /// @dev Only for governance
    function loadContracts() external; 

    event ClientActivated(address, uint256, uint256);
    // event ClientRenewed(address, uint256, uint256, uint256);
    event PriceQueried(address client, address token, uint256 bn);
    event PriceAvgVolaQueried(address client, address token, uint256 bn, uint128 avgPrice, int128 vola);

    event PriceListQueried(address client, address token, uint256 atHeight, uint8 num);

    // governance events
    event ParamsSetup(address gov, uint256 oldParams, uint256 newParams);
    event FlagSet(address gov, uint256 flag);
    event GovSet(address gov, address oldGov, address newGov);
}