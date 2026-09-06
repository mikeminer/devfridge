// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {BridgeSafety} from "../BridgeSafety.sol";

contract BridgeSafetyHarness is BridgeSafety {
    address private immutable _governor;

    constructor(address governor_, address guardian_, FlowLimitConfig[] memory limits_)
        BridgeSafety(guardian_, limits_)
    {
        _governor = governor_;
    }

    function bridgeGovernor() public view override returns (address) {
        return _governor;
    }

    function consume(uint32 eid, bool inbound, uint256 amount) external {
        _consumeFlow(eid, inbound, amount);
    }
}
