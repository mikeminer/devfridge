$ErrorActionPreference = "Continue"
$env:PATH = "C:\Users\mikfo\.local\share\solana\install\active_release\bin;" + $env:PATH
$deployer = "C:\Users\mikfo\.config\solana\id.json"
$so = "C:\Users\mikfo\fridge\target\deploy\fridge.so"
$kp = "C:\Users\mikfo\fridge\target\deploy\fridge-keypair.json"
$rpc = "https://api.mainnet-beta.solana.com"
$need = 2100000000
$log = "C:\Users\mikfo\fridge\target\deploy\mainnet-deploy.log"

function Write-Log($msg) {
  $line = "$(Get-Date -Format o) $msg"
  Add-Content -Path $log -Value $line
  Write-Host $line
}

Write-Log "watching $(solana-keygen pubkey $deployer) for >= 2.1 SOL"
while ($true) {
  $bal = (solana balance --url $rpc 2>$null | Out-String).Trim()
  if ($bal -match "([0-9]+(?:\.[0-9]+)?)\s*SOL") {
    $lamports = [int64]([double]$Matches[1] * 1000000000)
  } else {
    $lamports = 0
  }
  Write-Log "balance_lamports=$lamports"
  if ($lamports -ge $need) {
    Write-Log "funding detected, deploying"
    solana config set --url $rpc --keypair $deployer | Out-Null
    solana program deploy $so --program-id $kp --url $rpc --keypair $deployer *>> $log
    Write-Log "deploy_exit=$LASTEXITCODE"
    solana program show 9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6 --url $rpc *>> $log
    break
  }
  Start-Sleep -Seconds 8
}
