// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.6.12;

import "./lib/SafeMath.sol";
import "./lib/AddressPayable.sol";
import "./iface/IBonusPool.sol";
import "./lib/SafeERC20.sol";
import "./iface/IStaking.sol";

// import "truffle/Console.sol";

contract Staking is IStaking {

    using SafeMath for uint256;
    // using SafeMath for uint128;
    // using SafeMath for uint64;

    // uint64 _next_bonus_time = 1594958400;
    // uint64 _next_bonus_counter;
    uint256 _next_bonus_time = 1594958400;
    uint256 _next_bonus_counter;
    uint8  _staking_state; 

    // TODO: 以下是调试辅助工具
    event Log(string msg);
    event LogUint(string msg, uint256 v);
    event LogAddress(string msg, address a);
 

    // _user_bonus_claim_hist: (ntoken, counter, user) => amount
    mapping(address => mapping(uint256 => mapping(address => uint256))) _user_bonus_claim_hist;
    // _token_snapshot_total: (ntoken, counter) => amount
    mapping(address => mapping(uint256 => uint256)) _token_snapshot_total;
    // _eth_snapshot_total: (ntoken, counter) => amount
    mapping(address => mapping(uint256 => uint256)) _eth_snapshot_total;

    address _C_NestToken;
    IBonusPool _C_BonusPool;

    uint16 x_bonus_time_cycle_hour = 168;
    uint16 x_bonus_duration_hour = 60;

    uint256 constant x_bonus_minimum_ether = 100;
    uint256 constant x_bonus_life_inc_percentage = 3;

    uint256 x_saving_level_one_percentage        = 10;
    uint256 x_saving_level_two_percentage        = 20;
    uint256 x_saving_level_three_percentage      = 30;
    uint256 x_saving_level_two_threshold_ether   = 100;
    uint256 x_saving_level_three_threshold_ether = 600;

    uint256 constant c_bonus_nest_life_span_ether = 1000000000;
    uint256 constant c_bonus_ntoken_life_ether    = 1000000;
    // uint256 


    constructor(IBonusPool bonusPoolContract, address nestTokenContract) public {
        _C_BonusPool = bonusPoolContract;
        _C_NestToken = nestTokenContract;
        _staking_state = 0;
    }
    /*
    * @param s1: x_saving_level_one
    * @param s2: x_saving_level_two
    * @param s3: x_saving_level_three
    * @param st2: x_saving_level_two_threshold_ether
    * @param st3: x_saving_level_three_threshold_ether
    * 
    */
    function calcLeveling(uint256 ethBonus) 
        private view returns (uint256) 
    {
        uint256 levelEth;
        if (ethBonus > 5000 ether) {
            levelEth = ethBonus.mul(x_saving_level_three_percentage).div(100).sub(x_saving_level_three_threshold_ether);
        } else if (ethBonus > 1000 ether) {
            levelEth = ethBonus.mul(x_saving_level_two_percentage).div(100).sub(x_saving_level_two_threshold_ether);
        } else {
            levelEth = ethBonus.mul(x_saving_level_one_percentage).div(100);
        }
        return levelEth;
    }

    /**
     * @param nestNtoken: 
     * @param tokenTotal: 
     */

    function calcMinBonusEth(address nestNtoken, uint256 tokenTotal) 
        private  returns (uint256)
    {
        uint256 century;
        emit LogAddress("_C_NestToken", _C_NestToken);
        if (nestNtoken == address(_C_NestToken)) {
            century = tokenTotal.div(c_bonus_nest_life_span_ether * (1 ether));
            emit Log("branch-1");
        } else {
            emit Log("branch-2");
            century = tokenTotal.div(c_bonus_ntoken_life_ether * (1 ether));
        }
        emit LogUint("century", century);
        uint256 minBonusEther = x_bonus_minimum_ether;
        uint256 lifeIncPer = x_bonus_life_inc_percentage;
        emit LogUint("minBonusEther", minBonusEther);
        emit LogUint("lifeIncPer", lifeIncPer);

        uint256 minBonusEth = (minBonusEther * (1 ether));
        for (uint256 i = 0; i < century; i++) {
            minBonusEth = minBonusEth.add(minBonusEth.mul(lifeIncPer).div(100));
        }
        return minBonusEth;
    }

    function calcAndUpdateNextBonusTime(uint256 nowTime) private returns (uint256, uint256, uint256) 
    {
        uint256 nextTime = _next_bonus_time;
        uint256 counter = _next_bonus_counter;
        uint256 cycle = uint256(x_bonus_time_cycle_hour).mul(1 hours);
        uint256 duration = uint256(x_bonus_duration_hour).mul(1 hours);
        uint256 startTime;
        uint256 endTime;
        uint256 currIndex;

        emit LogUint("nextTime", nextTime);
        emit LogUint("counter", counter);
        emit LogUint("cycle", cycle);
        emit LogUint("duration", duration);

 //       /*
        if (nowTime >= nextTime) {
            uint256 c = nowTime.sub(nextTime).div(cycle);
            startTime = nextTime.add((c).mul(cycle));
            endTime = startTime.add(cycle);

            // 如果当前函数能正常执行完毕，那么下面两个关键变量会被修改
            // _next_bonus_counter 表示第几次快照，_next_bonus_timestamp 每次更新， _next_bonus_counter++
            _next_bonus_time = uint256(startTime.add(cycle));
            _next_bonus_counter = uint256(counter.add(1));
        } else {
            startTime = nextTime.sub(cycle);
            endTime = startTime.add(duration);
        }
//        */
        // currIndex = counter.sub(1);
        return (startTime, endTime, currIndex);
    }

    function timeOfNextBonus() override public returns (uint256, uint256, uint256) 
    {
        uint256 nowTime = block.timestamp;
        uint256 nextTime = _next_bonus_time;
        uint256 counter = _next_bonus_counter;
        uint256 cycle = uint256(x_bonus_time_cycle_hour).mul(1 hours);
        uint256 duration = uint256(x_bonus_duration_hour).mul(1 hours);
        uint256 startTime;
        uint256 endTime;
        uint256 currIndex;

        emit LogUint("nextTime", nextTime);
        emit LogUint("counter", counter);
        emit LogUint("cycle", cycle);
        emit LogUint("duration", duration);

        if (nowTime >= nextTime) {
            uint256 c = nowTime.sub(nextTime).div(cycle);
            startTime = nextTime.add((c).mul(cycle));
            endTime = startTime.add(cycle);
        } else {
            startTime = nextTime.sub(cycle);
            endTime = startTime.add(duration);
        }
        // currIndex = counter.sub(1);
        return (startTime, endTime, currIndex);
    }

    function getNTokenTotalAmount(address token) public view returns (uint256) {
        if (token == address(_C_NestToken)) {
            uint256 all = 10000000000 ether;
            //TODO: not right
            // uint256 
            // uint256 flux = all.sub(_C_NestToken.balanceOf(address(_voteFactory.checkAddress("nest.v3.miningSave"))))
            //                 .sub(_C_NestToken.balanceOf(address(x_nest_burning_address)));
            return all;
        } else {
            return ERC20(token).totalSupply();
        }
    }

    function stake(address ntoken, uint256 amount) public {
    // staking 功能打开
        require(_staking_state == 0, "Staking contract is paused");

        uint256 nowTime = block.timestamp;
        emit LogUint("now time", nowTime);
        
        uint256 nextTime = uint256(_next_bonus_time);
        emit LogUint("old nextTime", nextTime);

        uint256 cycle = uint256(x_bonus_time_cycle_hour) * (1 hours);
        emit LogUint("cycle", cycle);

        uint256 duration = uint256(x_bonus_duration_hour) * (1 hours);
        emit LogUint("duration", duration);

        if (nowTime < nextTime) {
        //  上一个周期有人领取分红
            uint256 startTime = nextTime.sub(cycle);
            uint256 endTime = startTime.add(duration);
            emit Log("branch 1");

            require(!(nowTime >= startTime && nowTime <= endTime), "Bonus-claiming was started ");
        } else {
        //  上一个周期内无人领取分红，导致 _next_bonus_timestamp 未被及时更新
            uint256 times = (nowTime.sub(nextTime)).div(cycle);
            uint256 startNext = nextTime.add((times).mul(cycle));  
            uint256 endNext = startNext.add(duration);             

            emit Log("branch 2");
            emit LogUint("times", times);
            emit LogUint("startNext", startNext);
            emit LogUint("endNext", endNext);

            // require(!(nowTime >= startNext && nowTime <= endNext), "Bonus-claiming was started 2");
        }

        emit Log("_C_BonusPool.lockNToken");
        emit LogAddress("_C_BonusPool", address(_C_BonusPool));
        emit LogAddress("msg.sender", msg.sender);
        emit LogAddress("ntoken", ntoken);
        emit LogUint("amount", amount / (10 ** 18));

        // // 转入到 staking 合约，并录入 staking 账本
        _C_BonusPool.lockNToken(msg.sender, ntoken, amount);
        emit Log("Staking.stake() call done");

    }

    function unstake(address ntoken, uint256 amount) public 
    {
        // staking 功能打开
        require (_staking_state < 2, "");
        require(amount <= _C_BonusPool.getNTokenAmount(ntoken, address(msg.sender)), 
            "Insufficient storage balance");

        require(amount > 0, "E: amount should be greater than 0");  
        address sender = address(msg.sender);
    
        _C_BonusPool.unlockNToken(sender, ntoken, amount);
        emit Log("Staking.unstake() call done");

    //TODO: DAO 投票期 与 stake/unstake 的关联度
    // if (token == address(_nestContract)) {
    //     require(!_voteFactory.checkVoteNow(address(tx.origin)), "Voting");
    // }
    }

    function claim(address nestNtoken) external 
    {
        // staking 功能打开
        require (_staking_state == 0, "");

        address sender = address(msg.sender);          
        uint256 tokenAmount = _C_BonusPool.getNTokenAmount(nestNtoken, sender);
        require(tokenAmount > 0, "E: insufficient storage balance");
    
        // 计算分红时间
        uint256 startTime;
        uint256 endTime;
        uint256 currIndex;
        uint256 nowTime = block.timestamp;

        emit LogUint("nowTime", nowTime);
        (startTime, endTime, currIndex) = calcAndUpdateNextBonusTime(nowTime);
        emit LogUint("new StartTime", startTime);
        emit LogUint("new EndTime", endTime);
        emit LogUint("new currIndex", currIndex);

        require(nowTime >= startTime && nowTime <= endTime,
            "E: bonus-claiming not started yet");

        // 快照
        uint256 tokenSnapshot = _token_snapshot_total[nestNtoken][currIndex]; 
        uint256 ethSnapshot = _eth_snapshot_total[nestNtoken][currIndex];
        
        emit LogUint("tokenSnapshot", tokenSnapshot/(10**18));
        emit LogUint("ethSnapshot", ethSnapshot/(10**18));

        if (tokenSnapshot == 0) {  // `claim` was first invoked in this round
            tokenSnapshot = getNTokenTotalAmount(nestNtoken);
            emit LogUint("tokenTotal", tokenSnapshot/(10**18));
            require(tokenSnapshot > 0, "E: token total flux should not be zero");
            _token_snapshot_total[nestNtoken][currIndex] = tokenSnapshot;
            ethSnapshot = _C_BonusPool.getEthAmount(nestNtoken); 
            require(ethSnapshot > 0, "No bonus in the pool");
            _eth_snapshot_total[nestNtoken][currIndex] = ethSnapshot;

            emit LogAddress("nestNtoken", nestNtoken);
            uint256 minBonusEth = calcMinBonusEth(nestNtoken, tokenSnapshot);
            emit LogUint("minBonusEth", minBonusEth/(10**18));
            if (ethSnapshot > minBonusEth) { // deposit saving when bonus is abundant
                uint256 levelEth = calcLeveling(ethSnapshot);
                emit LogUint("levelEth", levelEth/(10**18));
                if (ethSnapshot.sub(levelEth) < minBonusEth) { 
                    _C_BonusPool.moveBonusToLeveling(nestNtoken, ethSnapshot.sub(minBonusEth));
                } else {
                    _C_BonusPool.moveBonusToLeveling(nestNtoken, levelEth);
                }
            } else {  // use saving when bonus is deficient 
                uint256 ethUse = minBonusEth.sub(ethSnapshot);
                if (_C_BonusPool.getLevelingAmount(nestNtoken) >= ethUse) {
                    _C_BonusPool.moveBonusFromLeveling(nestNtoken, ethUse);
                }
            }
        /*        
        */
        } 

        // -----------------------------------------------------------
        // 分红计算

        // 采用 _user_bonus_claim_hist 一个 mapping 就可以记录用户是否领取分红，因为如果用户领取过，那么记录的 tokenAmount 一定是大于零的，
        require(_user_bonus_claim_hist[nestNtoken][currIndex][sender] == 0, "E: bonus-claiming duplicated"); 
        _user_bonus_claim_hist[nestNtoken][currIndex][sender] = tokenAmount;    
    
        uint256 ethBonus = tokenAmount.mul(ethSnapshot).div(tokenSnapshot);
        emit LogUint("ethBonus", ethBonus/(10**18));

        // emit <事件> 
        // pickup ethers to my own account 
        _C_BonusPool.pickupEth(msg.sender, nestNtoken, ethBonus);
        /*
        */
    }

    //  下次分红时间，本次分红截止时间，ETH数，nest数, 参与分红的nest, 可领取分红,授权金额，余额，是否可以分红

    /**
     * return startNext: the start time of next bonus cycle
     * endTime: the end of current bonus cycle
     * bonusEthTotal: the ethers in the bonus pool
     * ntokenTotal: the number of nest/ntoken mined
     * stakedAmount: the number of staked token of msg.sender
     * claimedEth: the number of ethers claimed
     * allowedNTokenAmount: the number of nest/ntoken allowed 
     * balanceOfNTokenAmount: the number of nest/ntoken of msg.sender
     * isClaimed: boolean
     */
    function getBonusParams(address nestNtoken) public view 
        returns (uint256 startNext, uint256 endTime, uint256 bonusEthTotal, 
        uint256 ntokenTotal, uint256 stakedAmount, uint256 claimedEth, 
        uint256 allowedNTokenAmount, uint256 balanceOfNTokenAmount, bool isClaimed)  
    {
        uint256 nowTime = block.timestamp;

        uint256 startTime = _next_bonus_time.sub(uint256(x_bonus_time_cycle_hour).mul(1 hours));
        endTime = startTime.add(uint256(x_bonus_duration_hour).mul(1 hours)); 

        if (nowTime >= _next_bonus_time) {
            startTime = _next_bonus_time.add((nowTime.sub(_next_bonus_time).div(uint256(x_bonus_time_cycle_hour).mul(1 hours))).mul(uint256(x_bonus_time_cycle_hour).mul(1 hours)));
            endTime = startTime.add(uint256(x_bonus_duration_hour).mul(1 hours));
            startNext = startTime.add(uint256(x_bonus_time_cycle_hour).mul(1 hours));
        } else {
            startNext = _next_bonus_time;
            endTime = _next_bonus_time.sub(uint256(x_bonus_time_cycle_hour).mul(1 hours)).add(uint256(x_bonus_duration_hour).mul(1 hours));
        } 

        uint256 claimed = 0;
        if (nowTime >= startTime && nowTime <= endTime) {
            //  bonus-claiming was triggered, return the numbers snapshotted
            claimed = _user_bonus_claim_hist[nestNtoken][_next_bonus_counter][address(msg.sender)];
            bonusEthTotal = _eth_snapshot_total[nestNtoken][_next_bonus_counter];
            ntokenTotal = _token_snapshot_total[nestNtoken][_next_bonus_counter];
        } else {
            // last bonus-cycle was closed, next cycle is on the way
            bonusEthTotal = _C_BonusPool.getEthAmount(nestNtoken);
            ntokenTotal = getNTokenTotalAmount(nestNtoken);
            claimed = _user_bonus_claim_hist[nestNtoken][_next_bonus_counter+1][address(msg.sender)];
        }

        // calculate how many ethers (bonus) can be claimed by the msg.sender
        stakedAmount = _C_BonusPool.getNTokenAmount(nestNtoken, address(msg.sender));
        if (claimed == 0) {
            claimedEth = 0;
            isClaimed = false;
        } else {
            claimedEth = stakedAmount.mul(bonusEthTotal).div(ntokenTotal);
            isClaimed = true;
        }



        allowedNTokenAmount = ERC20(nestNtoken).allowance(address(msg.sender), address(_C_BonusPool));
        balanceOfNTokenAmount = ERC20(nestNtoken).balanceOf(address(msg.sender));
    }

    function getNextBonusStartTime() public view returns (uint256) {
        uint256 nextTime = _next_bonus_time;
        uint256 cycle = uint256(x_bonus_time_cycle_hour).mul(1 hours);

        uint256 nowTime = block.timestamp;
        if ( nowTime >= nextTime) {
            uint256 c = nowTime.sub(nextTime).div(cycle);
            return (nextTime.add((c+1).mul(cycle)));
        } else {
            return nextTime;
        } 
    }

}

