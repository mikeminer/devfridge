const { ethers, network } = require("hardhat");

const EXPECTED = Object.freeze({
  chainId: 4663n,
  token: "0x5c845330b41D9Bef68B46DC254353A770f44dee8",
  endpoint: "0x6f475642a6e85809b1c36fa62763669b1b48dd5b",
  remoteEid: 30168,
  decimals: 18,
  flowLimit: 1_000_000n * 10n ** 18n,
  window: 86_400,
});

const configured = (name) => process.env[name]?.trim();

async function main() {
  const issues = [];
  const liveNetwork = await ethers.provider.getNetwork();
  const token = configured("CANONICAL_TOKEN") || EXPECTED.token;
  const endpoint = configured("LZ_ENDPOINT_V2") || EXPECTED.endpoint;
  const remoteEid = Number(configured("REMOTE_LZ_EID") || EXPECTED.remoteEid);
  const flowLimit = BigInt(configured("FLOW_LIMIT_BASE_UNITS") || "0");
  const window = Number(configured("FLOW_WINDOW_SECONDS") || "0");
  const governor = configured("BRIDGE_GOVERNOR") || configured("BRIDGE_MULTISIG");
  const guardian = configured("EMERGENCY_GUARDIAN");

  if (liveNetwork.chainId !== EXPECTED.chainId) issues.push(`wrong chain: ${liveNetwork.chainId}`);
  if (token.toLowerCase() !== EXPECTED.token.toLowerCase()) issues.push("canonical token mismatch");
  if (endpoint.toLowerCase() !== EXPECTED.endpoint.toLowerCase()) issues.push("LayerZero Endpoint mismatch");
  if (remoteEid !== EXPECTED.remoteEid) issues.push("remote Solana EID mismatch");
  if (flowLimit !== EXPECTED.flowLimit) issues.push("flow limit is not the approved 1,000,000 TMC");
  if (window !== EXPECTED.window) issues.push("flow window is not 24 hours");
  if (!governor || !ethers.isAddress(governor) || governor === ethers.ZeroAddress) issues.push("valid governor missing");
  if (!guardian || !ethers.isAddress(guardian) || guardian === ethers.ZeroAddress) issues.push("valid emergency guardian missing");

  const tokenCode = await ethers.provider.getCode(token);
  const endpointCode = await ethers.provider.getCode(endpoint);
  if (tokenCode === "0x") issues.push("canonical token has no deployed code");
  if (endpointCode === "0x") issues.push("LayerZero Endpoint has no deployed code");

  let tokenDecimals;
  if (tokenCode !== "0x") {
    const contract = new ethers.Contract(token, ["function decimals() view returns (uint8)"], ethers.provider);
    tokenDecimals = Number(await contract.decimals());
    if (tokenDecimals !== EXPECTED.decimals) issues.push(`token decimals are ${tokenDecimals}, expected 18`);
  }

  const privateKey = configured("DEPLOYER_PRIVATE_KEY");
  let deployer;
  let deployerBalance;
  if (!privateKey) {
    issues.push("deployment signer not configured");
  } else {
    const wallet = new ethers.Wallet(privateKey, ethers.provider);
    deployer = wallet.address;
    deployerBalance = ethers.formatEther(await ethers.provider.getBalance(wallet.address));
    if (deployerBalance === "0.0") issues.push("deployment signer has no native gas");
  }

  console.log(JSON.stringify({
    network: network.name,
    chainId: liveNetwork.chainId.toString(),
    canonicalToken: token,
    tokenDecimals,
    endpoint,
    remoteEid,
    flowLimitBaseUnits: flowLimit.toString(),
    flowWindowSeconds: window,
    governor,
    guardian,
    deployer,
    deployerBalance,
    ready: issues.length === 0,
    issues,
  }, null, 2));

  if (issues.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
