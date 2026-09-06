// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OFT} from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import {BridgeSafety} from "./BridgeSafety.sol";

/** @notice Mint/burn wrapper for EVM destinations in the same canonical OFT mesh. */
contract WrappedOFT is OFT, BridgeSafety {
    constructor(
        string memory name_,
        string memory symbol_,
        address endpoint_,
        address multisig_,
        address emergencyGuardian_,
        FlowLimitConfig[] memory limits_
    )
        OFT(name_, symbol_, endpoint_, multisig_)
        Ownable(multisig_)
        BridgeSafety(emergencyGuardian_, limits_)
    {
        _requireMultisigGovernor(multisig_);
    }

    function bridgeGovernor() public view override returns (address) {
        return owner();
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        _requireMultisigGovernor(newOwner);
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
