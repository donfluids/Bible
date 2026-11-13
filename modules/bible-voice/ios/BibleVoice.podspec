require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'BibleVoice'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/donfluids/Bible.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Only the apps with the Malayalam Bible carry the voice (BIBLE_EDITION ml or all, as
  # for the databases); the others get a module of the same name with nothing in it, and
  # are not made larger by the library that runs the model.
  if ['ml', 'all'].include?(ENV['BIBLE_EDITION'])
    # ONNX Runtime (MIT), which runs the voice's model. The same version as on Android,
    # from before the library gained telemetry code.
    s.dependency 'onnxruntime-objc', '1.22.0'
    s.source_files = "voice/**/*.{h,m,swift}"
  else
    s.source_files = "none/**/*.{h,m,swift}"
  end
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
