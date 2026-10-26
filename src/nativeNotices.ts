/**
 * Native libraries built into the app that the generated list (src/notices.json, from the
 * JavaScript bundle and the Android build's classpath) cannot see: C++ libraries compiled
 * into React Native itself, and on iPhone the CocoaPods the app's modules bring in. Kept by
 * hand; check them when React Native or expo-image-manipulator is upgraded.
 */
export interface NativeNotice {
  name: string;
  licence: string;
  copyright: string[];
  /** Full licence text for licences other than MIT and Apache 2.0, whose texts the screen shows once. */
  text?: string;
  /** Which builds carry it. */
  platforms: ('android' | 'ios')[];
}

const bsd3 = (holder: string) =>
  `Copyright (c) ${holder}. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`;

export const NATIVE_NOTICES: NativeNotice[] = [
  { name: 'Folly (in React Native)', licence: 'Apache-2.0', copyright: ['Copyright (c) Meta Platforms, Inc. and affiliates.'], platforms: ['android', 'ios'] },
  { name: 'glog (in React Native)', licence: 'BSD-3-Clause', copyright: ['Copyright (c) 2008, Google Inc.'], text: bsd3('2008, Google Inc'), platforms: ['android', 'ios'] },
  { name: 'double-conversion (in React Native)', licence: 'BSD-3-Clause', copyright: ['Copyright 2006-2011, the V8 project authors.'], text: bsd3('2006-2011, the V8 project authors'), platforms: ['android', 'ios'] },
  { name: '{fmt} (in React Native)', licence: 'MIT', copyright: ['Copyright (c) 2012 - present, Victor Zverovich and {fmt} contributors'], platforms: ['android', 'ios'] },
  { name: 'libwebp (in Fresco on Android, SDWebImageWebPCoder on iPhone)', licence: 'BSD-3-Clause', copyright: ['Copyright (c) 2010, Google Inc.'], text: bsd3('2010, Google Inc'), platforms: ['android', 'ios'] },
  { name: 'SDWebImage', licence: 'MIT', copyright: ['Copyright (c) 2009-2020 Olivier Poitrey <rs@dailymotion.com>'], platforms: ['ios'] },
  { name: 'SDWebImageWebPCoder', licence: 'MIT', copyright: ['Copyright (c) 2018 Bogdan Poplauschi'], platforms: ['ios'] },
  { name: 'SocketRocket (in React Native)', licence: 'BSD-3-Clause', copyright: ['Copyright (c) 2016-present, Facebook, Inc.'], text: bsd3('2016-present, Facebook, Inc'), platforms: ['ios'] },
];
