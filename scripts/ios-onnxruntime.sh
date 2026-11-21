#!/bin/bash
# ONNX Runtime 1.22.0 for the iPhone build, from Microsoft's NuGet package instead of
# download.onnxruntime.ai (the pods' only source, whose certificate has been wrong since
# 21 Nov 2026). Run from the repository after `expo prebuild` and before `pod install`.
#
# - onnxruntime-c: the iPhone library (onnxruntime.xcframework) from Microsoft's package
#   Microsoft.ML.OnnxRuntime 1.22.0 on nuget.org, checked against the copy we pinned.
# - onnxruntime-objc: its Objective-C layer, compiled from Microsoft's source at the commit
#   that package was built from, with the same files and flags as the published pod.
# Both become local pods the Podfile names, so CocoaPods never asks for the published ones.
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
VENDOR="$ROOT/ios/vendor"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
rm -rf "$VENDOR/onnxruntime-c" "$VENDOR/onnxruntime-objc"
mkdir -p "$VENDOR/onnxruntime-c/Headers" "$VENDOR/onnxruntime-objc"

# 1. The library, from nuget.org.
curl -fsSL --retry 3 -o "$WORK/ort.nupkg" "$NUPKG_URL"
got=$(shasum -a 512 "$WORK/ort.nupkg" | cut -d' ' -f1)
if [ "$got" != "$NUPKG_SHA512" ]; then echo "::error::the NuGet package is not the one pinned (sha512 $got)"; exit 1; fi
unzip -q "$WORK/ort.nupkg" 'runtimes/ios/native/onnxruntime.xcframework.zip' LICENSE Microsoft.ML.OnnxRuntime.nuspec -d "$WORK/pkg"
grep -q "commit=\"$COMMIT\"" "$WORK/pkg/Microsoft.ML.OnnxRuntime.nuspec" || { echo "::error::the package names another commit"; exit 1; }
# unzip keeps the Mac Catalyst slice's symbolic links.
unzip -q "$WORK/pkg/runtimes/ios/native/onnxruntime.xcframework.zip" -d "$VENDOR/onnxruntime-c"
cp "$VENDOR/onnxruntime-c/onnxruntime.xcframework/ios-arm64/onnxruntime.framework/Headers/"*.h "$VENDOR/onnxruntime-c/Headers/"
cp "$WORK/pkg/LICENSE" "$VENDOR/onnxruntime-c/LICENSE"

# 2. The Objective-C layer's source, the published pod's files only, at that commit
#    (a git fetch of a single commit asks the runner for a login; plain downloads do not).
OBJC_FILES="ort_coreml_execution_provider.mm error_utils.h ort_env_internal.h assert_arc_enabled.mm cxx_api.h
  ort_env.mm ort_session.mm ort_session_internal.h error_utils.mm cxx_utils.h ort_enums_internal.h ort_value.mm
  cxx_utils.mm ort_value_internal.h ort_enums.mm ort_xnnpack_execution_provider.mm
  include/ort_xnnpack_execution_provider.h include/ort_session.h include/ort_coreml_execution_provider.h
  include/ort_custom_op_registration.h include/ort_env.h include/ort_value.h include/ort_enums.h include/onnxruntime.h"
RAW="https://raw.githubusercontent.com/microsoft/onnxruntime/$COMMIT"
mkdir -p "$VENDOR/onnxruntime-objc/objectivec/include"
for f in $OBJC_FILES; do
  curl -fsSL --retry 3 -o "$VENDOR/onnxruntime-objc/objectivec/$f" "$RAW/objectivec/$f"
done
curl -fsSL --retry 3 -o "$VENDOR/onnxruntime-objc/LICENSE" "$RAW/LICENSE"

# 3. The two pods, as published (onnxruntime-c and onnxruntime-objc 1.22.0 on CocoaPods),
#    with a local source.
cat > "$VENDOR/onnxruntime-c/onnxruntime-c.podspec" <<EOF
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

cat > "$VENDOR/onnxruntime-objc/onnxruntime-objc.podspec" <<EOF
Pod::Spec.new do |s|
  s.name = 'onnxruntime-objc'
  s.version = '$VERSION'
  s.summary = 'ONNX Runtime Objective-C Pod (built from Microsoft source $COMMIT)'
  s.homepage = 'https://github.com/microsoft/onnxruntime'
  s.license = { :type => 'MIT', :file => 'LICENSE' }
  s.authors = { 'ONNX Runtime' => 'onnxruntime@microsoft.com' }
  s.source = { :git => 'https://github.com/microsoft/onnxruntime.git', :commit => '$COMMIT' }
  s.platforms = { :ios => '15.1' }
  s.preserve_paths = ['LICENSE']
  s.default_subspecs = 'Core'
  s.static_framework = true
  s.subspec 'Core' do |core|
    core.dependency 'onnxruntime-c', '$VERSION'
    core.requires_arc = true
    core.compiler_flags = '-std=c++17', '-fobjc-arc-exceptions', '-Wall', '-Wextra', '-Werror'
    core.pod_target_xcconfig = {
      'HEADER_SEARCH_PATHS' => '"\${PODS_TARGET_SRCROOT}/objectivec"',
      'OTHER_CPLUSPLUSFLAGS' => '-fvisibility=hidden -fvisibility-inlines-hidden',
    }
    # The published pod's own file lists (the folder also holds training code it leaves out).
    headers = %w[ort_xnnpack_execution_provider ort_session ort_coreml_execution_provider
      ort_custom_op_registration ort_env ort_value ort_enums onnxruntime].map { |n| "objectivec/include/#{n}.h" }
    core.public_header_files = headers
    core.source_files = %w[ort_coreml_execution_provider.mm error_utils.h ort_env_internal.h assert_arc_enabled.mm
      cxx_api.h ort_env.mm ort_session.mm ort_session_internal.h error_utils.mm cxx_utils.h ort_enums_internal.h
      ort_value.mm cxx_utils.mm ort_value_internal.h ort_enums.mm ort_xnnpack_execution_provider.mm].map { |n| "objectivec/#{n}" } + headers
  end
end
EOF

# 4. The Podfile takes them from here (inside the app's target, before its other pods).
PODFILE="$ROOT/ios/Podfile"
if ! grep -q "vendor/onnxruntime-c" "$PODFILE"; then
  awk '
    !done && /^[[:space:]]*use_expo_modules!/ {
      print; print "  pod '\''onnxruntime-c'\'', :path => '\''vendor/onnxruntime-c'\''"; print "  pod '\''onnxruntime-objc'\'', :path => '\''vendor/onnxruntime-objc'\''"; done = 1; next
    }
    { print }
    END { if (!done) exit 1 }
  ' "$PODFILE" > "$WORK/Podfile" || { echo "::error::no use_expo_modules! line in ios/Podfile"; exit 1; }
  cp "$WORK/Podfile" "$PODFILE"
fi
echo "ONNX Runtime $VERSION ready: from nuget.org (sha512 checked) and Microsoft source $COMMIT"
ls "$VENDOR/onnxruntime-c/onnxruntime.xcframework" "$VENDOR/onnxruntime-objc/objectivec"
