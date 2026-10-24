# App builds

Installable Android packages for the three apps built from this repository. This
branch holds only builds so the code history stays small. Builds also come from
the Android APK workflow on every push.

## Google Play bundles

App bundles (.aab) for uploading to Google Play, signed with the release key, which
Play records as the upload key. Phones install the APKs below, not these.

From 0.3.8 the package names are `org.riversresearch.bible` and
`org.riversresearch.bible.malayalam`; earlier builds used `org.donfluids.bible...`, so
phones treat them as different apps. Upload only 0.3.8 or later to Play.

0.4.0 (build 26), 0.4.1 (build 27) and 0.4.2 build 28 never went to Play; 0.4.2 build 29 did. 0.4.3 (build 30) was built for upload; 0.4.4 (build 31) adds the Berean Standard Bible (English app) and fuller Greek and Hebrew entries (both apps). 0.4.5 (build 32) adds verse cards to share, the Hebrew and Greek word said aloud, and the Fluorescent highlights of the dark theme (both apps). 0.4.6 (build 33) adds chapters read aloud with the phone's voice and the formal Sources and licences screen with the full third-party list. 0.4.7 (build 34) moves Listen to the chapter row at the bottom and leaves the top bar with the book, search and settings. 0.4.8 (build 35) fixes reading aloud (a highlighted verse stays readable in Fluorescent; looking up a word or going back no longer pauses it), restores fuller Greek dictionary entries for common words, keeps all Hebrew and Greek numbers on BSB phrases, credits the Malayalam text on cards, and revises the Malayalam wording. 0.4.9 (build 36) is a test of the new reader layout: Listen in the top bar, and at the bottom round arrows for the chapters with one pill per Bible (MAL, ENG; or KJV, BSB, WEB) and a Hebrew or Greek pill. 0.4.10 (build 37) makes the Bible switch one button: it names the Bible a tap takes you to, in the interface language (ഇംഗ്ലീഷ് or മലയാളം with the Malayalam interface, ENG or MAL with English); the English app's button shows the Bible open and moves to the next. 0.4.11 (build 38) adds the tablet layout (bars and lists at a reading width, landscape word sheet and card screen), Malayalam or Tamil and English side by side on a tablet or a phone turned sideways, iPad support for the iPhone build, and 64-bit Intel code in the bundles for Intel and AMD Chromebooks. 0.4.12 (build 39) gives the Malayalam app the English app's cream paper and brown colours (its icon stays green), shows in the word sheet only the Hebrew or Greek word the tapped word stands for, and drops the credit line from Malayalam and Tamil cards, with the publishers' permission. 0.4.13 (build 40) makes footnote letters smaller, the dark theme's underlines fainter, leaves out the KJV's ¶ marks, names the Bible in the English search title, keeps notebook references on one line, and shows the plain Malayalam word as a word's meaning (യെരൂശലേം, not യെരൂശലേമിൽ). 0.4.14 (build 41) fixes dark mode switched by the phone while reading, opens the word sheet taller on small phones, wraps long labels, gives a phone on its side lower bars, shows the word sheet as a panel beside the text on wide screens, finds every match in search (New Testament first, with Testament and book filters and Show more), lets a keyboard's arrows turn the chapter and Ctrl+F open search, and starts tablets a text size up. 0.4.15 (build 42) lets a card use your own photo (picked with the phone's photo picker, no photo permission), with a light or dark veil, blur, text placed top, middle or bottom, and designs saved for later; shows the version at the foot of Settings; checks saved settings and designs when reading them back; and removes doubled spaces from the WEB and Tamil text. 0.4.16 (build 43) gives all three apps one new icon, an open book under a lamp's flame on brown, and adds handwritten notebook pages (plain or lined paper; black, blue and red pens, a yellow highlighter, eraser, undo and redo; two fingers move the page, and after a pen touches the page a finger only moves it). 0.4.17 (build 44) keeps the open Bible on the left when the phone is turned sideways (it is the one read aloud and stays open when the phone is turned back), keeps every screen clear of the phone's side buttons, shows a notebook page's title once, keeps handwritten pages quick and small however long they get, and brings a card photo down to the card's size. 0.4.18 (build 45) adds Why this Bible in Settings, in English, Malayalam and Tamil. Upload 0.4.18; earlier builds that never went to Play can be skipped.
From 0.4.1 the bundles carry 32- and 64-bit ARM, and from 0.4.11 64-bit Intel too; the APKs are 64-bit ARM only.

| File | Version | Code | Signing | Built from | Size | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| [Vedapusthakam-0.4.18-b45.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.18-b45.aab) | 0.4.18 | 45 | release key | 1209417 | 64.2 MiB | `f778b12ab601b4a82e817c3f0809424f8147fc42f3e9152824ef85d90007a43c` |
| [Vedapusthakam-0.4.17-b44.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.17-b44.aab) | 0.4.17 | 44 | release key | 1209417 | 64.2 MiB | `aa5c622676b591f738fe5978681a9450185a2cf5c4f5d0490dab66cd99c807e8` |
| [Vedapusthakam-0.4.16-b43.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.16-b43.aab) | 0.4.16 | 43 | release key | 1209417 | 64.2 MiB | `a70672110a806d9519a66ed380419fb2e4de2cb48f57f2df82dd8357f2391a75` |
| [Vedapusthakam-0.4.15-b42.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.15-b42.aab) | 0.4.15 | 42 | release key | 1209417 | 61.6 MiB | `5e05d8d52bd39fbec5ea781a66572b6a5f392aecfa57a9397231f012384183f8` |
| [Vedapusthakam-0.4.14-b41.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.14-b41.aab) | 0.4.14 | 41 | release key | 1209417 | 61.1 MiB | `e78e23f499c00c447556b3a1740bda2ecb185faec8feebd8b5377c901a2f17c5` |
| [Vedapusthakam-0.4.13-b40.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.13-b40.aab) | 0.4.13 | 40 | release key | 1209417 | 61.1 MiB | `2e998e0ae34fd99c17ec60ddb2519cd9bed4d866ebcf3f891aa3895a36a21d22` |
| [Vedapusthakam-0.4.12-b39.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.12-b39.aab) | 0.4.12 | 39 | release key | 1209417 | 61.1 MiB | `2be22d68dc474de53c97f67bb58552fa6ebdd43da21593c588709f327f67b338` |
| [Vedapusthakam-0.4.11-b38.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.11-b38.aab) | 0.4.11 | 38 | release key | 1209417 | 61.1 MiB | `fe1fc8de30782d27168d89a59468e6b8eb5f020fdae3d4a238e9447dc7a11e59` |
| [Bible-0.4.18-b45.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.18-b45.aab) | 0.4.18 | 45 | release key | 1209417 | 65.6 MiB | `16148e77c31c95e3a5371559fbbb514fb0afc80c5823b9e736b83c2185dda32f` |
| [Bible-0.4.17-b44.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.17-b44.aab) | 0.4.17 | 44 | release key | 1209417 | 65.6 MiB | `8297ff5e0bad40050248299b51d49a95e27fcfcbfc47c63a28baa1ebc8b1f203` |
| [Bible-0.4.16-b43.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.16-b43.aab) | 0.4.16 | 43 | release key | 1209417 | 65.6 MiB | `abd6505c48c602d8ca1dafa23c1f75ffd9dfa7af29ea637058a3f99b1bb52905` |
| [Bible-0.4.15-b42.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.15-b42.aab) | 0.4.15 | 42 | release key | 1209417 | 62.9 MiB | `f3762351a8239e6c287b86597ebf7d854ab447aa4731dfe220c4e38b8d7c29fd` |
| [Bible-0.4.14-b41.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.14-b41.aab) | 0.4.14 | 41 | release key | 1209417 | 62.5 MiB | `2d4f99ce1e86f947105448a5fe46e41a73b22a5db42578d4cd4f4512ceaf201c` |
| [Bible-0.4.13-b40.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.13-b40.aab) | 0.4.13 | 40 | release key | 1209417 | 62.5 MiB | `ba94e5c434dcedecac6b162ce581e4668be0cd1a798a56eb8ad097e88d5d3914` |
| [Bible-0.4.12-b39.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.12-b39.aab) | 0.4.12 | 39 | release key | 1209417 | 62.5 MiB | `1ab4d132fbd75232241d06afa4328b497aaff82f4f3293c42a4826be6d2857a6` |
| [Bible-0.4.11-b38.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.11-b38.aab) | 0.4.11 | 38 | release key | 1209417 | 62.5 MiB | `3186ae428f95c5ab32375b51f82c64d441f4bff50e0ee6f30382084daab7d472` |
| [Vedapusthakam-0.4.10-b37.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.10-b37.aab) | 0.4.10 | 37 | release key | 4f83109 | 49.7 MiB | `c8f5b7fedc5cf42b7a1cf550f879d96e29efaaabe85d13d39c70d88593bdaff2` |
| [Bible-0.4.10-b37.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.10-b37.aab) | 0.4.10 | 37 | release key | 4f83109 | 51.1 MiB | `548b06a98b693703c275ded5a1bf695536c3a62422bd372adf7088ba5757b23a` |
| [Vedapusthakam-0.4.9-b36.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.9-b36.aab) | 0.4.9 | 36 | release key | d6bd35b | 49.7 MiB | `304244737974bac390c4888362fbf626387d463b9c30c49240af6fd2745a5ba3` |
| [Bible-0.4.9-b36.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.9-b36.aab) | 0.4.9 | 36 | release key | d6bd35b | 51.1 MiB | `308f95c565920bf931be78d71e7390f821a069c88239539293e4ffb3607b2892` |
| [Vedapusthakam-0.4.8-b35.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.8-b35.aab) | 0.4.8 | 35 | release key | 67cbde4 | 49.7 MiB | `a47c80e4bfe989a5b097b5d671da392c5828d5111f8258a148268170c93ff0f0` |
| [Bible-0.4.8-b35.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.8-b35.aab) | 0.4.8 | 35 | release key | 67cbde4 | 51.1 MiB | `ab722a29b8362eedf9daebbe344ab9d53bd052cf53625f1207efb928746329e6` |
| [Vedapusthakam-0.4.7-b34.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.7-b34.aab) | 0.4.7 | 34 | release key | 0d3eba2 | 49.7 MiB | `b18d5f1662e6bb2ab30502f603ea566b9696c972eeb82ff8826c0c24baff875f` |
| [Bible-0.4.7-b34.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.7-b34.aab) | 0.4.7 | 34 | release key | 0d3eba2 | 51.1 MiB | `a6624539617bfd29d5486fce53e69ccf9c14337577899334c09f3d252d8c1618` |
| [Vedapusthakam-0.4.6-b33.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.6-b33.aab) | 0.4.6 | 33 | release key | f15b794 | 49.7 MiB | `9ca51971a925a5da647ef423e90fa3e856d69388420248c596ba5d8f1a0c2d7d` |
| [Bible-0.4.6-b33.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.6-b33.aab) | 0.4.6 | 33 | release key | f15b794 | 51.1 MiB | `825c4d5c241fe345390e2d5896aea2e7a0f53c0bbe78b9794994b0d1ca9023bd` |
| [Vedapusthakam-0.4.5-b32.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.5-b32.aab) | 0.4.5 | 32 | release key | 5881b97 | 49.7 MiB | `d5254c71b95cab62a839465720b2a69a92dd6ff0701aaee67b42bb19c8fab05a` |
| [Bible-0.4.5-b32.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.5-b32.aab) | 0.4.5 | 32 | release key | 5881b97 | 51.1 MiB | `08631397b7f5ab8ec23af1844d2c4c8dea986d574980b9fe3b4fcaad175c151c` |
| [Vedapusthakam-0.4.4-b31.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.4-b31.aab) | 0.4.4 | 31 | release key | 5c41c5e | 48.9 MiB | `0990a60cfb2e768b14a54b4f6ee2276f39f4a9e37777b5349df57a4fc8a558aa` |
| [Bible-0.4.4-b31.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.4-b31.aab) | 0.4.4 | 31 | release key | 5c41c5e | 50.3 MiB | `83cf88579db6633969c8faf6728caea17639fe6321702ab206eeb40e16598eca` |
| [Vedapusthakam-0.4.3-b30.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.3-b30.aab) | 0.4.3 | 30 | release key | 90a82c8 | 47.8 MiB | `e7a012d648dca1cc8383162ff944536935b55f158f5a55de0f0408454d7fd788` |
| [Bible-0.4.3-b30.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.3-b30.aab) | 0.4.3 | 30 | release key | 90a82c8 | 44.8 MiB | `a9ca082b3213586f0f90ab749685a79a16ec2d8b04b2dccff9336a32fffa2f94` |
| [Vedapusthakam-0.4.2-b29.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.2-b29.aab) | 0.4.2 | 29 | release key | 49fecd1 | 47.8 MiB | `e2c59b47f9d2c415ec7dca1d8edac659fb3e66da6d7ec3b90167fb014e04155f` |
| [Bible-0.4.2-b29.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.2-b29.aab) | 0.4.2 | 29 | release key | 49fecd1 | 44.8 MiB | `67de8afd90193d2ca1558874c3052ab0441d65af22e22ef64023383331fdfc27` |
| [Vedapusthakam-0.4.2-b28.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.2-b28.aab) | 0.4.2 | 28 | release key | 5902856 | 47.7 MiB | `55490366034fb07841b8ef795cd9c927f43e1a8d3edf3e6a4c84814d09e351a3` |
| [Bible-0.4.2-b28.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.2-b28.aab) | 0.4.2 | 28 | release key | 5902856 | 44.8 MiB | `3a2a05d03f43e50944a9e36077c5194e0fb4e1be72b224275dfb13bb555a3390` |
| [Vedapusthakam-0.4.1-b27.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.1-b27.aab) | 0.4.1 | 27 | release key | abf7e02 | 47.7 MiB | `e71a7e25c08431a09f51b367b4433e126daa529b67db5b7046e6912d811eaffa` |
| [Bible-0.4.1-b27.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.1-b27.aab) | 0.4.1 | 27 | release key | abf7e02 | 44.8 MiB | `832b2f05ad1094f2f0ee9012351d8d076821dddfe71f395b8039bde3aaba256c` |
| [Vedapusthakam-0.4.0-b26.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.0-b26.aab) | 0.4.0 | 26 | release key | 47e1279 | 37.8 MiB | `059acc06a614d251caa1c6c9fe22e8e4cad6ac57f2b1f847ceaefd886a3ceae4` |
| [Bible-0.4.0-b26.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.0-b26.aab) | 0.4.0 | 26 | release key | 47e1279 | 34.8 MiB | `e11108214fec0e13ba11292e30d1e3e8ae9b45cf5eae271e59ff39c0111558ca` |
| [Vedapusthakam-0.3.13-b25.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.13-b25.aab) | 0.3.13 | 25 | release key | 7c5c1ab | 37.8 MiB | `459e1c853056d8e287a589debc575dd70f6f1eb45494b58a07eeef1ae1a0c86b` |
| [Bible-0.3.13-b25.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.13-b25.aab) | 0.3.13 | 25 | release key | 7c5c1ab | 34.8 MiB | `87be4e993d0237ec3e80f873c0b8f3463038f939ff8d59ee822ae034f71b09cf` |
| [Vedapusthakam-0.3.12-b24.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.12-b24.aab) | 0.3.12 | 24 | release key | 4888fe6 | 37.8 MiB | `f6c5f13c8a10efe0c50186fb8d16a118c374da8cc0e62a8f01f3c497efb54d3d` |
| [Bible-0.3.12-b24.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.12-b24.aab) | 0.3.12 | 24 | release key | 4888fe6 | 34.8 MiB | `a6653d2bb54cf01bbf231750fbd824dabfeb52bac0c4dd3dc7092d2f373f3905` |
| [Vedapusthakam-0.3.11-b23.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.11-b23.aab) | 0.3.11 | 23 | release key | d26724c | 37.8 MiB | `2340ca23807ba715630ee08fd3561f27c7240bdacd01b0e3792e613bbf41098c` |
| [Bible-0.3.11-b23.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.11-b23.aab) | 0.3.11 | 23 | release key | d26724c | 34.8 MiB | `b7da3e4c286da0f4ccd2e0ad962d8b028fa5cfd8e4e2e0738a52899a8107db1a` |
| [Vedapusthakam-0.3.10-b22.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.10-b22.aab) | 0.3.10 | 22 | release key | f215ec7 | 37.8 MiB | `09aa3f29d3653c7509401585103a6cb4dc6e60f19d6f6d9f3a3fa2feea2032e0` |
| [Bible-0.3.10-b22.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.10-b22.aab) | 0.3.10 | 22 | release key | f215ec7 | 34.8 MiB | `773a07fbac7a6160f740a712645a988bfcdcda86e46335d5aa3519e240a547d7` |
| [Vedapusthakam-0.3.9-b21.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.9-b21.aab) | 0.3.9 | 21 | release key | ca6ad4c | 37.8 MiB | `d8217b0fc631f4d21b3cc862c6020d4c49a408026d0867e45acc57ae6d84c055` |
| [Bible-0.3.9-b21.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.9-b21.aab) | 0.3.9 | 21 | release key | ca6ad4c | 34.8 MiB | `acf23f7331c862ac76ceb7546945ae185a0f1d868316a6ed33f14383ef2b6a4c` |
| [Vedapusthakam-0.3.8-b20.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.8-b20.aab) | 0.3.8 | 20 | release key | bf3cd1d | 37.8 MiB | `553d70403a873e77747c18728d8286f96301c12982332280a09c67e3cdbcbf1f` |
| [Bible-0.3.8-b20.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.8-b20.aab) | 0.3.8 | 20 | release key | bf3cd1d | 34.8 MiB | `a6bf02fa6416a2079aa98c11149164c93c0273054b71bfd4060952cbc9ceb5d5` |
| [Vedapusthakam-0.3.7-b19.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.7-b19.aab) | 0.3.7 | 19 | release key | efbc10d | 37.8 MiB | `f8161f1f3f8163c31949f4849b7869a6fafed73fb69eb7c5fb1087a965749368` |
| [Bible-0.3.7-b19.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.7-b19.aab) | 0.3.7 | 19 | release key | efbc10d | 34.8 MiB | `c9a40814eb378c79cbba68b9ee381a4a126eb8a052b7286c067a20c90a7e8309` |
| [Vedapusthakam-0.3.6-b18.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.6-b18.aab) | 0.3.6 | 18 | release key | 9f0035c | 37.7 MiB | `8f0d8e60d59533cfa910960d923f848bfe0b635ce48fb60bc63e5ea76b452f28` |
| [Bible-0.3.6-b18.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.6-b18.aab) | 0.3.6 | 18 | release key | 9f0035c | 34.7 MiB | `2a5c675b6b6b9b07599c459ba0fbb7c88f553c44bdac0db05cb7d6a8c6bb038a` |
| [Vedapusthakam-0.3.5-b17.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.5-b17.aab) | 0.3.5 | 17 | release key | 53e908b | 37.6 MiB | `ff071d8ee43b2da4f4448ff174bc403be800d03fa524673c8829fe9caca67635` |
| [Bible-0.3.5-b17.aab](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.5-b17.aab) | 0.3.5 | 17 | release key | 53e908b | 34.6 MiB | `f440c7780ed76fa68c477f49105a22916c535c3584f5d4c4f994369507335e22` |

## Bible (English: KJV, BSB, WEB, Hebrew and Greek)

| File | Version | Code | Signing | Built from | Size | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| [Bible-0.4.18-b45.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.18-b45.apk) | 0.4.18 | 45 | release key | 1209417 | 49.5 MiB | `2e6dad36fc797ad5011a1ea259b45b21d233c172532e891cdec2169367a591b9` |
| [Bible-0.4.17-b44.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.17-b44.apk) | 0.4.17 | 44 | release key | 1209417 | 49.5 MiB | `79537b7fa1c5c011d28d5d9a6c887402ef08db02b7e29c606ee498eac3390fc3` |
| [Bible-0.4.16-b43.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.16-b43.apk) | 0.4.16 | 43 | release key | 1209417 | 49.5 MiB | `883a664770151dc13c13e929b2d854093ea11ecaf149e6246b0d1db9082a8691` |
| [Bible-0.4.15-b42.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.15-b42.apk) | 0.4.15 | 42 | release key | 1209417 | 47.6 MiB | `90f5f222309ce22e63eb825cf5eace1676c5f8f153a9040153ac1fb4719d7a90` |
| [Bible-0.4.14-b41.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.14-b41.apk) | 0.4.14 | 41 | release key | 1209417 | 47.3 MiB | `5fb50f52d696f3a0c6aa415e2931725cfcc1e12297827aa63f861ca758050e5b` |
| [Bible-0.4.13-b40.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.13-b40.apk) | 0.4.13 | 40 | release key | 1209417 | 47.3 MiB | `be59770ea142ba814b6a1372316edfc614e9cd52f53fbc7dbb0deb357d4c260a` |
| [Bible-0.4.12-b39.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.12-b39.apk) | 0.4.12 | 39 | release key | 1209417 | 47.3 MiB | `1e46f085673eb2fe806b743e0d3f4f8645c3263c71877371f3be27b7fdd68ebf` |
| [Bible-0.4.11-b38.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.11-b38.apk) | 0.4.11 | 38 | release key | 1209417 | 47.3 MiB | `4ac9b424c281f6d56bb5012f8f4cfd982c22d86a532d8886d8f38d408426edab` |
| [Bible-0.4.10-b37.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.10-b37.apk) | 0.4.10 | 37 | release key | 4f83109 | 47.3 MiB | `9d16246f4c8dcb9bd08a4c0345faca741d2997c3a481c4d2fa6aafc301755b82` |
| [Bible-0.4.9-b36.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.9-b36.apk) | 0.4.9 | 36 | release key | d6bd35b | 47.3 MiB | `5f03768abf85be5c1906162848207e59780ed508ecbb496e0682151367165bd5` |
| [Bible-0.4.8-b35.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.8-b35.apk) | 0.4.8 | 35 | release key | 67cbde4 | 47.3 MiB | `7823972c061efe9daec6e4f9bab1f1755881dcf927ece63d9e264d14463234ed` |
| [Bible-0.4.7-b34.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.7-b34.apk) | 0.4.7 | 34 | release key | 0d3eba2 | 47.3 MiB | `d32a85a5fc347e002e92533d8f7db634298e7c04cf125d66de3e87eb145f155d` |
| [Bible-0.4.6-b33.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.6-b33.apk) | 0.4.6 | 33 | release key | f15b794 | 47.3 MiB | `0305355634304c436b18e8cee3182c35ce3df8f46dfcf2fc59dc3fb00dac5ad2` |
| [Bible-0.4.5-b32.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.5-b32.apk) | 0.4.5 | 32 | release key | 5881b97 | 47.3 MiB | `d85c20939c2208e77c9190500a9f5a952af756acb8539b5272eb733e6494170f` |
| [Bible-0.4.4-b31.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.4-b31.apk) | 0.4.4 | 31 | release key | 5c41c5e | 46.5 MiB | `e4cab7373d07f1a57f9d9c7c376eed64fe2224b37b3c301b5e0cfd0b1c58367a` |
| [Bible-0.4.3-b30.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.3-b30.apk) | 0.4.3 | 30 | release key | 90a82c8 | 41.0 MiB | `e38551fa45f82002fcd323d5ca02f59ae039aa9f52229426a51755ac7bdaf20a` |
| [Bible-0.4.2-b29.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.2-b29.apk) | 0.4.2 | 29 | release key | 49fecd1 | 41.0 MiB | `7268b949066738b07d99a2026a202e7a151cdb41ed212afa18059fe7db0bdd93` |
| [Bible-0.4.2-b28.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.2-b28.apk) | 0.4.2 | 28 | release key | 5902856 | 41.0 MiB | `9bbd6f4a9ecb9dd0ddb9d0f6ed4e183cf16f55ea56626c087f27874850d87aff` |
| [Bible-0.4.1-b27.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.1-b27.apk) | 0.4.1 | 27 | release key | abf7e02 | 41.0 MiB | `3081a9e99369131009aed8d9e86b1fbdb738f5384b0ae6ba0247f5d6b3af0e4f` |
| [Bible-0.4.0-b26.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.4.0-b26.apk) | 0.4.0 | 26 | release key | 47e1279 | 41.0 MiB | `e58a976a109e7040e743b52ca9405b335ffcc57284a4ddcebfe236a3ac344fb4` |
| [Bible-0.3.13-b25.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.13-b25.apk) | 0.3.13 | 25 | release key | 7c5c1ab | 40.9 MiB | `e233ab3064e1c50410e627e0c6588a428d956c916cc88febfdec66176915609f` |
| [Bible-0.3.12-b24.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.12-b24.apk) | 0.3.12 | 24 | release key | 4888fe6 | 40.9 MiB | `067e695ed0a32ba27b6fa77560f1d608773f442ab9dd5a0082dc27a136193569` |
| [Bible-0.3.11-b23.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.11-b23.apk) | 0.3.11 | 23 | release key | d26724c | 40.9 MiB | `b913c1d3049d9ec2ba1cc2d99d784684657019f74c895fef527babc748cc3de5` |
| [Bible-0.3.10-b22.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.10-b22.apk) | 0.3.10 | 22 | release key | f215ec7 | 40.9 MiB | `1757d8c5b322a0418bc7e67e7d31a7bed2e223159787288d291999f9d8a5b22e` |
| [Bible-0.3.9-b21.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.9-b21.apk) | 0.3.9 | 21 | release key | ca6ad4c | 40.9 MiB | `50ca819fdb225e0470e86e5732d3151cab70a953db1d81bb6a58fda53d304839` |
| [Bible-0.3.8-b20.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.8-b20.apk) | 0.3.8 | 20 | release key | bf3cd1d | 40.9 MiB | `7b5900c241a23d90cf439cd37d1a9ecc830292cc24f06a081dd21195c203df00` |
| [Bible-0.3.7-b19.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.7-b19.apk) | 0.3.7 | 19 | release key | efbc10d | 40.9 MiB | `439cbfb91d9f13dd237cbcfd546e2a88238bccdaf67811697128ce0879bae744` |
| [Bible-0.3.6-b18.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.6-b18.apk) | 0.3.6 | 18 | release key | 9f0035c | 40.9 MiB | `2e74d453ad933745db016d45d411172ec27e5ca94303ee0ff3fc626cccba43b5` |
| [Bible-0.3.5-b17.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.5-b17.apk) | 0.3.5 | 17 | release key | 53e908b | 40.8 MiB | `77503fb262822cec76889b4e42f73f6e17ba2f34a780121f28e3ce3f9b4fb49a` |
| [Bible-0.3.4-b16.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.4-b16.apk) | 0.3.4 | 16 | release key | cd3308f | 40.8 MiB | `7ea917bcf5c975186ee1f9babda655a6f5c3f666f75e3a972aebf722f9c3dbe6` |
| [Bible-0.3.3-b15.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.3-b15.apk) | 0.3.3 | 15 | release key | 816b634 | 40.8 MiB | `197ac8019ebb56658135c2bc280815ff65e8a7364195bb860736c9498fac409c` |
| [Bible-0.3.2-b14.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.2-b14.apk) | 0.3.2 | 14 | release key | 36a1ef1 | 40.8 MiB | `416f42ad6ee87277b77184d0647d396c708622bb5305116af91fce577fc19c51` |
| [Bible-0.3.1-b13.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.1-b13.apk) | 0.3.1 | 13 | release key | a874882 | 40.8 MiB | `62a0437154c56e9dac131c833551f34ed69923d699ce1ee604f2998273c186dd` |
| [Bible-0.3.0-b12.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.3.0-b12.apk) | 0.3.0 | 12 | release key | d8b22fe | 40.7 MiB | `a8e9a3d097ad178f5f05ffb30fbe44a6e3c578657a490041798710b9250dfdbe` |
| [Bible-0.2.9-b11.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.9-b11.apk) | 0.2.9 | 11 | release key | 8cf3ed7 | 40.3 MiB | `4cf62a797d44995e579bd1d54a90a623ed93054c30fee0342d9968eaefffb92a` |
| [Bible-0.2.8-b10.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.8-b10.apk) | 0.2.8 | 10 | release key | e74563e | 40.3 MiB | `9f0ddc751f6b0ef10638c835cc3c0a7334ca52200ff54fa7af70208fe3a670b5` |
| [Bible-0.2.7-b9.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.7-b9.apk) | 0.2.7 | 9 | release key | 6ea3364 | 43.6 MiB | `e4e7cf1ec0f3bddd26111b1d050251f5642420de96e7a86fa95e955551b8ee01` |
| [Bible-0.2.6-b8.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.6-b8.apk) | 0.2.6 | 8 | release key | f5d89aa | 43.3 MiB | `f8f504bd1ed13f74ad68e9a51ac7279983fc6d20715c1ff2f1b85ac9638b3e9d` |
| [Bible-0.2.2-b4.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.2-b4.apk) | 0.2.2 | 4 | release key | 8fa0e0a | 43.2 MiB | `7d584971ac9104faeb6e57509066da0f86fb474eb89604343a71a1caee12a175` |
| [Bible-0.2.2.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.2.apk) | 0.2.2 | 3 | release key | 521cd2c | 43.2 MiB | 2509883b233a9ad94e05302a270067ff6740680f20bac3c6b39f7001c30cbaee |
| [Bible-0.2.1.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.1.apk) | 0.2.1 | 2 | release key | 92830b2 | 43.0 MiB | ae22d86f0966b2a7b67603f099bb7db9861f2f8f95340a58af45ba154448b4c8 |
| [Bible-0.2.0.apk](https://github.com/donfluids/Bible/raw/apk-builds/Bible-0.2.0.apk) | 0.2.0 | 1 | debug key | 15fa023 | 60.6 MiB | 9ce81bc1242e62eb4cdb7dd4720f9ae7dd5307fdb7adeeba8eebc33ad24d2789 |

## വേദപുസ്തകം (Malayalam: Sathyavedapusthakam 1910, KJV, Hebrew and Greek)

| File | Version | Code | Signing | Built from | Size | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| [Vedapusthakam-0.4.18-b45.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.18-b45.apk) | 0.4.18 | 45 | release key | 1209417 | 48.1 MiB | `6584967ab6cfa591379c3c2811178f7db8219c5abcbb52dfb239b176fda28fce` |
| [Vedapusthakam-0.4.17-b44.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.17-b44.apk) | 0.4.17 | 44 | release key | 1209417 | 48.1 MiB | `269fb0eb6dc8e05f892a8502f7dc2f98981cae29f735937e9d84b2dbd0e5180e` |
| [Vedapusthakam-0.4.16-b43.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.16-b43.apk) | 0.4.16 | 43 | release key | 1209417 | 48.1 MiB | `6d3ffc7764151673ecd966318f0317aad2dcaee6b58d816dfac96c6d1b7a8669` |
| [Vedapusthakam-0.4.15-b42.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.15-b42.apk) | 0.4.15 | 42 | release key | 1209417 | 46.2 MiB | `30460d784b6e4196bfa1e187fe3fab6d6b8a6884fd30895b93509ce0e0f7f073` |
| [Vedapusthakam-0.4.14-b41.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.14-b41.apk) | 0.4.14 | 41 | release key | 1209417 | 45.9 MiB | `abf6e37d3aa34ef35a440c626bcf4f96458549e8561954ec52e9edbcf9069d69` |
| [Vedapusthakam-0.4.13-b40.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.13-b40.apk) | 0.4.13 | 40 | release key | 1209417 | 45.9 MiB | `5b72de0257548c81cc1534697106744ee42aa4d7b3c9ef194fcbe730121a9056` |
| [Vedapusthakam-0.4.12-b39.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.12-b39.apk) | 0.4.12 | 39 | release key | 1209417 | 45.9 MiB | `aec703ad98279951f6a4b3dd42f74b2e45c3ad60f7f58ab7550d6112b208e46f` |
| [Vedapusthakam-0.4.11-b38.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.11-b38.apk) | 0.4.11 | 38 | release key | 1209417 | 45.9 MiB | `220c1300868f775b8b0bd9becb931255dd721b6c2c6ca8aa456a138ba257345e` |
| [Vedapusthakam-0.4.10-b37.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.10-b37.apk) | 0.4.10 | 37 | release key | 4f83109 | 45.9 MiB | `a598497d39a2eca5ecffa071c7f64ef1ba4a1ca27796b055c86ea8b07758499f` |
| [Vedapusthakam-0.4.9-b36.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.9-b36.apk) | 0.4.9 | 36 | release key | d6bd35b | 45.9 MiB | `873ca66a0a059eccc08b02c99a7c00cd2e5f04d1b6b83e4fac5c14617f106651` |
| [Vedapusthakam-0.4.8-b35.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.8-b35.apk) | 0.4.8 | 35 | release key | 67cbde4 | 45.9 MiB | `8e3a01b0039c491b8c0c4097699fe7b7df15f1845f25ee4641078862eb5c3de1` |
| [Vedapusthakam-0.4.7-b34.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.7-b34.apk) | 0.4.7 | 34 | release key | 0d3eba2 | 45.9 MiB | `8ea787006cd885641c07f1cf91ab2f5e4978ac368ca67b23dc767d289e67f11d` |
| [Vedapusthakam-0.4.6-b33.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.6-b33.apk) | 0.4.6 | 33 | release key | f15b794 | 45.9 MiB | `1369dada2bd0282dc195ba66c81da3ff98eab3f0e4ab73ad16a63621d96e4986` |
| [Vedapusthakam-0.4.5-b32.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.5-b32.apk) | 0.4.5 | 32 | release key | 5881b97 | 45.8 MiB | `8e1eb3eb698aa7f0c5c08fae05be2a7f42cebf088d934e28e16495e190502f4c` |
| [Vedapusthakam-0.4.4-b31.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.4-b31.apk) | 0.4.4 | 31 | release key | 5c41c5e | 45.0 MiB | `a31fa274df3393ca28c0e627a069666d95e2200d8f773dfc8793deec449f6dd9` |
| [Vedapusthakam-0.4.3-b30.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.3-b30.apk) | 0.4.3 | 30 | release key | 90a82c8 | 43.9 MiB | `80f3ad5cdb38f5f51531b0336dc9a9f6123b47121616d3012836eefd38517f09` |
| [Vedapusthakam-0.4.2-b29.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.2-b29.apk) | 0.4.2 | 29 | release key | 49fecd1 | 43.9 MiB | `c0fea8694b08b213b1b1baa7ce819d4ef60e863cb4a403833b152b7825307d32` |
| [Vedapusthakam-0.4.2-b28.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.2-b28.apk) | 0.4.2 | 28 | release key | 5902856 | 43.8 MiB | `ce72e3f7122e5cd94fa8e2783fac577b8b3d0e6f79620b9ca82a1f4d77fadc5e` |
| [Vedapusthakam-0.4.1-b27.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.1-b27.apk) | 0.4.1 | 27 | release key | abf7e02 | 43.8 MiB | `d8c0d399dfeb2818454c3f45ebfd11117f06e0e88d434aa66eae39f412e379c3` |
| [Vedapusthakam-0.4.0-b26.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.4.0-b26.apk) | 0.4.0 | 26 | release key | 47e1279 | 43.8 MiB | `0be4e576f21225a048c60cb15b0bf661749871b405054a436370e5b0c3e67b39` |
| [Vedapusthakam-0.3.13-b25.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.13-b25.apk) | 0.3.13 | 25 | release key | 7c5c1ab | 43.8 MiB | `8e70428bcff3b7861d8689c2e84648dd5af095c3e61b7b8fa520e10a4b2b07d3` |
| [Vedapusthakam-0.3.12-b24.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.12-b24.apk) | 0.3.12 | 24 | release key | 4888fe6 | 43.8 MiB | `804679880eaef1a033a79e719fe673256f72cee91e723c5307a0e8bb4aae9e5f` |
| [Vedapusthakam-0.3.11-b23.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.11-b23.apk) | 0.3.11 | 23 | release key | d26724c | 43.8 MiB | `41b7d8e53a62d7fdb72bc71460045e969e62c1fb824e6feb9d93dfa413e89971` |
| [Vedapusthakam-0.3.10-b22.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.10-b22.apk) | 0.3.10 | 22 | release key | f215ec7 | 43.8 MiB | `3f43308e7228233b42a63704b7b2843447312a0e41d362f43b4b257a342cb046` |
| [Vedapusthakam-0.3.9-b21.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.9-b21.apk) | 0.3.9 | 21 | release key | ca6ad4c | 43.8 MiB | `1893f393729e621fabd46ac6e20fc6e99cb2d61246c1d739ec736ba8ff0bf877` |
| [Vedapusthakam-0.3.8-b20.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.8-b20.apk) | 0.3.8 | 20 | release key | bf3cd1d | 43.8 MiB | `170cfc7949c261ae24ef5534fe51647a09024dfeb13aaed4338d32cef543424d` |
| [Vedapusthakam-0.3.7-b19.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.7-b19.apk) | 0.3.7 | 19 | release key | efbc10d | 43.8 MiB | `2f51eb1f44949dda7465512ccc25c839cdda77e93e17276e609bd88ba4d8ad38` |
| [Vedapusthakam-0.3.6-b18.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.6-b18.apk) | 0.3.6 | 18 | release key | 9f0035c | 43.7 MiB | `2248ca216f8303ac063743100f13e5f10f6f25250cf880e862b8263217fb0368` |
| [Vedapusthakam-0.3.5-b17.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.5-b17.apk) | 0.3.5 | 17 | release key | 53e908b | 43.6 MiB | `703fcb0d1c0cd12bf69764b8f22ec91ab293d09a9d4946569deb782e446c3c9d` |
| [Vedapusthakam-0.3.4-b16.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.4-b16.apk) | 0.3.4 | 16 | release key | cd3308f | 43.6 MiB | `4cfc1069816ef5c0a31958d277ce72cbf7802dc30f3e63a3e084dfd65f91287d` |
| [Vedapusthakam-0.3.3-b15.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.3-b15.apk) | 0.3.3 | 15 | release key | 816b634 | 43.6 MiB | `2c80b4cf531cf1e10d326777c73492c2317a5272c7afdacc5a19afedefa144aa` |
| [Vedapusthakam-0.3.2-b14.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.2-b14.apk) | 0.3.2 | 14 | release key | 36a1ef1 | 43.5 MiB | `0cbaeb624dfdbef1e20d180690fe9fbe851b6a11540a122659233e3ad5b4c478` |
| [Vedapusthakam-0.3.1-b13.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.1-b13.apk) | 0.3.1 | 13 | release key | a874882 | 43.5 MiB | `8a874f89404b8ab6be196cd43c5e8368880a6793b20b4f25a35906fd97fe7f30` |
| [Vedapusthakam-0.3.0-b12.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.3.0-b12.apk) | 0.3.0 | 12 | release key | d8b22fe | 43.5 MiB | `75c35c25f5d583bf5289d82a307e0f42138af689110ca7b5aac7b6f4696057db` |
| [Vedapusthakam-0.2.9-b11.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.2.9-b11.apk) | 0.2.9 | 11 | release key | 8cf3ed7 | 43.1 MiB | `87652fc9868c1bc122df23942fb4ca76f11395c62d2db2b31144ee62d22d1a2f` |
| [Vedapusthakam-0.2.8-b10.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.2.8-b10.apk) | 0.2.8 | 10 | release key | e74563e | 43.2 MiB | `92085490713505e567cffe6ab61e1768b23dfece79f081d809e720c195d5180c` |
| [Vedapusthakam-0.2.7-b9.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.2.7-b9.apk) | 0.2.7 | 9 | release key | 6ea3364 | 43.2 MiB | `f2b0d6da44ec15c1524c478194c6e09466cb9f63cf5716d94e2ec57aa645d5c2` |
| [Vedapusthakam-0.2.6-b8.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.2.6-b8.apk) | 0.2.6 | 8 | release key | f5d89aa | 43.4 MiB | `fc41ddcee222d03256435fe9c29330df5e024535f76bac03aedca2d201b9a144` |
| [Vedapusthakam-0.2.5-b7.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedapusthakam-0.2.5-b7.apk) | 0.2.5 | 7 | release key | full Malayalam word links | 43.3 MiB | `f1f8cbc2d0ee27476e9e266e542d1672270916ecde5a00db23c48bcb32101870` |

The two apps install side by side (different package ids). Vedapusthakam build 4 was withdrawn: it carried the Malayalam text but started as the English edition. Build 5 installs over it. Use the newest build
of each. Release-key builds install over each other as updates and keep
bookmarks, highlights, notes and settings. Bible 0.2.0 was signed with the debug
key: if it is installed, uninstall it before installing a newer build.

## வேதாகமம் (Tamil: IRV, KJV, Hebrew and Greek)

Not yet released and not for Google Play: the Tamil interface and word links have not been
read by a Tamil speaker (docs/tamil-review.md on the main branch). Package
`org.riversresearch.bible.tamil`. The bundle is here for when it is ready.

| File | Version | Code | Signing | Built from | Size | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| [Vedagamam-0.4.18-b45.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.18-b45.apk) | 0.4.18 | 45 | release key | 1209417 | 48.4 MiB | `449bd62a474771d9a7cda1eb0f7cb4ef82f5e4aa909f0007667e8c94152d74e4` |
| [Vedagamam-0.4.17-b44.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.17-b44.apk) | 0.4.17 | 44 | release key | 1209417 | 48.4 MiB | `7bd0dc790d52040975b54103b172201ff9dc679f024d7ff4f9eb7f2060e638e2` |
| [Vedagamam-0.4.16-b43.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.16-b43.apk) | 0.4.16 | 43 | release key | 1209417 | 48.4 MiB | `7b8a6d7e13cd3d1e16aab77bed3be389c4f24c176357cd27c1a76bc042e7850e` |
| [Vedagamam-0.4.15-b42.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.15-b42.apk) | 0.4.15 | 42 | release key | 1209417 | 46.5 MiB | `351b17df71f075919869a7c316647641eacfb0308f65f90257600f028a8aab67` |
| [Vedagamam-0.4.14-b41.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.14-b41.apk) | 0.4.14 | 41 | release key | 1209417 | 46.2 MiB | `0f073ee5492d6c636d17d5e8d8a89b3eb4a866237c81b4f224efc6f513d37fd9` |
| [Vedagamam-0.4.13-b40.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.13-b40.apk) | 0.4.13 | 40 | release key | 1209417 | 46.2 MiB | `39022c4b6e85beeff5e92b9fa3312ce409e6316046174436eb1eb37d9eb62ae2` |
| [Vedagamam-0.4.12-b39.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.12-b39.apk) | 0.4.12 | 39 | release key | 1209417 | 46.2 MiB | `58c9321a1ecd32435570510560639cf7a4ff4177bf1b4a61e53295bde4c61ddc` |
| [Vedagamam-0.4.11-b38.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.11-b38.apk) | 0.4.11 | 38 | release key | 1209417 | 46.2 MiB | `5b586997d1e7b8c87b08ec1be1a47daea67b7bea2d33375489d6ea6698ba99ac` |
| [Vedagamam-0.4.18-b45.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.18-b45.aab) | 0.4.18 | 45 | release key | 1209417 | 64.6 MiB | `82281ff7e7397b62043d9467425918f7cb029ba3384b31c23a27f7283b0aa89e` |
| [Vedagamam-0.4.17-b44.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.17-b44.aab) | 0.4.17 | 44 | release key | 1209417 | 64.6 MiB | `3747746b217fbbe1128ef2d84efef2b5952e78e015f4079aa819e3d9cd7b053d` |
| [Vedagamam-0.4.16-b43.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.16-b43.aab) | 0.4.16 | 43 | release key | 1209417 | 64.5 MiB | `fcaf71db0547a2fd093e1af6c489cd57692eab4abf597e512bfb6f630a51ab52` |
| [Vedagamam-0.4.15-b42.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.15-b42.aab) | 0.4.15 | 42 | release key | 1209417 | 61.9 MiB | `abc95fbb2849a77a376e8f63b8936a4ad4f372248663e5af60b0ab30bf0cba5d` |
| [Vedagamam-0.4.14-b41.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.14-b41.aab) | 0.4.14 | 41 | release key | 1209417 | 61.4 MiB | `c645000689b426a56265611eef9a3703764bcc4d938313b3ba0291791dde1882` |
| [Vedagamam-0.4.13-b40.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.13-b40.aab) | 0.4.13 | 40 | release key | 1209417 | 61.4 MiB | `96c6434892332615f6eb1fa312234c391e79e2c6ff21dcce877f0b07da44eb2b` |
| [Vedagamam-0.4.12-b39.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.12-b39.aab) | 0.4.12 | 39 | release key | 1209417 | 61.4 MiB | `06f68ddfd304c481da0534fa977192571e3945d01eb865a9012cfa4672480de2` |
| [Vedagamam-0.4.11-b38.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.11-b38.aab) | 0.4.11 | 38 | release key | 1209417 | 61.4 MiB | `7ea02beba02105418e96ecbb1679c06933b0154ffa9c088b65a11b33b5970252` |
| [Vedagamam-0.4.10-b37.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.10-b37.apk) | 0.4.10 | 37 | release key | 4f83109 | 46.1 MiB | `7210b7469c7b3884071fa9f0a72f37ce1230c5d328e5f76d55a7beefc666b264` |
| [Vedagamam-0.4.10-b37.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.10-b37.aab) | 0.4.10 | 37 | release key | 4f83109 | 50.0 MiB | `9af8a0a0234f1e29eaba8ffd0c4b6114ee34d72670a24e3846910138a884c0db` |
| [Vedagamam-0.4.9-b36.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.9-b36.apk) | 0.4.9 | 36 | release key | d6bd35b | 46.1 MiB | `3cd2ab00491e93875a29c961cf30d304669b09eab9fd28d933aec47ab6311b92` |
| [Vedagamam-0.4.9-b36.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.9-b36.aab) | 0.4.9 | 36 | release key | d6bd35b | 50.0 MiB | `b037f92869611e7979185940cb81c10539f63588384314fbf8210f6d522e2477` |
| [Vedagamam-0.4.8-b35.apk](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.8-b35.apk) | 0.4.8 | 35 | release key | 67cbde4 | 46.2 MiB | `83e80643f4071bf058e61f7d701ebd9955f69f41560d5c3b674e7a17d9163622` |
| [Vedagamam-0.4.8-b35.aab](https://github.com/donfluids/Bible/raw/apk-builds/Vedagamam-0.4.8-b35.aab) | 0.4.8 | 35 | release key | 67cbde4 | 50.0 MiB | `ade12fe07bdcf40c5d62265888802a67c91b995263ddbe77726feba517637cfa` |

## Installing

1. Open the link on the phone and download the file.
2. Open the downloaded file. Android asks to allow installs from this source
   (your browser or Files app); allow it once.
3. Tap Install.

Requirements: Android 7.0 or newer on a 64-bit ARM phone (any phone sold since
about 2016).
