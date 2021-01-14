pragma solidity ^0.6.0;

import "../iface/INestVote.sol";

contract VoteTest1 {
    
    constructor() public {}


    function run() external 
    {  
        INestVote(address(this)).setParams(10, 20, 1000000);
    }
}