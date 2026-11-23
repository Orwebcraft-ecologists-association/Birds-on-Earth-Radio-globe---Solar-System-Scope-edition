# Google Play setup

The Android app is **Birds on Earth Radio — 0.5 Solar Scope Edition**. Its Bubblewrap configuration is in [android/twa-manifest.json](../android/twa-manifest.json). The proposed Play package is `com.orwebcraft.birdsonearthradio`, with version name `0.5` and initial version code `1`. Confirm the application ID in Play Console before the first upload. The Bubblewrap version used in CI targets Android API 36.

## Check the hosted PWA

The draft PR adds a web manifest and 192- and 512-pixel PNGs using the artwork in the AI Studio export. Deploy the web build to the intended TWA origin, then confirm the homepage links to the manifest and that the manifest and its icons are served over HTTPS. If another host is needed, update `host` and `webManifestUrl` in the TWA configuration together. Keep the web app, manifest and Digital Asset Links on that origin.

At the time of the setup, the homepage at `https://birds-on-earth-radio.ai.studio/` returned HTTP 200 without a manifest link, and the Digital Asset Links endpoint returned HTTP 404.

## Set up Digital Asset Links

In Play Console, obtain the SHA-256 fingerprint of the **app signing certificate** from **App integrity**. Use that fingerprint for Play-distributed installations. If testing an APK installed directly, add its signing certificate fingerprint as a separate entry in the array as needed.

Serve the following JSON at `/.well-known/assetlinks.json` on the TWA origin. Replace the fingerprint with the actual certificate value before deploying.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.orwebcraft.birdsonearthradio",
      "sha256_cert_fingerprints": ["REPLACE_WITH_PLAY_APP_SIGNING_SHA256"]
    }
  }
]
```

Check the endpoints with GET. The Digital Asset Links response must be HTTP 200 with a JSON content type and no redirect. Verify the package and certificate against Play Console, then open an installed build and check that the app launches fullscreen on the intended origin.

```sh
curl --fail --show-error --silent https://birds-on-earth-radio.ai.studio/manifest.webmanifest
curl --fail --show-error --silent --include https://birds-on-earth-radio.ai.studio/.well-known/assetlinks.json
```

## Test the GitHub Actions build

PR checks build the exported web app and generate the Android project with Bubblewrap. The Android job uses the checked-in artwork over loopback during generation and produces the `birds-on-earth-radio-unsigned-aab` artifact. This checks packaging independently of the live website and Play credentials.

To create a signed upload bundle after the workflow reaches the default branch, store these values in the GitHub Actions `android-signing` environment. Restrict the environment to the default branch.

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Single-line Base64 of the backed-up Play **upload** keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Upload key password |
| `ANDROID_KEY_ALIAS` | Upload key alias |

From the default branch, run **Actions → Build Android App Bundle (TWA) → Run workflow**. The signing job uses a temporary keystore and provides the `birds-on-earth-radio-play-aab` artifact. Keep the original upload keystore and its recovery information outside source control. The workflow produces artifacts in GitHub Actions. Play Console upload and release are separate manual steps that require approval.

[Bubblewrap guide](https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli) · [Digital Asset Links for TWAs](https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs) · [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878)

## Upload a test-signed bundle through Internal app sharing

When both build jobs pass, the workflow generates a temporary RSA test certificate, signs the AAB, checks the signature and deletes the temporary keystore. Download the `birds-on-earth-radio-internal-sharing-aab` artifact from the successful run and extract `birds-on-earth-radio-internal-sharing.aab`.

Sign in to the [Internal app sharing upload page](https://play.google.com/console/internal-app-sharing/), select the AAB and confirm the upload. Internal app sharing accepts a test signing key and re-signs the artifact with Google's Internal App Sharing certificate. Use the protected upload key for releases on the Internal testing, Closed testing or production tracks.

For an inactivity notice, also verify the account contact email and phone number in Play Console and save. Check Policy status after completing both tasks. Follow the notice's deadline and contact Play support if the warning remains.

[Google's inactive account guidance](https://support.google.com/googleplay/android-developer/answer/11605267) · [Internal app sharing requirements](https://support.google.com/googleplay/android-developer/answer/9844679)
