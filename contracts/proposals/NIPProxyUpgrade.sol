// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "../lib/SafeMath.sol";
import "../lib/AddressPayable.sol";
import "../iface/INestPool.sol";
import "./Proposal.sol";
import "hardhat/console.sol";


/// @dev The interface is compitable with `AdminUpgradeabilityProxy` from
///  open-zeppelin-upgrades
interface IProxy {

    /// @dev The function can only return `admin` if the caller is the admin
    function admin() external returns (address);

    /// @dev The function can only return `implementation` if the caller is the admin
    function implementation() external returns (address);

    /// @dev The function can only be called by the admin
    function upgradeTo(address newImplementation) external;

    /// @dev The function can only be called by the admin
    function upgradeToAndCall(address newImplementation, bytes calldata data) payable external;

}

interface IProxyAdmin {

    function owner() external view returns (address);

    function transferOwnership(address newOwner) external;

    function getProxyImplementation(IProxy proxy) external view returns (address);
   
    function getProxyAdmin(IProxy proxy) external view returns (address);

    function changeProxyAdmin(IProxy proxy, address newAdmin) external;

    function upgrade(IProxy proxy, address implementation) external;

    function upgradeAndCall(IProxy proxy, address implementation, bytes memory data) payable external;

}

contract NIPProxyUpgrade is Proposal {

    event NIPProxyUpgraded(address proxy, address oldImpl, address newImpl);

    function run(address NestPool, bytes calldata args) override external returns (bool)
    {
        (address proxy, address proxyAdmin, address newImplementation) = abi.decode(args, (address, address, address));

        IProxy _proxy = IProxy(proxy);
        IProxyAdmin _proxyAdmin = IProxyAdmin(proxyAdmin);

        address _oldImplementation = _proxyAdmin.getProxyImplementation(_proxy);

        require(newImplementation != address(0) 
            && newImplementation != _oldImplementation, "Nest:NIP:!newImpl");

        _proxyAdmin.upgrade(_proxy, newImplementation);

        emit NIPProxyUpgraded(proxy, _oldImplementation, newImplementation);

        return true;
    }
}