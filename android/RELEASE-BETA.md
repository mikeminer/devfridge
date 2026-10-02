# Android tester beta 0.3.1-beta.1

Package `cool.devfridge.world`, versionCode 7; Android 9/API 28 minimum, API 36 target. Built as a non-debuggable release and signed with a dedicated RSA-3072 release key. This is a tester beta, not a Solana dApp Store approval or a declaration of legal eligibility for TopShelf.

Release certificate SHA-256: `2acabfed1ae887ed90e650a4446e5ef747de096f0fd6ea75a8948b75b06071ca`.

## Signing and backup

The private PKCS#12 keystore is stored outside the project at `C:\Users\mikfo\.android\devfridge-world-signing\devfridge-world.p12`. The directory ACL permits the current Windows user and SYSTEM. Its random password is saved with Windows DPAPI in `signing-password.clixml`, not in source, GitHub, the APK or this document.

The Windows-bound credential is **not a portable backup**. Before replacing this PC or Windows account, run the following yourself and enter a strong backup password in the secure prompt. Use an existing directory on an offline drive and keep the password separately in your password manager:

```powershell
./scripts/backup-signing-key.ps1 -Destination 'E:\AndroidKeys\devfridge-world-backup.p12'
```

Never send the key or password through chat, email or the repository. Preserve this key for future direct Android/Solana dApp Store updates. Do not regenerate a key to solve a signing error. Publishing through Google Play requires a separate review of Play App Signing and cross-store update strategy.

To build/sign another authorized release locally:

```powershell
./gradlew.bat :app:assembleRelease :app:testReleaseUnitTest :app:lintRelease
./scripts/sign-release.ps1 -UnsignedApk app/build/outputs/apk/release/app-release-unsigned.apk -OutputApk 'C:\path\to\new-release.apk'
```

The source archive includes bundled game assets; an Android build does not require regenerating them. JDK 17 and Android SDK/build-tools 36 are needed. Local SDK paths and private signing material are deliberately excluded. The JavaScript tests/build scripts additionally use the sibling `cold-storage` source/dependencies described in README.md.

## Installation and validation

The previous debug APK has another certificate. Android will refuse an in-place update from that build. Uninstalling it clears app data; do not do that while saved runs or pending registrations are still needed. Updates signed with the release key can update this beta normally.

Release build, 4 release JVM tests, lint (0 errors / 17 warnings), APK signature and Android 9 minimum-SDK verification passed. The native authorization flow was covered by the previous 23 JavaScript and 126 backend tests. Previous emulator results remain limited: Android standard 5/6; Solana mock 4/6, with Android system ANRs affecting visual assertions. Do not label this beta fully device-tested.

## Store gates still open

- Real Seeker: original Solana wallet approval, return to Phantom, exact allowance/payment, confirmation, restart and retry. The owner confirmed no Seeker is available.
- Publisher Portal KYC/KYB and publisher wallet under the owner's control.
- Final privacy policy: legal bases, vendors, international transfers and provider-log retention verified by the publisher.
- TopShelf legal/territory assessment. The official Discord response of 19 September states that the store does not assess models or prize structures before submission; developer compliance remains the publisher's responsibility. This is not prior approval.
- Complete store assets and a reviewer demonstration. No real-money registration or claim was performed by the agent.
- Submit only when the above are satisfied; approve the publisher attestations and wallet transactions personally. Add a store link to `/android` only after an actual listing is approved.

TopShelf contract and owner withdrawal powers remain unchanged.
