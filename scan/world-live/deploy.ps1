# Deploy the sticky live worker to Fly and point Vercel at it.
# Run from anywhere:  powershell -File scan/world-live/deploy.ps1
# Requires: flyctl logged in (`flyctl auth login`), vercel logged in.

$ErrorActionPreference = "Continue"
$scan = Split-Path -Parent $PSScriptRoot
Set-Location $scan

$app = "devfridge-world-live"
$project = "scan-devfridge-cool"
$envFile = Join-Path $env:TEMP "scan-prod.env"
$secretFile = Join-Path $env:TEMP "world-live-secret.txt"

function Read-DotEnv([string]$path) {
  $map = @{}
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $k, $v = $_.Split('=', 2)
    $map[$k.Trim()] = $v.Trim().Trim('"')
  }
  return $map
}

Write-Host "Pulling Vercel production env..."
vercel env pull $envFile --environment production --project $project --yes | Out-Null
$envMap = Read-DotEnv $envFile
foreach ($need in @("KV_REST_API_URL", "KV_REST_API_TOKEN", "TOPSHELF_RUN_SECRET")) {
  if (-not $envMap[$need]) { throw "Missing $need in Vercel production env" }
}

if (-not (Test-Path $secretFile) -or (Get-Item $secretFile).Length -lt 32) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [System.BitConverter]::ToString($bytes).Replace("-", "").ToLower() | Set-Content -NoNewline $secretFile
}
$liveSecret = (Get-Content -Raw $secretFile).Trim()
if ($liveSecret.Length -lt 32) { throw "WORLD_LIVE_SECRET too short" }

flyctl auth whoami | Out-Null

$apps = flyctl apps list --json | ConvertFrom-Json
if (-not ($apps | Where-Object { $_.Name -eq $app })) {
  Write-Host "Creating Fly app $app..."
  flyctl apps create $app --org mikeminer 2>$null
  if ($LASTEXITCODE -ne 0) { flyctl apps create $app --org personal }
}

Write-Host "Setting Fly secrets..."
flyctl secrets set -a $app --stage `
  "WORLD_LIVE_SECRET=$liveSecret" `
  "TOPSHELF_RUN_SECRET=$($envMap.TOPSHELF_RUN_SECRET)" `
  "KV_REST_API_URL=$($envMap.KV_REST_API_URL)" `
  "KV_REST_API_TOKEN=$($envMap.KV_REST_API_TOKEN)" `
  "WORLD_LIVE_WORKER=1"

Write-Host "Deploying worker..."
flyctl deploy --config world-live/fly.toml --dockerfile world-live/Dockerfile -a $app --yes

$url = "https://$app.fly.dev"
Write-Host "Health check $url/health"
$health = Invoke-RestMethod "$url/health"
if (-not $health.ok) { throw "Worker health failed: $($health | ConvertTo-Json)" }

Write-Host "Setting Vercel env..."
vercel env add WORLD_LIVE_SECRET production --project $project --sensitive --yes --value $liveSecret --force
vercel env add WORLD_LIVE_WORKER_URL production --project $project --yes --value $url --force
vercel env add WORLD_LIVE_SECRET preview --project $project --sensitive --yes --value $liveSecret --force
vercel env add WORLD_LIVE_WORKER_URL preview --project $project --yes --value $url --force

Write-Host "Redeploying Vercel production..."
vercel --prod --yes --cwd $scan --project $project

Write-Host "Done. Worker $url  worlds=$($health.worlds)"
