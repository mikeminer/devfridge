param([Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference='Stop'
$directory=Join-Path $env:USERPROFILE '.android\devfridge-world-signing'
if(Test-Path -LiteralPath $Destination){throw 'Choose a new backup file; an existing file will not be overwritten.'}
if(!(Test-Path -LiteralPath (Split-Path -Parent $Destination))){throw 'Create the destination directory first (prefer an offline drive).'}
$newPassword=Read-Host 'Choose a strong password for the portable signing-key backup' -AsSecureString
$confirm=Read-Host 'Confirm the backup password' -AsSecureString
$newCredential=[pscredential]::new('backup',$newPassword)
$confirmation=[pscredential]::new('backup',$confirm)
if($newCredential.GetNetworkCredential().Password -ne $confirmation.GetNetworkCredential().Password){throw 'Passwords do not match.'}
if($newCredential.GetNetworkCredential().Password.Length -lt 16){throw 'Use at least 16 characters.'}
$original=Import-Clixml -LiteralPath (Join-Path $directory 'signing-password.clixml')
try {
 $env:DF_KEY_ORIGINAL=$original.GetNetworkCredential().Password
 $env:DF_KEY_BACKUP=$newCredential.GetNetworkCredential().Password
 & (Join-Path $env:JAVA_HOME 'bin\keytool.exe') -importkeystore -srckeystore (Join-Path $directory 'devfridge-world.p12') -srcstoretype PKCS12 -srcstorepass:env DF_KEY_ORIGINAL -srcalias devfridge-world -destkeystore $Destination -deststoretype PKCS12 -deststorepass:env DF_KEY_BACKUP -destkeypass:env DF_KEY_BACKUP -noprompt
 if($LASTEXITCODE -ne 0){throw 'Backup export failed.'}
 Write-Output 'Encrypted portable backup created. Keep its password separately in your password manager.'
} finally {Remove-Item Env:DF_KEY_ORIGINAL,Env:DF_KEY_BACKUP -ErrorAction SilentlyContinue;$original=$null;$newCredential=$null;$confirmation=$null}
