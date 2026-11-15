# Google Play setup — Birds on Earth Radio — 0.5 Solar Scope Edition

This repository is the intended home for the Google AI Studio source and Android packaging project.
**The Android wrapper is not yet generated.** The CI workflow is manual and intentionally fails with actionable errors until the prerequisites below are met.

## 1. Verify source export

In Google AI Studio, open the original project, then open **Settings → GitHub**. Confirm the linked repository is
`Orwebcraft-ecologists-association/Birds-on-Earth-Radio-globe---Solar-System-Scope-edition` and push/sync. Ensure `main` contains the source files (such as `package.json`, `src/` and an HTML entrypoint), not only the generated README. Never commit Gemini/API secrets or `.env` files.

## 2. Prepare your hosted PWA

The hosted app is `https://birds-on-earth-radio.ai.studio/`. Ensure its HTML links to a valid HTTPS web app manifest with icon files (including 192px and 512px icons), correct `start_url`, `scope`, and `display: standalone`. Find the **actual** manifest URL; do not assume `/manifest.webmanifest` exists.

For an edge-to-edge Trusted Web Activity, your host must serve `/.well-known/assetlinks.json` with your package ID and the SHA-256 fingerprint of the certificate used to sign the distributed app (Google Play App Signing certificate for Play-distributed builds). If AI Studio hosting does not allow this, host the app on a domain where you can control the `.well-known` route. Verify this before publishing.

## 3. Generate Android project once

On a workstation with Node.js, Java and Android SDK tools installed:

```bash
npm install --global @bubblewrap/cli
mkdir android
cd android
bubblewrap init --manifest="https://YOUR-VERIFIED-HOST/PATH-TO-ACTUAL-WEB-MANIFEST"
```

Choose the display name `Birds on Earth Radio — 0.5 Solar Scope Edition` (short launcher label may need to be shorter), proposed application ID `com.orwebcraft.birdsonearthradio`, and version name `0.5`. Confirm package ID uniqueness in Play Console and that generated target SDK meets current Play requirements. The version name is **0.5**, not `0`.

Commit generated project files in `android/`, excluding keystores, credentials, build outputs and local SDK files. Verify `android/twa-manifest.json` is present.

## 4. Set GitHub Actions secrets

Under **Settings → Secrets and variables → Actions**, set:

- `ANDROID_KEYSTORE_BASE64`: base64-encoded **upload** keystore file (single line)
- `ANDROID_KEYSTORE_PASSWORD`: keystore password
- `ANDROID_KEY_PASSWORD`: key password
- `ANDROID_KEY_ALIAS`: key alias

Do not commit the keystore or passwords. Back up the original upload keystore safely outside GitHub. For new Play apps, enroll in Play App Signing and use the correct Play app-signing certificate fingerprint in Digital Asset Links.

To encode a local keystore on macOS/Linux: `base64 -w 0 upload-key.jks` (macOS: `base64 < upload-key.jks | tr -d '\\n'`); copy the resulting content directly to the secret, never a source file.

## 5. Build and publish

Go to **Actions → Build Android App Bundle (TWA) → Run workflow**, then download the `birds-on-earth-radio-play-aab` artifact. Upload the AAB manually to an **internal testing** track in Google Play Console. Test navigation, radio/audio playback, background behavior, network failures, privacy, permissions and screen sizes before production.

The workflow intentionally **does not auto-publish**. A Play developer account, content declarations, data safety, store listing, icons, screenshots, contact details, privacy policy, relevant target API level and Google Play review requirements remain necessary.

References:
- https://ai.google.dev/gemini-api/docs/aistudio-build-mode
- https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli
- https://developer.chrome.com/docs/android/trusted-web-activity/
