# APK updates and private artifact delivery

Reviewed **2026-10-24**. This is a release workflow for the owner's game, not permission to upload an example APK when only updating this skill. Keep [Android delivery](seeker-android.md), [Store release](solana-dapp-store.md), [release pitfalls](release-pitfalls.md) and the release-capture performance guide alongside it.

## Reuse the published identity

Record the current publisher-portal release, its package, versions, APK and signing certificate. Prepare the new release against that build, not an older APK found on disk. Keep the package and original Android signing key; increase `versionCode` above the published value and change `versionName`. The portal's listing-only update instead reuses its existing APK and still makes a release for review. Keep metadata edits as a draft when shipping them with a new APK. [Official update steps](https://docs.solanamobile.com/dapp-store/submit-an-update)

The Android signing key and the Solana publisher wallet are different identities. Never export either private key to make an automated flow easier. A certificate-rotation/signing-lineage case is deliberately blocked by the helper's strict certificate comparison; obtain platform-specific evidence before a separately reviewed migration. Do not silently replace the key or rename the package.

Preserve existing authorization. If the owner already asked to publish this exact version, continue the necessary preparation and authorized submission. If they reserved final approval, finish the candidate, reports, screenshots, metadata and cost estimate before that approval. No real payment, token purchase or wallet signature is a test. A request to implement this toolkit does not authorize any game's submission.

## Inspect, compare, then test the exact candidate

Use the actual Android SDK paths and the final signed files. From the skill folder, these commands only inspect local inputs; select new output filenames so earlier evidence stays intact:

```text
python -B assets/release-delivery/preflight.py inspect --apk /release/previous.apk --apkanalyzer /sdk/bin/apkanalyzer --apksigner /sdk/build-tools/apksigner --output /reports/previous-apk.json
python -B assets/release-delivery/preflight.py inspect --apk /release/candidate.apk --apkanalyzer /sdk/bin/apkanalyzer --apksigner /sdk/build-tools/apksigner --output /reports/candidate-apk.json
```

