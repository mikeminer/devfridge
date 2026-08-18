$ErrorActionPreference = "Continue"
$env:PATH = "C:\Users\mikfo\.local\share\solana\install\active_release\bin;" + $env:PATH
$deployer = "C:\Users\mikfo\.config\solana\id.json"
$so = "C:\Users\mikfo\fridge\target\deploy\fridge.so"
$kp = "C:\Users\mikfo\fridge\target\deploy\fridge-keypair.json"
$rpc = "https://api.testnet.solana.com"
$need = 2100000000
$log = "C:\Users\mikfo\fridge\target\deploy\testnet-deploy.log"

function Write-Log($msg) {
  $line = "$(Get-Date -Format o) $msg"
  Add-Content -Path $log -Value $line
  Write-Host $line
}

Write-Log "watching $(solana-keygen pubkey $deployer) on testnet for >= 2.1 SOL"
while ($true) {
  $bal = (solana balance --url $rpc --keypair $deployer 2>$null | Out-String).Trim()
  if ($bal -match "([0-9]+(?:\.[0-9]+)?)\s*SOL") {
    $lamports = [int64]([double]$Matches[1] * 1000000000)
  } else {
    $lamports = 0
  }
  Write-Log "balance_lamports=$lamports"
  if ($lamports -ge $need) {
    Write-Log "funding detected, deploying"
    solana program deploy $so --program-id $kp --url $rpc --keypair $deployer --use-rpc --max-sign-attempts 10 --with-compute-unit-price 1000 *>> $log
    Write-Log "deploy_exit=$LASTEXITCODE"
    solana program show 9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6 --url $rpc *>> $log
    break
  }
  Start-Sleep -Seconds 8
}
