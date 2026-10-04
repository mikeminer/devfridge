param([ValidateSet('standard','solana')][string]$Profile='standard')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$sdkRoot = Join-Path $projectRoot 'tools\android-sdk'
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_AVD_HOME = Join-Path $projectRoot 'tools\avd'
$adb = Join-Path $sdkRoot 'platform-tools\adb.exe'
$emulator = Join-Path $sdkRoot 'emulator\emulator.exe'
$deviceName = if ($Profile -eq 'solana') { 'DevFridge_Solana_MWA_API36' } else { 'DevFridge_Pixel7_API36' }
$port = if ($Profile -eq 'solana') { '5556' } else { '5554' }
$serial = "emulator-$port"

if (!(Test-Path -LiteralPath $emulator) -or !(Test-Path -LiteralPath $adb)) {
    throw 'The local Android emulator tools are not installed.'
}
$devices = & $adb devices
if ($devices -match "^$serial\s") {
    $runningName = & $adb -s $serial emu avd name
    if ($runningName -notcontains $deviceName) {
        throw "Port $port is occupied by another virtual device. Close it before launching this profile."
    }
} else {
    # This interactive window lets the owner complete onboarding and wallet prompts.
    Start-Process -FilePath $emulator -WindowStyle Normal -ArgumentList @(
        '-avd', $deviceName, '-port', $port, '-gpu', 'auto', '-memory', '3072',
        '-cores', '2', '-no-snapshot', '-no-boot-anim', '-camera-back', 'none',
        '-camera-front', 'none'
    ) | Out-Null
}

$deadline = (Get-Date).AddMinutes(3)
do {
    $ready = & $adb -s $serial shell getprop sys.boot_completed 2>$null
    if ($ready -eq '1') { break }
    Start-Sleep -Seconds 3
} while ((Get-Date) -lt $deadline)
if ($ready -ne '1') { throw 'Android did not finish booting within three minutes.' }

$installed = & $adb -s $serial shell pm path cool.devfridge.world
if (!$installed) {
    $apk = Join-Path $projectRoot 'app\build\outputs\apk\debug\app-debug.apk'
    if (!(Test-Path -LiteralPath $apk)) { throw 'Build the debug APK before launching the app.' }
    & $adb -s $serial install -r $apk
    if ($LASTEXITCODE -ne 0) { throw 'APK installation failed.' }
}
& $adb -s $serial shell am start -W -n cool.devfridge.world/.MainActivity
if ($LASTEXITCODE -ne 0) { throw 'App launch failed.' }
