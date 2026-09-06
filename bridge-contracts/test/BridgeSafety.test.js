const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

describe("BridgeSafety", function () {
  const EID = 30168;

  async function fixture() {
    const [governor, guardian, user] = await ethers.getSigners();
    const Harness = await ethers.getContractFactory("BridgeSafetyHarness");
    const bridge = await Harness.deploy(governor.address, guardian.address, [
      { eid: EID, inbound: false, limit: 1000n, window: 3600 },
      { eid: EID, inbound: true, limit: 500n, window: 3600 },
    ]);
    return { bridge, governor, guardian, user };
  }

  it("fails closed for unconfigured paths and caps configured outflow", async function () {
    const { bridge, user } = await fixture();
    await bridge.connect(user).consume(EID, false, 1000n);
    await assert.rejects(bridge.connect(user).consume(EID, false, 1n));
    await assert.rejects(bridge.connect(user).consume(99999, false, 1n));
  });

  it("restores capacity linearly", async function () {
    const { bridge, user } = await fixture();
    await bridge.connect(user).consume(EID, false, 1000n);
    await ethers.provider.send("evm_increaseTime", [1800]);
    await ethers.provider.send("evm_mine", []);
    const [, available] = await bridge.getFlowLimit(EID, false);
    assert(available >= 500n && available <= 501n);
  });

  it("lets the guardian pause but only the governor unpause", async function () {
    const { bridge, governor, guardian, user } = await fixture();
    await bridge.connect(guardian).pause();
    await assert.rejects(bridge.connect(user).consume(EID, false, 1n));
    await assert.rejects(bridge.connect(guardian).unpause());
    await bridge.connect(governor).unpause();
    await bridge.connect(user).consume(EID, false, 1n);
  });

  it("restricts configuration to the governor", async function () {
    const { bridge, governor, user } = await fixture();
    const next = [{ eid: EID, inbound: false, limit: 2000n, window: 7200 }];
    await assert.rejects(bridge.connect(user).setFlowLimits(next));
    await bridge.connect(governor).setFlowLimits(next);
    const [config] = await bridge.getFlowLimit(EID, false);
    assert.equal(config.limit, 2000n);
    assert.equal(config.window, 7200n);
  });
});
