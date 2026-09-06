// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @notice Fail-closed, per-path flow controls shared by the adapter and wrapper.
 * @dev The LayerZero owner/delegate remains the governor. A guardian may pause,
 *      but only the governor may unpause or change limits. The governor can be
 *      an EOA or a multisig contract; deployments must publish which model is used.
 */
abstract contract BridgeSafety is Pausable {
    struct FlowLimit {
        uint192 amountInFlight;
        uint64 lastUpdated;
        uint192 limit;
        uint64 window;
    }

    struct FlowLimitConfig {
        uint32 eid;
        bool inbound;
        uint192 limit;
        uint64 window;
    }

    error OnlyBridgeGovernor();
    error OnlyPauseAuthority();
    error InvalidGovernor();
    error InvalidGuardian();
    error InvalidFlowLimit();
    error FlowLimitExceeded(uint32 eid, bool inbound, uint256 requested, uint256 available);

    event EmergencyGuardianChanged(address indexed previousGuardian, address indexed newGuardian);
    event FlowLimitChanged(uint32 indexed eid, bool indexed inbound, uint192 limit, uint64 window);
    event FlowLimitReset(uint32 indexed eid, bool indexed inbound);

    mapping(bytes32 key => FlowLimit limit) private _flowLimits;
    address public emergencyGuardian;

    constructor(address guardian, FlowLimitConfig[] memory configs) {
        if (guardian == address(0)) revert InvalidGuardian();
        emergencyGuardian = guardian;
        emit EmergencyGuardianChanged(address(0), guardian);
        _setFlowLimits(configs);
    }

    modifier onlyBridgeGovernor() {
        if (msg.sender != bridgeGovernor()) revert OnlyBridgeGovernor();
        _;
    }

    function bridgeGovernor() public view virtual returns (address);

    function pause() external {
        if (msg.sender != bridgeGovernor() && msg.sender != emergencyGuardian) {
            revert OnlyPauseAuthority();
        }
        _pause();
    }

    function unpause() external onlyBridgeGovernor {
        _unpause();
    }

    function setEmergencyGuardian(address guardian) external onlyBridgeGovernor {
        if (guardian == address(0)) revert InvalidGuardian();
        address previous = emergencyGuardian;
        emergencyGuardian = guardian;
        emit EmergencyGuardianChanged(previous, guardian);
    }

    function setFlowLimits(FlowLimitConfig[] calldata configs) external onlyBridgeGovernor {
        _setFlowLimits(configs);
    }

    function resetFlowLimits(uint32[] calldata eids, bool inbound) external onlyBridgeGovernor {
        for (uint256 i; i < eids.length; ++i) {
            FlowLimit storage flow = _flowLimits[_key(eids[i], inbound)];
            flow.amountInFlight = 0;
            flow.lastUpdated = uint64(block.timestamp);
            emit FlowLimitReset(eids[i], inbound);
        }
    }

    function getFlowLimit(uint32 eid, bool inbound)
        external
        view
        returns (FlowLimit memory config, uint256 available)
    {
        config = _flowLimits[_key(eid, inbound)];
        (, available) = _capacity(config);
    }

    function _requireGovernor(address governor) internal pure {
        if (governor == address(0)) revert InvalidGovernor();
    }

    function _consumeFlow(uint32 eid, bool inbound, uint256 amount) internal whenNotPaused {
        FlowLimit storage flow = _flowLimits[_key(eid, inbound)];
        (uint256 current, uint256 available) = _capacity(flow);
        if (amount > available) revert FlowLimitExceeded(eid, inbound, amount, available);
        flow.amountInFlight = uint192(current + amount);
        flow.lastUpdated = uint64(block.timestamp);
    }

    function _setFlowLimits(FlowLimitConfig[] memory configs) internal {
        for (uint256 i; i < configs.length; ++i) {
            FlowLimitConfig memory next = configs[i];
            if (next.eid == 0 || next.limit == 0 || next.window < 60) revert InvalidFlowLimit();
            bytes32 key = _key(next.eid, next.inbound);
            FlowLimit storage current = _flowLimits[key];
            (uint256 decayed,) = _capacity(current);
            current.amountInFlight = uint192(decayed);
            current.lastUpdated = uint64(block.timestamp);
            current.limit = next.limit;
            current.window = next.window;
            emit FlowLimitChanged(next.eid, next.inbound, next.limit, next.window);
        }
    }

    function _capacity(FlowLimit memory flow) internal view returns (uint256 current, uint256 available) {
        if (flow.limit == 0 || flow.window == 0) return (flow.amountInFlight, 0);
        uint256 elapsed = block.timestamp - flow.lastUpdated;
        uint256 decay = (uint256(flow.limit) * elapsed) / flow.window;
        current = decay >= flow.amountInFlight ? 0 : flow.amountInFlight - decay;
        available = current >= flow.limit ? 0 : flow.limit - current;
    }

    function _key(uint32 eid, bool inbound) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(eid, inbound));
    }
}