On Windows, give the installed `.bat` paths if applicable; paths containing shell metacharacters are rejected. The helper uses argument arrays with no shell and suppresses raw tool logs. It reads package/version/debug status, verifies signatures, rejects the Android Debug certificate, inspects native ABIs and hashes the APK before and after inspection. Commands are based on the official [APK Analyzer](https://developer.android.com/tools/apkanalyzer) and [apksigner](https://developer.android.com/tools/apksigner). Keep passwords, keystores and publisher credentials outside release folders, logs and screenshots.

Create a current `published-record.json` from the actual portal observation and previous released APK:

```json
{
  "schemaVersion": 1,
  "packageName": "it.yourstudio.yourgame",
  "versionCode": 41,
  "versionName": "1.4.1",
  "apkSha256": "<previous-released-APK-SHA256>",
  "certSha256": ["<previous-release-certificate-SHA256>"],
  "sourceUrl": "https://publish.solanamobile.com/dapp/it.yourstudio.yourgame/releases",
  "observedAt": "<actual-UTC-ISO-timestamp>"
}
```

These are schema examples, not defaults or evidence. Hashes are lowercase hexadecimal; replace all placeholders. The observation must be within 24 hours and match the previous APK report. Reports bind metadata to exact artifact bytes; they are not cryptographic attestations that a portal observation or physical-device test happened. Do not hand-edit reports to manufacture a pass.

Install the candidate as an update on a physical Seeker, without uninstalling or clearing data. Confirm retained settings/progress, launch, wallet cancellation/return, network recovery and the supported languages. Perform the capture/performance workflow against the installed candidate: at least 50 committed frames in every measured one-second window, required warmup, representative worst-case scenario, thermal soak and physical Seeker checklist. Keep fixtures/emulators explicitly classified; they cannot authorize release. Then run:

```text
node assets/release-capture/performance-gate.mjs --report /reports/performance.json --artifact-sha256 <candidate-sha256> --platform seeker --max-age-hours 24
python -B assets/release-delivery/preflight.py check --candidate /release/candidate.apk --candidate-report /reports/candidate-apk.json --previous /release/previous.apk --previous-report /reports/previous-apk.json --published-record /reports/published-record.json --performance-report /reports/performance.json --output /reports/update-preflight.json
```

The second command invokes that same Node gate; absent, stale, fixture, mismatched or failing evidence blocks release. `inspect` remains available for development. Rebuilds invalidate hashes and require fresh inspection and device evidence. This gate covers identity/version and performance, not every Store, legal, localization or gameplay requirement: complete the full release checklist too.

## Deliver large files automatically, privately

**25,000,000 bytes is this owner's delivery threshold, not a Store upload limit.** At or below it, retain the selected artifact for ordinary local delivery. Above it, route to the owner's authorized Drive folder. The APK always stays local for `dapp-store --apk-file`; a private Drive view URL is not a public APK download URL for `--apk-url`.

Prefer the connected Google Drive tool when it supports the authorized destination, bounded resumable upload, stable file identity and verification. Otherwise use [drive_delivery.py](../assets/release-delivery/drive_delivery.py), a runnable standard-library client for the official Drive v3 API. It needs an existing owner-only folder and an authorized OAuth access token supplied securely as `GOOGLE_DRIVE_ACCESS_TOKEN`. Prefer an app with the minimum suitable `drive.file` scope and an owner-selected folder; follow Google's [scope guidance](https://developers.google.com/workspace/drive/api/guides/api-specific-auth). Do not paste credentials in commands, create public sharing, or put credential/state files in the artifact manifest. A missing connection/authorization is a setup dependency, not consent.

Start from [manifest.example.json](../assets/release-delivery/manifest.example.json). Set `root` to a dedicated release directory and enumerate only reviewed artifact files, each with its exact byte size and SHA-256. No directory upload, recursion, globs, symlinks/junctions, duplicate names or extra files. A public file type is not proof that its contents are safe.

```text
python -B assets/release-delivery/drive_delivery.py /release/delivery-manifest.json
python -B assets/release-delivery/drive_delivery.py /release/delivery-manifest.json --apply --folder-id <authorized-private-folder-id> --state-directory /private-local-state/this-release
```

The first command scans and emits a plan without network mutation. The second executes the existing authorized delivery. Small files stay local; only selected larger files upload. There is no recursive upload or permission-writing endpoint. The client verifies that folder and resulting files remain owner-only, and fails if permission evidence is unavailable. It never sets `anyone`, domain or public-link permissions. Returning a private Drive link does not make it publicly accessible.

All selected files are scanned before any network request. The streaming scanner accepts outer files up to 2 GiB, archive members up to 256 MiB, nesting at most three levels and an aggregate scan budget of 8 GiB. Encrypted, malformed, oversized/unscannable archives and private names (`.git`, actual `.env` files, keypairs, keystores, credentials, private vaults) block delivery. Source ZIPs may include only these public dotfile names: `.gitignore`, `.gitattributes`, `.github`, `.dockerignore`, `.editorconfig`, `.node-version`, `.nvmrc` and `.env.example`; their contents are still scanned, so an example environment file containing real credentials is rejected. The public `env.example.txt` template and `check-no-secrets.py` helper are also allowed by exact name and still content-scanned. Other hidden files/directories remain blocked. Known secret detectors are a release check, not a guarantee that arbitrary unknown secrets are absent; inspect the allowlist and outputs. Do not bypass failed scans to deliver a file.

The client reserves and persists a Drive file ID before creation, uses 4 MiB resumable chunks, queries server progress after uncertain outcomes and verifies remote SHA-256, size, owner and folder. This follows Google's [resumable/pre-generated ID workflow](https://developers.google.com/workspace/drive/api/guides/manage-uploads) and [file metadata/checksum API](https://developers.google.com/workspace/drive/api/reference/rest/v3/files). Per-request timeouts are 30 seconds; safe requests retry at most three times, stalled uploads stop after five iterations, and each upload invocation stops after 15 minutes. Rerun with the same state to resume; never delete it or allocate a fresh upload just because a response was lost.

Private recovery files contain the resumable session capability. They are excluded from release delivery, stored outside the artifact root with restrictive POSIX modes, and never printed. On Windows, place the directory under an owner-only ACL; POSIX modes do not establish Windows ACL privacy. Keep it out of cloud sync and source control. A crash can leave a lock: confirm the original process is gone and reconcile the recorded file ID before removing only that lock, then reuse its JSON state. An expired OAuth token requires a new authorized token, not a new file ID. An expired session restarts against the same reserved ID. A remote mismatch stops for reconciliation rather than replacing or duplicating the file.

## Submit through the verified CLI or portal

The current [Solana Mobile CLI](https://docs.solanamobile.com/cli/overview) is `solana-mobile` and covers project, doctor, device, emulator, localnet, playground, template and webshell tasks. It is not the publishing command. The docs recommend invoking it with `@latest`; record the actual version used. Do not substitute old `dapp-publishing` NFT-creation examples.

Publishing uses [the portal-backed dApp Store CLI](https://docs.solanamobile.com/dapp-store/publishing-cli): package `@solana-mobile/dapp-store-cli`, executable `dapp-store`. Verify its current version/help, record or pin the inspected version, and use the existing app whose App NFT is already minted. It needs the portal API key through `DAPP_STORE_API_KEY`/stdin and an already authorized Solana signer file; keep that file outside every artifact. Its documented submission shape is:

```text
dapp-store --apk-file /release/candidate.apk --keypair /private-publisher/authorized-signer.json --whats-new "The reviewed release notes"
```

That command submits a release and transaction; it is not a dry run. Run it only after the passing preflight, full release checklist, concrete owner review when reserved, and existing submission/spending authorization. If the authorized signer is in an interactive wallet, use the portal and hand the final wallet confirmation to the owner; never export a private key to satisfy CLI prerequisites. Present the actual current fees/storage estimate and wallet action, not an invented fixed SOL budget. After an uncertain submission inspect the portal/transaction before retrying. Retain release ID, APK hash and observed status: prepared, privately delivered, submitted/in review, approved and live are separate outcomes. Verify the public listing before saying the update is live.

## Offline toolkit test

```text
python -B assets/release-delivery/release_delivery_test.py
```

Tests use temporary synthetic files and an injected fake HTTP transport, including lost initiation/chunk/completion responses, idempotent reruns, private-folder checks, checksum mismatch, threshold boundaries and files above 64 MiB. They do not prove real Drive authorization, an Android signature, physical Seeker behavior or Store acceptance. In restricted Windows sandboxes, set `RELEASE_DELIVERY_TEST_TMP` to a writable scratch directory; no real artifact is needed.
