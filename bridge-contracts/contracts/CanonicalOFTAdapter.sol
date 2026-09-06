// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OFTAdapter} from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import {BridgeSafety} from "./BridgeSafety.sol";

/**
 * @notice Escrows an existing canonical ERC-20 and connects it to OFT peers.
 * @dev Exactly one adapter should exist for the canonical token's global mesh.
 */
contract CanonicalOFTAdapter is OFTAdapter, BridgeSafety {
    constructor(
        address token_,
        address endpoint_,
        address governor_,
        address emergencyGuardian_,
        FlowLimitConfig[] memory limits_
    )
        OFTAdapter(token_, endpoint_, governor_)
        Ownable(governor_)
        BridgeSafety(emergencyGuardian_, limits_)
    {
        _requireGovernor(governor_);
    }

    function bridgeGovernor() public view override returns (address) {
        return owner();
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        _requireGovernor(newOwner);
        super.transferOwnership(newOwner);
    }

    function renounceOwnership() public pure override {
        revert InvalidGovernor();
    }

    function _debit(address from, uint256 amountLD, uint256 minAmountLD, uint32 dstEid)
        internal
        override
        returns (uint256 amountSentLD, uint256 amountReceivedLD)
    {
        _consumeFlow(dstEid, false, amountLD);
        return super._debit(from, amountLD, minAmountLD, dstEid);
    }

    function _credit(address to, uint256 amountLD, uint32 srcEid)
        internal
        override
        returns (uint256 amountReceivedLD)
    {
        _consumeFlow(srcEid, true, amountLD);
        return super._credit(to, amountLD, srcEid);
    }
}
