$ErrorActionPreference = "Stop"
$env:PATH = "C:\Users\mikfo\.local\share\solana\install\active_release\bin;" + $env:PATH
Set-Location C:\Users\mikfo\fridge

$programId = "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6"
$so = "C:\Users\mikfo\fridge\target\deploy\fridge.so"
$kp = "C:\Users\mikfo\fridge\target\deploy\fridge-keypair.json"
$deployer = "C:\Users\mikfo\.config\solana\id.json"
$rpc = if ($env:ALCHEMY_API_KEY) {
  "https://solana-devnet.g.alchemy.com/v2/$($env:ALCHEMY_API_KEY)"
} else {
  "https://api.devnet.solana.com"
}

if (-not (Test-Path $so)) {
  cargo-build-sbf --manifest-path programs/fridge/Cargo.toml
}

solana program deploy $so `
  --program-id $kp `
  --url $rpc `
  --keypair $deployer `
  --use-rpc `
  --max-sign-attempts 10 `
  --with-compute-unit-price 1000

solana program show $programId --url $rpc
