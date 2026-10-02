param([Parameter(Mandatory=$true)][string]$UnsignedApk,[Parameter(Mandatory=$true)][string]$OutputApk)
$ErrorActionPreference='Stop'
$keyDirectory=Join-Path $env:USERPROFILE '.android\devfridge-world-signing'
$keyPath=Join-Path $keyDirectory 'devfridge-world.p12'
$credentialPath=Join-Path $keyDirectory 'signing-password.clixml'
$alias='devfridge-world'
$keytool=Join-Path $env:JAVA_HOME 'bin\keytool.exe'
$buildTools='C:\Program Files (x86)\Android\android-sdk\build-tools\36.0.0'
if(!(Test-Path -LiteralPath $UnsignedApk)){throw 'Unsigned release APK not found.'}
if(!(Test-Path -LiteralPath $keyDirectory)){
 New-Item -ItemType Directory -Path $keyDirectory | Out-Null
 $acl=Get-Acl -LiteralPath $keyDirectory
 $acl.SetAccessRuleProtection($true,$false)
 $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User
 $acl.SetOwner($sid)
 foreach($identity in @($sid,[System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){
  $rule=[System.Security.AccessControl.FileSystemAccessRule]::new($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
  $acl.AddAccessRule($rule)
 }
 Set-Acl -LiteralPath $keyDirectory -AclObject $acl
}
if((Test-Path -LiteralPath $keyPath) -and !(Test-Path -LiteralPath $credentialPath)){throw 'Existing key has no local credential. Never replace the signing key.'}
if(!(Test-Path -LiteralPath $credentialPath)){
 $password=[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
 $secure=ConvertTo-SecureString $password -AsPlainText -Force
 [pscredential]::new($alias,$secure) | Export-Clixml -LiteralPath $credentialPath
 $password=$null
}
$credential=Import-Clixml -LiteralPath $credentialPath
try {
 $env:DF_ANDROID_SIGNING_PASSWORD=$credential.GetNetworkCredential().Password
 if(!(Test-Path -LiteralPath $keyPath)){
  & $keytool -genkeypair -storetype PKCS12 -keystore $keyPath -alias $alias -keyalg RSA -keysize 3072 -validity 10000 -storepass:env DF_ANDROID_SIGNING_PASSWORD -keypass:env DF_ANDROID_SIGNING_PASSWORD -dname 'CN=DevFridge World Android Publisher, O=DevFridge, C=IT'
  if($LASTEXITCODE -ne 0){throw 'Key generation failed.'}
 }
 & "$buildTools\apksigner.bat" sign --ks $keyPath --ks-key-alias $alias --ks-pass env:DF_ANDROID_SIGNING_PASSWORD --key-pass env:DF_ANDROID_SIGNING_PASSWORD --out $OutputApk $UnsignedApk
 if($LASTEXITCODE -ne 0){throw 'APK signing failed.'}
 & "$buildTools\apksigner.bat" verify --verbose --print-certs $OutputApk
 if($LASTEXITCODE -ne 0){throw 'APK verification failed.'}
 & $keytool -exportcert -rfc -keystore $keyPath -alias $alias -storepass:env DF_ANDROID_SIGNING_PASSWORD -file (Join-Path $keyDirectory 'certificate.pem')
 if($LASTEXITCODE -ne 0){throw 'Public certificate export failed.'}
 Write-Output "Signing key retained locally in $keyDirectory. Private key and password must never be uploaded."
} finally {Remove-Item Env:DF_ANDROID_SIGNING_PASSWORD -ErrorAction SilentlyContinue;$credential=$null}
