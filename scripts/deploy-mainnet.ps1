$ErrorActionPreference = "Stop"
$env:PATH = "C:\Users\mikfo\.local\share\solana\install\active_release\bin;" + $env:PATH
Set-Location C:\Users\mikfo\fridge

$programId = "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6"
$so = "C:\Users\mikfo\fridge\target\deploy\fridge.so"
$kp = "C:\Users\mikfo\fridge\target\deploy\fridge-keypair.json"

solana config set --url https://api.mainnet-beta.solana.com --keypair C:\Users\mikfo\.config\solana\id.json
Write-Host "deployer=$(solana address)"
Write-Host "balance=$(solana balance)"
Write-Host "program=$programId"

if (-not (Test-Path $so)) {
  cargo-build-sbf --manifest-path programs/fridge/Cargo.toml
}

solana program deploy $so `
  --program-id $kp `
  --url https://api.mainnet-beta.solana.com `
  --keypair C:\Users\mikfo\.config\solana\id.json
