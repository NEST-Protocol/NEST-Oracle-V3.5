// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;


interface IParamSettable {

    function setParam(uint256 index, uint256 value) external returns (bool);

    event ParamSet(address sender, uint256 paramIndex, uint256 oldValue, uint256 newValue);

}