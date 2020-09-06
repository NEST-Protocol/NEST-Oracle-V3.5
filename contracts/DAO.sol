// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";

contract DAO {
    using SafeMath for uint256;

    uint256 _x;

    constructor (uint256 x) public {
        _x = _x.add(x);

    }

    function getX() external view returns (uint256){
        return _x;
    }
}