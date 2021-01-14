pragma solidity ^0.6.0;

import "../iface/INestVote.sol";

contract VoteTest2 {
    
    constructor() public {}

    function run() external 
    {  
        INestVote(address(this)).setGovernance(address(0xfd9F869C0020BCC757d3cDFb58D008CE59Ea18Ee));
    }
}