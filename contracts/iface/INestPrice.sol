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
 
    function setFee() external;

    function activateClient(address defiAddress) external;

    function registerClient(uint32 monthlyFee) external;

    function renewalClient(uint8 months) external payable returns (uint64);

    function queryPrice(address token, address payback) external payable returns (uint256, uint256, uint64);

    function queryPriceList(address token, uint8 num, address payback) external payable returns (uint128[] memory);

}