# App builds

Installable Android packages for the two apps built from this repository. This
branch holds only builds so the code history stays small. Builds also come from
the Android APK workflow on every push.

## Bible (English: KJV, WEB, Hebrew and Greek)

| File | Version | Code | Signing | Built from | Size | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| [Bible-0.2.6-b8.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.6-b8.apk) | 0.2.6 | 8 | release key | f5d89aa | 43.3 MiB | `f8f504bd1ed13f74ad68e9a51ac7279983fc6d20715c1ff2f1b85ac9638b3e9d` |
| [Bible-0.2.2-b4.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.2-b4.apk) | 0.2.2 | 4 | release key | 8fa0e0a | 43.2 MiB | `7d584971ac9104faeb6e57509066da0f86fb474eb89604343a71a1caee12a175` |
| [Bible-0.2.2.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.2.apk) | 0.2.2 | 3 | release key | 521cd2c | 43.2 MiB | 2509883b233a9ad94e05302a270067ff6740680f20bac3c6b39f7001c30cbaee |
| [Bible-0.2.1.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.1.apk) | 0.2.1 | 2 | release key | 92830b2 | 43.0 MiB | ae22d86f0966b2a7b67603f099bb7db9861f2f8f95340a58af45ba154448b4c8 |
| [Bible-0.2.0.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.0.apk) | 0.2.0 | 1 | debug key | 15fa023 | 60.6 MiB | 9ce81bc1242e62eb4cdb7dd4720f9ae7dd5307fdb7adeeba8eebc33ad24d2789 |

## വേദപുസ്തകം (Malayalam: Sathyavedapusthakam 1910, KJV, Hebrew and Greek)

| File | Version | Code | Signing | Built from | Size | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| [Vedapusthakam-0.2.6-b8.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.2.6-b8.apk) | 0.2.6 | 8 | release key | f5d89aa | 43.4 MiB | `fc41ddcee222d03256435fe9c29330df5e024535f76bac03aedca2d201b9a144` |
| [Vedapusthakam-0.2.5-b7.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.2.5-b7.apk) | 0.2.5 | 7 | release key | full Malayalam word links | 43.3 MiB | `f1f8cbc2d0ee27476e9e266e542d1672270916ecde5a00db23c48bcb32101870` |

The two apps install side by side (different package ids). Vedapusthakam build 4 was withdrawn: it carried the Malayalam text but started as the English edition. Build 5 installs over it. Use the newest build
of each. Release-key builds install over each other as updates and keep
bookmarks, highlights, notes and settings. Bible 0.2.0 was signed with the debug
key: if it is installed, uninstall it before installing a newer build.

## Installing

1. Open the link on the phone and download the file.
2. Open the downloaded file. Android asks to allow installs from this source
   (your browser or Files app); allow it once.
3. Tap Install.

Requirements: Android 7.0 or newer on a 64-bit ARM phone (any phone sold since
about 2016).
