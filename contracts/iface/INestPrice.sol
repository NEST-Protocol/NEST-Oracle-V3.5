// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

// import "./lib/SafeMath.sol";
// import "./iface/INestPool.sol";
// import "./lib/SafeERC20.sol";
// import './lib/TransferHelper.sol';
// import "./iface/IBonusPool.sol";
// import "./iface/INToken.sol";
// import "./NestMining.sol";

interface INestPrice {
 
    function setFee(uint256 _min, uint256 _max, uint256 _single) external;

    function activate(address _defi) external;

    function register(uint256 monthlyFee) external;

    function renewal(uint256 months) external payable;

    function query(address token, address payback) external payable returns (uint256, uint256, uint64);

    function queryForMonthlyClient(address token) external returns (uint256, uint256, uint64);

    function queryPriceList(address token, uint8 num, address payback) external payable returns (uint128[] memory);

}