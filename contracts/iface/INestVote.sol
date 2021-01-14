pragma solidity ^0.6.12;

interface INestVote {

    function setParams(uint32 voteDuration_, uint32 acceptance_, uint256 proposalStaking_) external;

    function setGovernance(address _gov) external;

}