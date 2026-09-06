const { ethers, network } = require("hardhat");

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

async function assertContract(address, label) {
  if (!ethers.isAddress(address)) throw new Error(`${label} is not a valid address`);
  if ((await ethers.provider.getCode(address)) === "0x") throw new Error(`${label} has no deployed code`);
}

async function main() {
  if (network.config.chainId !== 4663 && network.config.chainId !== 46630) {
    throw new Error(`Refusing deployment on chain ${network.config.chainId}; expected Robinhood 4663/46630`);
  }

  const token = required("CANONICAL_TOKEN");
  const endpoint = required("LZ_ENDPOINT_V2");
  const multisig = required("BRIDGE_MULTISIG");
  const guardian = required("EMERGENCY_GUARDIAN");
  const remoteEid = Number(required("REMOTE_LZ_EID"));
  const limit = BigInt(required("FLOW_LIMIT_BASE_UNITS"));
  const window = Number(process.env.FLOW_WINDOW_SECONDS || "86400");

  await assertContract(token, "CANONICAL_TOKEN");
  await assertContract(endpoint, "LZ_ENDPOINT_V2");
  await assertContract(multisig, "BRIDGE_MULTISIG");
  if (!ethers.isAddress(guardian)) throw new Error("EMERGENCY_GUARDIAN is not a valid address");
  if (!Number.isInteger(remoteEid) || remoteEid <= 0) throw new Error("REMOTE_LZ_EID is invalid");
  if (!Number.isInteger(window) || window < 60) throw new Error("FLOW_WINDOW_SECONDS must be >= 60");

  const limits = [
    { eid: remoteEid, inbound: false, limit, window },
    { eid: remoteEid, inbound: true, limit, window },
  ];
  const Factory = await ethers.getContractFactory("CanonicalOFTAdapter");
  const adapter = await Factory.deploy(token, endpoint, multisig, guardian, limits);
  await adapter.waitForDeployment();
  console.log(JSON.stringify({ network: network.name, adapter: await adapter.getAddress(), token, multisig, guardian, remoteEid, limit: limit.toString(), window }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
