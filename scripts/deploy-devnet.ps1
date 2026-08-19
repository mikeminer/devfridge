$ErrorActionPreference = "Stop"
$env:PATH = "C:\Users\mikfo\.local\share\solana\install\active_release\bin;" + $env:PATH
Set-Location C:\Users\mikfo\fridge

$programId = "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6"
$so = "C:\Users\mikfo\fridge\target\deploy\fridge-test-cluster.so"
$deployer = "C:\Users\mikfo\.config\solana\id.json"
$rpc = if ($env:ALCHEMY_API_KEY) {
  "https://solana-devnet.g.alchemy.com/v2/$($env:ALCHEMY_API_KEY)"
} else {
  "https://api.devnet.solana.com"
}

Write-Host "Building TEST-CLUSTER fridge (local 2% burn, no Jupiter). Not for mainnet."
cargo-build-sbf --manifest-path programs/fridge/Cargo.toml --features test-cluster
Copy-Item -Force "C:\Users\mikfo\fridge\target\deploy\fridge.so" $so

$written = solana program write-buffer $so `
  --url $rpc `
  --keypair $deployer `
  --with-compute-unit-price 1000
Write-Host $written
if ($written -notmatch "Buffer:\s+(\S+)") {
  throw "write-buffer did not print a Buffer address"
}
$buffer = $Matches[1]
solana program upgrade $buffer $programId --url $rpc --keypair $deployer
solana program show $programId --url $rpc
