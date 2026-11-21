#!/bin/bash
# ONNX Runtime 1.22.0 for the iPhone build, from Microsoft's NuGet package instead of
# download.onnxruntime.ai (the pod's only source, whose certificate has been wrong since
# 21 Nov 2026). Run from the repository after `expo prebuild` and before `pod install`.
#
# The iPhone library (onnxruntime.xcframework) comes from Microsoft's package
# Microsoft.ML.OnnxRuntime 1.22.0 on nuget.org, checked against the copy we pinned, and
# becomes a local onnxruntime-c pod the Podfile names, so CocoaPods never asks for the
# published one. The voice calls its C interface itself (modules/bible-voice/ios/voice/
# BVVoiceModel.m), so the Objective-C pod, built from source on GitHub, is not needed.
#
# Only the apps that carry the voice need it (BIBLE_EDITION ml or all, without BIBLE_NO_VOICE).
set -euo pipefail

case "${BIBLE_EDITION:-}" in ml|all) ;; *) echo "no voice in the ${BIBLE_EDITION:-en} app: ONNX Runtime not needed"; exit 0 ;; esac
if [ "${BIBLE_NO_VOICE:-}" = 1 ]; then echo "built without the voice: ONNX Runtime not needed"; exit 0; fi

VERSION=1.22.0
NUPKG_URL="https://api.nuget.org/v3-flatcontainer/microsoft.ml.onnxruntime/$VERSION/microsoft.ml.onnxruntime.$VERSION.nupkg"
NUPKG_SHA512=cdbddeaa42fa8473c6cd9800aecb931fd556754b38a2829324705717a6597d0b0fbf332875a004bf7bbaf73c2da8abb0509fc33dcf22fae2a8c97333770aab3e
# The commit the package names in its .nuspec (tag v1.22.0).
COMMIT=f217402897f40ebba457e2421bc0a4702771968e

ROOT=$(pwd)
POD="$ROOT/ios/vendor/onnxruntime-c"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
rm -rf "$POD"
mkdir -p "$POD/Headers"

# 1. The library, from nuget.org.
curl -fsSL --retry 3 -o "$WORK/ort.nupkg" "$NUPKG_URL"
got=$(shasum -a 512 "$WORK/ort.nupkg" | cut -d' ' -f1)
if [ "$got" != "$NUPKG_SHA512" ]; then echo "::error::the NuGet package is not the one pinned (sha512 $got)"; exit 1; fi
unzip -q "$WORK/ort.nupkg" 'runtimes/ios/native/onnxruntime.xcframework.zip' LICENSE Microsoft.ML.OnnxRuntime.nuspec -d "$WORK/pkg"
grep -q "commit=\"$COMMIT\"" "$WORK/pkg/Microsoft.ML.OnnxRuntime.nuspec" || { echo "::error::the package names another commit"; exit 1; }
# unzip keeps the Mac Catalyst slice's symbolic links.
unzip -q "$WORK/pkg/runtimes/ios/native/onnxruntime.xcframework.zip" -d "$POD"
cp "$POD/onnxruntime.xcframework/ios-arm64/onnxruntime.framework/Headers/"*.h "$POD/Headers/"
cp "$WORK/pkg/LICENSE" "$POD/LICENSE"

# 2. The pod, as published (onnxruntime-c 1.22.0 on CocoaPods), with a local source.
cat > "$POD/onnxruntime-c.podspec" <<EOF
Pod::Spec.new do |s|
  s.name = 'onnxruntime-c'
  s.version = '$VERSION'
  s.summary = 'ONNX Runtime C/C++ Pod (from Microsoft.ML.OnnxRuntime $VERSION on nuget.org)'
  s.homepage = 'https://github.com/microsoft/onnxruntime'
  s.license = { :type => 'MIT', :file => 'LICENSE' }
  s.authors = { 'ONNX Runtime' => 'onnxruntime@microsoft.com' }
  s.source = { :git => 'https://github.com/microsoft/onnxruntime.git', :commit => '$COMMIT' }
  s.platforms = { :ios => '15.1' }
  s.vendored_frameworks = 'onnxruntime.xcframework'
  s.static_framework = true
  s.weak_frameworks = ['CoreML']
  s.source_files = 'Headers/*.h'
  s.preserve_paths = ['LICENSE']
  s.libraries = 'c++'
  s.pod_target_xcconfig = { 'OTHER_CPLUSPLUSFLAGS' => '-fvisibility=hidden -fvisibility-inlines-hidden' }
end
EOF

# 3. The Podfile takes it from here (inside the app's target, before its other pods).
PODFILE="$ROOT/ios/Podfile"
if ! grep -q "vendor/onnxruntime-c" "$PODFILE"; then
  awk '
    !done && /^[[:space:]]*use_expo_modules!/ {
      print; print "  pod '\''onnxruntime-c'\'', :path => '\''vendor/onnxruntime-c'\''"; done = 1; next
    }
    { print }
    END { if (!done) exit 1 }
  ' "$PODFILE" > "$WORK/Podfile" || { echo "::error::no use_expo_modules! line in ios/Podfile"; exit 1; }
  cp "$WORK/Podfile" "$PODFILE"
fi
echo "ONNX Runtime $VERSION ready, from nuget.org (sha512 checked; built from Microsoft commit $COMMIT)"
ls "$POD/onnxruntime.xcframework"
