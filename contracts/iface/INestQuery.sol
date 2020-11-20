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
        external payable returns (uint256, uint256, int128, int128, uint256);

    function updateAndCheckPriceNow(address tokenAddress) 
        external payable returns (uint256, uint256, uint256);


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
}